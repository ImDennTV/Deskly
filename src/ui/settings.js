import { h, icon, mount, modKey } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import { FOLDER_COLORS, normalizeHex } from '../core/colors.js';
import { downloadFile, extVersion } from '../core/api.js';
import { modal, toast, confirmDialog } from './kit.js';
import { THEME_PREVIEW, hasBackgroundImage, setBackgroundImage, clearBackgroundImage } from './theme.js';
import { importBookmarks, openSmartImport } from './importer.js';
import { ENGINES, ENGINE_IDS } from './engines.js';
import { previewPicker } from './previews.js';
import { checkForUpdate } from '../core/updates.js';
import { THEME_PRESETS, CUSTOM_PREFIX, MAX_CUSTOM_THEMES, findCustomTheme, newTheme, sanitizeCustomThemes } from '../core/themes.js';

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

  // Come `pick`, ma ogni scelta è una carta con la sua anteprima.
  const pvp = (s, key, kind, title, opts, desc) => previewPicker({
    kind, value: s[key], opts, title: t(title), desc: desc ? t(desc) : null, onPick: (v) => set({ [key]: v }),
  });

  // ---- Temi personalizzati: carte, galleria, editor dei 4 colori, import/export ----
  const cur = () => store.get().settings;
  const saveThemes = (list, extra = {}) => set({ customThemes: list, ...extra });
  const useTheme = (c) => set({ theme: CUSTOM_PREFIX + c.id, accent: c.accent });
  const addTheme = (base) => {
    const list = cur().customThemes;
    if (list.length >= MAX_CUSTOM_THEMES) return toast(t('toast.themeLimit'));
    const c = newTheme(base);
    saveThemes([...list, c], { theme: CUSTOM_PREFIX + c.id, accent: c.accent });
  };
  const editTheme = (id, patch, extra = {}) => saveThemes(cur().customThemes.map((x) => (x.id === id ? { ...x, ...patch } : x)), extra);

  async function removeTheme(c) {
    const ok = await confirmDialog({ title: t('set.themeDelete'), message: t('set.themeDeleteConfirm', { n: c.name }), confirmLabel: t('set.themeDelete') });
    if (!ok) return;
    const s = cur();
    saveThemes(s.customThemes.filter((x) => x.id !== c.id), s.theme === CUSTOM_PREFIX + c.id ? { theme: 'auto' } : {});
  }

  async function exportTheme(c) {
    const { id, ...rest } = c;
    const code = JSON.stringify({ 'deskly-theme': 1, ...rest });
    try {
      await navigator.clipboard.writeText(code);
      toast(t('toast.themeCopied'));
    } catch {
      downloadFile(`deskly-tema-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tema'}.json`, code);
    }
  }

  function importThemeDialog() {
    const area = h('textarea', { class: 'textarea', rows: 5, placeholder: '{"deskly-theme":1,…}', spellcheck: false, 'aria-label': t('set.themeImport') });
    const m = modal({
      title: t('set.themeImport'),
      body: h('div', { style: { display: 'grid', gap: '10px' } }, h('p', { class: 'muted' }, t('set.themeImportHint')), area),
      footer: [
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => m.close() }, t('common.cancel')),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            try {
              const [parsed] = sanitizeCustomThemes([JSON.parse(area.value.trim())]);
              if (!parsed) throw new Error('theme');
              addTheme(parsed);
              m.close();
              toast(t('toast.themeImported'));
            } catch {
              toast(t('toast.themeBad'));
            }
          },
        }, t('common.add')),
      ],
    });
    area.focus();
  }

  const themesGroup = (s) => {
    const active = findCustomTheme(s);
    const card = (c) => h('button', {
      class: 'theme-card', type: 'button', 'aria-pressed': s.theme === CUSTOM_PREFIX + c.id ? 'true' : 'false',
      style: { '--p-bg': c.bg, '--p-surface': c.surface, '--p-line': `color-mix(in srgb, ${c.text} 18%, ${c.surface})`, '--p-accent': c.accent },
      onclick: () => useTheme(c),
    }, h('div', { class: 'theme-card__pv' }, h('i'), h('i'), h('i')), h('span', null, c.name));
    const dark = !matchMedia('(prefers-color-scheme: light)').matches;
    const swatchOf = (p) => h('button', {
      class: 'preset', type: 'button', title: p.name, 'aria-label': p.name,
      style: { '--p-bg': p.bg, '--p-surface': p.surface, '--p-accent': p.accent, '--p-text': p.text },
      onclick: () => addTheme(p),
    }, h('i'), h('span', null, p.name));
    const colorRow = (c, key, label) => row(label, null, h('input', {
      class: 'colorpick', type: 'color', value: c[key], 'aria-label': label,
      oninput: (e) => editTheme(c.id, { [key]: normalizeHex(e.target.value) }, key === 'accent' ? { accent: normalizeHex(e.target.value) } : {}),
    }));
    return h('div', { class: 'themebox' },
      h('div', { class: 'setrow setrow--stack' },
        h('span', { class: 'label' }, t('set.themeMine')),
        h('div', { class: 'themes' },
          s.customThemes.map(card),
          h('button', { class: 'theme-card theme-card--add', type: 'button', onclick: () => addTheme(THEME_PRESETS.find((p) => (p.mode === 'dark') === dark)), disabled: s.customThemes.length >= MAX_CUSTOM_THEMES },
            h('div', { class: 'theme-card__pv' }, icon('plus', { size: 18 })), h('span', null, t('set.themeNew'))))),
      active ? h('div', { class: 'themeedit' },
        row(t('set.themeName'), null, h('input', { class: 'input input--auto', type: 'text', value: active.name, maxlength: 24, autocomplete: 'off', 'aria-label': t('set.themeName'), onchange: (e) => editTheme(active.id, { name: e.target.value.trim() || active.name }) })),
        row(t('set.themeMode'), null, seg([['dark', t('mode.dark')], ['light', t('mode.light')]], active.mode, (v) => editTheme(active.id, { mode: v }))),
        colorRow(active, 'bg', t('set.themeBg')),
        colorRow(active, 'surface', t('set.themeSurface')),
        colorRow(active, 'text', t('set.themeText')),
        colorRow(active, 'accent', t('set.themeAccent')),
        h('div', { class: 'data-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => addTheme({ ...active, name: `${active.name} 2`.slice(0, 24) }) }, icon('copy', { size: 15 }), t('set.themeDup')),
          h('button', { class: 'btn', type: 'button', onclick: () => exportTheme(active) }, icon('share-2', { size: 15 }), t('set.themeExport')),
          h('button', { class: 'btn btn--ghost btn--danger', type: 'button', onclick: () => removeTheme(active) }, icon('trash-2', { size: 15 }), t('set.themeDelete')))) : null,
      h('div', { class: 'setrow setrow--stack' },
        h('span', { class: 'label' }, t('set.themeGallery')),
        h('div', { class: 'presets' }, THEME_PRESETS.map(swatchOf)),
        h('div', { class: 'data-actions' }, h('button', { class: 'btn', type: 'button', onclick: importThemeDialog }, icon('upload', { size: 15 }), t('set.themeImport')))),
    );
  };

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
        themesGroup(s),
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
        pvp(s, 'cardStyle', 'card', 'set.card', [['solid', 'card.solid'], ['outline', 'card.outline'], ['tinted', 'card.tinted']]),
        pvp(s, 'iconShape', 'shape', 'set.ishape', [['rounded', 'ishape.rounded'], ['circle', 'ishape.circle'], ['square', 'ishape.square']]),
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
      pvp(s, 'newtabLayout', 'layout', 'settings.newtabLayout', [['grid', 'layout.grid'], ['icons', 'layout.icons'], ['list', 'layout.list'], ['compact', 'layout.compact']]),
      pvp(s, 'folderCols', 'cols', 'set.cols', [['auto', 'cols.auto'], ['1', 'cols.1'], ['2', 'cols.2'], ['3', 'cols.3'], ['4', 'cols.4']], 'set.colsHint'),
      pvp(s, 'tileSize', 'size', 'set.tile', [['small', 'size.small'], ['medium', 'size.medium'], ['large', 'size.large']]),
      pvp(s, 'pageWidth', 'width', 'set.width', [['narrow', 'width.narrow'], ['normal', 'width.normal'], ['wide', 'width.wide']]),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.order')),
      pvp(s, 'folderSort', 'sort', 'set.sortFolders', [['manual', 'sort.manual'], ['name', 'sort.name'], ['size', 'sort.size'], ['used', 'sort.used']], 'set.sortHint'),
      pvp(s, 'linkSort', 'sort', 'set.sortLinks', [['manual', 'sort.manual'], ['name', 'sort.name'], ['used', 'sort.used'], ['recent', 'sort.recent']]),
      tog(s, 'favFirst', 'set.favFirst', 'set.favFirstHint'),
      pvp(s, 'foldAt', 'fold', 'set.foldAt', [['few', 'fold.few'], ['normal', 'fold.normal'], ['all', 'fold.all']], 'set.foldAtHint'),
    ),
    h('section', { class: 'setgroup' },
      h('h3', null, t('set.details')),
      tog(s, 'showCount', 'set.showCount'),
      tog(s, 'showSub', 'set.showSub', 'set.showSubHint'),
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
      tog(s, 'openSame', 'set.openSame', 'set.openSameHint'),
      tog(s, 'focusExisting', 'settings.focusExisting'),
      tog(s, 'favicons', 'settings.favicons'),
      s.favicons ? tog(s, 'hiResIcons', 'set.hiIcons', 'set.hiIconsHint') : null,
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

  // Interruttore + stato: se c'è una versione nuova mostra «Scarica» e «Novità».
  const updatesGroup = (s) => {
    const status = h('div', { class: 'upd' });
    const show = (info, checked) => {
      if (info) {
        status.replaceChildren(
          h('strong', { class: 'upd__title' }, t('set.updateAvail', { v: info.version })),
          h('div', { class: 'data-actions' },
            h('a', { class: 'btn btn--primary', href: info.zip || info.page, target: '_blank', rel: 'noopener' }, icon('download', { size: 15 }), t('set.updateDownload')),
            h('a', { class: 'btn btn--ghost', href: info.page, target: '_blank', rel: 'noopener' }, t('set.updateNotes'))),
          h('span', { class: 'stat-line' }, t('set.updateHow')));
      } else {
        status.replaceChildren(checked ? h('span', { class: 'stat-line' }, t('set.updateUpToDate')) : '');
      }
    };
    if (s.updateCheck) checkForUpdate(s).then((info) => show(info, false));
    const now = h('button', { class: 'btn', type: 'button', onclick: () => checkForUpdate(store.get().settings, { force: true }).then((info) => show(info, true)) }, t('set.updateCheckNow'));
    return h('section', { class: 'setgroup' },
      h('h3', null, t('set.updates')),
      tog(s, 'updateCheck', 'set.updateCheck', 'set.updateCheckHint'),
      s.updateCheck ? h('div', { class: 'data-actions' }, now) : null,
      status);
  };

  const dataTab = () => {
    const st = store.stats();
    return [
      updatesGroup(store.get().settings),
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
