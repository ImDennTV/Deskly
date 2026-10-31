// Trova nella home di un sito le icone dichiarate (<link rel="icon|apple-touch-icon">) e nel suo manifest.
// Solo testo: niente DOM, cosi si puo provare anche fuori dal browser.

const LINK = /<link\b[^>]*>/gi;
const ATTR = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const VECTOR = 512;

const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(ATTR)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
};

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#38;/g, '&');

const absolute = (href, base) => {
  try {
    const u = new URL(decode(href.trim()), base);
    const web = u.protocol === 'http:' || u.protocol === 'https:';
    return web || (u.protocol === 'data:' && u.href.startsWith('data:image/')) ? u.href : '';
  } catch {
    return '';
  }
};

// "180x180 32x32" → 180; "any" o SVG → grande a piacere.
export function sizeScore(sizes, href, type, fallback) {
  const s = String(sizes || '').toLowerCase();
  if (s.includes('any') || /\.svg(\?|#|$)/i.test(href) || /svg/i.test(type || '') || /^data:image\/svg/i.test(href)) return VECTOR;
  let best = 0;
  for (const m of s.matchAll(/(\d+)\s*x\s*(\d+)/g)) best = Math.max(best, Math.min(+m[1], +m[2]));
  return best || fallback;
}

export function parseIconLinks(html, base) {
  const list = [];
  let manifest = '';
  for (const tag of String(html).match(LINK) || []) {
    const a = attrs(tag);
    const rel = (a.rel || '').toLowerCase().split(/\s+/);
    if (!a.href) continue;
    if (rel.includes('manifest')) {
      manifest = absolute(a.href, base);
      continue;
    }
    if (rel.includes('mask-icon')) continue;
    const apple = rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed');
    if (!apple && !rel.includes('icon')) continue;
    const href = absolute(a.href, base);
    if (!href) continue;
    list.push({ href, score: sizeScore(a.sizes, href, a.type, apple ? 180 : 32), apple });
  }
  return { list, manifest };
}

export function parseManifestIcons(json, base) {
  const out = [];
  const icons = Array.isArray(json?.icons) ? json.icons : [];
  for (const i of icons) {
    if (!i || typeof i.src !== 'string') continue;
    // Le icone "maskable" hanno un margine di sicurezza enorme: meglio le altre.
    if (/maskable/i.test(String(i.purpose || '')) && !/any/i.test(String(i.purpose))) continue;
    const href = absolute(i.src, base);
    if (href) out.push({ href, score: sizeScore(i.sizes, href, i.type, 64), apple: false });
  }
  return out;
}

// Dal migliore al peggiore, senza doppioni; a parita preferisce apple-touch-icon.
export function rankIcons(list) {
  const seen = new Set();
  return list
    .filter((c) => (seen.has(c.href) ? false : seen.add(c.href)))
    .sort((a, b) => b.score - a.score || Number(b.apple) - Number(a.apple));
}
