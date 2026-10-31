import { readableOn } from '../core/colors.js';
import { findCustomTheme, baseThemeOf, themeVars } from '../core/themes.js';

const mq = matchMedia('(prefers-color-scheme: light)');
const BG_KEY = 'deskly-bg';
let current = null;

const BUILTIN = ['midnight', 'carbon', 'paper', 'ember', 'violet'];
let appliedVars = [];

export function resolveTheme(theme) {
  if (BUILTIN.includes(theme)) return theme;
  return mq.matches ? 'paper' : 'midnight';
}

const readBg = () => {
  try {
    return localStorage.getItem(BG_KEY) || '';
  } catch {
    return '';
  }
};

export const hasBackgroundImage = () => Boolean(readBg());

// Scala l'immagine scelta (max 1920px, JPEG) e la tiene in localStorage: lo leggono sia la nuova scheda sia il pannello.
export function setBackgroundImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try {
        localStorage.setItem(BG_KEY, c.toDataURL('image/jpeg', 0.78));
        if (current) applyTheme(current);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

export function clearBackgroundImage() {
  try {
    localStorage.removeItem(BG_KEY);
  } catch {}
  if (current) applyTheme(current);
}

export function applyTheme(settings) {
  current = settings;
  const root = document.documentElement;
  const d = root.dataset;
  const custom = findCustomTheme(settings);
  const theme = custom ? baseThemeOf(custom) : resolveTheme(settings.theme);
  const ink = readableOn(settings.accent);
  d.theme = theme;
  // Un tema personalizzato è un tema di base più i suoi colori, applicati come variabili sulla radice.
  appliedVars.forEach((k) => root.style.removeProperty(k));
  const vars = custom ? themeVars(custom) : {};
  appliedVars = Object.keys(vars);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  d.density = settings.density;
  d.radius = settings.radius;
  d.font = settings.font;
  d.hfont = settings.heroFont;
  d.card = settings.cardStyle;
  d.tile = settings.tileSize;
  d.width = settings.pageWidth;
  d.aurora = settings.auroraLevel;
  d.dim = settings.bgDim;
  d.grain = settings.grain ? 'on' : 'off';
  d.fx = settings.effects ? 'on' : 'off';
  if (settings.bgBlur) d.bgblur = '';
  else delete d.bgblur;
  const img = settings.bgStyle === 'image' ? readBg() : '';
  // Senza immagine caricata "Immagine" ripiega sull'aurora.
  d.bg = settings.bgStyle === 'image' && !img ? 'aurora' : settings.bgStyle;
  if (img) root.style.setProperty('--bg-image', `url("${img}")`);
  else root.style.removeProperty('--bg-image');
  root.style.setProperty('--accent', settings.accent);
  root.style.setProperty('--accent-ink', ink);
  document.body.dataset.layout = settings.newtabLayout;
  try {
    localStorage.setItem('deskly-boot', JSON.stringify({
      theme: custom ? theme : settings.theme, vars, accent: settings.accent, ink, density: settings.density, radius: settings.radius,
      font: settings.font, hfont: settings.heroFont, card: settings.cardStyle, tile: settings.tileSize, width: settings.pageWidth,
      aurora: settings.auroraLevel, dim: settings.bgDim, grain: settings.grain, fx: settings.effects, blur: settings.bgBlur, bg: d.bg,
    }));
  } catch {}
}

mq.addEventListener('change', () => {
  if (current && current.theme === 'auto') applyTheme(current);
});

// Colori per l'anteprima delle carte tema nelle impostazioni.
export const THEME_PREVIEW = {
  midnight: { bg: 'radial-gradient(90% 120% at 0% 0%, #6e56cf55, transparent 60%), #111113', surface: '#212225', line: '#3b3f45' },
  carbon: { bg: '#0c0c0d', surface: '#201f22', line: '#3c393f' },
  paper: { bg: '#f6f5f3', surface: '#ffffff', line: '#cfceca' },
  ember: { bg: 'radial-gradient(90% 120% at 0% 0%, #e8590c40, transparent 60%), #111110', surface: '#222221', line: '#43423e' },
  violet: { bg: 'radial-gradient(90% 120% at 0% 0%, #6e56cf88, transparent 60%), radial-gradient(80% 110% at 100% 100%, #d6409f44, transparent 60%), #14121f', surface: '#251f40', line: '#473876' },
};
