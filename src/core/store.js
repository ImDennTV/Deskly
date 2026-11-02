import { storage } from './api.js';
import {
  hostOf,
  migrate,
  SCHEMA_VERSION,
  uid,
  findFolder,
  findLink,
  allLinks,
  countLinks,
  sanitizeFolder,
  sanitizeLink,
  normalizeUrl,
  foldersFromPacks,
} from './model.js';
import { FOLDER_COLORS } from './colors.js';

export const KEY = 'deskly';
const UNDO_LIMIT = 30;
const WRITER = uid('w_');

let state = migrate(null);
let timer = 0;
const subs = new Set();
const undoStack = [];

export const get = () => state;
export const canUndo = () => undoStack.length > 0;

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function emit(meta) {
  for (const fn of subs) fn(state, meta);
}

function persistNow() {
  clearTimeout(timer);
  timer = 0;
  state.meta.writer = WRITER;
  state.meta.rev += 1;
  return storage.set(KEY, state);
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(persistNow, 250);
}

export function flush() {
  if (timer) persistNow();
}

export async function init() {
  const raw = await storage.get(KEY);
  state = migrate(raw);
  if (!raw) await persistNow();
  storage.onChanged(KEY, (val) => {
    if (!val || val.meta?.writer === WRITER) return;
    state = migrate(val);
    emit({ type: 'external' });
  });
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.hidden && flush());
  return state;
}

function commit(label, fn, { undo = true, type = 'change' } = {}) {
  if (undo) {
    undoStack.push({ label, snap: structuredClone(state) });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  }
  const result = fn(state);
  schedule();
  emit({ type, label, undoable: undo });
  return result;
}

export function undo() {
  const entry = undoStack.pop();
  if (!entry) return false;
  state = entry.snap;
  schedule();
  emit({ type: 'undo', label: entry.label });
  return true;
}

const clamp = (i, len) => Math.max(0, Math.min(len, i));

// Cartelle

export function addFolder({ name, icon = 'folder', color, links = [] } = {}, label = 'folder.created') {
  const folder = sanitizeFolder(
    { name, icon, links, color: color || FOLDER_COLORS[state.folders.length % FOLDER_COLORS.length].hex },
    state.folders.length,
  );
  commit(label, (d) => d.folders.push(folder));
  return folder;
}

export function updateFolder(id, patch) {
  commit('folder.edit', (d) => {
    const f = findFolder(d, id);
    if (!f) return;
    const clean = sanitizeFolder({ ...f, ...patch, links: f.links });
    Object.assign(f, { name: clean.name, icon: clean.icon, color: clean.color });
  });
}

export function removeFolder(id) {
  const folder = findFolder(state, id);
  if (!folder) return null;
  commit('folder.deleted', (d) => {
    for (const l of folder.links) delete d.stats[l.id];
    d.folders = d.folders.filter((f) => f.id !== id);
  });
  return folder;
}

export function moveFolder(id, toIndex) {
  commit('folder.reorder', (d) => {
    const from = d.folders.findIndex((f) => f.id === id);
    if (from < 0) return;
    const [f] = d.folders.splice(from, 1);
    d.folders.splice(clamp(toIndex, d.folders.length), 0, f);
  }, { undo: false });
}

export function setCollapsed(id, collapsed) {
  commit('folder.collapse', (d) => {
    const f = findFolder(d, id);
    if (!f) return;
    if (collapsed) f.collapsed = true;
    else delete f.collapsed;
  }, { undo: false });
}

export function setWide(id, wide) {
  commit('folder.wide', (d) => {
    const f = findFolder(d, id);
    if (!f) return;
    if (wide) f.wide = true;
    else delete f.wide;
  }, { undo: false });
}

// Link

export function addLink(folderId, data, index) {
  const link = sanitizeLink(data);
  if (!link) return null;
  commit('link.added', (d) => {
    const f = findFolder(d, folderId);
    if (!f) return;
    f.links.splice(index == null ? f.links.length : clamp(index, f.links.length), 0, link);
  });
  return link;
}

export function addLinks(folderId, list) {
  const clean = list.map(sanitizeLink).filter(Boolean);
  commit('link.added', (d) => {
    const f = findFolder(d, folderId);
    if (!f) return;
    const have = new Set(f.links.map((l) => l.url));
    for (const l of clean) if (!have.has(l.url)) f.links.push(l);
  });
  return clean.length;
}

export function updateLink(id, patch) {
  commit('link.edit', (d) => {
    const hit = findLink(d, id);
    if (!hit) return;
    const merged = sanitizeLink({ ...hit.link, ...patch, url: patch.url ?? hit.link.url });
    if (!merged) return;
    for (const k of ['note', 'tag', 'fav', 'icon']) delete hit.link[k];
    Object.assign(hit.link, merged, { id });
    if (patch.folderId && patch.folderId !== hit.folder.id) {
      const target = findFolder(d, patch.folderId);
      if (target) {
        hit.folder.links.splice(hit.index, 1);
        target.links.push(hit.link);
      }
    }
  });
}

export function removeLink(id) {
  commit('link.deleted', (d) => {
    const hit = findLink(d, id);
    if (!hit) return;
    hit.folder.links.splice(hit.index, 1);
    delete d.stats[id];
  });
}

export function moveLink(id, toFolderId, toIndex) {
  commit('link.move', (d) => {
    const hit = findLink(d, id);
    const target = findFolder(d, toFolderId);
    if (!hit || !target) return;
    hit.folder.links.splice(hit.index, 1);
    target.links.splice(clamp(toIndex, target.links.length), 0, hit.link);
  }, { undo: false });
}

export function toggleFav(id) {
  commit('link.fav', (d) => {
    const hit = findLink(d, id);
    if (!hit) return;
    if (hit.link.fav) delete hit.link.fav;
    else hit.link.fav = true;
  }, { undo: false });
}

export function touchLink(id) {
  commit('stat', (d) => {
    const st = d.stats[id] || { n: 0, last: 0 };
    st.n += 1;
    st.last = Date.now();
    d.stats[id] = st;
  }, { undo: false, type: 'stat' });
}

// Selettori

export function recents(limit = 8) {
  return allLinks(state)
    .map((x) => ({ ...x, st: state.stats[x.link.id] }))
    .filter((x) => x.st && x.st.last)
    .sort((a, b) => b.st.last - a.st.last)
    .slice(0, limit);
}

export const favorites = () => allLinks(state).filter((x) => x.link.fav);

export function folderOfUrl(url) {
  const n = normalizeUrl(url);
  return n ? allLinks(state).find((x) => x.link.url === n) || null : null;
}

// Un sito (stesso dominio) è già in una cartella: serve a non riproporlo tra i suggeriti.
export const hostSaved = (url) => {
  const host = hostOf(url);
  return allLinks(state).some((x) => hostOf(x.link.url) === host);
};

// Impostazioni e dati

export function updateSettings(patch) {
  commit('settings', (d) => Object.assign(d.settings, migrate({ v: SCHEMA_VERSION, settings: { ...d.settings, ...patch } }).settings), {
    undo: false,
    type: 'settings',
  });
}

export function completeOnboarding(packIds, t) {
  commit('onboarding', (d) => {
    d.folders.push(...foldersFromPacks(packIds, t));
    d.meta.onboarded = true;
  }, { undo: false });
}

export function exportJson() {
  const { meta, ...rest } = state;
  return JSON.stringify({ app: 'deskly', exportedAt: new Date().toISOString(), ...rest, meta: { created: meta.created } }, null, 2);
}

export function importFolders(folders, mode = 'merge') {
  let f = 0;
  let l = 0;
  commit('import', (d) => {
    if (mode === 'replace') {
      d.folders = [];
      d.stats = {};
    }
    for (const incoming of folders) {
      const existing = d.folders.find((x) => x.name.toLowerCase() === incoming.name.toLowerCase());
      if (existing) {
        const have = new Set(existing.links.map((x) => x.url));
        for (const link of incoming.links) {
          if (!have.has(link.url)) {
            existing.links.push(link);
            l++;
          }
        }
      } else {
        incoming.id = uid('f_');
        for (const link of incoming.links) link.id = uid('l_');
        d.folders.push(incoming);
        f++;
        l += incoming.links.length;
      }
    }
    d.meta.onboarded = true;
  });
  return { f, l };
}

export function importJson(text, mode = 'merge') {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('invalid');
  }
  if (!raw || !Array.isArray(raw.folders)) throw new Error('invalid');
  const doc = migrate(raw);
  const res = importFolders(doc.folders, mode);
  if (mode === 'replace') {
    commit('settings', (d) => {
      d.settings = doc.settings;
      d.stats = doc.stats;
    }, { undo: false, type: 'settings' });
  }
  return res;
}

export function resetAll() {
  commit('reset', (d) => {
    d.folders = [];
    d.stats = {};
    d.meta.onboarded = true;
  });
}

export const stats = () => ({ folders: state.folders.length, links: countLinks(state) });
