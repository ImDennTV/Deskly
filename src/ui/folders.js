import { h, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { cachedIcon, loadIcon } from '../core/favicons.js';
import { displayUrl, hostOf } from '../core/model.js';
import { tagColor } from '../core/colors.js';

const INITIAL_ROWS = 8;
const INITIAL_TILES = 15;

// Icona del sito: favicon se disponibile, altrimenti lettera o icona scelta.
export function favEl(link, { favicons = true, size = 32 } = {}) {
  const host = hostOf(link.url);
  const hue = tagColor(host || link.title);
  if (link.icon) {
    return h('span', { class: 'fav fav--icon', style: { '--fc': hue } }, icon(link.icon, { size: size > 32 ? 26 : 15 }));
  }
  const letter = (link.title || host || '?').trim().charAt(0);
  const fallback = () => h('span', { class: 'fav fav--letter', style: { '--fc': hue } }, letter);
  if (!favicons || !/^https?:/.test(link.url)) return fallback();
  // Parte come lettera e diventa l'icona appena è pronta; se l'icona c'è già in cache compare subito.
  const holder = fallback();
  const show = (e) => {
    const img = h('img', { src: e.src, alt: '', decoding: 'async', draggable: false });
    img.addEventListener('error', () => { holder.className = 'fav fav--letter'; holder.removeAttribute('data-tone'); holder.replaceChildren(letter); }, { once: true });
    holder.className = 'fav';
    if (e.tone) holder.dataset.tone = e.tone;
    holder.replaceChildren(img);
  };
  const hit = cachedIcon(link.url);
  if (hit) show(hit);
  else loadIcon(link.url).then((e) => e && show(e));
  return holder;
}

export function folderTile(folder, size = '') {
  return h('span', { class: `tile${size ? ` tile--${size}` : ''}`, style: { '--fc': folder.color } }, icon(folder.icon, { size: size === 'lg' ? 20 : size === 'sm' ? 13 : 16 }));
}

function subtitle(link) {
  if (link.note) return link.note;
  const host = hostOf(link.url).replace(/^www\./, '');
  const label = host.split('.')[0].toLowerCase();
  const title = (link.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return title.includes(label.replace(/[^a-z0-9]/g, '')) ? '' : displayUrl(link.url);
}

export function linkRow(link, folder, ctx) {
  const sub = subtitle(link);
  const main = h(
    'a',
    {
      class: 'link__main',
      href: link.url,
      draggable: false,
      title: link.url,
      onclick: (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: e.ctrlKey || e.metaKey });
      },
      onauxclick: (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: true });
      },
    },
    favEl(link, ctx.settings),
    h('span', { class: 'link__text' },
      h('span', { class: 'link__title truncate' }, link.title),
      sub ? h('span', { class: 'link__sub truncate' }, sub) : null,
    ),
    link.tag ? h('span', { class: 'badge', style: { '--bc': tagColor(link.tag) } }, link.tag) : null,
  );
  const star = h('button', {
    class: 'ibtn ibtn--fav',
    type: 'button',
    'aria-pressed': link.fav ? 'true' : 'false',
    'aria-label': link.fav ? t('link.unfav') : t('link.fav'),
    title: link.fav ? t('link.unfav') : t('link.fav'),
    onclick: () => ctx.toggleFav(link),
  }, icon('star', { size: 15 }));
  if (link.fav) star.firstChild.setAttribute('fill', 'currentColor');
  const more = h('button', {
    class: 'ibtn',
    type: 'button',
    'aria-label': t('common.more'),
    title: t('common.more'),
    onclick: (e) => ctx.linkMenu(link, folder, e.currentTarget),
  }, icon('ellipsis', { size: 16 }));
  return h(
    'div',
    {
      class: `link${link.fav ? ' is-fav' : ''}`,
      draggable: ctx.canDrag,
      dataset: { linkId: link.id },
      oncontextmenu: (e) => {
        e.preventDefault();
        ctx.linkMenu(link, folder, { x: e.clientX, y: e.clientY });
      },
    },
    main,
    h('div', { class: 'link__actions' }, star, more),
  );
}

// Tessera grande per la nuova scheda: icona in vetro e nome sotto, come un'app.
export function linkTile(link, folder, ctx) {
  const main = h(
    'a',
    {
      class: 'link__main',
      href: link.url,
      draggable: false,
      title: link.note ? `${link.title} · ${link.note}` : `${link.title} · ${displayUrl(link.url)}`,
      onclick: (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: e.ctrlKey || e.metaKey });
      },
      onauxclick: (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: true });
      },
    },
    h('span', { class: 'ltile__ico' }, favEl(link, { ...ctx.settings, size: 64 })),
    h('span', { class: 'ltile__title truncate' }, link.title),
  );
  const star = h('button', {
    class: 'ibtn ibtn--fav',
    type: 'button',
    'aria-pressed': link.fav ? 'true' : 'false',
    'aria-label': link.fav ? t('link.unfav') : t('link.fav'),
    title: link.fav ? t('link.unfav') : t('link.fav'),
    onclick: () => ctx.toggleFav(link),
  }, icon('star', { size: 13 }));
  if (link.fav) star.firstChild.setAttribute('fill', 'currentColor');
  const more = h('button', {
    class: 'ibtn',
    type: 'button',
    'aria-label': t('common.more'),
    title: t('common.more'),
    onclick: (e) => ctx.linkMenu(link, folder, e.currentTarget),
  }, icon('ellipsis', { size: 14 }));
  return h(
    'div',
    {
      class: `link link--tile${link.fav ? ' is-fav' : ''}`,
      draggable: ctx.canDrag,
      dataset: { linkId: link.id },
      oncontextmenu: (e) => {
        e.preventDefault();
        ctx.linkMenu(link, folder, { x: e.clientX, y: e.clientY });
      },
    },
    main,
    h('div', { class: 'link__actions' }, star, more),
  );
}

export function folderCard(folder, ctx) {
  const collapsed = Boolean(folder.collapsed) && !ctx.forceOpen;
  const count = folder.links.length;
  const isNewtab = ctx.mode === 'newtab';
  const tiles = isNewtab && ctx.settings.newtabLayout !== 'list';
  const limit = tiles ? INITIAL_TILES : INITIAL_ROWS;
  const open = ctx.expanded.has(folder.id);
  const shown = isNewtab && !open && count > limit ? folder.links.slice(0, limit) : folder.links;

  const head = h(
    'div',
    { class: 'folder__head' },
    ctx.canDrag
      ? h('span', { class: 'folder__grip', dataset: { grip: '1' }, title: t('folder.reorder'), 'aria-hidden': 'true' }, icon('grip-vertical', { size: 14 }))
      : null,
    h('button', {
      class: 'folder__toggle',
      type: 'button',
      'aria-expanded': collapsed ? 'false' : 'true',
      title: collapsed ? t('folder.expand') : t('folder.collapse'),
      onclick: () => ctx.toggleCollapse(folder),
    },
      folderTile(folder),
      h('span', { class: 'truncate' },
        h('span', { class: 'folder__name' }, folder.name),
        ' ',
        h('span', { class: 'folder__count' }, t('folder.links', { n: count })),
      ),
      icon('chevron-down', { size: 14, cls: 'folder__chev' }),
    ),
    h('div', { class: 'folder__tools' },
      h('button', { class: 'ibtn', type: 'button', title: t('folder.openGroup'), 'aria-label': t('folder.openGroup'), disabled: !count, onclick: () => ctx.openFolder(folder) }, icon('layers', { size: 16 })),
      h('button', { class: 'ibtn', type: 'button', title: t('folder.addLink'), 'aria-label': t('folder.addLink'), onclick: () => ctx.addLink(folder) }, icon('plus', { size: 16 })),
      h('button', { class: 'ibtn', type: 'button', title: t('folder.moreOptions'), 'aria-label': t('folder.moreOptions'), onclick: (e) => ctx.folderMenu(folder, e.currentTarget) }, icon('ellipsis', { size: 16 })),
    ),
  );

  let body = null;
  if (!collapsed) {
    if (!count) {
      body = h('div', { class: 'folder__empty' },
        h('span', null, t('folder.emptyHint')),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => ctx.addLink(folder) }, icon('plus', { size: 14 }), t('folder.addLink')),
      );
    } else {
      const more = isNewtab && count > limit
        ? h('button', { class: 'folder__more', type: 'button', onclick: () => ctx.toggleExpanded(folder) },
            open ? t('folder.showLess') : t('folder.showMore', { n: count - limit }))
        : null;
      if (tiles) {
        body = h('div', { class: 'folder__tiles' },
          shown.map((l) => linkTile(l, folder, ctx)),
          // L'ultima tessera aggiunge un link: nessuna caccia al pulsante.
          !more || open
            ? h('button', { class: 'ltile ltile--add', type: 'button', title: t('folder.addLink'), 'aria-label': t('folder.addLink'), onclick: () => ctx.addLink(folder) },
                h('span', { class: 'ltile__ico' }, icon('plus', { size: 22 })),
                h('span', { class: 'ltile__title truncate' }, t('folder.addLink')))
            : null,
        );
        if (more) body = h('div', { class: 'folder__body' }, body, more);
      } else {
        body = h('div', { class: 'folder__links' }, shown.map((l) => linkRow(l, folder, ctx)), more);
      }
    }
  }

  return h(
    'section',
    {
      class: `folder${collapsed ? ' is-collapsed' : ''}`,
      style: { '--fc': folder.color },
      dataset: { folderId: folder.id },
      oncontextmenu: (e) => {
        if (e.target.closest('.link')) return;
        e.preventDefault();
        ctx.folderMenu(folder, { x: e.clientX, y: e.clientY });
      },
    },
    head,
    body,
  );
}

// Chip compatta per preferiti e recenti.
export function chip(link, folder, ctx) {
  return h(
    'a',
    {
      class: 'chip',
      href: link.url,
      title: `${link.title} · ${folder.name}`,
      onclick: (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: e.ctrlKey || e.metaKey });
      },
      onauxclick: (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        ctx.openLink(link, folder, { background: true });
      },
      oncontextmenu: (e) => {
        e.preventDefault();
        ctx.linkMenu(link, folder, { x: e.clientX, y: e.clientY });
      },
    },
    favEl(link, ctx.settings),
    h('span', { class: 'truncate' }, link.title),
  );
}

export function emptyState(ctx) {
  return h('div', { class: 'empty' },
    h('span', { class: 'tile tile--lg' }, icon('folder-plus', { size: 20 })),
    h('h2', null, t('home.empty.title')),
    h('p', null, t('home.empty.sub')),
    h('div', { class: 'empty__actions' },
      h('button', { class: 'btn btn--primary', type: 'button', onclick: ctx.newFolder }, icon('plus', { size: 16 }), t('home.newFolder')),
      ctx.smartImport ? h('button', { class: 'btn', type: 'button', onclick: ctx.smartImport }, icon('sparkles', { size: 15 }), t('onb.smart')) : null,
    ),
  );
}
