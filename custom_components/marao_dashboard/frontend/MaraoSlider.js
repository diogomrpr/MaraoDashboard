const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const sliderStyles = `
    .slider { position:relative; display:flex; align-items:center; width:100%; min-height:48px; height:48px; }
    .slider-track { position:absolute; inset:0; width:100%; height:48px; pointer-events:none; shape-rendering:geometricPrecision; }
    .slider-background,.slider-fill,.slider-thumb { stroke:var(--marao-slider-thumb-border,#415C65); stroke-width:1px; }
    .slider-background,.slider-fill { x:.5px; y:.5px; height:47px; rx:23.5px; ry:23.5px; }
    .slider-background { width:calc(100% - 1px); fill:var(--marao-slider-track,#B4C7C9); }
    .slider-fill { width:calc(47px + (100% - 48px) * var(--marao-slider-fraction,0)); fill:var(--marao-slider-fill,#F3F3EE); }
    .slider-thumb { cx:calc(24px + (100% - 48px) * var(--marao-slider-target-fraction,0)); cy:24px; r:23.5px; fill:var(--marao-slider-thumb,#FFFFFF); transition:filter .12s ease; }
    .slider:has(input:disabled) .slider-fill { fill:var(--marao-slider-disabled-fill,#D8DFDB); }
    .slider:has(input:active:not(:disabled)) .slider-thumb { filter:brightness(.9); }
    input[type=range] { position:absolute; inset:0; z-index:1; appearance:none; width:100%; min-height:48px; height:48px; margin:0; padding:0; border:0; border-radius:24px; background:transparent; cursor:pointer; }
    input[type=range]:disabled { cursor:default; }
    input[type=range]::-webkit-slider-runnable-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-webkit-slider-thumb { appearance:none; box-sizing:border-box; width:48px; height:48px; margin-top:0; border:0; border-radius:50%; background:transparent; box-shadow:none; }
    input[type=range]::-moz-range-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-progress { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-thumb { box-sizing:border-box; width:48px; height:48px; border:0; border-radius:50%; background:transparent; box-shadow:none; }
`;

export function sliderMarkup({ key, current, value = current, min = 0, max = 100, step = 1, label, disabled = false }) {
  return `<div class="slider"><svg class="slider-track" aria-hidden="true" focusable="false"><rect class="slider-background"></rect><rect class="slider-fill"></rect><circle class="slider-thumb"></circle></svg><input data-slider-key="${esc(key)}" data-slider-current="${Number.isFinite(current) ? current : min}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(label)}" title="${esc(label)}"${disabled ? ' disabled' : ''}></div>`;
}

export function bindSlider(input, { haptic, onInput, onStart, onCommit, onEnd, onCancel } = {}) {
  let gesture;
  let destroyed = false;
  const fraction = value => {
    const min = Number(input.min), max = Number(input.max);
    return max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  };
  const update = (current = Number(input.dataset.sliderCurrent ?? input.value), target = Number(input.value)) => {
    input.dataset.sliderCurrent = String(current);
    input.value = String(target);
    const progress = Math.min(fraction(current), fraction(target));
    input.style.setProperty('--marao-slider-progress', `${progress * 100}%`);
    input.parentElement?.style.setProperty('--marao-slider-progress', `${progress * 100}%`);
    input.parentElement?.style.setProperty('--marao-slider-fraction', String(progress));
    input.parentElement?.style.setProperty('--marao-slider-target-fraction', String(fraction(target)));
  };
  const cancel = () => {
    if (!gesture || gesture.cancelled || gesture.completed) return;
    gesture.cancelled = true;
    update(undefined, Number(input.dataset.sliderCurrent ?? input.value));
    onCancel?.(gesture);
  };
  const commit = () => {
    if (destroyed || input.disabled || gesture && (gesture.cancelled || !gesture.completed || gesture.dispatched)) return;
    if (gesture && !gesture.changed && Number(input.value) === gesture.startValue) return;
    if (gesture) gesture.dispatched = true;
    onCommit?.(Number(input.value));
  };
  const listeners = {
    input: () => {
      if (destroyed || input.disabled || gesture?.cancelled) return;
      if (gesture) gesture.changed = true;
      update();
      onInput?.(Number(input.value));
    },
    pointerdown: event => {
      if (destroyed || input.disabled || event.button != null && event.button !== 0) return;
      gesture = { input, key: input.dataset.sliderKey, completed: false, cancelled: false, dispatched: false, startValue: Number(input.value) };
      haptic?.('heavy');
      onStart?.(gesture);
    },
    pointerup: () => {
      if (!gesture || gesture.cancelled || gesture.completed) return;
      gesture.completed = true;
      commit();
      onEnd?.(gesture);
    },
    pointercancel: cancel,
    keydown: event => {
      if (destroyed || input.disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      gesture = undefined;
      haptic?.('heavy');
    },
    change: commit,
  };
  for (const [type, listener] of Object.entries(listeners)) input.addEventListener(type, listener);
  update();
  return {
    update,
    cancel,
    destroy() {
      destroyed = true;
      cancel();
      for (const [type, listener] of Object.entries(listeners)) input.removeEventListener(type, listener);
    },
  };
}
