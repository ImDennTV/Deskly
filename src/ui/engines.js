// Motori di ricerca web: nome, indirizzo di ricerca e piccolo logo.
export const ENGINES = {
  chrome: { name: 'Chrome', url: null },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  brave: { name: 'Brave', url: 'https://search.brave.com/search?q=%s' },
  youtube: { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
};

export const ENGINE_IDS = Object.keys(ENGINES);

export function searchUrl(id, query) {
  const e = ENGINES[id]?.url ? ENGINES[id] : ENGINES.google;
  return e.url.replace('%s', encodeURIComponent(query.trim()));
}

// "AI Mode" è una funzione di Google: ha senso solo con Google o con il motore di Chrome.
export const hasAiMode = (id) => id === 'google' || id === 'chrome';
export const aiModeUrl = (query) => `https://www.google.com/search?q=${encodeURIComponent(query.trim())}&udm=50`;

const SVG_NS ='http://www.w3.org/2000/svg';

const MARKS = {
  chrome: '<path fill="#EA4335" d="M24 24L4.95 13A22 22 0 0 1 43.05 13Z"/><path fill="#FBBC04" d="M24 24L43.05 13A22 22 0 0 1 24 46Z"/><path fill="#34A853" d="M24 24L24 46A22 22 0 0 1 4.95 13Z"/><circle cx="24" cy="24" r="10.5" fill="#fff"/><circle cx="24" cy="24" r="8" fill="#4285F4"/>',
  google: '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>',
  duckduckgo: '<circle cx="24" cy="24" r="24" fill="#DE5833"/><text x="24" y="33" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="28" font-weight="700" fill="#fff">D</text>',
  bing: '<rect width="48" height="48" rx="12" fill="#0C8484"/><text x="24" y="34" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="30" font-weight="700" fill="#fff">b</text>',
  brave: '<rect width="48" height="48" rx="12" fill="#FB542B"/><text x="24" y="34" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="28" font-weight="700" fill="#fff">B</text>',
  youtube: '<rect y="9" width="48" height="30" rx="9" fill="#FF0033"/><path fill="#fff" d="M20 17.5v13l11-6.5z"/>',
};

export function engineMark(id, size = 18) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ico engine-mark');
  svg.innerHTML = MARKS[id] || MARKS.google;
  return svg;
}
