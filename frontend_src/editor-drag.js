// Insertion boundaries use live DOM rectangles, including wrapped fixed-column grids.
export function insertionAt(rects, x, y) {
  if (!rects.length) return { boundary: 0, rect: null, vertical: false };
  const bands = [];
  rects.forEach((rect, index) => {
    let band = bands.at(-1);
    if (!band || Math.abs(band.top - rect.top) > 2) bands.push(band = { top: rect.top, bottom: rect.bottom, rows: [] });
    band.bottom = Math.max(band.bottom, rect.bottom); band.rows.push({ rect, index });
  });
  const band = bands.find(b => y <= b.bottom) || bands.at(-1);
  if (y < band.top) return { boundary: band.rows[0].index, rect: band.rows[0].rect, after: false, vertical: false };
  if (y > bands.at(-1).bottom) return { boundary: rects.length, rect: rects.at(-1), after: true, vertical: false };
  if (bands.every(b => b.rows.length === 1)) {
    const { rect, index } = band.rows[0];
    const after = y > (rect.top + rect.bottom) / 2;
    return { boundary: index + (after ? 1 : 0), rect, after, vertical: false };
  }
  const rtl = band.rows[0].rect.left > band.rows.at(-1).rect.left;
  const row = band.rows.find(({ rect }) => rtl ? x > (rect.left + rect.right) / 2 : x < (rect.left + rect.right) / 2);
  const { rect, index } = row || band.rows.at(-1);
  return { boundary: index + (row ? 0 : 1), rect, after: !row, vertical: true, rtl };
}

export function editorScrollHost(element) {
  for (let node = element; node; node = node.parentElement || node.getRootNode()?.host) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement;
}

export function bindCardDrag(root, { sourceFor, commit, header, label, haptic }) {
  const events = new AbortController();
  let session, frame, consumed;
  const stopFrame = () => { if (frame) cancelAnimationFrame(frame); frame = null; };
  const cleanup = () => {
    const previous = session; session = null; stopFrame();
    if (!previous) return;
    previous.scroll.removeEventListener('scroll', locate);
    previous.row.classList.remove('drag-source'); previous.cue?.remove();
    if (previous.handle.hasPointerCapture(previous.id)) previous.handle.releasePointerCapture(previous.id);
  };
  const locate = () => {
    const s = session; if (!s?.active) return;
    s.target = null; s.cue.hidden = true;
    const top = header().bottom, bottom = s.scroll === document.scrollingElement ? innerHeight : Math.min(innerHeight, s.scroll.getBoundingClientRect().bottom);
    if (s.y < top || s.y > bottom) return;
    for (const list of root.querySelectorAll('[data-card-list]')) {
      if (list.dataset.movePage !== s.source.key || !list.getClientRects().length) continue;
      const bounds = list.getBoundingClientRect();
      if (s.x < bounds.left || s.x > bounds.right || s.y < bounds.top || s.y > bounds.bottom) continue;
      const rows = [...list.querySelectorAll(':scope > [data-card-drag]')];
      const target = insertionAt(rows.map(row => row.getBoundingClientRect()), s.x, s.y);
      s.target = { section: Number(list.dataset.moveSection), boundary: target.boundary };
      const rect = target.rect || bounds;
      const after = target.after;
      const edge = target.vertical ? (after !== Boolean(target.rtl) ? rect.right : rect.left) : (after ? rect.bottom : rect.top);
      Object.assign(s.cue.style, { left: `${target.vertical ? edge - 2 : rect.left}px`, top: `${target.vertical ? rect.top : edge - 2}px`,
        width: `${target.vertical ? 4 : rect.width}px`, height: `${target.vertical ? rect.height : 4}px` });
      Object.assign(s.cue.firstElementChild.style, { left: `${Math.max(4, Math.min(rect.left, innerWidth - 160))}px`, top: `${Math.max(top + 4, Math.min(rect.top - 32, innerHeight - 64))}px` });
      s.cue.hidden = false; return;
    }
  };
  const edgeBounds = s => {
    const bounds = s.scroll === document.scrollingElement ? { top: 0, bottom: innerHeight } : s.scroll.getBoundingClientRect();
    const top = Math.max(bounds.top, header().bottom), bottom = Math.min(bounds.bottom, innerHeight);
    return { top, bottom, zone: Math.max(1, Math.min(64, (bottom - top) / 3)) };
  };
  const inEdge = (s, edge) => {
    const { top, bottom, zone } = edgeBounds(s);
    return bottom > top && s.y >= top && s.y <= bottom && (edge === 'top' ? s.y < top + zone : s.y > bottom - zone);
  };
  const resetIntent = s => {
    s.edge = null; s.topReference = s.bottomReference = s.y; stopFrame();
  };
  const approach = (s, previousY) => {
    if (s.edge) {
      s.edgePeak = s.edge === 'top' ? Math.min(s.edgePeak, s.y) : Math.max(s.edgePeak, s.y);
      const reversal = s.edge === 'top' ? s.y - s.edgePeak : s.edgePeak - s.y;
      if (!inEdge(s, s.edge) || reversal >= 8) resetIntent(s);
      return;
    }
    s.topReference = Math.max(s.topReference, s.y);
    s.bottomReference = Math.min(s.bottomReference, s.y);
    if (s.y < previousY && s.topReference - s.y >= 16 && inEdge(s, 'top')) s.edge = 'top';
    else if (s.y > previousY && s.y - s.bottomReference >= 16 && inEdge(s, 'bottom')) s.edge = 'bottom';
    if (s.edge) s.edgePeak = s.y;
  };
  const scroll = () => {
    frame = null;
    const s = session; if (!s?.active || !s.edge) return;
    if (!inEdge(s, s.edge)) { resetIntent(s); locate(); return; }
    const { top, bottom, zone } = edgeBounds(s);
    const delta = s.edge === 'top' ? -Math.ceil(14 * Math.min(1, (top + zone - s.y) / zone))
      : Math.ceil(14 * Math.min(1, (s.y - bottom + zone) / zone));
    const before = s.scroll.scrollTop;
    s.scroll.scrollTop = Math.max(0, Math.min(s.scroll.scrollHeight - s.scroll.clientHeight, before + delta));
    locate();
    if (delta && s.scroll.scrollTop !== before) frame = requestAnimationFrame(scroll);
  };
  globalThis.addEventListener('resize', () => { if (session?.active) { locate(); if (session.edge && !frame) frame = requestAnimationFrame(scroll); } }, { signal: events.signal });
  root.addEventListener('pointerdown', event => {
    consumed = null;
    const handle = event.target.closest?.('[data-card-handle]');
    if (!handle || session || event.button !== 0 || event.isPrimary === false) return;
    const row = handle.closest('[data-card-drag]'), source = sourceFor(row);
    if (!source) return;
    session = { handle, row, source, id: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, scroll: editorScrollHost(root.host) };
    session.scroll.addEventListener('scroll', locate);
    handle.setPointerCapture(event.pointerId);
  }, { signal: events.signal });
  root.addEventListener('pointermove', event => {
    const s = session; if (!s || s.id !== event.pointerId) return;
    const previousY = s.y;
    s.x = event.clientX; s.y = event.clientY;
    if (!s.active && Math.hypot(s.x - s.startX, s.y - s.startY) < 8) return;
    event.preventDefault();
    if (!s.active) {
      s.active = true; s.row.classList.add('drag-source');
      s.cue = document.createElement('div'); s.cue.className = 'card-drop-cue';
      s.cue.setAttribute('aria-hidden', 'true'); s.cue.inert = true;
      const text = document.createElement('span'); text.textContent = label(); s.cue.append(text); root.append(s.cue);
      haptic();
      resetIntent(s);
    } else approach(s, previousY);
    locate(); if (s.edge && !frame) frame = requestAnimationFrame(scroll);
  }, { signal: events.signal, passive: false });
  root.addEventListener('pointerup', event => {
    const s = session; if (!s || s.id !== event.pointerId) return;
    if (s.active) { s.x = event.clientX; s.y = event.clientY; locate(); consumed = s.id; }
    cleanup();
    if (s.active && s.target && commit(s.source, s.target.section, s.target.boundary)) haptic();
  }, { signal: events.signal });
  for (const type of ['pointercancel', 'lostpointercapture']) root.addEventListener(type, event => {
    if (session?.id === event.pointerId) { if (session.active) consumed = session.id; cleanup(); }
  }, { signal: events.signal });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && session) { consumed = session.id; cleanup(); } }, { signal: events.signal });
  root.addEventListener('click', event => {
    if (consumed != null && event.pointerId === consumed) { event.preventDefault(); event.stopImmediatePropagation(); consumed = null; }
    else if (event.target.closest?.('[data-card-handle]')) haptic();
  }, { capture: true, signal: events.signal });
  return { cancel: cleanup, dispose() { cleanup(); events.abort(); } };
}
