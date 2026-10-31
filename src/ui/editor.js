import { h, icon, ICON_GROUPS, mount, debounce } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import { normalizeUrl, hostOf } from '../core/model.js';
import { suggestSites } from '../core/suggest.js';
import { CATEGORIES, categoryName } from '../core/catalog.js';
import { getLang } from '../core/i18n.js';
import { FOLDER_COLORS, TAG_SUGGESTIONS, tagColor, normalizeHex } from '../core/colors.js';
import { faviconUrl } from '../core/api.js';
import { modal } from './kit.js';
import { folderTile } from './folders.js';

// ---------- Link ----------

export function openLinkEditor({ link, folderId, prefill = {}, onDone } = {}) {
  const state = store.get();
  const editing = Boolean(link);
  const current = link || { title: prefill.title || '', url: prefill.url || '', note: '', tag: '' };
  const startFolder = editing ? state.folders.find((f) => f.links.some((l) => l.id === link.id))?.id : folderId || state.folders[0]?.id;

  const title = h('input', { class: 'input', id: 'le-title', value: current.title, placeholder: t('link.titlePh'), maxlength: 120, autocomplete: 'off' });
  const url = h('input', { class: 'input', id: 'le-url', value: current.url || '', placeholder: t('link.urlPh'), autocomplete: 'off', spellcheck: false, inputmode: 'url', role: 'combobox', 'aria-expanded': 'false' });
  const note = h('textarea', { class: 'textarea', id: 'le-note', placeholder: t('link.notePh'), maxlength: 300 }, current.note || '');
  const tag = h('input', { class: 'input', id: 'le-tag', value: current.tag || '', placeholder: t('link.tagPh'), maxlength: 24, autocomplete: 'off' });
  const select = h('select', { class: 'select', id: 'le-folder' }, state.folders.map((f) => h('option', { value: f.id, selected: f.id === startFolder }, f.name)));
  const urlHint = h('span', { class: 'hint' });
  const lead = h('span', { class: 'lead' });
  const tagRow = h('div', { class: 'tagrow' });

  const renderTags = () => {
    const cur = tag.value.trim().toLowerCase();
    mount(tagRow, TAG_SUGGESTIONS.map((s) => h('button', {
      type: 'button',
      style: { '--bc': tagColor(s) },
      'aria-pressed': cur === s ? 'true' : 'false',
      onclick: () => { tag.value = cur === s ? '' : s; renderTags(); },
    }, s)));
  };

  let pendingFav = '';
  const refreshUrl = () => {
    const n = url.value.trim() ? normalizeUrl(url.value) : null;
    const typing = !n && hits.length > 0;
    url.classList.toggle('is-bad', Boolean(url.value.trim()) && !n && !typing);
    urlHint.className = 'hint';
    urlHint.textContent = '';
    if (url.value.trim() && !n && !typing) {
      urlHint.classList.add('is-bad');
      urlHint.textContent = t('link.invalidUrl');
    } else if (n) {
      const dup = store.folderOfUrl(n);
      if (dup && dup.link.id !== link?.id && dup.folder.id === select.value) urlHint.textContent = t('add.alreadyThere');
    }
    const next = n && /^https?:/.test(n) ? faviconUrl(n, 32) : '';
    if (next !== pendingFav) {
      pendingFav = next;
      mount(lead, next ? h('img', { src: next, width: 16, height: 16, alt: '', style: { borderRadius: '3px' }, onerror: (e) => e.target.replaceWith(icon('globe', { size: 16 })) }) : icon('globe', { size: 16 }));
    }
    title.placeholder = n && !title.value ? hostOf(n).replace(/^www\./, '') : t('link.titlePh');
  };
  url.addEventListener('input', refreshUrl);

  // ---- Suggerimenti mentre scrivi: cronologia, siti più visitati, schede aperte e catalogo ----
  const drop = h('div', { class: 'suggest', role: 'listbox', hidden: true });
  let hits = [];
  let sel = -1;
  let typedTitle = Boolean(current.title);
  title.addEventListener('input', () => { typedTitle = title.value.trim().length > 0; });

  const folderFor = (cat) => {
    const name = categoryName(cat, getLang()).toLowerCase();
    return store.get().folders.find((f) => f.name.toLowerCase() === name || (cat === 'google' && f.name.toLowerCase() === 'google'))?.id;
  };
  const paintSel = () => {
    [...drop.children].forEach((el, i) => el.classList.toggle('is-active', i === sel));
    drop.children[sel]?.scrollIntoView({ block: 'nearest' });
  };
  const closeDrop = () => { drop.hidden = true; hits = []; sel = -1; url.setAttribute('aria-expanded', 'false'); };
  const pick = (hit) => {
    url.value = hit.url;
    if (!typedTitle || !title.value.trim()) { title.value = hit.title; typedTitle = false; }
    const fid = !editing && folderFor(hit.cat);
    if (fid) select.value = fid;
    closeDrop();
    refreshUrl();
    title.focus();
    title.select();
  };
  const paintDrop = () => {
    if (!hits.length) return closeDrop();
    mount(drop, hits.map((hit, i) => h('button', {
      type: 'button', class: 'suggest__row', role: 'option',
      onmousedown: (e) => e.preventDefault(),
      onmousemove: () => { if (sel !== i) { sel = i; paintSel(); } },
      onclick: () => pick(hit),
    },
    h('img', { src: faviconUrl(hit.url, 32), width: 18, height: 18, alt: '', style: { borderRadius: '4px' } }),
    h('span', { class: 'suggest__main' },
      h('span', { class: 'suggest__title truncate' }, hit.title),
      h('span', { class: 'suggest__url truncate' }, hit.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))),
    hit.exists ? h('span', { class: 'suggest__tag' }, t('add.alreadySaved')) : (hit.cat !== 'other' ? h('span', { class: 'suggest__tag' }, h('i', { style: { background: CATEGORIES[hit.cat].color } }), categoryName(hit.cat, getLang())) : null),
    )));
    drop.hidden = false;
    url.setAttribute('aria-expanded', 'true');
    paintSel();
  };
  const ask = debounce(async () => {
    const q = url.value.trim();
    // Un indirizzo già completo non ha bisogno di suggerimenti.
    if (q.length < 2 || /^https?:\/\/\S+\.\S+/i.test(q) || (editing && q === current.url)) return closeDrop();
    const res = await suggestSites(q, { limit: 6, exclude: (u) => Boolean(store.folderOfUrl(u)) }).catch(() => []);
    if (url.value.trim() !== q) return;
    hits = res;
    // Se non sembra un indirizzo ("terminal") il primo risultato è già selezionato: basta Invio.
    sel = hits.length && !normalizeUrl(q) ? 0 : -1;
    paintDrop();
  }, 90);
  url.addEventListener('input', ask);
  url.addEventListener('blur', () => setTimeout(closeDrop, 120));
  url.addEventListener('keydown', (e) => {
    if (drop.hidden || !hits.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      paintSel();
    } else if ((e.key === 'Enter' || e.key === 'Tab') && sel >= 0) {
      e.preventDefault();
      pick(hits[sel]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDrop();
    }
  });
  select.addEventListener('change', refreshUrl);
  tag.addEventListener('input', renderTags);

  const submit = (e) => {
    e?.preventDefault();
    const n = normalizeUrl(url.value);
    if (!n) {
      url.classList.add('is-bad');
      url.focus();
      return;
    }
    const data = {
      title: title.value.trim() || hostOf(n).replace(/^www\./, ''),
      url: n,
      note: note.value.trim() || undefined,
      tag: tag.value.trim() || undefined,
    };
    let saved;
    if (editing) {
      store.updateLink(link.id, { ...data, note: data.note || '', tag: data.tag || '', folderId: select.value });
      saved = link;
    } else {
      saved = store.addLink(select.value, data);
    }
    m.close();
    onDone?.(saved, select.value);
  };

  const body = h('form', { id: 'link-form', onsubmit: submit, style: { display: 'grid', gap: '16px' } },
    h('div', { class: 'field' }, h('label', { for: 'le-url' }, t('link.url')),
      h('div', { class: 'input-wrap input-wrap--suggest' }, lead, url, drop), urlHint),
    h('div', { class: 'field' }, h('label', { for: 'le-title' }, t('link.title')), title, h('span', { class: 'hint' }, t('link.autoTitle'))),
    h('div', { class: 'field' }, h('label', { for: 'le-folder' }, t('link.folder')), select),
    h('div', { class: 'field' }, h('label', { for: 'le-tag' }, t('link.tag')), tagRow, tag),
    h('details', { class: 'adv', open: Boolean(current.note) },
      h('summary', null, icon('chevron-right', { size: 14 }), t('settings.advanced')),
      h('div', { class: 'adv__body' }, h('div', { class: 'field' }, h('label', { for: 'le-note' }, t('link.note')), note)),
    ),
  );

  const m = modal({
    title: editing ? t('link.edit') : t('link.new'),
    body,
    footer: [
      editing ? h('button', { class: 'btn btn--ghost btn--danger', type: 'button', onclick: () => { m.close(); onDone?.(link, null, 'delete'); } }, icon('trash-2', { size: 15 }), t('common.delete')) : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => m.close() }, t('common.cancel')),
      h('button', { class: 'btn btn--primary', type: 'submit', form: 'link-form' }, editing ? t('common.save') : t('common.add')),
    ],
  });
  renderTags();
  refreshUrl();
  (editing ? title : url).focus();
  return m;
}

// ---------- Cartella ----------

export function openFolderEditor({ folder, onDone } = {}) {
  const editing = Boolean(folder);
  const draft = {
    name: folder?.name || '',
    icon: folder?.icon || 'folder',
    color: folder?.color || FOLDER_COLORS[store.get().folders.length % FOLDER_COLORS.length].hex,
  };

  const name = h('input', { class: 'input', id: 'fe-name', value: draft.name, placeholder: t('folder.namePh'), maxlength: 40, autocomplete: 'off' });
  const preview = h('div', { class: 'preview' });
  const swatches = h('div', { class: 'swatches' });
  const pickerHost = h('div', { class: 'icon-picker' });
  const groups = Object.keys(ICON_GROUPS);
  let group = groups.find((g) => ICON_GROUPS[g].includes(draft.icon)) || groups[0];
  let query = '';

  const cssVars = () => m?.el.style.setProperty('--fc', draft.color);

  const renderPreview = () => {
    mount(preview, folderTile({ icon: draft.icon, color: draft.color }, 'lg'),
      h('span', { class: 'name truncate' }, name.value.trim() || t('folder.namePh')));
    cssVars();
  };

  const renderSwatches = () => {
    const known = FOLDER_COLORS.some((c) => c.hex === draft.color);
    const custom = h('input', { type: 'color', value: draft.color, 'aria-label': t('folder.custom'), oninput: (e) => {
        draft.color = normalizeHex(e.target.value);
        renderPreview();
        pickerHost.querySelector('.icon-grid')?.style.setProperty('--fc', draft.color);
      },
      onchange: renderSwatches });
    mount(swatches,
      FOLDER_COLORS.map((c) => h('button', {
        class: 'swatch', type: 'button', style: { '--c': c.hex }, 'aria-label': c.id, 'aria-pressed': draft.color === c.hex ? 'true' : 'false',
        onclick: () => { draft.color = c.hex; renderSwatches(); renderPreview(); renderPicker(); },
      })),
      h('span', { class: `swatch swatch--custom`, 'aria-pressed': known ? 'false' : 'true', title: t('folder.custom') }, custom),
    );
  };

  const renderPicker = () => {
    const names = query ? [...new Set(Object.values(ICON_GROUPS).flat())].filter((n) => n.includes(query)) : ICON_GROUPS[group];
    const search = h('input', { class: 'input', placeholder: t('icon.search'), value: query, 'aria-label': t('icon.search'), autocomplete: 'off',
      oninput: (e) => { query = e.target.value.trim().toLowerCase(); renderPicker(); const i = pickerHost.querySelector('input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    mount(pickerHost,
      search,
      query ? null : h('div', { class: 'icon-tabs', role: 'tablist' }, groups.map((g) => h('button', {
        type: 'button', 'aria-pressed': g === group ? 'true' : 'false', onclick: () => { group = g; renderPicker(); },
      }, t(`icons.${g}`)))),
      h('div', { class: 'icon-grid', style: { '--fc': draft.color } }, names.map((n) => h('button', {
        type: 'button', title: n, 'aria-label': n, 'aria-pressed': draft.icon === n ? 'true' : 'false',
        onclick: () => { draft.icon = n; renderPicker(); renderPreview(); },
      }, icon(n, { size: 18 })))),
    );
  };

  const submit = (e) => {
    e?.preventDefault();
    const value = name.value.trim();
    if (!value) {
      name.classList.add('is-bad');
      name.focus();
      return;
    }
    let result = folder;
    if (editing) store.updateFolder(folder.id, { name: value, icon: draft.icon, color: draft.color });
    else result = store.addFolder({ name: value, icon: draft.icon, color: draft.color });
    m.close();
    onDone?.(result);
  };
  name.addEventListener('input', () => { name.classList.remove('is-bad'); renderPreview(); });

  const body = h('form', { id: 'folder-form', onsubmit: submit, style: { display: 'grid', gap: '16px' } },
    preview,
    h('div', { class: 'field' }, h('label', { for: 'fe-name' }, t('folder.name')), name),
    h('div', { class: 'field' }, h('span', { class: 'label' }, t('folder.color')), swatches),
    h('div', { class: 'field' }, h('span', { class: 'label' }, t('folder.icon')), pickerHost),
  );

  const m = modal({
    title: editing ? t('folder.edit') : t('folder.new'),
    body,
    footer: [
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => m.close() }, t('common.cancel')),
      h('button', { class: 'btn btn--primary', type: 'submit', form: 'folder-form' }, editing ? t('common.save') : t('common.create')),
    ],
  });
  renderPreview();
  renderSwatches();
  renderPicker();
  name.focus();
  name.select();
  return m;
}
