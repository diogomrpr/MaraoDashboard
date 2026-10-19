import test from 'node:test';
import assert from 'node:assert/strict';
import { insertionAt } from '../../frontend_src/editor-drag.js';
const rect = (left, top, width = 100, height = 80) => ({ left, top, right: left + width, bottom: top + height, width, height });
test('empty, vertical lists and all start/between/end insertion boundaries', () => {
  assert.equal(insertionAt([], 0, 0).boundary, 0);
  const list = [rect(0, 0), rect(0, 90), rect(0, 180)];
  for (const [y, expected] of [[-2,0], [39,0], [41,1], [85,1], [129,1], [131,2], [219,2], [221,3], [300,3]]) {
    assert.equal(insertionAt(list, 25, y).boundary, expected);
  }
});
test('wrapped grids use actual horizontal slots including a single card in the last row', () => {
  const grid = [rect(0,0),rect(110,0),rect(0,90),rect(110,90),rect(0,180)];
  for (const [x,y,expected] of [[20,30,0],[70,30,1],[130,30,1],[190,30,2],[20,100,2],[190,100,4],[20,190,4],[70,190,5],[0,300,5]]) {
    assert.equal(insertionAt(grid,x,y).boundary,expected);
  }
  assert.equal(insertionAt(grid, 190, 85).boundary, 2, 'Between wrapped rows means before the next row');
});
test('right-to-left grids follow DOM ordering', () => {
  const grid = [rect(110,0),rect(0,0)];
  assert.equal(insertionAt(grid,190,30).boundary,0);
  assert.equal(insertionAt(grid,130,30).boundary,1);
  assert.equal(insertionAt(grid,20,30).boundary,2);
});

// Exercise the actual controller with deterministic frames and live scroll geometry.
import fs from 'node:fs';
import vm from 'node:vm';
const controllerSource = fs.readFileSync(new URL('../../frontend_src/editor-drag.js', import.meta.url), 'utf8');
function controller() {
  const frames = new Map(), captures = new Set(), classes = new Set(), cues = new Set(), commits = [];
  let nextFrame = 0, haptics = 0, headerBottom = 100, viewportHeight = 800;
  const scrollHost = new EventTarget();
  Object.assign(scrollHost, { scrollTop: 500, scrollHeight: 2000, clientHeight: 800, getBoundingClientRect: () => ({ top: 0, bottom: viewportHeight }) });
  const row = { classList: { add: x => classes.add(x), remove: x => classes.delete(x) }, getBoundingClientRect: () => rect(0, 100, 300, 700) };
  const handle = { closest: selector => selector === '[data-card-handle]' ? handle : row,
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id) };
  const list = { dataset: { movePage: 'page:0', moveSection: '0' }, getClientRects: () => [1],
    getBoundingClientRect: row.getBoundingClientRect, querySelectorAll: () => [row] };
  const root = new EventTarget();
  Object.assign(root, { host: scrollHost, querySelectorAll: () => [list], append: cue => cues.add(cue) });
  const globalEvents = new EventTarget();
  const context = vm.createContext({ AbortController, innerWidth: 400,
    get innerHeight() { return viewportHeight; },
    getComputedStyle: () => ({ overflowY: 'auto' }),
    addEventListener: globalEvents.addEventListener.bind(globalEvents),
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    document: { scrollingElement: scrollHost, createElement: () => ({ style: {}, setAttribute() {}, append(child) { this.firstElementChild = child; }, remove() { cues.delete(this); } }) },
  });
  vm.runInContext(controllerSource.replaceAll('export function', 'function') + '\nglobalThis.bind = bindCardDrag;', context);
  const binding = context.bind(root, { sourceFor: () => ({ key: 'page:0' }), commit: (...args) => { commits.push(args); return true; },
    header: () => ({ bottom: headerBottom }), label: () => 'Move', haptic: () => { haptics++; } });
  const send = (type, x = 30, y = 130, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true, ...extra });
    Object.defineProperty(event, 'target', { value: handle }); root.dispatchEvent(event);
  };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { const ready = [...frames]; frames.clear(); ready.forEach(([, callback]) => callback()); } };
  return { send, tick, binding, frames, captures, classes, cues, commits, scrollHost, get haptics() { return haptics; },
    activate(y, diagonal = false) { send('pointerdown', 30, y); send('pointermove', 40, y + (diagonal ? 10 : 0)); },
    resize(height, header = headerBottom) { viewportHeight = height; headerBottom = header; globalEvents.dispatchEvent(new Event('resize')); },
  };
}

test('press, subthreshold, horizontal/diagonal activation and stationary pickup never scroll at either edge', () => {
  for (const y of [108, 140, 450, 760, 788]) for (const diagonal of [false, true]) {
    const c = controller();
    c.send('pointerdown', 30, y); c.tick(20);
    c.send('pointermove', 34, y + 4); c.tick(20);
    assert.equal(c.classes.size, 0);
    c.send('pointermove', 40, y + (diagonal ? 10 : 0)); c.tick(20);
    c.send('pointermove', 60, y + (diagonal ? 10 : 0)); c.tick(20);
    assert.equal(c.classes.has('drag-source'), true);
    assert.equal(c.scrollHost.scrollTop, 500); assert.equal(c.frames.size, 0);
    assert.equal(c.haptics, 1); assert.equal(c.commits.length, 0);
    c.binding.dispose();
  }
});

test('only subsequent 16px outward travel arms either edge; an armed stationary hold continues scrolling', () => {
  for (const [y, direction] of [[145, -1], [755, 1]]) {
    const c = controller(); c.activate(y);
    c.send('pointermove', 40, y + direction * 15); c.tick(10);
    assert.equal(c.scrollHost.scrollTop, 500, 'Threshold minus one stays still');
    c.send('pointermove', 40, y + direction * 16); c.tick(3);
    assert.equal(Math.sign(c.scrollHost.scrollTop - 500), direction);
    const after = c.scrollHost.scrollTop; c.tick(3);
    assert.equal(Math.sign(c.scrollHost.scrollTop - after), direction);
    assert.equal(c.commits.length, 0); c.binding.dispose(); assert.equal(c.frames.size, 0);
  }
});

test('8px reversal disarms, resets the approach, and rejects a 1px outward twitch', () => {
  for (const [y, direction] of [[145, -1], [755, 1]]) {
    const c = controller(); c.activate(y);
    c.send('pointermove', 40, y + direction * 16); c.tick();
    c.send('pointermove', 40, y + direction * 9); c.tick();
    assert.equal(c.frames.size, 1, 'Seven-pixel reversal tolerates touch jitter');
    c.send('pointermove', 40, y + direction * 8); const stopped = c.scrollHost.scrollTop; c.tick(5);
    c.send('pointermove', 40, y + direction * 9); c.tick(5);
    assert.equal(c.scrollHost.scrollTop, stopped);
    c.send('pointermove', 40, y + direction * 23); c.tick(5);
    assert.equal(c.scrollHost.scrollTop, stopped, 'A fresh approach below 16px remains unarmed');
    c.send('pointermove', 40, y + direction * 24); c.tick();
    assert.equal(Math.sign(c.scrollHost.scrollTop - stopped), direction); c.binding.dispose();
  }
});

test('extreme-edge pickup can move inward and reapproach; leaving the band needs fresh intent', () => {
  const c = controller(); c.activate(102);
  c.send('pointermove', 40, 130); c.tick(10); assert.equal(c.scrollHost.scrollTop, 500);
  c.send('pointermove', 40, 114); c.tick(); assert.ok(c.scrollHost.scrollTop < 500);
  c.send('pointermove', 40, 200); const stopped = c.scrollHost.scrollTop; c.tick(10);
  c.send('pointermove', 40, 199); c.tick(10); assert.equal(c.scrollHost.scrollTop, stopped);
  c.send('pointermove', 40, 150); c.tick(); assert.ok(c.scrollHost.scrollTop < stopped); c.binding.dispose();
});

test('live header/viewport bounds never arm pickup, stop invalid armed edges and use current limits', () => {
  const c = controller(); c.activate(710); c.resize(730, 120); c.tick(10);
  assert.equal(c.scrollHost.scrollTop, 500); assert.equal(c.frames.size, 0);
  c.send('pointermove', 60, 710); c.tick(10); assert.equal(c.scrollHost.scrollTop, 500, 'Horizontal input after resize has no vertical intent');
  c.send('pointermove', 60, 726); c.tick(); assert.ok(c.scrollHost.scrollTop > 500);
  c.resize(700); const stopped = c.scrollHost.scrollTop; c.tick(10);
  assert.equal(c.scrollHost.scrollTop, stopped); assert.equal(c.frames.size, 0);
  c.resize(800); c.send('pointermove', 60, 727); c.tick(5); assert.equal(c.scrollHost.scrollTop, stopped);
  c.send('pointermove', 60, 760); c.tick(500);
  assert.equal(c.scrollHost.scrollTop, 1200); assert.equal(c.frames.size, 0, 'No spinning at the scroll limit'); c.binding.dispose();
});

test('each terminal path clears frame/capture/markers; cancellation cannot commit and a fresh gesture has no inherited intent', () => {
  for (const terminal of ['pointercancel', 'lostpointercapture', 'escape', 'cancel', 'dispose']) {
    const c = controller(); c.activate(755); c.send('pointermove', 40, 780); c.tick();
    if (terminal === 'escape') c.send('keydown', 40, 780, { key: 'Escape' });
    else if (terminal === 'cancel') c.binding.cancel();
    else if (terminal === 'dispose') c.binding.dispose();
    else c.send(terminal, 40, 780);
    const stopped = c.scrollHost.scrollTop; c.tick(20);
    assert.equal(c.scrollHost.scrollTop, stopped); assert.equal(c.frames.size, 0);
    assert.equal(c.captures.size, 0); assert.equal(c.cues.size, 0); assert.equal(c.classes.size, 0); assert.equal(c.commits.length, 0);
    if (terminal !== 'dispose') { c.activate(780); c.tick(20); assert.equal(c.scrollHost.scrollTop, stopped); }
    c.binding.dispose();
  }
});

test('valid release commits once with the current insertion boundary and consumes its native click', () => {
  const c = controller(); c.activate(145); c.send('pointermove', 40, 129); c.tick();
  c.send('pointerup', 40, 450); c.send('pointerup', 40, 450);
  assert.equal(c.commits.length, 1); assert.equal(c.commits[0][1], 0); assert.equal(c.commits[0][2], 0);
  assert.equal(c.haptics, 2); assert.equal(c.frames.size, 0); assert.equal(c.captures.size, 0);
  c.send('click', 40, 450); assert.equal(c.haptics, 2); c.binding.dispose();
});
