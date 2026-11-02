// Disposizione delle cartelle nella nuova scheda: cartelle larghe (2 colonne) e mosaico senza buchi.
// Il mosaico usa righe da 1px e fa occupare a ogni cartella tante righe quanto è alta: l'ordine nel DOM
// (e quindi il trascinamento) resta quello vero, la griglia riempie da sola la colonna più corta.
let observer = null;

export function arrangeFolders(grid) {
  observer?.disconnect();
  observer = null;
  if (!grid) return;
  const cards = [...grid.children];
  const run = () => {
    const cs = getComputedStyle(grid);
    const cols = cs.gridTemplateColumns.split(' ').filter((c) => c && parseFloat(c) > 0).length;
    const gap = parseFloat(cs.columnGap) || 0;
    const masonry = document.documentElement.dataset.flow === 'masonry' && cols > 1;
    grid.classList.toggle('folders--masonry', masonry);
    for (const c of cards) {
      const col = c.dataset.wide && cols > 1 ? 'span 2' : '';
      if (c.style.gridColumn !== col) c.style.gridColumn = col;
      const row = masonry ? `span ${Math.ceil(c.offsetHeight + gap)}` : '';
      if (c.style.gridRowEnd !== row) c.style.gridRowEnd = row;
    }
  };
  let frame = 0;
  const later = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(run);
  };
  run();
  if (typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(later);
  observer.observe(grid);
  for (const c of cards) observer.observe(c);
}
