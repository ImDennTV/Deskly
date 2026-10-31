// Effetti della nuova scheda: posizione del mouse per lo spotlight delle cartelle e ingresso a cascata.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

export function initEffects(root) {
  if (document.body.dataset.mode !== 'newtab' && root.dataset.mode !== 'newtab') return;

  let frame = 0;
  let last = null;
  root.addEventListener('pointermove', (e) => {
    if (reduce.matches || e.pointerType === 'touch') return;
    last = e;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const card = last.target.closest?.('.folder');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${last.clientX - r.left}px`);
      card.style.setProperty('--my', `${last.clientY - r.top}px`);
    });
  }, { passive: true });
}

// Da chiamare dopo il primo render: numera le cartelle per la cascata e spegne l'ingresso a fine animazione.
export function playIntro(root) {
  if (reduce.matches) return;
  root.querySelectorAll('.folder').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 10)));
  document.body.classList.add('is-intro');
  setTimeout(() => document.body.classList.remove('is-intro'), 1700);
}
