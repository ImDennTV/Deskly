import { h, icon } from '../core/dom.js';
import { t, getLang } from '../core/i18n.js';
import * as store from '../core/store.js';
import { bookmarksApi } from '../core/api.js';
import { iconImg } from '../core/favicons.js';
import { foldersFromBookmarks, sanitizeFolder, hostOf } from '../core/model.js';
import { CATEGORIES, categoryName, findSite } from '../core/catalog.js';
import { frequentSites } from '../core/suggest.js';
import { modal, toast } from './kit.js';
import { folderTile } from './folders.js';

const undoAction = () => ({ label: t('common.undo'), run: () => store.undo() });

export async function importBookmarks() {
  try {
    const tree = await bookmarksApi.tree();
    if (!tree) return toast(t('toast.bookmarksDenied'));
    const res = store.importFolders(foldersFromBookmarks(tree));
    toast(t('toast.imported', { f: res.f, l: res.l }), { action: undoAction() });
  } catch {
    toast(t('toast.bookmarksDenied'));
  }
}

// Crea (o riempie) le cartelle per categoria a partire da una lista di siti { url, title, cat }.
export function addSitesByCategory(sites) {
  const lang = getLang();
  const groups = new Map();
  for (const s of sites) {
    if (!groups.has(s.cat)) groups.set(s.cat, []);
    groups.get(s.cat).push({ url: s.url, title: s.title });
  }
  const folders = [...groups].map(([cat, links], i) => {
    const c = CATEGORIES[cat] || CATEGORIES.other;
    return sanitizeFolder({ name: categoryName(cat, lang), icon: c.icon, color: c.color, links }, i);
  });
  return store.importFolders(folders, 'merge');
}

// Importazione guidata: propone i siti più visitati, già divisi in cartelle, da spuntare.
export function openSmartImport({ onDone } = {}) {
  const lang = getLang();
  const body = h('div', { class: 'imp' }, h('p', { class: 'muted imp__loading' }, t('import.loading')));
  const count = h('span', { class: 'imp__count' });
  const go = h('button', { class: 'btn btn--primary', type: 'button', disabled: true }, t('import.add', { n: 0 }));
  const m = modal({
    title: t('import.title'),
    body,
    footer: [
      h('button', {
        class: 'btn btn--ghost', type: 'button',
        onclick: async () => { m.close(); await importBookmarks(); onDone?.(); },
      }, icon('bookmark', { size: 15 }), t('import.fromBookmarks')),
      h('span', { class: 'spacer' }),
      count,
      go,
    ],
  });

  let groups = [];
  const picked = new Set();
  const total = () => picked.size;
  const refresh = () => {
    const n = total();
    go.disabled = n === 0;
    go.textContent = t('import.add', { n });
    count.textContent = t('import.picked', { n });
    for (const g of groups) {
      const on = g.sites.filter((s) => picked.has(s.url)).length;
      g.box.checked = on === g.sites.length;
      g.box.indeterminate = on > 0 && on < g.sites.length;
    }
  };

  const draw = (sites) => {
    const byCat = new Map();
    for (const s of sites) {
      if (!byCat.has(s.cat)) byCat.set(s.cat, []);
      byCat.get(s.cat).push(s);
    }
    // Prima i gruppi con più siti noti, "Altri siti" sempre in fondo.
    const order = [...byCat].sort((a, b) => (a[0] === 'other') - (b[0] === 'other') || b[1].length - a[1].length);
    groups = [];
    const nodes = order.map(([cat, list]) => {
      const c = CATEGORIES[cat] || CATEGORIES.other;
      list.slice(0, 12).forEach((s, i) => {
        if (i < 8 && (findSite(s.url) || s.visits >= 3)) picked.add(s.url);
      });
      const shown = list.slice(0, 12);
      const box = h('input', { type: 'checkbox', class: 'imp__box', 'aria-label': categoryName(cat, lang) });
      const g = { cat, sites: shown, box };
      groups.push(g);
      box.addEventListener('change', () => {
        for (const s of shown) box.checked ? picked.add(s.url) : picked.delete(s.url);
        rows.forEach((r) => { r.input.checked = picked.has(r.url); });
        refresh();
      });
      const rows = shown.map((s) => {
        const input = h('input', { type: 'checkbox', class: 'imp__box', checked: picked.has(s.url) });
        input.addEventListener('change', () => {
          input.checked ? picked.add(s.url) : picked.delete(s.url);
          refresh();
        });
        const label = h('label', { class: 'imp__row' },
          input,
          iconImg(s.url, { cls: 'imp__fav' }),
          h('span', { class: 'imp__name truncate' }, s.title),
          h('span', { class: 'imp__host truncate' }, hostOf(s.url).replace(/^www\./, '')),
        );
        return { url: s.url, input, el: label };
      });
      return h('section', { class: 'imp__group' },
        h('label', { class: 'imp__head' },
          box,
          folderTile({ icon: c.icon, color: c.color }, 'sm'),
          h('strong', null, categoryName(cat, lang)),
          h('span', { class: 'muted' }, String(shown.length)),
        ),
        h('div', { class: 'imp__rows' }, rows.map((r) => r.el)),
      );
    });
    body.replaceChildren(h('p', { class: 'muted imp__hint' }, t('import.hint')), ...nodes);
    refresh();
  };

  go.addEventListener('click', () => {
    const chosen = [];
    for (const g of groups) for (const s of g.sites) if (picked.has(s.url)) chosen.push({ ...s, cat: g.cat });
    const res = addSitesByCategory(chosen);
    store.completeOnboarding([], t);
    m.close();
    toast(t('toast.imported', { f: res.f, l: res.l }), { action: undoAction() });
    onDone?.();
  });

  frequentSites({ exclude: store.hostSaved, limit: 80 })
    .then((sites) => {
      if (!sites.length) {
        body.replaceChildren(h('p', { class: 'muted imp__loading' }, t('import.empty')));
        return;
      }
      draw(sites);
    })
    .catch(() => body.replaceChildren(h('p', { class: 'muted imp__loading' }, t('import.empty'))));
  return m;
}
