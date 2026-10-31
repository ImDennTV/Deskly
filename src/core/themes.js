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
  { id: 'tokyo', name: 'Tokyo', mode: 'dark', bg: '#1a1b26', surface: '#24283b', text: '#c0caf5', accent: '#7aa2f7' },
  { id: 'mocha', name: 'Mocha', mode: 'dark', bg: '#1e1e2e', surface: '#313244', text: '#cdd6f4', accent: '#cba6f7' },
  { id: 'gruvbox', name: 'Gruvbox', mode: 'dark', bg: '#282828', surface: '#3c3836', text: '#ebdbb2', accent: '#fabd2f' },
  { id: 'solar-dark', name: 'Solarized', mode: 'dark', bg: '#002b36', surface: '#073642', text: '#eee8d5', accent: '#2aa198' },
  { id: 'monokai', name: 'Monokai', mode: 'dark', bg: '#272822', surface: '#3e3d32', text: '#f8f8f2', accent: '#a6e22e' },
  { id: 'synthwave', name: 'Synthwave', mode: 'dark', bg: '#1a1033', surface: '#2a1b4d', text: '#f4e9ff', accent: '#ff4fd8' },
  { id: 'cyber', name: 'Cyber', mode: 'dark', bg: '#0b0f1a', surface: '#151b2e', text: '#eaf2ff', accent: '#fcee0a' },
  { id: 'crimson', name: 'Crimson', mode: 'dark', bg: '#190a0e', surface: '#2a1218', text: '#fbe9ec', accent: '#ff4560' },
  { id: 'sunset', name: 'Tramonto', mode: 'dark', bg: '#1f1020', surface: '#34172c', text: '#ffeede', accent: '#ff8a3d' },
  { id: 'amber', name: 'Ambra', mode: 'dark', bg: '#17120a', surface: '#261d0e', text: '#fff3dc', accent: '#ffb020' },
  { id: 'grape', name: 'Uva', mode: 'dark', bg: '#150b1f', surface: '#231234', text: '#f1e6ff', accent: '#b667ff' },
  { id: 'aqua', name: 'Acqua', mode: 'dark', bg: '#07191b', surface: '#0e2b2e', text: '#def7f5', accent: '#2dd4bf' },
  { id: 'lime', name: 'Lime', mode: 'dark', bg: '#0f1405', surface: '#1a2409', text: '#eef8d8', accent: '#a3e635' },
  { id: 'blueberry', name: 'Mirtillo', mode: 'dark', bg: '#0b1030', surface: '#141c4a', text: '#e6e9ff', accent: '#6c7bff' },
  { id: 'candy', name: 'Candy', mode: 'dark', bg: '#1f0f1c', surface: '#331a2d', text: '#ffe6f6', accent: '#ff6ec7' },
  { id: 'coral', name: 'Corallo', mode: 'dark', bg: '#0b1c24', surface: '#12303d', text: '#e6f6fb', accent: '#ff7a66' },
  { id: 'volcano', name: 'Vulcano', mode: 'dark', bg: '#1a0a05', surface: '#2e1409', text: '#ffeadf', accent: '#ff5722' },
  { id: 'gold', name: 'Oro', mode: 'dark', bg: '#0a0a0a', surface: '#171512', text: '#f5efe0', accent: '#d4af37' },
  { id: 'matrix', name: 'Matrix', mode: 'dark', bg: '#020a04', surface: '#08170b', text: '#d6ffe0', accent: '#00ff66' },
  { id: 'graphite', name: 'Grafite', mode: 'dark', bg: '#121212', surface: '#1e1e1e', text: '#ececec', accent: '#9ca3af' },
  { id: 'sand', name: 'Sabbia', mode: 'light', bg: '#f4ecdd', surface: '#fffaf0', text: '#3a3226', accent: '#c2410c' },
  { id: 'sakura', name: 'Sakura', mode: 'light', bg: '#fbf1f3', surface: '#ffffff', text: '#3b2a30', accent: '#e5487b' },
  { id: 'mint', name: 'Menta', mode: 'light', bg: '#eef7f2', surface: '#ffffff', text: '#1d2f27', accent: '#16a06a' },
  { id: 'solar-light', name: 'Solar Day', mode: 'light', bg: '#fdf6e3', surface: '#fffdf5', text: '#3f5660', accent: '#268bd2' },
  { id: 'lavender', name: 'Lavanda', mode: 'light', bg: '#f2effb', surface: '#ffffff', text: '#2b2640', accent: '#7c5cff' },
  { id: 'peach', name: 'Pesca', mode: 'light', bg: '#fff1e8', surface: '#ffffff', text: '#3d2a22', accent: '#e8590c' },
  { id: 'sky', name: 'Cielo', mode: 'light', bg: '#eaf4ff', surface: '#ffffff', text: '#1b2a3d', accent: '#1677e0' },
  { id: 'lemon', name: 'Limone', mode: 'light', bg: '#fffbe0', surface: '#ffffff', text: '#36310f', accent: '#b07d00' },
  { id: 'bubblegum', name: 'Pop', mode: 'light', bg: '#ffeaf5', surface: '#ffffff', text: '#40203a', accent: '#e11d8c' },
  { id: 'poppy', name: 'Papavero', mode: 'light', bg: '#ffeceb', surface: '#ffffff', text: '#40201e', accent: '#e5392e' },
  { id: 'spring', name: 'Primavera', mode: 'light', bg: '#f0fbe8', surface: '#ffffff', text: '#1f3317', accent: '#3a9a0c' },
  { id: 'ice', name: 'Ghiaccio', mode: 'light', bg: '#eef9fb', surface: '#ffffff', text: '#12333b', accent: '#0a8a9c' },
  { id: 'wine', name: 'Vino', mode: 'light', bg: '#f9eeee', surface: '#ffffff', text: '#3a1f22', accent: '#b0303c' },
  { id: 'orchid', name: 'Orchidea', mode: 'light', bg: '#f6ecfb', surface: '#ffffff', text: '#36154a', accent: '#a21caf' },
  { id: 'slate', name: 'Ardesia', mode: 'light', bg: '#eef1f5', surface: '#ffffff', text: '#1f2937', accent: '#3b82f6' },
];

export const PRESET_PREFIX = 'preset:';
export const isPresetTheme = (theme) => typeof theme === 'string' && theme.startsWith(PRESET_PREFIX);
export const findPreset = (settings) => (isPresetTheme(settings?.theme) ? THEME_PRESETS.find((p) => PRESET_PREFIX + p.id === settings.theme) || null : null);

export const isCustomTheme = (theme) => typeof theme === 'string' && theme.startsWith(CUSTOM_PREFIX);

export const findCustomTheme = (settings) =>
  isCustomTheme(settings?.theme) ? (settings.customThemes || []).find((c) => CUSTOM_PREFIX + c.id === settings.theme) || null : null;

// I colori del tema scelto: i suoi se è personalizzato, quelli del modello se è un modello.
export const findThemeColors = (settings) => findCustomTheme(settings) || findPreset(settings);

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
