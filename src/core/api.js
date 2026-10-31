// Strato sottile sopra chrome.*: in estensione usa le API vere, fuori (test locale) usa localStorage e dati finti.

export const isExt = typeof chrome !== 'undefined' && Boolean(chrome.runtime && chrome.runtime.id);

const devGet = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

export const storage = {
  async get(key) {
    if (isExt) return (await chrome.storage.local.get(key))[key];
    return devGet(key) ?? undefined;
  },
  async set(key, value) {
    if (isExt) return chrome.storage.local.set({ [key]: value });
    localStorage.setItem(key, JSON.stringify(value));
  },
  onChanged(key, cb) {
    if (isExt) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[key]) cb(changes[key].newValue);
      });
    } else {
      addEventListener('storage', (e) => {
        if (e.key === key) cb(devGet(key));
      });
    }
  },
};

export function faviconUrl(pageUrl, size = 32) {
  const px = size * (devicePixelRatio > 1 ? 2 : 1);
  if (isExt) {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', pageUrl);
    u.searchParams.set('size', String(px));
    return u.href;
  }
  return `https://www.google.com/s2/favicons?sz=${px}&domain_url=${encodeURIComponent(pageUrl)}`;
}

const send = (msg) => (isExt ? chrome.runtime.sendMessage(msg) : Promise.resolve(null));

export const tabsApi = {
  openLink(url, { background = false, folderId = null, sameTab = false } = {}) {
    if (isExt) return send({ type: 'open-link', url, background, folderId, sameTab });
    window.open(url, '_blank', 'noopener');
  },
  openFolder(folderId) {
    if (isExt) return send({ type: 'open-folder', folderId });
    return null;
  },
  async current() {
    if (isExt) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      return tab && tab.url ? { title: tab.title, url: tab.url } : null;
    }
    return { title: 'Esempio', url: 'https://example.com/pagina' };
  },
  async inWindow() {
    if (isExt) {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return tabs.filter((t) => t.url).map((t) => ({ title: t.title, url: t.url, groupId: t.groupId }));
    }
    return [
      { title: 'Esempio', url: 'https://example.com/a', groupId: -1 },
      { title: 'Altro', url: 'https://example.org/b', groupId: -1 },
    ];
  },
  async groups() {
    if (!isExt) return [];
    const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    return groups.map((g) => ({ id: g.id, title: g.title, color: g.color }));
  },
  async inGroup(groupId) {
    if (!isExt) return [];
    const tabs = await chrome.tabs.query({ groupId });
    return tabs.filter((t) => t.url).map((t) => ({ title: t.title, url: t.url }));
  },
};

export const bookmarksApi = {
  async tree() {
    if (!isExt) return null;
    const granted = await chrome.permissions.request({ permissions: ['bookmarks'] });
    return granted ? chrome.bookmarks.getTree() : null;
  },
};

// Permesso facoltativo di leggere la home dei siti: serve solo per prendere le loro icone grandi.
const SITE_ORIGINS = ['https://*/*', 'http://*/*'];

export const sitesApi = {
  async has() {
    if (!isExt) return false;
    try {
      return await chrome.permissions.contains({ origins: SITE_ORIGINS });
    } catch {
      return false;
    }
  },
  async request() {
    if (!isExt) return false;
    try {
      return await chrome.permissions.request({ origins: SITE_ORIGINS });
    } catch {
      return false;
    }
  },
  async drop() {
    if (!isExt) return;
    try {
      await chrome.permissions.remove({ origins: SITE_ORIGINS });
    } catch {}
  },
};

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function downloadFile(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const extVersion = () => (isExt ? chrome.runtime.getManifest().version : 'dev');

// ---------- Cronologia, siti più visitati, ricerca di Chrome ----------
// Fuori dall'estensione (anteprima su localhost) restituiscono dati finti, così l'interfaccia si può provare.

const DEV_HISTORY = [
  ['Enjoying Studio', 'https://panel.enjoyingteam.it/terminal', 48],
  ['Enjoying Studio - Dashboard', 'https://panel.enjoyingteam.it/dashboard', 31],
  ['GitHub', 'https://github.com/', 90],
  ['Claude', 'https://claude.ai/new', 120],
  ['YouTube', 'https://www.youtube.com/', 210],
  ['Roblox Creator Hub', 'https://create.roblox.com/dashboard/creations', 64],
  ['Namecheap - Domini', 'https://ap.www.namecheap.com/domains/list/', 22],
  ['Cloudflare', 'https://dash.cloudflare.com/', 37],
  ['Gmail', 'https://mail.google.com/mail/u/0/', 180],
  ['Twitch', 'https://www.twitch.tv/directory', 55],
  ['Notion', 'https://www.notion.so/', 41],
  ['Vercel', 'https://vercel.com/dashboard', 19],
].map(([title, url, visitCount], i) => ({ title, url, visitCount, typedCount: i % 3, lastVisitTime: Date.now() - i * 3600e3 * 7 }));

const mapHistory = (items) => items.map((i) => ({ title: i.title || '', url: i.url, visitCount: i.visitCount || 0, typedCount: i.typedCount || 0, lastVisitTime: i.lastVisitTime || 0 }));

export const historyApi = {
  async search(text, max = 60) {
    if (isExt) {
      try {
        return mapHistory(await chrome.history.search({ text, maxResults: max, startTime: 0 }));
      } catch {
        return [];
      }
    }
    const q = text.toLowerCase();
    return DEV_HISTORY.filter((i) => `${i.title} ${i.url}`.toLowerCase().includes(q));
  },
  // I siti più frequenti degli ultimi mesi, per i suggerimenti e l'importazione.
  async frequent(days = 120, max = 3000) {
    if (isExt) {
      try {
        return mapHistory(await chrome.history.search({ text: '', maxResults: max, startTime: Date.now() - days * 864e5 }));
      } catch {
        return [];
      }
    }
    return DEV_HISTORY;
  },
};

export const topSitesApi = {
  async get() {
    if (isExt) {
      try {
        return (await chrome.topSites.get()).map((s) => ({ title: s.title || '', url: s.url }));
      } catch {
        return [];
      }
    }
    return DEV_HISTORY.slice(2, 8).map(({ title, url }) => ({ title, url }));
  },
};

// Ricerca "vera" di Chrome: usa il motore predefinito scelto dall'utente in Chrome.
export const searchApi = {
  available: isExt && typeof chrome.search?.query === 'function',
  query(text, background = false) {
    if (!this.available) return false;
    chrome.search.query({ text, disposition: background ? 'NEW_TAB' : 'CURRENT_TAB' });
    return true;
  },
};

const SUGGEST_MAX = 7;

// Suggerimenti web in tempo reale, gli stessi della barra di Chrome: ricerche ({ kind: 'query', text })
// e siti ({ kind: 'nav', url, title }), già in ordine di rilevanza.
// L'endpoint pubblico non manda foto né sottotitoli delle "entità": quelli li ha solo Chrome.
export async function webSuggest(text, lang = 'it', signal) {
  const q = text.trim();
  if (!q) return [];
  if (!isExt) {
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return [
      { kind: 'query', text: `${q} online` },
      slug ? { kind: 'nav', url: `https://${slug}.com/`, title: `${q} · sito ufficiale` } : null,
      { kind: 'query', text: `${q} gratis` },
      { kind: 'query', text: `${q} come si usa` },
      { kind: 'query', text: `${q} 2026` },
    ].filter(Boolean);
  }
  try {
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&hl=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`, { signal });
    // Con questo client la risposta può non essere UTF-8: la leggo con il charset dichiarato.
    const charset = /charset=([\w-]+)/i.exec(r.headers.get('content-type') || '')?.[1];
    let decoder;
    try {
      decoder = new TextDecoder(charset || 'utf-8');
    } catch {
      decoder = new TextDecoder();
    }
    const data = JSON.parse(decoder.decode(await r.arrayBuffer()));
    const list = Array.isArray(data?.[1]) ? data[1] : [];
    const titles = Array.isArray(data?.[2]) ? data[2] : [];
    const types = data?.[4]?.['google:suggesttype'];
    const rank = data?.[4]?.['google:suggestrelevance'];
    const out = [];
    list.forEach((s, i) => {
      if (typeof s !== 'string' || !s.trim()) return;
      const score = Array.isArray(rank) && typeof rank[i] === 'number' ? rank[i] : -i;
      if (types?.[i] === 'NAVIGATION' || /^https?:\/\//i.test(s)) {
        const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
        if (!/^https?:\/\/[^\s]+$/i.test(url)) return;
        out.push({ kind: 'nav', url, title: typeof titles[i] === 'string' ? titles[i] : '', score });
      } else if (s.toLowerCase() !== q.toLowerCase()) out.push({ kind: 'query', text: s, score });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, SUGGEST_MAX).map(({ score, ...x }) => x);
  } catch {
    return [];
  }
}
