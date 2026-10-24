import test from 'node:test';
import assert from 'node:assert/strict';
import { lightColorCapabilities, lightColorAppearance } from '../../custom_components/marao_dashboard/frontend/MaraoLightCapabilities.js';
import { createLightColorPicker } from '../../custom_components/marao_dashboard/frontend/MaraoLightColor.js';

class Element extends EventTarget {
  constructor(tag) {
    super(); this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } }; this.className = ''; this.disabled = false;
  }
  append(...elements) { for (const element of elements) { element.parentElement = this; this.children.push(element); } }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  toggleAttribute(name, present) { if (present) this.setAttribute(name, ''); else delete this.attributes[name]; }
  querySelector(selector) { return this.children.find(child => selector.startsWith('.') ? child.className.split(' ').includes(selector.slice(1)) : child.tagName === selector) || this.children.map(child => child.querySelector(selector)).find(Boolean) || null; }
  getBoundingClientRect() { return { left:0, top:0, width:260, height:260 }; }
  setPointerCapture(id) { this.pointerId = id; }
  hasPointerCapture(id) { return this.pointerId === id; }
  releasePointerCapture() { this.pointerId = undefined; }
  focus() {}
  set innerHTML(html) {
    const container = new Element('div'), input = new Element('input'); container.className = 'slider';
    for (const key of ['min', 'max', 'step', 'value']) input[key] = html.match(new RegExp(` ${key}="([^"]+)"`))[1];
    input.dataset.sliderCurrent = html.match(/data-slider-current="([^"]+)"/)[1];
    input.dataset.sliderKey = html.match(/data-slider-key="([^"]+)"/)[1];
    input.disabled = html.includes(' disabled'); container.append(input); this.append(container);
  }
}
globalThis.document = { createElement:tag => new Element(tag) };
const light = (attributes = {}, value = 'on') => ({ state:value, attributes:{ supported_color_modes:['hs','color_temp'], min_color_temp_kelvin:2200, max_color_temp_kelvin:6000, hs_color:[120,50], brightness:128, color_temp_kelvin:3000, ...attributes } });
function setup(value = light(), service = () => Promise.resolve()) {
  const calls = [], host = new Element('div');
  const options = { entity:'light.fixture', hass:{ callService() {}, states:{ 'light.fixture':value } }, callService:data => { calls.push(data); return service(data); }, localize:(_key,_values,fallback) => fallback };
  const picker = createLightColorPicker(host, options);
  return { picker, host, options, calls, wheel:host.querySelector('.light-color-wheel'), status:host.querySelector('.light-color-status') };
}
function fire(element, type, props = {}) {
  const event = new Event(type, { cancelable:true }); Object.assign(event, { pointerId:1, button:0, isPrimary:true, clientX:130, clientY:130, ...props }); element.dispatchEvent(event); return event;
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('capabilities follow HA color modes and validated reported Kelvin limits', () => {
  for (const mode of ['hs','xy','rgb','rgbw','rgbww']) {
    assert.equal(lightColorCapabilities(light({ supported_color_modes:[mode] })).color, true);
    assert.equal(lightColorCapabilities(light({ supported_color_modes:[mode] })).temperature, false);
  }
  for (const mode of ['brightness','onoff','white','unknown']) assert.equal(lightColorCapabilities(light({ supported_color_modes:[mode] })).color, false);
  assert.deepEqual(lightColorCapabilities(light({ supported_color_modes:['color_temp'] })), { color:false, temperature:true, brightness:true, minKelvin:2200, maxKelvin:6000 });
  for (const limits of [{ min_color_temp_kelvin:null }, { max_color_temp_kelvin:Infinity }, { min_color_temp_kelvin:0 }, { min_color_temp_kelvin:7000 }, { max_color_temp_kelvin:2200 }, { min_color_temp_kelvin:'2200' }]) {
    const result = lightColorCapabilities(light(limits)); assert.equal(result.temperature, false); assert.equal(result.minKelvin, null); assert.equal(result.maxKelvin, null);
  }
  assert.deepEqual(lightColorCapabilities({}), { color:false, temperature:false, brightness:false, minKelvin:null, maxKelvin:null });
});

test('wheel previews a color without sending, then sends once on release even when off', async () => {
  const { picker, wheel, calls, options, status } = setup(light({}, 'off'));
  assert.equal(calls.length, 0); assert.equal(status.textContent, 'Off');
  assert.equal(wheel.querySelector('.light-color-thumb').style.background, 'hsl(120 100% 75%)', 'HA saturation50 means a half-white blend, not muted HSL saturation50');
  fire(wheel, 'pointerdown', { clientX:236 });
  assert.equal(wheel.getAttribute('aria-valuenow'), '0'); assert.equal(calls.length, 0);
  fire(wheel, 'pointermove', { clientX:130, clientY:236 });
  assert.equal(wheel.getAttribute('aria-valuenow'), '90'); assert.equal(calls.length, 0);
  picker.update({ hass:{ ...options.hass, states:{ 'light.fixture':light({ hs_color:[220,30] }, 'off') } } });
  assert.equal(wheel.getAttribute('aria-valuenow'), '90', 'HA state must not replace an active drag');
  fire(wheel, 'pointerup', { clientX:130, clientY:236 }); fire(wheel, 'click'); fire(wheel, 'pointerup');
  assert.deepEqual(calls, [{ hs_color:[90,100] }]);
  assert.equal(wheel.getAttribute('aria-valuenow'), '220', 'After release the selector follows HA, not an optimistic guess');
  await tick(); picker.destroy();
});

test('wheel cancellation and removal never dispatch, including stale gesture events', () => {
  const { picker, wheel, calls } = setup();
  fire(wheel, 'pointerdown', { clientX:236 }); fire(wheel, 'pointercancel'); fire(wheel, 'pointerup');
  assert.equal(wheel.getAttribute('aria-valuenow'), '120'); assert.equal(calls.length, 0);
  fire(wheel, 'pointerdown', { clientX:236 }); picker.destroy(); fire(wheel, 'pointerup');
  assert.equal(calls.length, 0);
});

test('wheel keyboard interaction commits once at key release and Escape cancels', () => {
  const { picker, wheel, calls } = setup();
  fire(wheel, 'keydown', { key:'ArrowRight' }); fire(wheel, 'keydown', { key:'ArrowRight', repeat:true });
  assert.equal(calls.length, 0); fire(wheel, 'keyup', { key:'ArrowRight' }); fire(wheel, 'click');
  assert.deepEqual(calls, [{ hs_color:[130,50] }]);
  fire(wheel, 'keydown', { key:'ArrowUp' }); fire(wheel, 'keydown', { key:'Escape' }); fire(wheel, 'keyup', { key:'ArrowUp' });
  assert.equal(calls.length, 1); picker.destroy();
});

test('unavailable/disconnected or removed capability cancels and disables controls before dispatch', () => {
  for (const change of [
    options => ({ ...options.hass, connected:false }),
    options => ({ ...options.hass, connection:{ connected:false } }),
    options => ({ ...options.hass, states:{ 'light.fixture':light({}, 'unavailable') } }),
    options => ({ ...options.hass, states:{ 'light.fixture':light({}, 'unknown') } }),
    options => ({ ...options.hass, states:{} }),
    options => ({ ...options.hass, states:{ 'light.fixture':light({ supported_color_modes:['onoff'] }) } }),
  ]) {
    const { picker, wheel, calls, options } = setup();
    fire(wheel, 'pointerdown', { clientX:236 }); picker.update({ hass:change(options) }); fire(wheel, 'pointerup', { clientX:236 });
    assert.equal(wheel.disabled, true); assert.equal(calls.length, 0); picker.destroy();
  }
});

test('shared brightness and Kelvin controls commit once and retain HA values after release', () => {
  const { picker, host, calls } = setup();
  const brightness = host.querySelector('.light-brightness').querySelector('input');
  const temperature = host.querySelector('.light-temperature').querySelector('input');
  fire(brightness, 'pointerdown'); brightness.value = '75'; fire(brightness, 'input'); assert.equal(calls.length, 0);
  fire(brightness, 'pointerup'); fire(brightness, 'change'); assert.deepEqual(calls, [{ brightness_pct:75 }]);
  assert.ok(Math.abs(Number(brightness.value) - 128 / 255 * 100) < 0.001);
  fire(temperature, 'pointerdown'); temperature.value = '4200'; fire(temperature, 'input'); fire(temperature, 'pointerup'); fire(temperature, 'change');
  assert.deepEqual(calls[1], { color_temp_kelvin:4200 }); assert.equal(Number(temperature.value), 3000);
  fire(temperature, 'pointerdown'); temperature.value = '5500'; fire(temperature, 'input'); fire(temperature, 'pointercancel'); fire(temperature, 'change');
  assert.equal(calls.length, 2); picker.destroy();
});

test('reported Kelvin bound changes cancel the old drag and reframe the shared slider', () => {
  const { picker, host, calls, options } = setup();
  const temperature = host.querySelector('.light-temperature').querySelector('input');
  fire(temperature, 'pointerdown'); temperature.value = '5500'; fire(temperature, 'input');
  picker.update({ hass:{ ...options.hass, states:{ 'light.fixture':light({ min_color_temp_kelvin:2700, max_color_temp_kelvin:4000, color_temp_kelvin:3350 }) } } });
  fire(temperature, 'pointerup'); fire(temperature, 'change');
  assert.equal(calls.length, 0); assert.equal(temperature.min, '2700'); assert.equal(temperature.max, '4000');
  assert.equal(temperature.parentElement.style['--marao-slider-target-fraction'], '0.5');
  fire(temperature, 'pointerdown'); temperature.value = '3900'; fire(temperature, 'input'); fire(temperature, 'pointerup');
  assert.deepEqual(calls, [{ color_temp_kelvin:3900 }]); picker.destroy();
});

test('service failures remain readable until a successful change and stale results are ignored', async () => {
  let fail = true;
  const { picker, wheel, status } = setup(light(), () => fail ? Promise.reject(new Error('Fixture rejected the color')) : Promise.resolve());
  fire(wheel, 'pointerdown', { clientX:236 }); fire(wheel, 'pointerup', { clientX:236 }); await tick();
  assert.equal(status.textContent, 'Fixture rejected the color'); assert.equal(status.getAttribute('role'), 'alert');
  picker.update({}); assert.equal(status.textContent, 'Fixture rejected the color');
  fail = false; fire(wheel, 'pointerdown', { clientX:236 }); fire(wheel, 'pointerup', { clientX:236 }); await tick();
  assert.equal(status.textContent, '\u00a0'); picker.destroy();
  let reject; const later = setup(light(), () => new Promise((_resolve, failure) => { reject = failure; }));
  fire(later.wheel, 'pointerdown'); fire(later.wheel, 'pointerup'); later.picker.destroy(); reject(new Error('late')); await tick();
  assert.equal(later.status.textContent, '\u00a0');
});

test('native service errors preserve nested or string messages inside the picker', async () => {
  for (const cause of [{ body:{ message:'The light is busy' } }, 'The light is busy']) {
    const { picker, wheel, status } = setup(light(), () => Promise.reject(cause));
    fire(wheel, 'pointerdown'); fire(wheel, 'pointerup'); await tick();
    assert.equal(status.textContent, 'The light is busy'); assert.equal(status.getAttribute('role'), 'alert'); picker.destroy();
  }
});


test('reported light backgrounds use converted RGB with readable contrast and safe fallback', () => {
  for (const mode of ['hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'color_temp']) {
    for (const rgb of [[255,0,0], [0,0,255], [255,255,255], [0,0,0], [255,180,90]]) {
      const appearance = lightColorAppearance(light({supported_color_modes:[mode], rgb_color:rgb}));
      assert.equal(appearance.background, `rgb(${rgb.join(', ')})`);
      const linear = rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
      assert.ok((appearance.text === '#000' ? (luminance + .05) / .05 : 1.05 / (luminance + .05)) >= 4.5);
      assert.equal(appearance.icon, appearance.text);
    }
  }
  for (const rgb_color of [undefined, null, [], [1,2], [1,2,3,4], ['255',0,0], [-1,0,0], [256,0,0], [NaN,0,0]])
    assert.equal(lightColorAppearance(light({rgb_color})), null);
  for (const state of ['off', 'unknown', 'unavailable']) assert.equal(lightColorAppearance(light({rgb_color:[255,0,0]}, state)), null);
  assert.equal(lightColorAppearance(light({supported_color_modes:['brightness'],rgb_color:[255,0,0]})), null);
});
