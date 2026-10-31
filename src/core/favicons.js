import { h } from './dom.js';
import { isExt, storage } from './api.js';

// Icone dei siti: nitide, con una cache locale e un piano B per quando Chrome non ha l'icona.
// Ordine: servizio Google a 128px (se acceso) → cache di Chrome (_favicon) → lettera.
// Le icone scelte restano in chrome.storage.local, così le volte dopo compaiono subito e anche offline.

const KEY = 'deskly-icons';
const TTL = 21 * 864e5;
const MISS_TTL = 6 * 36e5;
const MAX = 400;
const OUT = 96;
const PARALLEL = 6;

let remote = true;
let db = {};
let saveTimer = 0;
let globeSig = null;
const live = new Map();
const queue = [];
let running = 0;

export const configureIcons = (settings) => {
  remote = settings?.hiResIcons !== false;
};

export async function preloadIcons() {
  if (!isExt) return;
  try {
    const raw = await storage.get(KEY);
    if (raw && typeof raw === 'object') db = raw;
  } catch {}
}

const hostKey = (url) => {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.toLowerCase() : '';
  } catch {
    return '';
  }
};

const fresh = (e) => e && Date.now() - e.t < (e.x ? MISS_TTL : TTL);
const toEntry = (e) => ({ src: e.d, tone: e.tone || '' });

// Subito, senza rete: l'icona già scelta per questo sito, se c'è.
export function cachedIcon(url) {
  if (!isExt) return null;
  const e = db[hostKey(url)];
  return fresh(e) && e.d ? toEntry(e) : null;
}

export function loadIcon(url) {
  const host = hostKey(url);
  if (!host) return Promise.resolve(null);
  if (!isExt) return Promise.resolve({ src: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`, tone: '' });
  const hit = db[host];
  if (fresh(hit)) return Promise.resolve(hit.d ? toEntry(hit) : null);
  if (live.has(host)) return live.get(host);
  const p = new Promise((resolve) => {
    queue.push(async () => {
      try {
        resolve(await resolveIcon(url, host));
      } catch {
        resolve(null);
      }
    });
    pump();
  }).finally(() => live.delete(host));
  live.set(host, p);
  return p;
}

function pump() {
  while (running < PARALLEL && queue.length) {
    running++;
    queue.shift()().finally(() => {
      running--;
      pump();
    });
  }
}

async function resolveIcon(url, host) {
  let found = null;
  if (remote) found = await fromGoogle(url).catch(() => null);
  if (!found) found = await fromChrome(url).catch(() => null);
  db[host] = found ? { d: found.d, tone: found.tone, t: Date.now() } : { x: 1, t: Date.now() };
  scheduleSave();
  return found ? { src: found.d, tone: found.tone } : null;
}

async function fromGoogle(url) {
  const origin = new URL(url).origin;
  const r = await fetch(`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&nfrp=2&size=128&url=${encodeURIComponent(origin)}`, { credentials: 'omit' });
  if (!r.ok) return null;
  const blob = await r.blob();
  if (!blob.type.startsWith('image/')) return null;
  return pack(blob);
}

const chromeIconUrl = (pageUrl, size) => {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', String(size));
  return u.href;
};

async function fromChrome(url) {
  const r = await fetch(chromeIconUrl(url, 64));
  if (!r.ok) return null;
  const out = await pack(await r.blob());
  if (!out) return null;
  // Se il sito non ha un'icona salvata Chrome risponde con il mappamondo grigio: lo scartiamo.
  if (!globeSig) {
    try {
      const ref = await pack(await (await fetch(chromeIconUrl('https://deskly-no-icon.invalid/', 64))).blob());
      globeSig = ref?.sig || [];
    } catch {
      globeSig = [];
    }
  }
  if (globeSig.length && distance(globeSig, out.sig) < 6) return null;
  return out;
}

const distance = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

// Ridimensiona (mai ingrandisce), misura la luminosità e restituisce un PNG come data URL.
async function pack(blob) {
  const bmp = await createImageBitmap(blob);
  const w = bmp.width;
  const hh = bmp.height;
  if (!w || !hh) return null;
  const k = Math.min(1, OUT / Math.max(w, hh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(hh * k));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();

  const S = 8;
  const m = document.createElement('canvas');
  m.width = S;
  m.height = S;
  const mg = m.getContext('2d', { willReadFrequently: true });
  mg.drawImage(c, 0, 0, S, S);
  const px = mg.getImageData(0, 0, S, S).data;
  const sig = [];
  let alpha = 0;
  let lum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    const l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    sig.push(Math.round(px[i] * a), Math.round(px[i + 1] * a), Math.round(px[i + 2] * a), px[i + 3]);
    alpha += a;
    lum += l * a;
  }
  if (alpha / (S * S) < 0.03) return null;
  const mean = lum / alpha;
  return { d: c.toDataURL('image/png'), tone: mean > 0.82 ? 'light' : mean < 0.16 ? 'dark' : '', sig };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const keys = Object.keys(db);
    if (keys.length > MAX) {
      keys.sort((a, b) => db[a].t - db[b].t).slice(0, keys.length - MAX).forEach((k) => delete db[k]);
    }
    try {
      await storage.set(KEY, db);
    } catch {}
  }, 1500);
}

// Piccola <img> per elenchi e suggerimenti: compare appena l'icona è pronta.
export function iconImg(url, { size = 18, cls = '' } = {}) {
  const img = h('img', { class: `siteico ${cls}`.trim(), width: size, height: size, alt: '', decoding: 'async', draggable: false });
  const hit = cachedIcon(url);
  if (hit) {
    img.src = hit.src;
    return img;
  }
  img.classList.add('is-empty');
  loadIcon(url).then((e) => {
    if (!e) return;
    img.src = e.src;
    img.classList.remove('is-empty');
    if (e.tone) img.dataset.tone = e.tone;
  });
  return img;
}
