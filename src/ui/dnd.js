// Drag and drop nativo: riordino link, spostamento tra cartelle, riordino cartelle (dalla maniglia).
export function initDnd(root, { get, moveLink, moveFolder, enabled }) {
  let drag = null;

  const clearMarks = () => {
    root.querySelectorAll('.drop-before, .drop-after, .drop-into, .dragging').forEach((el) => {
      el.classList.remove('drop-before', 'drop-after', 'drop-into');
    });
  };
  const reset = () => {
    clearMarks();
    root.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    root.querySelectorAll('.folder[draggable="true"]').forEach((el) => (el.draggable = false));
    drag = null;
  };

  root.addEventListener('mousedown', (e) => {
    const grip = e.target.closest?.('[data-grip]');
    if (grip && enabled()) grip.closest('.folder').draggable = true;
  });
  root.addEventListener('mouseup', () => {
    root.querySelectorAll('.folder[draggable="true"]').forEach((el) => (el.draggable = false));
  });

  root.addEventListener('dragstart', (e) => {
    if (!enabled()) return e.preventDefault();
    const el = e.target;
    if (el.matches?.('.link[data-link-id]')) drag = { kind: 'link', id: el.dataset.linkId };
    else if (el.matches?.('.folder[data-folder-id]')) drag = { kind: 'folder', id: el.dataset.folderId };
    else return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', drag.id);
    requestAnimationFrame(() => el.classList.add('dragging'));
  });

  function locate(e) {
    if (drag.kind === 'link') {
      const row = e.target.closest?.('.link[data-link-id]');
      if (row && row.dataset.linkId !== drag.id) {
        const r = row.getBoundingClientRect();
        // Le tessere stanno in griglia: contano le colonne, non le righe.
        const after = row.classList.contains('link--tile') ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
        return { el: row, kind: 'link', id: row.dataset.linkId, after, folderId: row.closest('.folder').dataset.folderId };
      }
      const folder = e.target.closest?.('.folder[data-folder-id]');
      if (folder && !row) return { el: folder, kind: 'into', folderId: folder.dataset.folderId };
      return null;
    }
    const folder = e.target.closest?.('.folder[data-folder-id]');
    if (!folder || folder.dataset.folderId === drag.id) return null;
    const r = folder.getBoundingClientRect();
    const cols = getComputedStyle(folder.parentElement).gridTemplateColumns.split(' ').length;
    const after = cols > 1 ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    return { el: folder, kind: 'folder', id: folder.dataset.folderId, after };
  }

  root.addEventListener('dragover', (e) => {
    if (!drag) return;
    const hit = locate(e);
    clearMarks();
    if (!hit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    hit.el.classList.add(hit.kind === 'into' ? 'drop-into' : hit.after ? 'drop-after' : 'drop-before');
  });

  root.addEventListener('drop', (e) => {
    if (!drag) return;
    const hit = locate(e);
    const current = drag;
    reset();
    if (!hit) return;
    e.preventDefault();
    const state = get();
    if (current.kind === 'link') {
      const from = state.folders.find((f) => f.links.some((l) => l.id === current.id));
      const fromIndex = from ? from.links.findIndex((l) => l.id === current.id) : -1;
      const target = state.folders.find((f) => f.id === hit.folderId);
      if (!target) return;
      let to = hit.kind === 'into' ? target.links.length : target.links.findIndex((l) => l.id === hit.id) + (hit.after ? 1 : 0);
      if (from === target && fromIndex < to) to -= 1;
      moveLink(current.id, target.id, to);
    } else {
      const fromIndex = state.folders.findIndex((f) => f.id === current.id);
      let to = state.folders.findIndex((f) => f.id === hit.id) + (hit.after ? 1 : 0);
      if (fromIndex < to) to -= 1;
      moveFolder(current.id, to);
    }
  });

  root.addEventListener('dragend', reset);
  root.addEventListener('dragleave', (e) => {
    if (!root.contains(e.relatedTarget)) clearMarks();
  });
}
