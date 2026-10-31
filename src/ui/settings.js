import { h, icon, mount, modKey } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import { FOLDER_COLORS, normalizeHex } from '../core/colors.js';
import { downloadFile, extVersion } from '../core/api.js';
import { modal, toast, confirmDialog } from './kit.js';
import { THEME_PREVIEW, hasBackgroundImage, setBackgroundImage, clearBackgroundImage } from './theme.js';
import { importBookmarks, openSmartImport } from './importer.js';
import { ENGINES, ENGINE_IDS } from './engines.js';

const THEMES = ['auto', 'midnight', 'carbon', 'paper', 'ember', 'violet'];
const TABS = ['look', 'bg', 'page', 'behavior', 'data'];
let activeTab = 'look';

const row = (title, desc, control) =>
  h('div', { class: 'setrow' }, h('div', { class: 'setrow__text' }, h('span', { class: 't' }, title), desc ? h('span', { class: 'd' }, desc) : null), control);

function seg(options, value, onPick) {
  return h('div', { class: 'seg' }, options.map(([val, label]) => h('button', { type: 'button', 'aria-pressed': val === value ? 'true' : 'false', onclick: () => onPick(val) }, label)));
}

function toggle(value, label, onPick) {
  return h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': value ? 'true' : 'false', 'aria-label': label, onclick: () => onPick(!value) });
}

const set = (patch) => store.updateSettings(patch);

export function openSettings() {
  const root = h('div', { class: 'settings' });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const imgInput = h('input', { type: 'file', accept: 'image/*', hidden: true });

  const tog = (s, key, title, desc) => row(t(title), desc ? t(desc) : null, toggle(s[key], t(title), (v) => set({ [key]: v })));
  const pick = (s, key, title, opts, desc) => row(t(title), desc ? t(desc) : null, seg(opts.map(([v, k]) => [v, t(k)]), s[key], (v) => set({ [key]: v })));

  const lookTab = (s) => {
    const themeCard = (id) => {
      const p = THEME_PREVIEW[id === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'midnight') : id];
      return h('button', {
        class: 'theme-card', type: 'button', 'aria-pressed': s.theme === id ? 'true' : 'false',
        style: { '--p-bg': p.bg, '--p-surface': p.surface, '--p-line': p.line, '--p-accent': s.accent },
        onclick: () => set({ theme: id }),
      }, h('div', { class: 'theme-card__pv' }, h('i'), h('i'), h('i')), h('span', null, t(`theme.${id}`)));
    };
    const custom = h('input', { type: 'color', value: s.accent, 'aria-label': t('folder.custom'), oninput: (e) => set({ accent: normalizeHex(e.target.value) }), onchange: () => render() });
    const known = FOLDER_COLORS.some((c) => c.hex === s.accent);
    return [
      h('section', { class: 'setgroup' },
        h('h3', null, t('settings.appearance')),
        h('div', { class: 'themes' }, THEMES.map(themeCard)),
        h('div', { class: 'setrow setrow--stack' }, h('span', { class: 'label' }, t('settings.accent')),
          h('div', { class: 'swatches' },
            FOLDER_COLORS.map((c) => h('button', { class: 'swatch', type: 'button', style: { '--c': c.hex }, 'aria-label': c.id, 'aria-pressed': s.accent === c.hex ? 'true' : 'false', onclick: () => set({ accent: c.hex }) })),
            h('span', { class: 'swatch swatch--custom', 'aria-pressed': known ? 'false' : 'true', title: t('folder.custom') }, custom),
          ),
        ),
      ),
      h('section', { class: 'setgroup' },
        h('h3', null, t('set.type')),
        pick(s, 'font', 'set.font', [['geist', 'font.geist'], ['system', 'font.system'], ['mono', 'font.mono']]),
        pick(s, 'heroFont', 'set.heroFont', [['serif', 'hfont.serif'], ['sans', 'hfont.sans']]),
      ),
      h('section', { class: 'setgroup' },
        h('h3', null, t('set.shape')),
        pick(s, 'cardStyle', 'set.card', [['solid', 'card.solid'], ['outline', 'card.outline'], ['tinted', 'card.tinted']]),
        pick(s, 'density', 'settings.density', [['compact', 'density.compact'], ['cozy', 'density.cozy'], ['roomy', 'density.roomy']]),
        pick(s, 'radius', 'settings.radius', [['sharp', 'radius.sharp'], ['soft', 'radius.soft'], ['round', 'radius.round']]),
        row(t('settings.language'), null, seg([['auto', 'Auto'], ['it', 'Italiano'], ['en', 'English']], s.lang, (v) => set({ lang: v }))),
      ),
    ];
  };

  const bgTab = (s) => {
    const has = hasBackgroundImage();
    return [
      h('section', { class: 'setgroup' },
        h('h3', null, t('set.tab.bg')),
        pick(s, 'bgStyle', 'set.bgStyle', [['aurora', 'bg.aurora'], ['gradient', 'bg.gradient'], ['plain', 'bg.plain'], ['image', 'bg.image']]),
        s.bgStyle === 'image'
          ? h('div', { class: 'setrow setrow--stack' },
              h('div', { class: 'setrow__text' }, h('span', { class: 't' }, t('set.bgImage')), h('span', { class: 'd' }, t('set.bgImageHint'))),
              has ? h('div', { class: 'setpreview', style: { backgroundImage: `url("${localStorage.getItem('deskly-bg')}")` } }) : null,
              h('div', { class: 'bgpick' },
                h('button', { class: 'btn', type: 'button', onclick: () => imgInput.click() }, icon('image', { size: 15 }), t(has ? 'set.bgChange' : 'set.bgPick')),
                has ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { clearBackgroundImage(); set({ bgStyle: 'aurora' }); } }, icon('trash-2', { size: 15 }), t('set.bgRemove')) : null,
              ))
          : null,
        s.bgStyle === 'aurora' ? pick(s, 'auroraLevel', 'set.aurora', [['low', 'lvl.low'], ['mid', 'lvl.mid'], ['high', 'lvl.high']]) : null,
        s.bgStyle === 'image' ? pick(s, 'bgDim', 'set.dim', [['none', 'dim.none'], ['soft', 'dim.soft'], ['strong', 'dim.strong']]) : null,
        s.bgStyle === 'image' ? tog(s, 'bgBlur', 'set.blur') : null,
        tog(s, 'grain', 'set.grain'),
        tog(s, 'effects', 'set.effects', 'set.effectsHint'),
      ),
    ];
  };

  const pageTab = (s) => [
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.layout')),
      pick(s, 'newtabLayout', 'settings.newtabLayout', [['grid', 'layout.grid'], ['list', 'layout.list']]),
      pick(s, 'tileSize', 'set.tile', [['small', 'size.small'], ['medium', 'size.medium'], ['large', 'size.large']]),
      pick(s, 'pageWidth', 'set.width', [['narrow', 'width.narrow'], ['normal', 'width.normal'], ['wide', 'width.wide']]),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.brand')),
      tog(s, 'showBrand', 'set.showBrand'),
      row(t('set.brandName'), t('set.brandNameHint'),
        h('input', { class: 'input input--auto', type: 'text', value: s.brandName, maxlength: 24, autocomplete: 'off', placeholder: 'Deskly', 'aria-label': t('set.brandName'), onchange: (e) => set({ brandName: e.target.value.trim() }) })),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.clock')),
      tog(s, 'showClock', 'set.showClock'),
      tog(s, 'showDate', 'set.showDate'),
      tog(s, 'clock24', 'set.clock24'),
      tog(s, 'showSeconds', 'set.showSeconds'),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.sections')),
      row(t('settings.userName'), t('settings.userNameHint'),
        h('input', { class: 'input input--auto', type: 'text', value: s.userName, maxlength: 40, autocomplete: 'off', placeholder: t('settings.userNamePh'), 'aria-label': t('settings.userName'), onchange: (e) => set({ userName: e.target.value.trim() }) })),
      tog(s, 'showGreeting', 'set.showGreeting'),
      tog(s, 'showSummary', 'set.showSummary'),
      tog(s, 'showFavorites', 'set.showFavorites'),
      tog(s, 'showRecents', 'set.showRecents'),
      tog(s, 'showSuggestions', 'set.showSuggestions', 'set.showSuggestionsHint'),
    ),
  ];

  const behaviorTab = (s) => [
    h('section', { class: 'setgroup' },
      h('h3', null, t('settings.behavior')),
      tog(s, 'groupOnOpen', 'settings.groupOnOpen', 'settings.groupOnOpenHint'),
      tog(s, 'focusExisting', 'settings.focusExisting'),
      tog(s, 'favicons', 'settings.favicons'),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.search')),
      row(t('settings.searchEngine'), t('settings.searchEngineHint'),
        h('select', { class: 'select select--auto', 'aria-label': t('settings.searchEngine'), onchange: (e) => set({ searchEngine: e.target.value }) },
          ENGINE_IDS.map((id) => h('option', { value: id, selected: id === s.searchEngine }, ENGINES[id].name)))),
      tog(s, 'webSuggest', 'set.webSuggest', 'set.webSuggestHint'),
      tog(s, 'historyHints', 'set.historyHints', 'set.historyHintsHint'),
    ),
  ];

  const dataTab = () => {
    const st = store.stats();
    return [
      h('section', { class: 'setgroup' },
        h('h3', null, t('set.addSites')),
        h('p', { class: 'stat-line' }, t('set.smartHint')),
        h('div', { class: 'data-actions' },
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => openSmartImport() }, icon('sparkles', { size: 15 }), t('onb.smart')),
          h('button', { class: 'btn', type: 'button', onclick: importBookmarks }, icon('bookmark', { size: 15 }), t('settings.importBookmarks')),
        ),
      ),
      h('section', { class: 'setgroup' },
        h('h3', null, t('settings.data')),
        h('div', { class: 'data-actions' },
          h('button', { class: 'btn', type: 'button', onclick: doExport }, icon('download', { size: 15 }), t('settings.export')),
          h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, icon('upload', { size: 15 }), t('settings.import')),
        ),
        h('span', { class: 'stat-line' }, t('home.summary', { l: st.links, f: st.folders })),
      ),
      h('section', { class: 'setgroup' },
        h('h3', null, t('settings.shortcuts')),
        row(t('settings.sc.palette'), null, h('kbd', { class: 'kbd' }, `${modKey} K`)),
        row(t('settings.sc.panel'), null, h('kbd', { class: 'kbd' }, 'Alt Shift D')),
        row(t('settings.sc.newLink'), null, h('kbd', { class: 'kbd' }, 'Alt Shift S')),
        h('span', { class: 'stat-line' }, t('settings.sc.hint')),
        h('span', { class: 'stat-line' }, t('settings.sc.omnibox')),
      ),
      h('section', { class: 'setgroup' },
        h('h3', null, t('settings.about')),
        h('span', { class: 'stat-line' }, `Deskly · ${t('settings.version', { v: extVersion() })}`),
        h('span', { class: 'stat-line' }, t('set.footerHint')),
        h('div', { class: 'data-actions' }, h('button', { class: 'btn btn--danger', type: 'button', onclick: doReset }, icon('trash-2', { size: 15 }), t('settings.reset'))),
      ),
    ];
  };

  const render = () => {
    const s = store.get().settings;
    const body = { look: lookTab, bg: bgTab, page: pageTab, behavior: behaviorTab, data: dataTab }[activeTab](s);
    mount(root,
      h('div', { class: 'settabs', role: 'tablist' }, TABS.map((id) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': id === activeTab ? 'true' : 'false', onclick: () => { activeTab = id; render(); } }, t(`set.tab.${id}`)))),
      ...body,
    );
  };

  function doExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`deskly-backup-${stamp}.json`, store.exportJson());
    toast(t('toast.exported'));
  }
  async function doReset() {
    const ok = await confirmDialog({ title: t('settings.reset'), message: t('settings.resetConfirm'), confirmLabel: t('settings.reset') });
    if (!ok) return;
    store.resetAll();
    toast(t('toast.reset'), { action: { label: t('common.undo'), run: () => store.undo() } });
  }
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const res = store.importJson(await file.text(), 'merge');
      toast(t('toast.imported', { f: res.f, l: res.l }), { action: { label: t('common.undo'), run: () => store.undo() } });
    } catch {
      toast(t('toast.importError'));
    }
  });
  imgInput.addEventListener('change', async () => {
    const file = imgInput.files?.[0];
    imgInput.value = '';
    if (!file) return;
    try {
      await setBackgroundImage(file);
      render();
    } catch {
      toast(t('set.bgError'));
    }
  });

  const m = modal({ title: t('settings.title'), body: [root, fileInput, imgInput], onClose: () => unsub() });
  const unsub = store.subscribe((_, meta) => {
    if (meta.type === 'stat' || document.activeElement?.type === 'color') return;
    const scroller = m.el.querySelector('.modal__body');
    const top = scroller.scrollTop;
    render();
    m.el.querySelector('#modal-title').textContent = t('settings.title');
    scroller.scrollTop = top;
  });
  render();
  return m;
}
