import { FOLDER_COLORS, normalizeHex, isHex } from './colors.js';
import { sanitizeCustomThemes, isCustomTheme, CUSTOM_PREFIX } from './themes.js';

export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = {
  // aspetto
  theme: 'auto',
  customThemes: [],
  accent: '#8b7cf6',
  density: 'cozy',
  radius: 'soft',
  lang: 'auto',
  font: 'geist',
  heroFont: 'serif',
  cardStyle: 'solid',
  tileSize: 'medium',
  pageWidth: 'normal',
  newtabLayout: 'grid',
  iconShape: 'rounded',
  // disposizione e ordine
  folderCols: 'auto',
  folderSort: 'manual',
  linkSort: 'manual',
  favFirst: false,
  foldAt: 'normal',
  showCount: true,
  showSub: true,
  // sfondo
  bgStyle: 'aurora',
  auroraLevel: 'mid',
  bgDim: 'soft',
  bgBlur: false,
  grain: true,
  effects: true,
  // pagina
  showBrand: true,
  brandName: '',
  showClock: true,
  showDate: true,
  clock24: true,
  showSeconds: false,
  showGreeting: true,
  showSummary: true,
  showFavorites: true,
  showRecents: true,
  showSuggestions: true,
  userName: '',
  // comportamento
  groupOnOpen: true,
  openSame: true,
  focusExisting: true,
  favicons: true,
  hiResIcons: true,
  searchEngine: 'chrome',
  webSuggest: true,
  historyHints: true,
  updateCheck: true,
};

const ENUMS = {
  theme: ['auto', 'midnight', 'carbon', 'paper', 'ember', 'violet'],
  density: ['compact', 'cozy', 'roomy'],
  radius: ['sharp', 'soft', 'round'],
  lang: ['auto', 'it', 'en'],
  font: ['geist', 'system', 'mono'],
  heroFont: ['serif', 'sans'],
  cardStyle: ['solid', 'outline', 'tinted'],
  tileSize: ['small', 'medium', 'large'],
  pageWidth: ['narrow', 'normal', 'wide'],
  newtabLayout: ['grid', 'list', 'compact', 'icons'],
  iconShape: ['rounded', 'circle', 'square'],
  folderCols: ['auto', '1', '2', '3', '4'],
  folderSort: ['manual', 'name', 'size', 'used'],
  linkSort: ['manual', 'name', 'used', 'recent'],
  foldAt: ['few', 'normal', 'all'],
  bgStyle: ['aurora', 'plain', 'gradient', 'image'],
  auroraLevel: ['low', 'mid', 'high'],
  bgDim: ['none', 'soft', 'strong'],
  searchEngine: ['chrome', 'google', 'duckduckgo', 'bing', 'brave', 'youtube'],
};
const BOOLS = ['bgBlur', 'grain', 'effects', 'showBrand', 'showClock', 'showDate', 'clock24', 'showSeconds', 'showGreeting', 'showSummary', 'showFavorites', 'showRecents', 'showSuggestions', 'favFirst', 'showCount', 'showSub', 'groupOnOpen', 'openSame', 'focusExisting', 'favicons', 'hiResIcons', 'webSuggest', 'historyHints', 'updateCheck'];

const LIMITS = { folders: 500, links: 20000 };

export function uid(prefix = '') {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return prefix + [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 9);
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const iconName = (v, fallback = 'folder') => (typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : fallback);

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'chrome:', 'chrome-extension:', 'file:', 'edge:', 'about:', 'ftp:']);
const LOCAL_HOST = /^(localhost|127\.|192\.168\.|10\.|\[::1\])/i;

export function normalizeUrl(input) {
  let s = String(input ?? '').trim();
  if (!s || /\s/.test(s)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /^(about|chrome|edge):/i.test(s);
  if (!hasScheme) s = (LOCAL_HOST.test(s) ? 'http://' : 'https://') + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!SAFE_PROTOCOLS.has(u.protocol)) return null;
  if (u.protocol === 'http:' || u.protocol === 'https:') {
    const host = u.hostname;
    if (!host) return null;
    if (!host.includes('.') && host !== 'localhost' && !u.port && !host.startsWith('[')) return null;
  }
  return u.href;
}

export function hostOf(url) {
  try {
    const u = new URL(url);
    return (u.hostname || u.protocol.replace(':', '')).replace(/^www\./, '');
  } catch {
    return String(url || '');
  }
}

export function displayUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    return (u.hostname || u.protocol).replace(/^www\./, '') + path.replace(/\/$/, '') + (u.search ? '?…' : '');
  } catch {
    return String(url || '');
  }
}

export function sanitizeLink(l) {
  if (!l || typeof l !== 'object') return null;
  const url = normalizeUrl(l.url);
  if (!url) return null;
  const link = { id: str(l.id, 24) || uid('l_'), title: str(l.title, 80) || hostOf(url), url };
  const note = str(l.note, 200);
  if (note) link.note = note;
  const tag = str(l.tag, 16);
  if (tag) link.tag = tag;
  if (l.fav) link.fav = true;
  if (l.icon) link.icon = iconName(l.icon, '');
  if (!link.icon) delete link.icon;
  return link;
}

export function sanitizeFolder(f, index = 0) {
  if (!f || typeof f !== 'object') return null;
  const folder = {
    id: str(f.id, 24) || uid('f_'),
    name: str(f.name, 40) || 'Folder',
    icon: iconName(f.icon),
    color: normalizeHex(f.color, FOLDER_COLORS[index % FOLDER_COLORS.length].hex),
    links: [],
  };
  if (f.collapsed) folder.collapsed = true;
  for (const l of Array.isArray(f.links) ? f.links : []) {
    const link = sanitizeLink(l);
    if (link) folder.links.push(link);
  }
  return folder;
}

export function createDefaultDoc() {
  return {
    v: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    folders: [],
    stats: {},
    meta: { created: Date.now(), onboarded: false, rev: 0, writer: '' },
  };
}

export function migrate(raw) {
  const doc = createDefaultDoc();
  if (!raw || typeof raw !== 'object') return doc;

  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  for (const [k, allowed] of Object.entries(ENUMS)) if (allowed.includes(s[k])) doc.settings[k] = s[k];
  for (const k of BOOLS) if (typeof s[k] === 'boolean') doc.settings[k] = s[k];
  if (isHex(s.accent)) doc.settings.accent = normalizeHex(s.accent);
  doc.settings.customThemes = sanitizeCustomThemes(s.customThemes);
  if (isCustomTheme(s.theme) && doc.settings.customThemes.some((c) => CUSTOM_PREFIX + c.id === s.theme)) doc.settings.theme = s.theme;
  if (typeof s.userName === 'string') doc.settings.userName = s.userName.trim().slice(0, 40);
  if (typeof s.brandName === 'string') doc.settings.brandName = s.brandName.trim().slice(0, 24);
  // Dalla v2 la ricerca predefinita è quella vera di Chrome.
  if ((Number(raw.v) || 1) < 2 && s.searchEngine === 'google') doc.settings.searchEngine = 'chrome';

  const seenF = new Set();
  const seenL = new Set();
  let linkCount = 0;
  for (const rawFolder of (Array.isArray(raw.folders) ? raw.folders : []).slice(0, LIMITS.folders)) {
    const f = sanitizeFolder(rawFolder, doc.folders.length);
    if (!f) continue;
    if (seenF.has(f.id)) f.id = uid('f_');
    seenF.add(f.id);
    f.links = f.links.filter(() => linkCount++ < LIMITS.links);
    for (const l of f.links) {
      if (seenL.has(l.id)) l.id = uid('l_');
      seenL.add(l.id);
    }
    doc.folders.push(f);
  }

  if (raw.stats && typeof raw.stats === 'object') {
    for (const id of seenL) {
      const st = raw.stats[id];
      if (st && Number.isFinite(st.n)) doc.stats[id] = { n: Math.max(0, Math.floor(st.n)), last: Number(st.last) || 0 };
    }
  }

  const m = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  doc.meta.created = Number(m.created) || doc.meta.created;
  doc.meta.onboarded = Boolean(m.onboarded) || doc.folders.length > 0;
  doc.meta.rev = Number(m.rev) || 0;
  doc.meta.writer = str(m.writer, 24);
  return doc;
}

export function findFolder(doc, id) {
  return doc.folders.find((f) => f.id === id) || null;
}

export function findLink(doc, id) {
  for (const folder of doc.folders) {
    const index = folder.links.findIndex((l) => l.id === id);
    if (index >= 0) return { folder, link: folder.links[index], index };
  }
  return null;
}

export function allLinks(doc) {
  const out = [];
  for (const folder of doc.folders) for (const link of folder.links) out.push({ link, folder });
  return out;
}

export function countLinks(doc) {
  return doc.folders.reduce((n, f) => n + f.links.length, 0);
}

export const STARTER_PACKS = [
  {
    id: 'work',
    icon: 'briefcase',
    color: '#3b9cf5',
    links: [
      ['Gmail', 'https://mail.google.com'],
      ['Calendar', 'https://calendar.google.com'],
      ['Drive', 'https://drive.google.com'],
      ['Notion', 'https://www.notion.so'],
    ],
  },
  {
    id: 'dev',
    icon: 'terminal',
    color: '#4cc16a',
    links: [
      ['GitHub', 'https://github.com'],
      ['Vercel', 'https://vercel.com/dashboard'],
      ['npm', 'https://www.npmjs.com'],
      ['MDN', 'https://developer.mozilla.org'],
    ],
  },
  {
    id: 'domains',
    icon: 'globe',
    color: '#20c0a0',
    links: [
      ['Cloudflare', 'https://dash.cloudflare.com'],
      ['Namecheap', 'https://www.namecheap.com'],
      ['GoDaddy', 'https://www.godaddy.com'],
      ['DNS Checker', 'https://dnschecker.org'],
    ],
  },
  {
    id: 'roblox',
    icon: 'roblox',
    color: '#ef5b5b',
    links: [
      ['Roblox', 'https://www.roblox.com'],
      ['Creator Hub', 'https://create.roblox.com'],
      ['DevForum', 'https://devforum.roblox.com'],
      ['Status', 'https://status.roblox.com'],
    ],
  },
  {
    id: 'social',
    icon: 'message-circle',
    color: '#ec5f9c',
    links: [
      ['Instagram', 'https://www.instagram.com'],
      ['X', 'https://x.com'],
      ['Reddit', 'https://www.reddit.com'],
      ['WhatsApp', 'https://web.whatsapp.com'],
    ],
  },
  {
    id: 'media',
    icon: 'headphones',
    color: '#f5873b',
    links: [
      ['YouTube', 'https://www.youtube.com'],
      ['Spotify', 'https://open.spotify.com'],
      ['Twitch', 'https://www.twitch.tv'],
    ],
  },
];

export function foldersFromPacks(packIds, t) {
  const out = [];
  for (const pack of STARTER_PACKS) {
    if (!packIds.includes(pack.id)) continue;
    out.push({
      id: uid('f_'),
      name: t(`pack.${pack.id}`),
      icon: pack.icon,
      color: pack.color,
      links: pack.links.map(([title, url]) => ({ id: uid('l_'), title, url })),
    });
  }
  return out;
}

export function foldersFromBookmarks(tree, { maxFolders = 60 } = {}) {
  const out = [];
  const walk = (node, trail) => {
    if (out.length >= maxFolders) return;
    const kids = node.children || [];
    const links = kids.filter((k) => k.url).map((k) => sanitizeLink({ title: k.title, url: k.url })).filter(Boolean);
    const name = trail.join(' / ');
    if (links.length && name) {
      out.push({
        id: uid('f_'),
        name: name.slice(0, 40),
        icon: 'folder',
        color: FOLDER_COLORS[out.length % FOLDER_COLORS.length].hex,
        links,
      });
    }
    for (const k of kids) if (!k.url) walk(k, node.title && trail.length < 2 ? [...trail, k.title] : [k.title]);
  };
  for (const root of tree || []) for (const top of root.children || []) walk(top, top.title ? [top.title] : []);
  return out;
}

export function foldersFromTabs(tabs) {
  return tabs
    .filter((tb) => tb.url)
    .map((tb) => sanitizeLink({ title: tb.title, url: tb.url }))
    .filter(Boolean);
}
