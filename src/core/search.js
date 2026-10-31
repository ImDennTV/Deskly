import { allLinks, hostOf } from './model.js';

export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isBoundary = (text, i) => i === 0 || /[\s\-_./:@]/.test(text[i - 1]);

// Punteggio 0 = nessuna corrispondenza. Sottostringa batte sequenza sparsa; inizio parola e inizio testo pesano di più.
export function fuzzy(q, text) {
  if (!q || !text) return 0;
  const at = text.indexOf(q);
  if (at >= 0) {
    return 100 + (at === 0 ? 40 : isBoundary(text, at) ? 25 : 0) + (q.length / text.length) * 20 - Math.min(at, 20) * 0.5;
  }
  if (q.length < 3) return 0;
  let score = 10;
  let ti = 0;
  let prev = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const found = text.indexOf(q[qi], ti);
    if (found < 0) return 0;
    if (found === prev + 1) score += 6;
    else if (isBoundary(text, found)) score += 4;
    else score += 1;
    prev = found;
    ti = found + 1;
  }
  return score - (text.length - q.length) * 0.1;
}

const W = { title: 1, host: 0.8, folder: 0.6, tag: 0.6, note: 0.4 };

export function search(doc, query, { limit = 30 } = {}) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const results = [];

  for (const { link, folder } of allLinks(doc)) {
    const fields = {
      title: norm(link.title),
      host: norm(hostOf(link.url)),
      folder: norm(folder.name),
      tag: norm(link.tag),
      note: norm(link.note),
    };
    let total = 0;
    let ok = true;
    for (const tok of tokens) {
      let best = 0;
      for (const [k, v] of Object.entries(fields)) best = Math.max(best, fuzzy(tok, v) * W[k]);
      if (!best) {
        ok = false;
        break;
      }
      total += best;
    }
    if (!ok) continue;
    const st = doc.stats[link.id];
    total += (link.fav ? 6 : 0) + (st ? Math.log(1 + st.n) * 3 : 0);
    results.push({ type: 'link', link, folder, score: total });
  }

  for (const folder of doc.folders) {
    const name = norm(folder.name);
    let total = 0;
    let ok = true;
    for (const tok of tokens) {
      const s = fuzzy(tok, name);
      if (!s) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) results.push({ type: 'folder', folder, score: total * 0.9 });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
