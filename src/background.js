// Service worker di Deskly: apertura link/cartelle come gruppi di schede, omnibox, menu contestuale, scorciatoie.
// Non può usare store.js (legato al DOM): legge e scrive il documento `deskly` direttamente con i moduli puri.
import { migrate, sanitizeLink, normalizeUrl, hostOf, findFolder } from './core/model.js';
import { chromeGroupColor } from './core/colors.js';
import { search } from './core/search.js';

const KEY = 'deskly';
const PENDING = 'deskly-pending';
const GROUPS = 'deskly-groups';
const WRITER = 'sw';
const FOLDER_PREFIX = 'deskly-folder:';
const MENU_ROOT = 'dk';
const MENU_PICK = 'dk-pick';
const MENU_FOLDER = 'dk-f:';
const MENU_MAX = 20;

const STRINGS = {
  it: {
    menu: 'Aggiungi a Deskly',
    pick: 'Scegli nel pannello…',
    empty: 'Crea la prima cartella…',
    omni: 'Cerca in Deskly: scrivi il nome di un sito o di una cartella',
    none: 'Nessun risultato in Deskly',
  },
  en: {
    menu: 'Add to Deskly',
    pick: 'Choose in the panel…',
    empty: 'Create your first folder…',
    omni: 'Search Deskly: type a site or folder name',
    none: 'No results in Deskly',
  },
};

// ---------- documento ----------

async function loadDoc() {
  const raw = (await chrome.storage.local.get(KEY))[KEY];
  return migrate(raw);
}

async function saveDoc(doc) {
  doc.meta = { ...doc.meta, rev: (doc.meta?.rev || 0) + 1, writer: WRITER };
  await chrome.storage.local.set({ [KEY]: doc });
}

const strings = (doc) => {
  const pref = doc.settings.lang === 'auto' ? chrome.i18n.getUILanguage() : doc.settings.lang;
  return String(pref).toLowerCase().startsWith('it') ? STRINGS.it : STRINGS.en;
};

// ---------- schede e gruppi ----------

const tabKey = (url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
    return u.origin + u.pathname.replace(/\/+$/, '') + u.search;
  } catch {
    return url;
  }
};

async function findOpenTab(url, windowId) {
  const key = tabKey(url);
  const tabs = await chrome.tabs.query(windowId == null ? {} : { windowId });
  return tabs.find((tb) => tb.url && tabKey(tb.url) === key) || null;
}

async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
}

async function groupTabs(tabIds, folder, windowId) {
  const store = (await chrome.storage.session.get(GROUPS))[GROUPS] || {};
  let gid = store[folder.id];
  if (gid != null) {
    try {
      const g = await chrome.tabGroups.get(gid);
      if (g.windowId !== windowId) gid = null;
    } catch {
      gid = null;
    }
  }
  if (gid == null) {
    const [same] = await chrome.tabGroups.query({ windowId, title: folder.name });
    gid = same ? same.id : null;
  }
  if (gid == null) gid = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
  else await chrome.tabs.group({ groupId: gid, tabIds });
  await chrome.tabGroups.update(gid, { title: folder.name, color: chromeGroupColor(folder.color), collapsed: false });
  store[folder.id] = gid;
  await chrome.storage.session.set({ [GROUPS]: store });
  return gid;
}

async function openLink({ url, background = false, folderId = null, sameTab = false }, sender) {
  const target = normalizeUrl(url);
  if (!target) return;
  const doc = await loadDoc();
  const { focusExisting, groupOnOpen } = doc.settings;
  const folder = folderId ? findFolder(doc, folderId) : null;
  const from = sender?.tab || null;

  if (focusExisting && !background) {
    const hit = await findOpenTab(target);
    if (hit && hit.id !== from?.id) {
      await focusTab(hit);
      if (sameTab && from) await chrome.tabs.remove(from.id).catch(() => {});
      return;
    }
  }

  if (sameTab && from) await markFresh(from.id);
  let tab;
  if (sameTab && from) tab = await chrome.tabs.update(from.id, { url: target });
  else tab = await chrome.tabs.create({ url: target, active: !background, windowId: from?.windowId });
  if (groupOnOpen && folder && tab) await groupTabs([tab.id], folder, tab.windowId);
}

// La nuova scheda di Deskly non deve restare in un gruppo di Chrome (Indietro dopo un link, "+" del gruppo, trascinamento).
// Fa eccezione la scheda che Deskly sta portando al link in questo momento: per qualche secondo non la tocco.
const FRESH = 'deskly-fresh';
const FRESH_GRACE = 4000;
const NEWTAB_URLS = [chrome.runtime.getURL('newtab.html'), 'chrome://newtab', 'chrome://new-tab-page'];
const isNewTab = (url) => Boolean(url) && NEWTAB_URLS.some((u) => url.startsWith(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const leaving = new Set();

async function markFresh(tabId) {
  const map = (await chrome.storage.session.get(FRESH))[FRESH] || {};
  map[tabId] = Date.now();
  await chrome.storage.session.set({ [FRESH]: map });
}

async function isFresh(tabId) {
  const map = (await chrome.storage.session.get(FRESH))[FRESH] || {};
  const at = map[tabId];
  if (at == null) return false;
  if (Date.now() - at < FRESH_GRACE) return true;
  delete map[tabId];
  await chrome.storage.session.set({ [FRESH]: map });
  return false;
}

// Chrome rifiuta di modificare le schede mentre l'utente le trascina: riprovo qualche volta.
async function ungroupWithRetry(tabId) {
  for (let i = 0; i < 6; i++) {
    try {
      await chrome.tabs.ungroup(tabId);
      return;
    } catch {
      await sleep(250 * (i + 1));
    }
  }
}

async function sweepTab(tab) {
  if (!tab || tab.groupId == null || tab.groupId < 0 || leaving.has(tab.id)) return;
  // Durante la navigazione verso il link l'indirizzo attuale è ancora la nuova scheda: conta dove sta andando.
  if (tab.pendingUrl && !isNewTab(tab.pendingUrl)) return;
  if (!isNewTab(tab.url || tab.pendingUrl)) return;
  leaving.add(tab.id);
  try {
    if (await isFresh(tab.id)) return;
    if (!(await loadDoc()).settings.ungroupNewtab) return;
    await ungroupWithRetry(tab.id);
  } catch {
  } finally {
    leaving.delete(tab.id);
  }
}

chrome.tabs.onUpdated.addListener((tabId, change, tab) => sweepTab(tab));
chrome.tabs.onCreated.addListener((tab) => sweepTab(tab));
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    await sweepTab(await chrome.tabs.get(tabId));
  } catch {}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const map = (await chrome.storage.session.get(FRESH))[FRESH] || {};
    if (map[tabId] == null) return;
    delete map[tabId];
    await chrome.storage.session.set({ [FRESH]: map });
  } catch {}
});

async function sweepAll() {
  try {
    for (const tab of await chrome.tabs.query({})) await sweepTab(tab);
  } catch {}
}

async function openFolder({ folderId }, sender) {
  const doc = await loadDoc();
  const folder = findFolder(doc, folderId);
  if (!folder) return;
  const urls = folder.links.map((l) => normalizeUrl(l.url)).filter(Boolean);
  if (!urls.length) return;

  const win = sender?.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
  const open = doc.settings.focusExisting ? await chrome.tabs.query({ windowId: win }) : [];
  const ids = [];
  let first = true;
  for (const url of urls) {
    const key = tabKey(url);
    const hit = open.find((tb) => tb.url && tabKey(tb.url) === key && !ids.includes(tb.id));
    if (hit) {
      ids.push(hit.id);
      continue;
    }
    const tab = await chrome.tabs.create({ url, windowId: win, active: first && !ids.length });
    first = false;
    ids.push(tab.id);
  }
  if (doc.settings.groupOnOpen) await groupTabs(ids, folder, win);
  if (ids.length) await chrome.tabs.update(ids[0], { active: true }).catch(() => {});
}

// ---------- messaggi dalle pagine di Deskly ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg) return false;
  const run = msg.type === 'open-link' ? openLink : msg.type === 'open-folder' ? openFolder : null;
  if (!run) return false;
  run(msg, sender).then(
    () => sendResponse({ ok: true }),
    (err) => sendResponse({ ok: false, error: String(err) }),
  );
  return true;
});

// ---------- pannello laterale e invio di un link dal menu/scorciatoie ----------

async function queuePending({ url, title }) {
  await chrome.storage.local.set({ [PENDING]: { url, title: title || '', at: Date.now() } });
}

function openPanel(windowId) {
  return chrome.sidePanel.open({ windowId }).catch(() => {});
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) return;
  if (command === 'open-panel') {
    openPanel(tab.windowId);
  } else if (command === 'new-link') {
    openPanel(tab.windowId);
    if (tab.url) queuePending({ url: tab.url, title: tab.title });
  }
});

// ---------- menu contestuale ----------

let menuSig = '';
let menuQueue = Promise.resolve();

function rebuildMenu() {
  menuQueue = menuQueue.then(buildMenu).catch(() => {});
  return menuQueue;
}

async function buildMenu() {
  const doc = await loadDoc();
  const folders = doc.folders.slice(0, MENU_MAX);
  const sig = JSON.stringify([doc.settings.lang, doc.folders.length, folders.map((f) => [f.id, f.name])]);
  if (sig === menuSig) return;
  menuSig = sig;
  const s = strings(doc);
  const contexts = ['page', 'link'];
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ROOT, title: s.menu, contexts });
  if (!doc.folders.length) {
    chrome.contextMenus.create({ id: MENU_PICK, parentId: MENU_ROOT, title: s.empty, contexts });
    return;
  }
  for (const f of folders) chrome.contextMenus.create({ id: MENU_FOLDER + f.id, parentId: MENU_ROOT, title: f.name, contexts });
  chrome.contextMenus.create({ id: 'dk-sep', parentId: MENU_ROOT, type: 'separator', contexts });
  chrome.contextMenus.create({ id: MENU_PICK, parentId: MENU_ROOT, title: s.pick, contexts });
}

async function flash(tabId, text, color) {
  if (tabId == null) return;
  await chrome.action.setBadgeBackgroundColor({ color, tabId });
  await chrome.action.setBadgeText({ text, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }).catch(() => {}), 1600);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  const title = info.linkUrl ? info.selectionText || '' : tab?.title || '';

  if (info.menuItemId === MENU_PICK) {
    if (tab) openPanel(tab.windowId);
    return queuePending({ url, title });
  }
  if (!String(info.menuItemId).startsWith(MENU_FOLDER)) return;

  const doc = await loadDoc();
  const folder = findFolder(doc, String(info.menuItemId).slice(MENU_FOLDER.length));
  const link = sanitizeLink({ title: title || hostOf(url), url });
  if (!folder || !link) return flash(tab?.id, '!', '#e5484d');
  if (folder.links.some((l) => tabKey(l.url) === tabKey(link.url))) return flash(tab?.id, '=', '#8a8f98');
  folder.links.push(link);
  await saveDoc(doc);
  flash(tab?.id, '✓', '#30a46c');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[KEY]) rebuildMenu();
});

// ---------- omnibox: scrivi "dk" + nome ----------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

chrome.omnibox.onInputStarted.addListener(async () => {
  chrome.omnibox.setDefaultSuggestion({ description: esc(strings(await loadDoc()).omni) });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const doc = await loadDoc();
  const seen = new Set();
  const out = [];
  for (const r of search(doc, text, { limit: 8 })) {
    if (r.type === 'folder') {
      out.push({ content: FOLDER_PREFIX + r.folder.id, description: `${esc(r.folder.name)} <dim>· ${r.folder.links.length}</dim>` });
      continue;
    }
    if (seen.has(r.link.url)) continue;
    seen.add(r.link.url);
    out.push({ content: r.link.url, description: `<match>${esc(r.link.title)}</match> <dim>${esc(r.folder.name)} · ${esc(hostOf(r.link.url))}</dim>` });
  }
  if (!out.length) chrome.omnibox.setDefaultSuggestion({ description: esc(strings(doc).none) });
  suggest(out);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const doc = await loadDoc();
  if (text.startsWith(FOLDER_PREFIX)) return openFolder({ folderId: text.slice(FOLDER_PREFIX.length) });

  let url = normalizeUrl(text) && doc.folders.some((f) => f.links.some((l) => l.url === text)) ? text : null;
  if (!url) {
    const top = search(doc, text, { limit: 1 })[0];
    if (!top) return;
    if (top.type === 'folder') return openFolder({ folderId: top.folder.id });
    url = top.link.url;
  }
  if (disposition === 'currentTab') {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (active) return void (await chrome.tabs.update(active.id, { url }));
  }
  await chrome.tabs.create({ url, active: disposition !== 'newBackgroundTab' });
});

// ---------- avvio ----------

function setup() {
  sweepAll();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  rebuildMenu();
}

chrome.runtime.onInstalled.addListener((details) => {
  setup();
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
});
chrome.runtime.onStartup.addListener(setup);
