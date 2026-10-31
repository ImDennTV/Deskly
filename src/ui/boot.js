// Script bloccante: applica l'aspetto salvato prima del primo paint, così non c'è nessun lampo.
(function () {
  try {
    var b = JSON.parse(localStorage.getItem('deskly-boot') || '{}');
    var d = document.documentElement;
    var theme = b.theme;
    if (!theme || theme === 'auto') theme = matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'midnight';
    d.dataset.theme = theme;
    var keys = { density: 'density', radius: 'radius', font: 'font', hfont: 'hfont', card: 'card', tile: 'tile', width: 'width', aurora: 'aurora', dim: 'dim', bg: 'bg' };
    for (var k in keys) if (b[k]) d.dataset[keys[k]] = b[k];
    if (b.grain === false) d.dataset.grain = 'off';
    if (b.fx === false) d.dataset.fx = 'off';
    if (b.blur) d.dataset.bgblur = '';
    if (b.bg === 'image') {
      var img = localStorage.getItem('deskly-bg');
      if (img) d.style.setProperty('--bg-image', 'url("' + img + '")');
    }
    if (b.vars) for (var v in b.vars) d.style.setProperty(v, b.vars[v]);
    if (b.accent) {
      d.style.setProperty('--accent', b.accent);
      d.style.setProperty('--accent-ink', b.ink || '#ffffff');
    }
  } catch (e) {}
})();
