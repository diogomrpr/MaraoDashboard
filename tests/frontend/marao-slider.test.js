import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSlider } from '../../custom_components/marao_dashboard/frontend/MaraoSlider.js';

function slider() {
  const input = new EventTarget(), properties = new Map();
  Object.assign(input, {
    min: '0', max: '100', value: '30', disabled: false,
    dataset: { sliderKey: 'light:light.test', sliderCurrent: '30' },
    style: { setProperty() {} },
    parentElement: { style: { setProperty: (name, value) => properties.set(name, value) } },
  });
  return { input, properties, fire(type, fields = {}) { input.dispatchEvent(Object.assign(new Event(type), fields)); } };
}

test('range previews independently from current state and dispatches once on release', () => {
  const { input, properties, fire } = slider(), commits = [], pulses = [];
  let started, ended;
  const control = bindSlider(input, { haptic: value => pulses.push(value), onStart: gesture => { started = gesture; }, onEnd: gesture => { ended = gesture; }, onCommit: value => commits.push(value) });
  fire('pointerdown'); input.value = '80'; fire('input');
  control.update(40);
  assert.equal(properties.get('--marao-slider-fraction'), '0.4');
  assert.equal(properties.get('--marao-slider-target-fraction'), '0.8');
  fire('change');
  assert.deepEqual(commits, [], 'A browser change preceding pointerup must not apply early');
  fire('pointerup'); fire('change'); fire('pointerup');
  assert.deepEqual(commits, [80]);
  assert.equal(started, ended);
  assert.equal(ended.completed, true);
  assert.equal(ended.dispatched, true);
  assert.deepEqual(pulses, ['heavy']);
  control.destroy();
});

test('cancelling a range restores authoritative state and ignores late native events', () => {
  const { input, properties, fire } = slider(), commits = [];
  let cancelled;
  const control = bindSlider(input, { onCommit: value => commits.push(value), onCancel: gesture => { cancelled = gesture; } });
  fire('pointerdown'); input.value = '10'; fire('input');
  control.update(40); fire('pointercancel'); fire('pointerup'); fire('change');
  assert.equal(cancelled.cancelled, true);
  assert.equal(input.value, '40');
  assert.equal(properties.get('--marao-slider-fraction'), '0.4');
  assert.equal(properties.get('--marao-slider-target-fraction'), '0.4');
  assert.deepEqual(commits, []);
  fire('pointerdown'); input.value = '70'; fire('input'); control.cancel(); fire('change');
  assert.equal(input.value, '40');
  assert.deepEqual(commits, []);
  control.destroy();
});

test('inline state stays left while it fits and switches right for space through resize, reports and cancellation', t => {
  const { input, properties, fire } = slider();
  const previousObserver = globalThis.ResizeObserver, previousDocument = globalThis.document;
  t.after(() => { globalThis.ResizeObserver = previousObserver; globalThis.document = previousDocument; });
  let resize, disconnected = false, needed = 96;
  const fonts = new EventTarget();
  globalThis.document = { fonts };
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  };
  const label = { style: { maxWidth: '' }, getBoundingClientRect: () => ({ width: needed }) };
  input.parentElement.dataset = {};
  input.parentElement.clientWidth = 248;
  input.parentElement.querySelector = selector => selector === '.slider-state' ? label : null;
  const control = bindSlider(input);
  assert.equal(input.parentElement.dataset.stateSide, 'right');
  assert.equal(properties.get('--marao-slider-label-fraction'), '0.7');
  fire('pointerdown'); input.value = '80'; fire('input');
  assert.equal(input.parentElement.dataset.stateSide, 'left');
  assert.equal(properties.get('--marao-slider-label-fraction'), '0.8');
  control.update(10, 80);
  assert.equal(input.parentElement.dataset.stateSide, 'left', 'Confirmed fill must not choose the label side');
  fire('pointercancel');
  assert.equal(input.parentElement.dataset.stateSide, 'right');
  assert.equal(properties.get('--marao-slider-label-fraction'), '0.9');
  control.update(49, 49);
  assert.equal(input.parentElement.dataset.stateSide, 'left', 'Prefer left when it fits even if right has more space');
  assert.equal(properties.get('--marao-slider-label-fraction'), '0.49');
  control.update(47, 47);
  assert.equal(input.parentElement.dataset.stateSide, 'right', 'Switch before the text overlaps the thumb');
  control.update(30, 30);
  input.parentElement.clientWidth = 448; resize();
  assert.equal(input.parentElement.dataset.stateSide, 'left', 'Wider tracks can keep the same label on the left');
  needed = 150; fonts.dispatchEvent(new Event('loadingdone'));
  assert.equal(input.parentElement.dataset.stateSide, 'right', 'Use current label and font metrics');
  input.parentElement.clientWidth = 168;
  control.update(50, 50);
  assert.equal(input.parentElement.dataset.stateSide, 'left', 'When neither side fits, wrap in the larger region with a left tie-break');
  assert.equal(properties.get('--marao-slider-label-fraction'), '0.5');
  input.parentElement.clientWidth = 448; needed = 96;
  for (const target of [0, 50, 100]) {
    control.update(target, target);
    assert.equal(input.parentElement.dataset.stateSide, target >= 50 ? 'left' : 'right');
    assert.equal(properties.get('--marao-slider-label-fraction'), String(Math.max(target, 100 - target) / 100));
  }
  assert.equal(label.style.maxWidth, '', 'Temporary natural-width measurement does not leave a style override');
  control.destroy();
  assert.equal(disconnected, true);
  input.parentElement.clientWidth = 48;
  fonts.dispatchEvent(new Event('loadingdone')); resize();
  assert.equal(input.parentElement.dataset.stateSide, 'left', 'Disposed observers cannot move the label');
});

test('pressing a range without changing its value does not send an update', () => {
  const { input, fire } = slider(), commits = [];
  const control = bindSlider(input, { onCommit: value => commits.push(value) });
  fire('pointerdown'); fire('pointerup'); fire('change');
  assert.deepEqual(commits, []);
  control.destroy();
});

test('keyboard adjustments work after pointer completion, while disabled and destroyed controls send nothing', () => {
  const { input, fire } = slider(), commits = [];
  const control = bindSlider(input, { onCommit: value => commits.push(value) });
  fire('pointerdown'); input.value = '80'; fire('input'); fire('pointerup'); fire('change');
  for (const value of ['81', '82']) {
    fire('keydown', { key: 'ArrowRight' }); input.value = value; fire('input'); fire('change');
  }
  assert.deepEqual(commits, [80, 81, 82]);
  fire('pointerdown'); input.value = '90'; fire('input'); input.disabled = true; fire('pointerup'); fire('change');
  assert.deepEqual(commits, [80, 81, 82]);
  input.disabled = false; fire('pointerdown'); input.value = '95'; fire('input'); control.destroy(); fire('pointerup'); fire('change');
  assert.deepEqual(commits, [80, 81, 82]);
  assert.equal(input.value, '30');
});

test('confirmed cover interpolation retargets from the drawn value, keeps targets independent and never dispatches passively',t=>{
 const old={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,performance:globalThis.performance,matchMedia:globalThis.matchMedia,document:globalThis.document};t.after(()=>Object.assign(globalThis,old));
 let time=0,id=0;const frames=new Map(),motion=new EventTarget(),document=new EventTarget();motion.matches=false;document.hidden=false;
 Object.assign(globalThis,{performance:{now:()=>time},requestAnimationFrame:callback=>{frames.set(++id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>motion,document});
 const step=at=>{time=at;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(time));};
 const {input,properties,fire}=slider(),commits=[],pulses=[];const control=bindSlider(input,{smooth:true,onCommit:value=>commits.push(value),haptic:value=>pulses.push(value)});
 assert.equal(properties.get('--marao-slider-fraction'),'0.3');assert.equal(frames.size,0);
 time=1000;control.update(80,80,{follow:true});assert.equal(input.value,'80');assert.equal(input.dataset.sliderCurrent,'80');step(1100);
 const drawn=Number(properties.get('--marao-slider-fraction'));assert.ok(drawn>.3&&drawn<.8);
 control.update(20,20,{follow:true});assert.equal(Number(properties.get('--marao-slider-fraction')),drawn);step(1600);assert.equal(properties.get('--marao-slider-fraction'),'0.2');assert.equal(frames.size,0);
 control.update(20,20,{follow:true});assert.equal(frames.size,0);
 time=2000;control.update(60,90);step(2250);assert.equal(properties.get('--marao-slider-target-fraction'),'0.9');assert.deepEqual(commits,[]);assert.deepEqual(pulses,[]);
 fire('pointerdown');input.value='75';fire('input');assert.equal(properties.get('--marao-slider-target-fraction'),'0.75');assert.equal(frames.size,0);fire('pointerup');fire('change');assert.deepEqual(commits,[75]);assert.deepEqual(pulses,['heavy']);
 control.update(80,80,{follow:true});motion.matches=true;motion.dispatchEvent(new Event('change'));assert.equal(frames.size,0);assert.equal(properties.get('--marao-slider-fraction'),'0.8');
 motion.matches=false;time=3000;control.update(90,90,{follow:true});document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(frames.size,0);assert.equal(properties.get('--marao-slider-fraction'),'0.9');control.destroy();assert.equal(frames.size,0);
});
