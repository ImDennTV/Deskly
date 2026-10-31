import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

// Mini schemi delle opzioni di impostazione: ogni carta mostra com'è fatta la scelta prima di farla.
const rep = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const cell = () => h('div', null, h('i'), h('b'));
const row = () => h('div', null, h('i'), h('b'));
const pv = (cls, ...kids) => h('div', { class: `pv ${cls}`, 'aria-hidden': 'true' }, ...kids);

const BUILD = {
  layout: {
    grid: () => pv('pv--tiles', rep(8, cell)),
    icons: () => pv('pv--icons', rep(10, () => h('i'))),
    list: () => pv('pv--rows', rep(4, row)),
    compact: () => pv('pv--rows pv--rows2', rep(8, row)),
  },
  card: {
    solid: () => pv('pv--card pv--solid', h('div', null, h('b'), h('b'))),
    outline: () => pv('pv--card pv--outline', h('div', null, h('b'), h('b'))),
    tinted: () => pv('pv--card pv--tinted', h('div', null, h('b', { class: 'a' }), h('b'))),
  },
  shape: {
    rounded: () => pv('pv--shape pv--rounded', rep(3, () => h('i'))),
    circle: () => pv('pv--shape pv--circle', rep(3, () => h('i'))),
    square: () => pv('pv--shape pv--square', rep(3, () => h('i'))),
  },
  width: {
    narrow: () => pv('pv--frame', h('div', { style: { width: '52%' } }, h('i'))),
    normal: () => pv('pv--frame', h('div', { style: { width: '74%' } }, h('i'))),
    wide: () => pv('pv--frame', h('div', { style: { width: '96%' } }, h('i'))),
  },
  size: {
    small: () => pv('pv--sz', rep(3, () => h('div', null, h('i', { style: { width: '9px', height: '9px' } }), h('b', { style: { width: '9px' } })))),
    medium: () => pv('pv--sz', rep(3, () => h('div', null, h('i', { style: { width: '13px', height: '13px' } }), h('b', { style: { width: '13px' } })))),
    large: () => pv('pv--sz', rep(3, () => h('div', null, h('i', { style: { width: '18px', height: '18px' } }), h('b', { style: { width: '18px' } })))),
  },
  cols: {
    auto: () => pv('pv--cols', rep(3, () => h('i'))),
    1: () => pv('pv--cols', rep(1, () => h('i'))),
    2: () => pv('pv--cols', rep(2, () => h('i'))),
    3: () => pv('pv--cols', rep(3, () => h('i'))),
    4: () => pv('pv--cols', rep(4, () => h('i'))),
  },
  sort: {
    manual: () => pv('pv--grip', rep(6, () => h('i'))),
    name: () => pv('pv--text', 'A → Z'),
    size: () => pv('pv--text', '9 → 1'),
    used: () => pv('pv--sort', [100, 70, 44].map((w) => h('b', { style: { width: `${w}%` } }))),
    recent: () => pv('pv--sort', [100, 72, 46].map((w, i) => h('b', { style: { width: '88%', opacity: String(1 - i * 0.32) } }))),
  },
  fold: {
    few: () => pv('pv--icons', rep(5, () => h('i'))),
    normal: () => pv('pv--icons', rep(10, () => h('i'))),
    all: () => pv('pv--icons', rep(15, () => h('i'))),
  },
};

// Gruppo di carte con anteprima. `kind` sceglie lo schema; `opts` sono coppie [valore, chiave i18n].
export function previewPicker({ kind, value, opts, title, desc, onPick }) {
  const build = BUILD[kind];
  return h('div', { class: 'setrow setrow--stack' },
    h('div', { class: 'setrow__text' }, h('span', { class: 't' }, title), desc ? h('span', { class: 'd' }, desc) : null),
    h('div', { class: `pvgrid${opts.length === 5 ? ' pvgrid--5' : ''}`, role: 'group', 'aria-label': title },
      opts.map(([val, key]) => h('button', {
        class: 'pvcard', type: 'button', 'aria-pressed': String(val) === String(value) ? 'true' : 'false',
        onclick: () => onPick(val),
      }, build[val](), h('span', null, t(key))))),
  );
}
