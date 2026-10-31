import { h, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function logo(size = 22) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('class', 'logo');
  svg.setAttribute('aria-hidden', 'true');
  const rect = (x, y, w, o) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w);
    r.setAttribute('height', w);
    r.setAttribute('rx', 2.4);
    r.setAttribute('fill', 'var(--accent)');
    r.setAttribute('opacity', o);
    return r;
  };
  svg.append(rect(3, 3, 8, 1), rect(13, 3, 8, 0.55), rect(3, 13, 8, 0.55), rect(13, 13, 8, 0.85));
  return svg;
}

// Toast con azione opzionale (es. Annulla).
let toastHost;
export function toast(message, { action, timeout = 5000 } = {}) {
  if (!toastHost) {
    toastHost = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const el = h('div', { class: 'toast' }, h('span', null, message));
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 200);
  };
  if (action) {
    el.append(
      h('button', { type: 'button', onclick: () => { action.run(); dismiss(); } }, action.label),
    );
  }
  toastHost.replaceChildren(el);
  timer = setTimeout(dismiss, timeout);
  return dismiss;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog con focus trap. In pannello è un bottom sheet, nella nuova scheda un dialog centrato (CSS).
export function modal({ title, body, footer, onClose, labelledBy = 'modal-title' }) {
  const prev = document.activeElement;
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    if (prev && prev.isConnected) prev.focus();
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  const box = h(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': labelledBy },
    h('div', { class: 'modal__head' },
      h('h2', { id: labelledBy }, title),
      h('button', { class: 'ibtn', type: 'button', 'aria-label': t('common.close'), onclick: close }, icon('x', { size: 16 })),
    ),
    h('div', { class: 'modal__body' }, body),
    footer ? h('div', { class: 'modal__foot' }, footer) : null,
  );
  const scrim = h('div', { class: 'scrim', onmousedown: (e) => { if (e.target === scrim) close(); } }, box);
  document.body.append(scrim);
  document.addEventListener('keydown', onKey, true);
  const first = box.querySelector('[autofocus], input, select, textarea');
  (first || box.querySelector(FOCUSABLE))?.focus();
  return { close, el: box };
}

export function confirmDialog({ title, message, confirmLabel, danger = true }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = modal({
      title,
      body: h('p', { class: 'muted' }, message),
      footer: [
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => m.close() }, t('common.cancel')),
        h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button', onclick: () => { finish(true); m.close(); } }, confirmLabel || t('common.done')),
      ],
      onClose: () => finish(false),
    });
  });
}

// Menu popover ancorato a un elemento o a un punto {x, y}.
// item: { label, icon, onClick, danger, meta, dot, disabled } | { sep: true } | { heading: 'testo' }
let openMenu;
export function closeMenu() {
  openMenu?.();
}

export function menu(anchor, items) {
  closeMenu();
  const prev = document.activeElement;
  const el = h('div', { class: 'menu', role: 'menu' });
  for (const it of items) {
    if (!it) continue;
    if (it.sep) el.append(h('div', { class: 'menu__sep', role: 'separator' }));
    else if (it.heading) el.append(h('div', { class: 'menu__label' }, it.heading));
    else {
      el.append(
        h('button', {
          class: `menu__item${it.danger ? ' is-danger' : ''}`,
          type: 'button',
          role: 'menuitem',
          disabled: it.disabled,
          onclick: () => { close(false); it.onClick?.(); },
        },
          it.dot ? h('span', { class: 'dot', style: { '--c': it.dot } }) : it.icon ? icon(it.icon, { size: 16, cls: 'ico' }) : null,
          h('span', { class: 'grow' }, h('span', { class: 'truncate' }, it.label), it.meta ? h('span', { class: 'meta truncate' }, it.meta) : null),
          it.check ? icon('check', { size: 15, cls: 'ico menu__check' }) : null,
        ),
      );
    }
  }
  document.body.append(el);
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
  const mw = el.offsetWidth;
  const mh = el.offsetHeight;
  let x = Math.min(r.right - mw, innerWidth - mw - 8);
  if (!anchor.getBoundingClientRect) x = Math.min(r.left, innerWidth - mw - 8);
  x = Math.max(8, x);
  let y = r.bottom + 6;
  if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  const entries = () => [...el.querySelectorAll('.menu__item:not([disabled])')];
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = entries();
      const i = list.indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? i + 1 : i - 1;
      list[(n + list.length) % list.length]?.focus();
    }
  };
  const onDown = (e) => { if (!el.contains(e.target)) close(false); };
  function close(restore) {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onDown, true);
    removeEventListener('blur', onBlur);
    removeEventListener('resize', onBlur);
    el.remove();
    openMenu = null;
    if (restore && prev?.isConnected) prev.focus();
  }
  const onBlur = () => close(false);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('mousedown', onDown, true);
  addEventListener('blur', onBlur);
  addEventListener('resize', onBlur);
  openMenu = () => close(false);
  entries()[0]?.focus();
  return close;
}
