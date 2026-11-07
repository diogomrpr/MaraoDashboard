// HA custom editors receive the dashboard document directly; runtime roots expose a wrapper.
export function nativeDashboardConfig(context) {
  return context?.rawConfig || context?.config || (Array.isArray(context?.views)?context:undefined);
}

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

// HA mounts card dialogs beside the dashboard, outside the runtime root's ancestry.
export function findNativeEditorContext(owner) {
  let dialog;
  for(let node=owner;node;node=node.parentNode || node.host || node.getRootNode?.()?.host) {
    if(node._maraoPopupDraftOwner)return;
    if(node.localName==='hui-dialog-edit-card'){dialog=node;break;}
  }
  const path=globalThis.location?.pathname.split('/')[1];
  const root=findNativeHost(owner) || globalThis.window?.MaraoNativeBootstrap?.findHost?.(path);
  if(root && dialog && typeof dialog.closeDialog==='function' && typeof dialog.isEffectiveDirtyState==='boolean')return {root,dialog};
}

export function nativeEditing(owner) {
  const visited=new Set();
  for(let node=owner;node&&!visited.has(node);node=node.nativeOwner||node.parentNode||node.parentElement||node.host||node.getRootNode?.()?.host){
    visited.add(node);
    if(node._maraoPopupDraftOwner||['hui-card-picker','hui-card-preview','hui-card-element-editor','hui-dialog-edit-card','hui-dialog-create-card'].includes(node.localName))return true;
  }
  return Boolean(findNativeHost(owner)?.lovelace?.editMode);
}

// HA dialogs are mounted beside hui-root, across shadow boundaries. Native
// editMode alone is not dirty; only an effective unsaved dialog draft blocks.
export function nativeDashboardHasDraft(root) {
  const visit=tree=>{
    if(!tree?.querySelectorAll)return false;
    for(const node of tree.querySelectorAll('*')) {
      if(node.localName?.startsWith('hui-dialog-edit-')&&node.isEffectiveDirtyState===true)return true;
      if(node.shadowRoot&&visit(node.shadowRoot))return true;
    }
    return false;
  };
  return visit(root?.ownerDocument||globalThis.document);
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
