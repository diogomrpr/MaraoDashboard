export const dropdownStyles = `
.marao-dropdown{position:relative;min-width:0}
.marao-dropdown button{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;width:100%;min-width:48px;padding:12px;border:0;border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;text-align:start;cursor:pointer;overflow-wrap:anywhere}
.marao-dropdown>button[aria-haspopup=menu]{background:var(--ha-card-background,var(--card-background-color));box-shadow:inset 0 0 0 1px var(--divider-color)}
.marao-dropdown button:disabled{opacity:.5;cursor:default}
.marao-dropdown button:focus{outline:none}
.marao-dropdown button:active:not(:disabled){transform:scale(.98)}
.marao-dropdown ha-icon{flex:0 0 24px;--mdc-icon-size:24px;pointer-events:none}
.marao-dropdown-options{box-sizing:border-box;position:absolute;inset:calc(100% + 4px) 0 auto;z-index:3;display:grid;gap:4px;padding:4px;border:0;border-radius:16px;max-height:360px;max-height:min(360px,60dvh);overflow:auto;overscroll-behavior:contain;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:0 4px 16px var(--opacity-contrast-200,rgba(0,0,0,.2));font:inherit}
.marao-dropdown-options[popover]{position:fixed;inset:auto;margin:0}
.marao-dropdown-options[hidden],.marao-dropdown-options[popover]:not(:popover-open){display:none}
.marao-dropdown-options button[aria-checked=true]{box-shadow:inset 0 0 0 2px var(--primary-color);font-weight:var(--font-weight-primary,700)}
.marao-dropdown-options button[aria-checked=false] ha-icon[icon="mdi:check"]{visibility:hidden}
`;

export function bindDropdown(picker, { trigger, menu, choices, value, activeElement, haptic, onSelect, onTab }) {
  const events = new AbortController(), listen = { signal: events.signal };
  let open = false;
  const floating = typeof menu.showPopover === 'function';
  if (floating) menu.setAttribute('popover', 'manual');
  const position = () => {
    if (!floating || !open) return;
    const rect = trigger.getBoundingClientRect(), viewport = globalThis.window.visualViewport;
    const top = viewport?.offsetTop || 0, left = viewport?.offsetLeft || 0;
    const width = viewport?.width || window.innerWidth, bottom = top + (viewport?.height || window.innerHeight);
    if (rect.bottom < top || rect.top > bottom) { close(); return; }
    const below = bottom - rect.bottom - 12, above = rect.top - top - 12;
    const upwards = below < 240 && above > below, available = upwards ? above : below;
    menu.style.width = `${Math.min(rect.width, width - 24)}px`;
    menu.style.maxHeight = `${Math.max(48, Math.min(360, available))}px`;
    menu.style.left = `${Math.max(left + 12, Math.min(rect.left, left + width - menu.offsetWidth - 12))}px`;
    menu.style.top = `${upwards ? Math.max(top + 12, rect.top - menu.offsetHeight - 4) : rect.bottom + 4}px`;
  };
  function close(focus = false) {
    if (open && floating && menu.matches(':popover-open')) menu.hidePopover();
    open = false; menu.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus({ preventScroll: true });
  }
  const show = () => {
    if (trigger.disabled || !choices.length) return;
    open = true; menu.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    if (floating) menu.showPopover();
    position();
    const selected = (choices.find(item => item.value === value() && !item.button.disabled) || choices.find(item => !item.button.disabled))?.button;
    selected?.focus({ preventScroll: true });
    if (selected && Number.isFinite(selected.offsetTop)) menu.scrollTop = Math.max(0, selected.offsetTop - menu.clientHeight / 2 + selected.offsetHeight / 2);
  };
  trigger.addEventListener('click', event => { event.stopPropagation(); if (!trigger.disabled) { haptic(); if (open) close(true); else show(); } }, listen);
  trigger.addEventListener('keydown', event => {
    if (!trigger.disabled && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); show(); }
  }, listen);
  for (const item of choices) item.button.addEventListener('click', event => {
    event.stopPropagation(); if (item.button.disabled) return;
    close(true); onSelect(item.value);
  }, listen);
  picker.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') {
      close();
      if (onTab) { event.preventDefault(); onTab(event.shiftKey); } else trigger.focus({ preventScroll: true });
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const enabled = choices.filter(item => !item.button.disabled);
      if (!enabled.length) return;
      const index = enabled.findIndex(item => item.button === activeElement());
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : enabled.length - 1)) % enabled.length;
      enabled[target].button.focus({ preventScroll: true });
    }
  }, listen);
  globalThis.document.addEventListener?.('pointerdown', event => { if (!event.composedPath().includes(picker)) close(); }, { ...listen, capture: true });
  globalThis.window?.addEventListener?.('resize', position, listen);
  globalThis.window?.addEventListener?.('scroll', position, { ...listen, capture: true });
  globalThis.window?.visualViewport?.addEventListener('resize', position, listen);
  const sync = () => {
    for (const item of choices) { item.button.disabled = trigger.disabled; item.button.setAttribute('aria-checked', String(!trigger.disabled && item.value === value())); }
    if (trigger.disabled) close(); else position();
  };
  close(); sync();
  return { element: picker, sync, close, get open() { return open; }, destroy() { close(); events.abort(); } };
}
