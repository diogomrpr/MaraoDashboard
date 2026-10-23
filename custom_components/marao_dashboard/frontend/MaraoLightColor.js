const [{ sliderStyles, sliderMarkup, bindSlider }, { lightColorCapabilities }] = await Promise.all([
  import(new URL(`./MaraoSlider.js${new URL(import.meta.url).search}`, import.meta.url)),
  import(new URL(`./MaraoLightCapabilities.js${new URL(import.meta.url).search}`, import.meta.url)),
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hue = value => ((value % 360) + 360) % 360;
const styles = `
  ${sliderStyles}
  .light-color-picker { display:grid; gap:16px; color:var(--primary-text-color); font-family:var(--primary-font-family,inherit); }
  .light-color-picker [hidden] { display:none; }
  .light-color-picker button:focus,.light-color-picker input:focus { outline:none; }
  .light-color-status { min-height:1.25em; line-height:1.25; margin:0; font-size:var(--font-size-secondary,1rem); overflow-wrap:anywhere; }
  .light-color-status[data-error] { color:var(--error-color,#c62828); }
  .light-color-section { display:grid; gap:8px; min-width:0; }
  .light-color-labels { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:4px 12px; line-height:1.25; }
  .light-color-labels label { font-size:var(--font-size-secondary,1rem); }
  .light-color-value { font-size:var(--font-size-caption,.9375rem); }
  .light-color-wheel { position:relative; display:block; width:min(100%,260px); aspect-ratio:1; min-width:48px; min-height:48px; margin:0 auto; padding:0; border:0; border-radius:50%; box-sizing:border-box; cursor:crosshair; touch-action:none; background:radial-gradient(circle closest-side,#fff 0%,transparent calc(100% - 24px)),conic-gradient(from 90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00); -webkit-tap-highlight-color:transparent; }
  .light-color-wheel:disabled { cursor:default; filter:grayscale(1); opacity:.5; }
  .light-color-thumb { position:absolute; width:48px; height:48px; box-sizing:border-box; border:3px solid #fff; border-radius:50%; box-shadow:0 0 0 1px #415C65,inset 0 0 0 1px #415C65; transform:translate(-50%,-50%); pointer-events:none; }
  .light-temperature .slider { border-radius:24px; background:linear-gradient(90deg,#ffc078,#fff4df,#c9e2ff); }
  .light-temperature .slider-background { fill:transparent; }
  .light-temperature .slider-fill { fill:color-mix(in srgb,var(--marao-slider-fill,#F3F3EE) 55%,transparent); }
  .light-temperature:has(input:disabled) .slider { filter:grayscale(1); }
  .light-temperature-ends { display:flex; justify-content:space-between; gap:12px; font-size:var(--font-size-caption,.9375rem); }
`;

export function createLightColorPicker(host, initialOptions) {
  let options = initialOptions, destroyed = false, requestId = 0, error = '';
  let wheelGesture, selected = [0, 0];
  const sliders = [];
  const root = document.createElement('section');
  root.className = 'light-color-picker';
  const style = document.createElement('style'); style.textContent = styles; root.append(style);
  const add = (tag, className, parent = root) => {
    const element = document.createElement(tag); element.className = className; parent.append(element); return element;
  };
  const status = add('p', 'light-color-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const localize = (key, fallback, values = {}) => options.localize?.(key, values, fallback) || fallback;
  const state = () => options.hass?.states?.[options.entity];
  const capabilities = () => lightColorCapabilities(state());
  const unavailable = () => !options.hass?.states ? 'loading'
    : !options.hass.callService || options.hass.connected === false || options.hass.connection?.connected === false ? 'disconnected'
    : !state() || state().state === 'unavailable' ? 'unavailable'
    : state().state === 'unknown' ? 'unknown' : '';
  const initialCapabilities = capabilities();
  const wheelSection = add('div', 'light-color-section'); wheelSection.hidden = !initialCapabilities.color;
  const wheelLabel = add('span', 'light-color-labels', wheelSection);
  const wheel = add('button', 'light-color-wheel', wheelSection);
  wheel.type = 'button'; wheel.setAttribute('role', 'slider');
  wheel.setAttribute('aria-valuemin', '0'); wheel.setAttribute('aria-valuemax', '360');
  const thumb = add('span', 'light-color-thumb', wheel); thumb.setAttribute('aria-hidden', 'true');
  const listeners = [];
  const listen = (element, type, callback) => { element.addEventListener(type, callback); listeners.push([element, type, callback]); };

  function drawWheel() {
    const [h, s] = selected, angle = h * Math.PI / 180;
    const radius = Math.max(0, wheel.getBoundingClientRect().width / 2 - 24);
    thumb.style.left = `calc(50% + ${Math.cos(angle) * radius * s / 100}px)`;
    thumb.style.top = `calc(50% + ${Math.sin(angle) * radius * s / 100}px)`;
    thumb.style.background = `hsl(${h} 100% ${100 - s / 2}%)`;
    wheel.setAttribute('aria-valuenow', String(Math.round(h)));
    wheel.setAttribute('aria-valuetext', localize('light.color_value', `Hue ${Math.round(h)}°, saturation ${Math.round(s)}%`, { hue:Math.round(h), saturation:Math.round(s) }));
  }
  function authoritativeColor() {
    const hs = state()?.attributes?.hs_color;
    return Array.isArray(hs) && hs.length === 2 && hs.every(Number.isFinite) ? [hue(hs[0]), clamp(hs[1], 0, 100)] : [0, 0];
  }
  function cancelWheel() {
    if (!wheelGesture) return;
    const pointerId = wheelGesture.pointerId; wheelGesture = undefined;
    if (pointerId != null && wheel.hasPointerCapture?.(pointerId)) wheel.releasePointerCapture(pointerId);
    selected = authoritativeColor(); drawWheel();
  }
  async function send(data, capability) {
    if (destroyed || unavailable() || !capabilities()[capability]) return;
    const id = ++requestId, entity = options.entity;
    try {
      await options.callService(data);
      if (!destroyed && id === requestId && entity === options.entity) error = '';
    } catch (cause) {
      if (!destroyed && id === requestId && entity === options.entity) {
        error = String(cause?.message || cause?.body?.message || (typeof cause === 'string' ? cause : '')).trim()
          || localize('light.color_error', 'Could not update the light.');
      }
    }
    if (!destroyed && id === requestId) refresh();
  }
  function point(event) {
    const box = wheel.getBoundingClientRect(), x = event.clientX - box.left - box.width / 2, y = event.clientY - box.top - box.height / 2;
    const radius = Math.max(1, box.width / 2 - 24);
    selected = [hue(Math.atan2(y, x) * 180 / Math.PI), Math.min(100, Math.hypot(x, y) / radius * 100)];
    drawWheel();
  }
  function completeWheel() {
    if (!wheelGesture || wheel.disabled) return cancelWheel();
    const value = selected.map(value => Math.round(value * 10) / 10);
    cancelWheel(); options.haptic?.('heavy');
    void send({ hs_color:value }, 'color');
  }
  listen(wheel, 'pointerdown', event => {
    if (wheel.disabled || wheelGesture || event.isPrimary === false || event.button != null && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    wheelGesture = { pointerId:event.pointerId }; wheel.setPointerCapture?.(event.pointerId);
    options.haptic?.('heavy'); point(event);
  });
  listen(wheel, 'pointermove', event => { if (wheelGesture?.pointerId === event.pointerId) point(event); });
  listen(wheel, 'pointerup', event => { if (wheelGesture?.pointerId === event.pointerId) { point(event); completeWheel(); } });
  listen(wheel, 'pointercancel', cancelWheel);
  listen(wheel, 'lostpointercapture', cancelWheel);
  listen(wheel, 'blur', cancelWheel);
  listen(wheel, 'click', event => { event.preventDefault(); event.stopPropagation(); });
  listen(wheel, 'keydown', event => {
    if (event.key === 'Escape') return cancelWheel();
    if (wheel.disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || wheelGesture?.pointerId != null) return;
    event.preventDefault(); event.stopPropagation();
    if (!wheelGesture) { wheelGesture = { keyboard:true }; options.haptic?.('heavy'); }
    if (event.key === 'ArrowLeft') selected[0] = hue(selected[0] - 5);
    if (event.key === 'ArrowRight') selected[0] = hue(selected[0] + 5);
    if (event.key === 'ArrowUp') selected[1] = clamp(selected[1] + 5, 0, 100);
    if (event.key === 'ArrowDown') selected[1] = clamp(selected[1] - 5, 0, 100);
    if (event.key === 'Home') selected[1] = 0;
    if (event.key === 'End') selected[1] = 100;
    drawWheel();
  });
  listen(wheel, 'keyup', event => {
    if (wheelGesture?.keyboard && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); completeWheel();
    }
  });

  function addSlider(capability, labelKey, fallback, min, max, value, format, payload) {
    const section = add('div', `light-color-section light-${capability}`);
    section.hidden = !initialCapabilities[capability];
    const heading = add('div', 'light-color-labels', section);
    const label = add('label', '', heading), output = add('span', 'light-color-value', heading);
    const range = add('div', '', section);
    range.innerHTML = sliderMarkup({ key:capability, current:value(), min, max, label:localize(labelKey, fallback) });
    const input = range.querySelector('input');
    label.addEventListener('click', () => input.focus({ preventScroll:true }));
    const item = { input, section, active:false, value, output, label, labelKey, fallback, capability, format };
    item.control = bindSlider(input, {
      haptic:strength => options.haptic?.(strength),
      onStart:() => { item.active = true; },
      onInput:target => { output.textContent = format(target); },
      onCommit:target => {
        if (!unavailable() && capabilities()[capability]) void send(payload(target), capability);
      },
      onEnd:() => { item.active = false; refresh(); },
      onCancel:() => { item.active = false; refresh(); },
    });
    sliders.push(item);
    return section;
  }
  const kelvin = () => {
    const attrs = state()?.attributes || {}, caps = capabilities();
    return clamp(Number.isFinite(attrs.color_temp_kelvin) ? attrs.color_temp_kelvin : initialCapabilities.minKelvin || 2000,
      caps.minKelvin || initialCapabilities.minKelvin || 2000, caps.maxKelvin || initialCapabilities.maxKelvin || 6500);
  };
  const temperature = addSlider('temperature', 'light.color_temperature', 'White temperature', initialCapabilities.minKelvin || 2000, initialCapabilities.maxKelvin || 6500,
    kelvin, value => `${Math.round(value)} K`, value => ({ color_temp_kelvin:Math.round(clamp(value, capabilities().minKelvin, capabilities().maxKelvin)) }));
  const ends = add('div', 'light-temperature-ends', temperature);
  const warm = add('span', '', ends), cool = add('span', '', ends);
  addSlider('brightness', 'controls.brightness', 'Brightness', 0, 100,
    () => state()?.state === 'off' ? 0 : clamp((state()?.attributes?.brightness || 0) / 255 * 100, 0, 100),
    value => `${Math.round(value)}%`, value => ({ brightness_pct:Math.round(clamp(value, 0, 100)) }));
  host.append(root);

  function refresh() {
    if (destroyed) return;
    const reason = unavailable(), caps = capabilities();
    wheel.disabled = !!reason || !caps.color;
    if (wheel.disabled) cancelWheel();
    wheelLabel.textContent = localize('light.color', 'Color');
    wheel.setAttribute('aria-label', localize('light.color', 'Color'));
    if (!wheelGesture) selected = authoritativeColor();
    drawWheel();
    for (const item of sliders) {
      if (item.capability === 'temperature' && caps.temperature) {
        const changed = Number(item.input.min) !== caps.minKelvin || Number(item.input.max) !== caps.maxKelvin;
        item.input.min = String(caps.minKelvin); item.input.max = String(caps.maxKelvin);
        if (changed) item.control.cancel();
      }
      item.input.disabled = !!reason || !caps[item.capability];
      if (item.input.disabled) item.control.cancel();
      item.label.textContent = localize(item.labelKey, item.fallback);
      item.input.setAttribute('aria-label', item.label.textContent);
      if (!item.active) { item.control.update(item.value(), item.value()); item.output.textContent = item.format(item.value()); }
      else item.control.update(item.value());
    }
    warm.textContent = localize('light.warm', 'Warm'); cool.textContent = localize('light.cool', 'Cool');
    status.textContent = error || (reason ? localize(`common.${reason}`, { loading:'Loading…', disconnected:'Disconnected', unknown:'Unknown', unavailable:'Unavailable' }[reason])
      : state()?.state === 'off' ? localize('common.off', 'Off') : '\u00a0');
    status.toggleAttribute('data-error', !!error); status.setAttribute('role', error ? 'alert' : 'status');
  }
  const observer = globalThis.ResizeObserver ? new ResizeObserver(drawWheel) : null;
  observer?.observe(wheel);
  refresh();
  return {
    update(nextOptions) {
      if (destroyed) return;
      if (nextOptions.entity && nextOptions.entity !== options.entity) {
        requestId++; error = ''; cancelWheel(); sliders.forEach(item => item.control.cancel());
      }
      options = { ...options, ...nextOptions }; refresh();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; requestId++; cancelWheel(); observer?.disconnect();
      sliders.forEach(item => item.control.destroy());
      listeners.forEach(([element, type, callback]) => element.removeEventListener(type, callback));
      root.remove();
    },
  };
}
