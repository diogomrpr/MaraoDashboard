// The only native-edit compatibility boundary used by ordinary runtime cards.
// No HA classes are imported or patched; the installed host owns notifications.
export function findNativeHost(owner) {
  const visited = new Set();
  for (let node = owner; node && !visited.has(node); node = node.nativeOwner || node.parentNode || node.parentElement || node.host || node.getRootNode?.()?.host) {
    visited.add(node);
    if (node.localName === 'hui-root') return node;
  }
  return null;
}

export function nativeEditing(owner) {
  return Boolean(findNativeHost(owner)?.lovelace?.editMode);
}

export function bindNativeEditing(owner, onChange) {
  const host = findNativeHost(owner), originalInert = Boolean(owner.inert);
  let editing;
  const sync = () => {
    const next = nativeEditing(owner);
    if (next === editing) return;
    const initial = editing === undefined;
    editing = next;
    owner.inert = next || originalInert;
    if (!initial || next) onChange?.(next);
  };
  const guard = event => {
    if (!nativeEditing(owner) && !owner.preview) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const events = ['click', 'dblclick', 'contextmenu', 'pointerdown', 'pointerup', 'keydown'];
  for (const event of events) owner.shadowRoot?.addEventListener?.(event, guard, true);
  const controller = { hostUpdated: sync, hostConnected: sync, hostDisconnected: sync };
  // Nested renderers inherit their owner's update; only independent raw cards subscribe.
  const subscribed = !owner.nativeOwner && host?.addController && host?.removeController;
  if (subscribed) host.addController(controller);
  sync();
  return () => {
    if (subscribed) host.removeController(controller);
    for (const event of events) owner.shadowRoot?.removeEventListener?.(event, guard, true);
    if (owner.inert === Boolean(editing || originalInert)) owner.inert = originalInert;
  };
}
