export const FOLDER_COLORS = [
  { id: 'violet', hex: '#8b7cf6' },
  { id: 'indigo', hex: '#6b8cff' },
  { id: 'blue', hex: '#3b9cf5' },
  { id: 'cyan', hex: '#22b8cf' },
  { id: 'teal', hex: '#20c0a0' },
  { id: 'green', hex: '#4cc16a' },
  { id: 'lime', hex: '#a3cf3c' },
  { id: 'yellow', hex: '#f0b429' },
  { id: 'orange', hex: '#f5873b' },
  { id: 'red', hex: '#ef5b5b' },
  { id: 'pink', hex: '#ec5f9c' },
  { id: 'slate', hex: '#8794a8' },
];

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '');
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isHex(v) {
  return Boolean(hexToRgb(v));
}

export function normalizeHex(v, fallback = '#8b7cf6') {
  const rgb = hexToRgb(v);
  if (!rgb) return fallback;
  return '#' + rgb.map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [0, 0, 0];
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

// Chrome offre solo 9 colori per i gruppi: scelgo per tonalità, più fedele della distanza RGB.
const GROUP_HUES = [
  [15, 'red'],
  [40, 'orange'],
  [68, 'yellow'],
  [165, 'green'],
  [195, 'cyan'],
  [235, 'blue'],
  [290, 'purple'],
  [345, 'pink'],
];

export function chromeGroupColor(hex) {
  const [h, s] = hexToHsl(hex);
  if (s < 0.18) return 'grey';
  for (const [limit, name] of GROUP_HUES) if (h < limit) return name;
  return 'red';
}

export function luminance(hex) {
  const rgb = hexToRgb(hex) || [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(hex) {
  return luminance(hex) > 0.38 ? '#14151f' : '#ffffff';
}

const TAG_PRESETS = {
  prod: '#ef5b5b',
  production: '#ef5b5b',
  live: '#ef5b5b',
  staging: '#f0b429',
  stage: '#f0b429',
  test: '#3b9cf5',
  dev: '#4cc16a',
  local: '#4cc16a',
};

export function tagColor(text) {
  const key = String(text || '').trim().toLowerCase();
  if (TAG_PRESETS[key]) return TAG_PRESETS[key];
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FOLDER_COLORS[hash % FOLDER_COLORS.length].hex;
}

export const TAG_SUGGESTIONS = ['prod', 'staging', 'dev', 'test'];
