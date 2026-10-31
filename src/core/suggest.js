import { historyApi, topSitesApi, tabsApi } from './api.js';
import { CATALOG, findSite, categoryOf, bareHost } from './catalog.js';
import { norm } from './search.js';
import { hostOf } from './model.js';

// Suggerimenti di siti: unisce cronologia, siti più visitati, schede aperte e catalogo, come fa la barra di Chrome.
// Serve all'editor dei link ("terminal" -> panel.enjoyingteam.it/terminal) e alla ricerca.

const SKIP_HOST = /^(localhost|127\.|192\.168\.|10\.|accounts\.google\.|www\.google\.[a-z.]+$|google\.[a-z.]+$)/i;
const SKIP_URL = /^(chrome|chrome-extension|edge|about|devtools|view-source|file|blob|data):/i;
const SEARCH_PAGE = /(google\.[a-z.]+\/(search|url)|bing\.com\/search|duckduckgo\.com\/\?q|\/(login|logout|signin|oauth|auth|callback)\b)/i;

const key = (url) => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url;
  }
};

export const usable = (url) => {
  if (!/^https?:/i.test(url) || SKIP_URL.test(url)) return false;
  try {
    return !SKIP_HOST.test(new URL(url).hostname) && !SEARCH_PAGE.test(url);
  } catch {
    return false;
  }
};

// Titolo pulito: toglie i suffissi del tipo " - YouTube" quando il titolo resta sensato.
export function cleanTitle(title, url) {
  const t = (title || '').trim();
  const site = findSite(url);
  if (site && (!t || t.length > 60)) return site[1];
  if (!t) return hostOf(url).replace(/^www\./, '');
  return t.length > 70 ? `${t.slice(0, 68)}…` : t;
}

function score(c, tokens, now) {
  const title = norm(c.title);
  const host = norm(bareHost(c.url));
  const path = norm(c.url.replace(/^https?:\/\/[^/]+/i, ''));
  const hay = `${title} ${host} ${path}`;
  if (!tokens.every((tok) => hay.includes(tok))) return -1;
  let s = 0;
  for (const tok of tokens) {
    if (host.startsWith(tok) || host.split('.').some((p) => p.startsWith(tok))) s += 60;
    else if (title.split(/[\s\-–—|:/]+/).some((w) => w.startsWith(tok))) s += 40;
    else if (path.split(/[/?#=&_.-]+/).some((w) => w.startsWith(tok))) s += 36;
    else s += 12;
  }
  s += Math.min(40, Math.log2(1 + (c.visitCount || 0)) * 6);
  s += Math.min(24, (c.typedCount || 0) * 6);
  if (c.lastVisitTime) s += Math.max(0, 18 - (now - c.lastVisitTime) / 864e5 / 4);
  // Preferisci pagine "di primo livello" a quelle profonde, a parità di resto.
  s -= Math.min(10, (c.url.split('/').length - 3) * 2);
  if (c.src === 'catalog') s -= 6;
  return s;
}

// Restituisce [{ url, title, cat, src, folderUrlDup? }] ordinati per pertinenza.
export async function suggestSites(query, { limit = 6, exclude = () => false } = {}) {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const [hist, tops, tabs] = await Promise.all([
    historyApi.search(query.trim(), 80),
    topSitesApi.get(),
    tabsApi.inWindow().catch(() => []),
  ]);

  const pool = [
    ...hist.map((x) => ({ ...x, src: 'history' })),
    ...tops.map((x) => ({ ...x, visitCount: 25, src: 'top' })),
    ...tabs.map((x) => ({ ...x, visitCount: 12, src: 'tab' })),
    ...CATALOG.map((x) => ({ title: x.name, url: x.url, visitCount: 0, src: 'catalog' })),
  ].filter((c) => usable(c.url));

  const now = Date.now();
  const seen = new Map();
  for (const c of pool) {
    const s = score(c, tokens, now);
    if (s < 0) continue;
    const k = key(c.url);
    const prev = seen.get(k);
    if (!prev || s > prev.s) seen.set(k, { c, s });
  }
  // La stessa pagina del catalogo e della cronologia: tieni quella della cronologia (titolo reale).
  return [...seen.values()]
    .sort((a, b) => b.s - a.s)
    .map(({ c }) => ({
      url: c.url,
      title: cleanTitle(c.title, c.url),
      cat: categoryOf(c.url),
      src: c.src,
      exists: exclude(c.url),
    }))
    .slice(0, limit);
}

// Siti frequenti non ancora salvati: alimentano "Suggeriti per te" e l'importazione guidata.
export async function frequentSites({ exclude = () => false, limit = 60 } = {}) {
  const [hist, tops] = await Promise.all([historyApi.frequent(120), topSitesApi.get()]);
  const byHost = new Map();
  const bump = (c, boost = 0) => {
    if (!usable(c.url)) return;
    const host = bareHost(c.url);
    const known = findSite(c.url);
    const entry = byHost.get(host) || { host, url: '', title: '', visits: 0, best: 0, boost: 0 };
    entry.visits += c.visitCount || 0;
    entry.boost += boost;
    // L'indirizzo di riferimento è la pagina più visitata di quel sito (o la home del catalogo).
    if ((c.visitCount || 0) >= entry.best) {
      entry.best = c.visitCount || 0;
      entry.url = known ? known[3] || `https://${host}/` : c.url;
      entry.title = known ? known[1] : c.title;
    }
    byHost.set(host, entry);
  };
  hist.forEach((c) => bump(c));
  tops.forEach((c) => bump({ ...c, visitCount: 1 }, 60));
  return [...byHost.values()]
    .filter((e) => e.url && !exclude(e.url))
    .map((e) => ({ ...e, rank: Math.log2(1 + e.visits) * 10 + e.boost + (findSite(e.url) ? 10 : 0) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((e) => ({ url: e.url, title: cleanTitle(e.title, e.url), cat: categoryOf(e.url), visits: e.visits }));
}
