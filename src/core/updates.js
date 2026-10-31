// Controllo aggiornamenti: una volta al giorno legge l'ultima release pubblica su GitHub. Non invia dati.
// Si ferma da solo se l'estensione arriva dal Chrome Web Store (si aggiorna già da sola).

import { isExt, storage, extVersion } from './api.js';

export const REPO = 'ImDennTV/Deskly';
const KEY = 'deskly-update';
const DAY = 24 * 60 * 60 * 1000;

// Confronta "1.10.0" con "1.9.2" numero per numero.
export function isNewer(latest, current) {
  const a = String(latest).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const b = String(current).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

async function fromStore() {
  if (!isExt || !chrome.management?.getSelf) return false;
  try {
    return (await chrome.management.getSelf()).installType === 'normal';
  } catch {
    return false;
  }
}

async function fetchLatest() {
  if (!isExt) {
    // Anteprima locale: niente rete, si simula con localStorage 'deskly-fake-update' = "1.9.0".
    const fake = localStorage.getItem('deskly-fake-update');
    return fake ? { version: fake, page: `https://github.com/${REPO}/releases/latest`, zip: '' } : null;
  }
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`github ${r.status}`);
  const rel = await r.json();
  const zip = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
  return { version: String(rel.tag_name || '').replace(/^v/i, ''), page: rel.html_url, zip: zip ? zip.browser_download_url : '' };
}

// Ritorna { version, page, zip } se esiste una versione più nuova, altrimenti null. Usa la cache di un giorno.
export async function checkForUpdate(settings, { force = false } = {}) {
  if (!settings.updateCheck || (await fromStore())) return null;
  let cache = (await storage.get(KEY)) || null;
  if (force || !cache || Date.now() - (cache.at || 0) > DAY) {
    try {
      const latest = await fetchLatest();
      cache = { at: Date.now(), latest };
      await storage.set(KEY, cache);
    } catch {
      return null;
    }
  }
  const latest = cache && cache.latest;
  return latest && latest.version && isNewer(latest.version, extVersion()) ? latest : null;
}
