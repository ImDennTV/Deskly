import { h, icon, mount, modKey } from '../core/dom.js';
import { t, setLang, applyStatic, greeting, getLang } from '../core/i18n.js';
import * as store from '../core/store.js';
import { isExt, tabsApi, searchApi, faviconUrl } from '../core/api.js';
import { searchUrl } from './engines.js';
import { foldersFromTabs, normalizeUrl } from '../core/model.js';
import { applyTheme } from './theme.js';
import { logo, toast, menu } from './kit.js';
import { folderCard, chip, emptyState } from './folders.js';
import { createSearch } from './search.js';
import { initDnd } from './dnd.js';
import { openLinkEditor, openFolderEditor } from './editor.js';
import { openSettings } from './settings.js';
import { importBookmarks, openSmartImport, addSitesByCategory } from './importer.js';
import { frequentSites } from '../core/suggest.js';
import { categoryName, bareHost } from '../core/catalog.js';
import { renderOnboarding } from './onboarding.js';
import { initEffects, playIntro } from './effects.js';

const mode = document.body.dataset.mode === 'newtab' ? 'newtab' : 'panel';
const root = document.getElementById('app');
const expanded = new Set();
const GROUP_HEX = {
  grey: '#8b8fa3', blue: '#4f8ef7', red: '#ef5b5b', yellow: '#e8b730', green: '#3fb97a',
  pink: '#ec6ca9', purple: '#8b7cf6', cyan: '#2fb8d0', orange: '#f08a3c',
};

let searching = false;
let shell = null;
let search = null;
let shownLang = null;
let clockTimer = 0;

const undo = () => {
  if (store.canUndo()) store.undo();
};
const undoAction = () => ({ label: t('common.undo'), run: undo });

// ---------- azioni ----------

function openLink(link, folder, { background = false } = {}) {
  store.touchLink(link.id);
  tabsApi.openLink(link.url, { background, folderId: folder?.id, sameTab: mode === 'newtab' && !background });
}

function newFolder() {
  openFolderEditor({ onDone: (f) => requestAnimationFrame(() => revealFolder(f)) });
}

function newLink(prefill = {}, folderId) {
  if (!store.get().folders.length) {
    toast(t('link.needFolder'));
    return newFolder();
  }
  openLinkEditor({
    folderId,
    prefill,
    onDone: (saved, fid) => {
      const name = store.get().folders.find((f) => f.id === fid)?.name;
      if (name) toast(t('link.added', { name }));
    },
  });
}

function editLink(link) {
  openLinkEditor({
    link,
    onDone: (l, _fid, action) => {
      if (action === 'delete') deleteLink(l);
    },
  });
}

function deleteLink(link) {
  store.removeLink(link.id);
  toast(t('link.deleted'), { action: undoAction() });
}

function deleteFolder(folder) {
  store.removeFolder(folder.id);
  toast(t('folder.deleted', { name: folder.name }), { action: undoAction() });
}

function revealFolder(folder) {
  search.clear();
  expanded.add(folder.id);
  if (folder.collapsed) store.setCollapsed(folder.id, false);
  else render();
  requestAnimationFrame(() => {
    const el = root.querySelector(`[data-folder-id="${folder.id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.classList.add('is-flash');
    setTimeout(() => el.classList.remove('is-flash'), 1400);
  });
}

async function addCurrent() {
  const tab = await tabsApi.current();
  const url = tab && /^https?:/i.test(tab.url) ? normalizeUrl(tab.url) : null;
  if (!url) return toast(t('toast.noTab'));
  newLink({ url, title: tab.title });
}

function createFolderFrom(tabs, name, color) {
  const links = foldersFromTabs(tabs).filter((l) => /^https?:/i.test(l.url));
  if (!links.length) return toast(t('toast.noTab'));
  const folder = store.addFolder({ name, icon: 'layers', color, links });
  toast(t('add.tabsSaved', { n: folder.links.length, name: folder.name }), { action: undoAction() });
  requestAnimationFrame(() => revealFolder(folder));
}

async function saveWindow() {
  const date = new Date().toLocaleDateString(getLang(), { day: 'numeric', month: 'short' });
  createFolderFrom(await tabsApi.inWindow(), t('add.windowFolder', { date }));
}

async function saveGroup(anchor) {
  const groups = await tabsApi.groups();
  if (!groups.length) return toast(t('add.noGroups'));
  const pick = async (g) => createFolderFrom(await tabsApi.inGroup(g.id), g.title || t('add.groupUntitled'), GROUP_HEX[g.color]);
  if (groups.length === 1) return pick(groups[0]);
  menu(anchor, [
    { heading: t('add.pickGroup') },
    ...groups.map((g) => ({ label: g.title || t('add.groupUntitled'), dot: GROUP_HEX[g.color], onClick: () => pick(g) })),
  ]);
}

function addMenu(anchor) {
  menu(anchor, [
    { label: t('add.manual'), icon: 'plus', onClick: () => newLink() },
    { label: t('home.newFolder'), icon: 'folder-plus', onClick: newFolder },
    { sep: true },
    mode === 'panel' ? { label: t('add.current'), icon: 'globe', meta: t('add.currentHint'), onClick: addCurrent } : null,
    { label: t('add.tabs'), icon: 'layers', meta: t('add.tabsHint'), onClick: saveWindow },
    isExt ? { label: t('add.group'), icon: 'folder-input', meta: t('add.groupHint'), onClick: () => saveGroup(anchor) } : null,
  ]);
}

function linkMenu(link, folder, anchor) {
  const folders = store.get().folders;
  menu(anchor, [
    { label: t('common.open'), icon: 'external-link', onClick: () => openLink(link, folder) },
    { label: t('link.openBg'), icon: 'arrow-up-right', onClick: () => openLink(link, folder, { background: true }) },
    { label: link.fav ? t('link.unfav') : t('link.fav'), icon: 'star', onClick: () => store.toggleFav(link.id) },
    { label: t('link.copyUrl'), icon: 'copy', onClick: async () => { const { copyText } = await import('../core/api.js'); if (await copyText(link.url)) toast(t('link.copied')); } },
    { sep: true },
    { label: t('common.edit'), icon: 'pencil', onClick: () => editLink(link) },
    folders.length > 1
      ? {
          label: t('link.moveTo'),
          icon: 'folder-input',
          onClick: () => setTimeout(() => menu(anchor, [
            { heading: t('link.moveTo') },
            ...folders.filter((f) => f.id !== folder.id).map((f) => ({
              label: f.name, dot: f.color,
              onClick: () => store.moveLink(link.id, f.id, f.links.length),
            })),
          ]), 0),
        }
      : null,
    { label: t('link.delete'), icon: 'trash-2', danger: true, onClick: () => deleteLink(link) },
  ]);
}

function folderMenu(folder, anchor) {
  menu(anchor, [
    { label: t('folder.openGroup'), icon: 'layers', disabled: !folder.links.length, onClick: () => ctx.openFolder(folder) },
    { label: t('folder.addLink'), icon: 'plus', onClick: () => newLink({}, folder.id) },
    { sep: true },
    { label: t('common.edit'), icon: 'pencil', onClick: () => openFolderEditor({ folder }) },
    { label: folder.collapsed ? t('folder.expand') : t('folder.collapse'), icon: folder.collapsed ? 'chevron-down' : 'chevron-up', onClick: () => store.setCollapsed(folder.id, !folder.collapsed) },
    { sep: true },
    { label: t('folder.delete'), icon: 'trash-2', danger: true, onClick: () => deleteFolder(folder) },
  ]);
}

const ctx = {
  get settings() { return store.get().settings; },
  mode,
  get canDrag() { return !searching; },
  get forceOpen() { return searching; },
  expanded,
  openLink,
  openFolder: (folder) => {
    if (!isExt) return toast('Dev: apri come gruppo disponibile solo nell’estensione');
    tabsApi.openFolder(folder.id);
  },
  addLink: (folder) => newLink({}, folder.id),
  linkMenu,
  folderMenu,
  toggleFav: (link) => store.toggleFav(link.id),
  toggleCollapse: (folder) => store.setCollapsed(folder.id, !folder.collapsed),
  toggleExpanded: (folder) => {
    expanded.has(folder.id) ? expanded.delete(folder.id) : expanded.add(folder.id);
    render();
  },
  revealFolder,
  newFolder,
  newLink,
  smartImport: () => openSmartImport(),
};

// ---------- struttura (si costruisce una volta, o al cambio lingua) ----------

function buildShell() {
  search = createSearch({
    placeholder: t('search.placeholder'),
    getState: store.get,
    ctx,
    web: {
      getEngine: () => store.get().settings.searchEngine,
      setEngine: (id) => store.updateSettings({ searchEngine: id }),
      go: (url, { background = false } = {}) => tabsApi.openLink(url, { background, sameTab: mode === 'newtab' && !background }),
      // "Chrome" usa il motore scelto in Chrome stesso; gli altri aprono il loro indirizzo di ricerca.
      search: (text, { background = false } = {}) => {
        const id = store.get().settings.searchEngine;
        if (id === 'chrome' && searchApi.query(text, mode === 'panel' || background)) return;
        tabsApi.openLink(searchUrl(id, text), { background, sameTab: mode === 'newtab' && !background });
      },
      prefs: () => {
        const s = store.get().settings;
        return { webSuggest: s.webSuggest, historyHints: s.historyHints, lang: getLang() };
      },
      isSaved: (url) => Boolean(store.folderOfUrl(url)),
    },
    onActive: (on) => {
      if (on === searching) return;
      searching = on;
      render();
    },
    commands: () => [
      { id: 'new-link', label: t('palette.cmd.newLink'), icon: 'plus', run: () => newLink() },
      { id: 'new-folder', label: t('palette.cmd.newFolder'), icon: 'folder-plus', run: newFolder },
      { id: 'add-current', label: t('palette.cmd.addCurrent'), icon: 'globe', run: addCurrent },
      { id: 'settings', label: t('palette.cmd.settings'), icon: 'settings', run: openSettings },
    ],
  });

  const settingsBtn = h('button', { class: 'ibtn', type: 'button', title: t('palette.cmd.settings'), 'aria-label': t('palette.cmd.settings'), onclick: openSettings }, icon('settings', { size: 18 }));
  const main = h('main', { class: 'main' });
  const heroTitle = h('h1');
  const heroSub = h('p', { class: 'sub' });
  const parts = { main, heroTitle, heroSub };

  if (mode === 'panel') {
    parts.topbar = h('header', { class: 'topbar' }, h('div', { class: 'topbar__row' }, search.field, settingsBtn), search.hints);
    const fab = h('button', { class: 'btn btn--primary fab', type: 'button', onclick: (e) => addMenu(e.currentTarget) }, icon('plus', { size: 16 }), t('add.title'));
    parts.fab = fab;
    mount(root, parts.topbar, main, fab);
    main.prepend(search.results);
  } else {
    const addBtn = h('button', { class: 'btn', type: 'button', onclick: (e) => addMenu(e.currentTarget) }, icon('plus', { size: 16 }), t('add.title'));
    parts.brandName = h('span', { class: 'brand__name' }, 'Deskly');
    parts.brand = h('span', { class: 'brand' },
      h('span', { class: 'brand__mark' }, logo(26)),
      h('span', { class: 'brand__text' }, parts.brandName, h('span', { class: 'brand__tag' }, t('brand.tag'))));
    parts.top = h('header', { class: 'nt-top' },
      parts.brand,
      h('div', { class: 'nt-top__actions' }, addBtn, settingsBtn),
    );
    const clock = h('span', { class: 'hero__clock' });
    const date = h('span', { class: 'hero__date' });
    const sep = h('i', { class: 'hero__sep', 'aria-hidden': 'true' });
    const when = h('div', { class: 'hero__when' }, date, sep, clock);
    const tick = () => {
      const st = store.get().settings;
      const now = new Date();
      clock.textContent = now.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit', second: st.showSeconds ? '2-digit' : undefined, hour12: !st.clock24 });
      date.textContent = now.toLocaleDateString(getLang(), { weekday: 'long', day: 'numeric', month: 'long' });
      clock.hidden = !st.showClock;
      date.hidden = !st.showDate;
      sep.hidden = !(st.showClock && st.showDate);
      when.hidden = !(st.showClock || st.showDate);
    };
    parts.tick = tick;
    tick();
    clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000);
    parts.hero = h('section', { class: 'hero' },
      when,
      heroTitle, search.field, search.results, search.hints, heroSub);
    mount(root, parts.top, parts.hero, main);
  }
  shell = parts;
  shownLang = getLang();
}

// ---------- contenuto ----------

function section(title, body, count) {
  return h('section', { class: 'section' },
    h('div', { class: 'section__title' }, title, count != null ? h('span', { class: 'count faint' }, count) : null),
    body,
  );
}

function render() {
  const doc = store.get();
  const onboarding = !doc.meta.onboarded;
  const hasFolders = doc.folders.length > 0;
  const total = search.total();

  if (shell.hero) {
    const name = doc.settings.userName;
    mount(shell.heroTitle, greeting(), name ? [', ', h('em', null, name)] : null);
    shell.heroSub.textContent = hasFolders ? t('home.summary', { l: total, f: doc.folders.length }) : '';
    shell.heroTitle.hidden = !doc.settings.showGreeting;
    shell.heroSub.hidden = !doc.settings.showSummary;
    shell.hero.hidden = onboarding;
    shell.tick();
    shell.brand.hidden = !doc.settings.showBrand;
    shell.brandName.textContent = doc.settings.brandName || 'Deskly';
  }
  if (shell.topbar) shell.topbar.hidden = onboarding;
  if (shell.fab) shell.fab.hidden = onboarding || searching;

  const out = [];
  if (!onboarding && mode === 'panel') out.push(search.results);
  if (onboarding) {
    out.push(renderOnboarding({
      onStart: (ids) => store.completeOnboarding(ids, t),
      onImport: async () => {
        await importBookmarks();
        if (store.get().folders.length) store.completeOnboarding([], t);
      },
      onSmart: () => openSmartImport(),
    }));
  } else if (!searching) {
    const favs = store.favorites();
    const favIds = new Set(favs.map((x) => x.link.id));
    if (favs.length && doc.settings.showFavorites) {
      out.push(section(t('home.favorites'), h('div', { class: 'chips' }, favs.map((x) => chip(x.link, x.folder, ctx)))));
    }
    const recent = total >= 6 && doc.settings.showRecents ? store.recents(mode === 'newtab' ? 6 : 4).filter((x) => !favIds.has(x.link.id)) : [];
    if (recent.length) {
      out.push(section(t('home.recents'), h('div', { class: 'chips' }, recent.map((x) => chip(x.link, x.folder, ctx)))));
    }
    if (hasFolders && doc.settings.showSuggestions) out.push(suggestionsSection());
    if (hasFolders) {
      out.push(section(t('home.folders'), h('div', { class: 'folders' }, doc.folders.map((f) => folderCard(f, ctx))), doc.folders.length));
    } else {
      out.push(emptyState(ctx));
    }
  }
  mount(shell.main, out);
}

// ---------- suggeriti per te ----------

const SKIP_KEY = 'deskly-skip';
const skippedHosts = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const skipHost = (host) => {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...skippedHosts(), host].slice(-200)));
  } catch {}
};

let suggHost;
let suggCache = null;
let suggAt = 0;
let suggBusy = false;

function suggestionsSection() {
  suggHost ??= h('section', { class: 'section' });
  paintSuggestions();
  if (!suggBusy && Date.now() - suggAt > 60000) {
    suggBusy = true;
    suggAt = Date.now();
    frequentSites({ exclude: store.hostSaved, limit: 40 })
      .then((list) => { suggCache = list; })
      .catch(() => { suggCache = []; })
      .finally(() => { suggBusy = false; paintSuggestions(); });
  }
  return suggHost;
}

function paintSuggestions() {
  if (!suggHost) return;
  const skipped = skippedHosts();
  const list = (suggCache || []).filter((x) => !store.hostSaved(x.url) && !skipped.has(bareHost(x.url))).slice(0, mode === 'newtab' ? 8 : 5);
  suggHost.hidden = list.length === 0;
  if (!list.length) return;
  const lang = getLang();
  const add = (x) => {
    const res = addSitesByCategory([x]);
    const name = categoryName(x.cat, lang);
    toast(t('sugg.added', { title: x.title, name }), { action: { label: t('common.undo'), run: () => undo() } });
    return res;
  };
  const chips = list.map((x) => h('span', { class: 'sugg' },
    h('button', { class: 'sugg__add', type: 'button', title: t('sugg.addTo', { name: categoryName(x.cat, lang) }), onclick: () => add(x) },
      h('img', { src: faviconUrl(x.url, 32), alt: '', width: 18, height: 18 }),
      h('span', { class: 'truncate' }, x.title),
      icon('plus', { size: 14, cls: 'plus' })),
    h('button', { class: 'sugg__x', type: 'button', title: t('sugg.hide'), 'aria-label': t('sugg.hide'), onclick: () => { skipHost(bareHost(x.url)); paintSuggestions(); } }, icon('x', { size: 12 })),
  ));
  suggHost.replaceChildren(
    h('div', { class: 'section__title' }, t('home.suggested')),
    h('div', { class: 'suggs' }, chips,
      h('button', { class: 'btn btn--ghost btn--sm suggs__all', type: 'button', onclick: () => openSmartImport() }, icon('sparkles', { size: 14 }), t('sugg.all'))),
  );
}

// ---------- avvio ----------

function syncAppearance() {
  const s = store.get().settings;
  setLang(s.lang);
  applyTheme(s);
}

async function start() {
  await store.init();
  const doc = store.get();
  if (!doc.meta.onboarded && doc.folders.length) store.completeOnboarding([], t);
  syncAppearance();
  applyStatic();
  buildShell();
  render();
  if (mode === 'newtab') {
    initEffects(root);
    if (store.get().settings.effects) playIntro(root);
  }

  store.subscribe((_state, meta) => {
    if (meta.type === 'stat') return;
    if (meta.type === 'settings' || meta.type === 'external' || meta.type === 'undo') syncAppearance();
    if (getLang() !== shownLang) buildShell();
    render();
    search.refresh();
  });

  initDnd(root, {
    get: store.get,
    moveLink: store.moveLink,
    moveFolder: store.moveFolder,
    enabled: () => !searching,
  });

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      search.focus();
    } else if (e.key === '/' && !typing && !mod) {
      e.preventDefault();
      search.focus();
    } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing && store.canUndo()) {
      e.preventDefault();
      undo();
      toast(t('toast.undone'));
    }
  });

  // Aggiunte che arrivano dal service worker (scorciatoia, menu contestuale): le legge il pannello.
  if (isExt && mode === 'panel') {
    const takePending = async () => {
      const got = await chrome.storage.local.get('deskly-pending');
      const pending = got['deskly-pending'];
      if (!pending) return;
      await chrome.storage.local.remove('deskly-pending');
      if (Date.now() - (pending.at || 0) < 15000) newLink({ url: pending.url, title: pending.title });
    };
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['deskly-pending']?.newValue) takePending();
    });
    takePending();
  }
}

start();
