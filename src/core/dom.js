import { ICONS, BRANDS, ICON_GROUPS } from './icons.data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.length > 2 && k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'for') el.htmlFor = v;
      else if (k.includes('-') || k === 'role' || k === 'list' || k === 'form') el.setAttribute(k, v === true ? '' : v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function mount(el, ...children) {
  clear(el);
  append(el, children);
  return el;
}

export function icon(name, { size = 16, stroke = 1.75, cls = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ico ${cls}`.trim());
  if (BRANDS[name]) {
    svg.setAttribute('fill', 'currentColor');
    svg.innerHTML = `<path d="${BRANDS[name]}"/>`;
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', stroke);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = ICONS[name] || ICONS.folder;
  }
  return svg;
}

export const hasIcon = (name) => Boolean(ICONS[name] || BRANDS[name]);
export { ICON_GROUPS };

export function debounce(fn, ms = 120) {
  let t;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  d.cancel = () => clearTimeout(t);
  return d;
}

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = isMac ? '⌘' : 'Ctrl';
