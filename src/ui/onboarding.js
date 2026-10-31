import { h, icon, modKey } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { STARTER_PACKS } from '../core/model.js';
import { logo } from './kit.js';

// Prima apertura: scegli da dove partire. Un solo passaggio, niente moduli.
export function renderOnboarding({ onStart, onImport, onSmart }) {
  const picked = new Set(['work', 'dev']);
  const startBtn = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => onStart([...picked]) });
  const hint = h('span', { class: 'sub' });

  const sync = () => {
    startBtn.textContent = picked.size ? t('onb.start') : t('onb.empty');
    hint.textContent = picked.size ? t('onb.selected', { n: picked.size }) : '';
    grid.querySelectorAll('.pack').forEach((el) => el.setAttribute('aria-pressed', picked.has(el.dataset.id) ? 'true' : 'false'));
  };

  const grid = h('div', { class: 'packs' }, STARTER_PACKS.map((p) => h('button', {
    class: 'pack', type: 'button', dataset: { id: p.id }, style: { '--fc': p.color }, 'aria-pressed': 'false',
    onclick: () => { picked.has(p.id) ? picked.delete(p.id) : picked.add(p.id); sync(); },
  },
    h('span', { class: 'tile' }, icon(p.icon, { size: 16 })),
    h('span', null, h('div', { class: 'name' }, t(`pack.${p.id}`)), h('div', { class: 'meta' }, t('folder.links', { n: p.links.length }))),
  )));

  const el = h('div', { class: 'onb' },
    h('div', { class: 'onb__head' },
      logo(40),
      h('h1', null, t('onb.welcome')),
      h('p', null, t('onb.sub')),
    ),
    h('div', { class: 'section' },
      h('div', { class: 'section__title' }, t('onb.pick')),
      h('p', { class: 'sub' }, t('onb.pickHint')),
    ),
    grid,
    h('div', { class: 'onb__foot' },
      startBtn,
      onSmart ? h('button', { class: 'btn', type: 'button', onclick: onSmart }, icon('sparkles', { size: 15 }), t('onb.smart')) : null,
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: onImport }, icon('bookmark', { size: 15 }), t('onb.import')),
      h('span', { class: 'spacer' }),
      hint,
    ),
    h('p', { class: 'sub' }, t('onb.tip', { key: `${modKey} K` })),
  );
  sync();
  return el;
}
