import { h, icon, mount, modKey, debounce } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { search as runSearch, norm } from '../core/search.js';
import { normalizeUrl, countLinks } from '../core/model.js';
import { linkRow, folderTile } from './folders.js';
import { menu } from './kit.js';
import { ENGINES, ENGINE_IDS, engineMark } from './engines.js';
import { webSuggest, faviconUrl } from '../core/api.js';
import { suggestSites } from '../core/suggest.js';

const URL_LIKE = /^(https?:\/\/\S+|[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?)$/i;

// Ricerca unica: filtra link e cartelle, cerca sul web e offre comandi. Sostituisce una palette separata.
// `web` ({ getEngine, setEngine, go }) accende la barra del motore di ricerca.
export function createSearch({ placeholder, getState, ctx, commands, onActive, web }) {
  let q = '';
  let items = [];
  let active = 0;
  let auto = true;
  // Righe che arrivano dopo, in modo asincrono: suggerimenti web e siti dalla cronologia.
  let extra = { q: '', sites: [], words: [] };
  let controller = null;

  const input = h('input', {
    type: 'text',
    id: 'q',
    placeholder,
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('common.search'),
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-controls': 'results',
  });
  const clearBtn = h('button', { class: 'ibtn clear', type: 'button', 'aria-label': t('search.clear'), onclick: () => { clear(); input.focus(); } }, icon('x', { size: 14 }));
  const engineBtn = web
    ? h('button', { class: 'lead engine', type: 'button', 'aria-haspopup': 'menu', onclick: () => engineMenu() })
    : null;
  const paintEngine = () => {
    if (!engineBtn) return;
    const id = web.getEngine();
    engineBtn.title = `${t('search.engine')}: ${ENGINES[id].name}`;
    engineBtn.setAttribute('aria-label', engineBtn.title);
    engineBtn.replaceChildren(engineMark(id, 20), icon('chevron-down', { size: 12 }));
  };
  paintEngine();
  const field = h('div', { class: engineBtn ? 'search search--web' : 'search' },
    engineBtn || h('span', { class: 'lead' }, icon('search', { size: 16 })),
    input,
    h('kbd', { class: 'kbd' }, `${modKey} K`),
    clearBtn,
  );
  const results = h('div', { class: 'results', id: 'results', role: 'listbox', hidden: true });
  const hints = h('div', { class: 'hints', hidden: true },
    h('span', null, h('kbd', { class: 'kbd' }, '↑↓'), t('palette.nav')),
    h('span', null, h('kbd', { class: 'kbd' }, '↵'), t('palette.open')),
    web ? h('span', null, h('kbd', { class: 'kbd' }, '⇧ ↵'), t('palette.web')) : null,
    h('span', null, h('kbd', { class: 'kbd' }, `${modKey} ↵`), t('palette.bg')),
    h('span', null, h('kbd', { class: 'kbd' }, 'esc'), t('palette.close')),
  );

  function engineMenu() {
    const current = web.getEngine();
    menu(engineBtn, ENGINE_IDS.map((id) => ({
      label: ENGINES[id].name,
      check: id === current,
      onClick: () => { web.setEngine(id); paintEngine(); render(); input.focus(); },
    })));
  }

  function matchCommands() {
    const nq = norm(q);
    const list = commands().filter((c) => nq.split(/\s+/).every((tok) => norm(c.label).includes(tok)));
    const url = looksLikeUrl() ? normalizeUrl(q) : null;
    if (url) list.unshift({ id: 'add-url', label: t('palette.cmd.newLink'), meta: url.replace(/^https?:\/\//, ''), icon: 'plus', run: () => ctx.newLink({ url }) });
    return list;
  }

  const looksLikeUrl = () => URL_LIKE.test(q.trim());

  function goWeb(background, text = q) {
    const term = text;
    if (!background) clear();
    web.search(term, { background });
  }

  const prefs = () => web?.prefs?.() || {};
  const fetchExtra = debounce(async () => {
    const asked = q.trim();
    controller?.abort();
    if (asked.length < 2 || !web) return;
    controller = new AbortController();
    const { signal } = controller;
    const p = prefs();
    const [words, sites] = await Promise.all([
      p.webSuggest ? webSuggest(asked, p.lang, signal) : [],
      p.historyHints ? suggestSites(asked, { limit: 4, exclude: web.isSaved }).catch(() => []) : [],
    ]);
    if (signal.aborted || q.trim() !== asked) return;
    extra = { q: asked, sites: sites.filter((x) => !x.exists), words };
    render();
  }, 110);

  function render() {
    const doc = getState();
    items = [];
    const hasQuery = q.trim().length > 0;
    results.hidden = !hasQuery;
    hints.hidden = !hasQuery;
    field.classList.toggle('has-value', hasQuery);
    input.setAttribute('aria-expanded', hasQuery ? 'true' : 'false');
    onActive?.(hasQuery);
    if (!hasQuery) return;

    const hits = runSearch(doc, q, { limit: 30 });
    const folderHits = hits.filter((x) => x.type === 'folder');
    const linkHits = hits.filter((x) => x.type === 'link');
    const cmds = matchCommands();
    const asked = q.trim();
    const live = extra.q && (asked.startsWith(extra.q) || extra.q.startsWith(asked));
    const siteHits = live ? extra.sites : [];
    const wordHits = live ? extra.words : [];

    const nodes = [];
    const group = (label) => h('div', { class: 'section__title results__group' }, label);
    const register = (item, el) => {
      item.el = el;
      const idx = items.push(item) - 1;
      el.addEventListener('mousemove', () => { if (active !== idx) { auto = false; setActive(idx, false); } });
      el.setAttribute('role', 'option');
      return el;
    };

    // Se scrivi un indirizzo, la prima scelta è aprirlo.
    const target = web && looksLikeUrl() ? normalizeUrl(q) : null;
    if (target) {
      nodes.push(group(t('palette.go')));
      const el = h('button', { class: 'cmd-row', type: 'button', onclick: () => { clear(); web.go(target, {}); } },
        h('span', { class: 'tile' }, icon('globe', { size: 16 })),
        h('span', { class: 'grow truncate' }, t('web.goTo', { u: target.replace(/^https?:\/\//, '').replace(/\/$/, '') })),
      );
      nodes.push(register({ type: 'url', url: target }, el));
    }

    if (folderHits.length) {
      nodes.push(group(t('palette.folders')));
      for (const hit of folderHits) {
        const f = hit.folder;
        const el = h('div', { class: 'cmd-row', tabindex: -1, onclick: () => ctx.revealFolder(f) },
          folderTile(f),
          h('span', { class: 'grow truncate' }, f.name),
          h('span', { class: 'sub' }, t('folder.links', { n: f.links.length })),
          h('button', { class: 'ibtn', type: 'button', title: t('folder.openGroup'), 'aria-label': t('folder.openGroup'), onclick: (e) => { e.stopPropagation(); ctx.openFolder(f); } }, icon('layers', { size: 16 })),
        );
        nodes.push(register({ type: 'folder', folder: f }, el));
      }
    }
    if (linkHits.length) {
      nodes.push(group(t('palette.links')));
      for (const hit of linkHits) {
        const row = linkRow(hit.link, hit.folder, ctx);
        row.draggable = false;
        row.querySelector('.link__main').append(
          h('span', { class: 'folder-chip' }, h('span', { class: 'dot', style: { '--c': hit.folder.color } }), hit.folder.name),
        );
        nodes.push(register({ type: 'link', link: hit.link, folder: hit.folder }, row));
      }
    }
    if (siteHits.length) {
      nodes.push(group(t('search.fromHistory')));
      for (const site of siteHits) {
        const el = h('div', { class: 'cmd-row', tabindex: -1, onclick: (e) => { clear(); web.go(site.url, { background: e.ctrlKey || e.metaKey }); } },
          h('span', { class: 'tile tile--mark' }, h('img', { src: faviconUrl(site.url, 32), width: 18, height: 18, alt: '', style: { borderRadius: '4px' } })),
          h('span', { class: 'grow truncate' }, site.title),
          h('span', { class: 'sub truncate' }, site.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')),
          h('button', { class: 'ibtn', type: 'button', title: t('search.addSite'), 'aria-label': t('search.addSite'), onclick: (e) => { e.stopPropagation(); clear(); ctx.newLink({ url: site.url, title: site.title }); } }, icon('plus', { size: 16 })),
        );
        nodes.push(register({ type: 'site', site }, el));
      }
    }
    let webIdx = -1;
    if (web) {
      const id = web.getEngine();
      nodes.push(group(t('palette.web')));
      const el = h('button', { class: 'cmd-row', type: 'button', onclick: (e) => goWeb(e.ctrlKey || e.metaKey) },
        h('span', { class: 'tile tile--mark' }, engineMark(id, 18)),
        h('span', { class: 'grow truncate' }, t('web.searchOn', { q: q.trim(), e: ENGINES[id].name })),
        h('kbd', { class: 'kbd' }, '⇧ ↵'),
      );
      nodes.push(register({ type: 'web' }, el));
      webIdx = items.length - 1;
      for (const word of wordHits) {
        const sg = h('button', { class: 'cmd-row', type: 'button', onclick: (e) => goWeb(e.ctrlKey || e.metaKey, word) },
          h('span', { class: 'tile' }, icon('search', { size: 16 })),
          h('span', { class: 'grow truncate' }, word),
        );
        nodes.push(register({ type: 'word', word }, sg));
      }
    }
    if (cmds.length) {
      nodes.push(group(t('palette.commands')));
      for (const c of cmds) {
        const el = h('button', { class: 'cmd-row', type: 'button', onclick: () => run(c) },
          h('span', { class: 'tile' }, icon(c.icon, { size: 16 })),
          h('span', { class: 'grow truncate' }, c.label),
          c.meta ? h('span', { class: 'sub truncate' }, c.meta) : null,
        );
        nodes.push(register({ type: 'cmd', cmd: c }, el));
      }
    }
    if (!nodes.length) {
      nodes.push(h('div', { class: 'results__empty' },
        h('span', null, t('search.empty', { q: q.trim() })),
        h('span', { class: 'faint' }, t('search.hint')),
      ));
    }
    mount(results, nodes);
    if (auto) {
      const local = folderHits.length + linkHits.length;
      active = target ? 0 : local ? 0 : Math.max(0, webIdx);
    }
    active = Math.min(active, Math.max(0, items.length - 1));
    setActive(active, false);
  }

  function setActive(i, scroll = true) {
    items[active]?.el.classList.remove('is-active');
    active = i;
    const it = items[i];
    if (!it) return;
    it.el.classList.add('is-active');
    if (scroll) it.el.scrollIntoView({ block: 'nearest' });
  }

  function run(cmd) {
    clear();
    cmd.run();
  }

  function activate(background, forceWeb = false) {
    if (forceWeb && web && q.trim()) return goWeb(background);
    const it = items[active];
    if (!it) return;
    if (it.type === 'web') goWeb(background);
    else if (it.type === 'url') {
      if (!background) clear();
      web.go(it.url, { background });
    }
    else if (it.type === 'word') goWeb(background, it.word);
    else if (it.type === 'site') {
      if (!background) clear();
      web.go(it.site.url, { background });
    }
    else if (it.type === 'link') {
      if (!background) clear();
      ctx.openLink(it.link, it.folder, { background });
    } else if (it.type === 'folder') ctx.revealFolder(it.folder);
    else run(it.cmd);
  }

  function clear() {
    controller?.abort();
    extra = { q: '', sites: [], words: [] };
    q = '';
    input.value = '';
    active = 0;
    auto = true;
    render();
  }

  input.addEventListener('input', () => {
    q = input.value;
    active = 0;
    auto = true;
    render();
    fetchExtra();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      auto = false;
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(e.ctrlKey || e.metaKey, e.shiftKey);
    } else if (e.key === 'Escape') {
      if (q) {
        e.preventDefault();
        e.stopPropagation();
        clear();
      } else input.blur();
    }
  });

  return {
    field,
    results,
    hints,
    input,
    clear,
    refresh: () => q && render(),
    focus: () => { input.focus(); input.select(); },
    isActive: () => q.trim().length > 0,
    total: () => countLinks(getState()),
  };
}
