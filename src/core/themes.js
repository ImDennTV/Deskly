import { isHex, normalizeHex } from './colors.js';

// Temi personalizzati: bastano 4 colori (sfondo, schede, testo, accento) e il modo chiaro/scuro.
// Tutte le altre tinte (bordi, campi, testo secondario, ombre) si ricavano mescolando questi colori.

export const MAX_CUSTOM_THEMES = 12;
export const CUSTOM_PREFIX = 'custom:';

export const THEME_PRESETS = [
  { id: 'nord', name: 'Nord', mode: 'dark', bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0' },
  { id: 'dracula', name: 'Dracula', mode: 'dark', bg: '#1e1f29', surface: '#282a36', text: '#f8f8f2', accent: '#bd93f9' },
  { id: 'rose', name: 'Rosé', mode: 'dark', bg: '#191724', surface: '#1f1d2e', text: '#e0def4', accent: '#ebbcba' },
  { id: 'forest', name: 'Foresta', mode: 'dark', bg: '#0e1a14', surface: '#15251c', text: '#e4f1e8', accent: '#3dd68c' },
  { id: 'ocean', name: 'Oceano', mode: 'dark', bg: '#0a1522', surface: '#10233a', text: '#e3eefb', accent: '#38b6ff' },
  { id: 'sand', name: 'Sabbia', mode: 'light', bg: '#f4ecdd', surface: '#fffaf0', text: '#3a3226', accent: '#c2410c' },
  { id: 'sakura', name: 'Sakura', mode: 'light', bg: '#fbf1f3', surface: '#ffffff', text: '#3b2a30', accent: '#e5487b' },
  { id: 'mint', name: 'Menta', mode: 'light', bg: '#eef7f2', surface: '#ffffff', text: '#1d2f27', accent: '#16a06a' },
];

export const isCustomTheme = (theme) => typeof theme === 'string' && theme.startsWith(CUSTOM_PREFIX);

export const findCustomTheme = (settings) =>
  isCustomTheme(settings?.theme) ? (settings.customThemes || []).find((c) => CUSTOM_PREFIX + c.id === settings.theme) || null : null;

const newId = () => {
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  return 't' + [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
};

export function sanitizeCustomThemes(list) {
  const out = [];
  const seen = new Set();
  for (const r of (Array.isArray(list) ? list : []).slice(0, MAX_CUSTOM_THEMES)) {
    if (!r || typeof r !== 'object' || ![r.bg, r.surface, r.text, r.accent].every(isHex)) continue;
    let id = typeof r.id === 'string' ? r.id.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) : '';
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    out.push({
      id,
      name: (typeof r.name === 'string' ? r.name.trim().slice(0, 24) : '') || 'Tema',
      mode: r.mode === 'light' ? 'light' : 'dark',
      bg: normalizeHex(r.bg),
      surface: normalizeHex(r.surface),
      text: normalizeHex(r.text),
      accent: normalizeHex(r.accent),
    });
  }
  return out;
}

export const newTheme = (base) => ({ ...base, id: newId() });

// Variabili CSS da applicare alla radice. Il tema "base" (midnight o paper) fornisce ombre e dettagli.
export function themeVars(c) {
  const light = c.mode === 'light';
  const mix = (a, b, p) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
  return {
    '--bg': c.bg,
    '--surface': c.surface,
    '--surface-2': mix(c.text, c.surface, light ? 5 : 7),
    '--surface-3': mix(c.text, c.surface, light ? 9 : 12),
    '--pop': `color-mix(in srgb, ${c.surface} 97%, transparent)`,
    '--line': mix(c.text, c.surface, light ? 11 : 10),
    '--line-strong': mix(c.text, c.surface, light ? 20 : 20),
    '--edge': light ? '#ffffff' : mix(c.text, c.surface, 14),
    '--glass': `linear-gradient(180deg, ${mix(c.text, c.surface, light ? 0 : 5)}, ${c.surface})`,
    '--field': mix(c.surface, c.bg, light ? 100 : 55),
    '--text': c.text,
    '--text-2': mix(c.text, c.bg, 74),
    '--text-3': mix(c.text, c.bg, 52),
    '--tone': light ? '#000' : '#fff',
    '--fav-bg': light ? '#ffffff' : 'rgb(255 255 255 / 0.94)',
    '--aurora-b': mix(c.accent, c.text, 55),
    '--aurora-c': mix(c.accent, c.bg, 35),
    '--scrim': light ? `color-mix(in srgb, ${c.text} 34%, transparent)` : 'rgb(0 0 0 / 0.62)',
    'color-scheme': light ? 'light' : 'dark',
  };
}

export const baseThemeOf = (c) => (c.mode === 'light' ? 'paper' : 'midnight');
