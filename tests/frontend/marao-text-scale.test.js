import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  constructor() {
    this._attributes = new Map();
  }

  attachShadow() {
    this.shadowRoot = { innerHTML: "", querySelector: () => null };
    return this.shadowRoot;
  }

  getAttribute(name) {
    return this._attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this._attributes.set(name, String(value));
  }

  getRootNode() {
    return this;
  }
};
globalThis.customElements = { get: () => true, define() {} };
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "en", maxTouchPoints: 0 },
});
globalThis.window = {
  location: { pathname: "/", hash: "" },
  addEventListener() {},
  MaraoDashboard: {},
};

function fakeDocument(foreignMeta) {
  const children = foreignMeta ? [foreignMeta] : [];
  const head = {
    append(element) {
      children.push(element);
    },
    querySelector(selector) {
      if (selector === 'meta[name="text-scale"]') {
        return children.find((item) => item.getAttribute("name") === "text-scale") || null;
      }
      return children.find((item) => item.hasAttribute("data-marao-dashboard-text-scale")) || null;
    },
  };
  return {
    head,
    querySelector: () => null,
    createElement() {
      const attributes = new Map();
      const element = {
        getAttribute: (name) => attributes.get(name) ?? null,
        hasAttribute: (name) => attributes.has(name),
        setAttribute: (name, value) => attributes.set(name, value),
        remove: () => children.splice(children.indexOf(element), 1),
      };
      return element;
    },
  };
}

globalThis.document = fakeDocument();
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const source = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoRuntime.js", import.meta.url),
  "utf8",
);
// This harness loads only the shared shell/gesture implementation; native module
// registration is checked by marao-native.test.js with a real module URL.
const sourceWithoutFrontendImports = source.slice(source.indexOf("const MARAO_FONT_URL"), source.indexOf("await import(`./MaraoNativeCards.js"));
const cardsSource = (await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url), 'utf8')).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const instrumentedSource = `
import { cardProblem, problemStyle, problemLabel, showCardDetails, serviceOutcome, serviceConnectionReady, serviceTargetReady, accessOpenerService } from "data:text/javascript;base64,${Buffer.from(cardsSource).toString('base64')}";
const haptic = (value) => globalThis.__maraoTestHaptics.push(value);
const callServiceWithNotification = (hass, domain, service, data, onOutcome) => {
  try {
    onOutcome?.("sent");
    return Promise.resolve(hass.callService(domain, service, data)).then(result => {
      onOutcome?.("success");
      return result;
    }).catch((error) => {
      globalThis.__maraoTestActionErrors.push(error.message);
      onOutcome?.("error", error);
    });
  } catch (error) {
    globalThis.__maraoTestActionErrors.push(error.message);
    onOutcome?.("error", error);
  }
};
${sourceWithoutFrontendImports}
export { MaraoSlideToOpen, installMaraoTapGuard, installPopupScrollGuard, isMaraoDashboardPath, syncMaraoTextScale };
`;
globalThis.__maraoTestHaptics = [];
globalThis.__maraoTestActionErrors = [];
const {
  MaraoSlideToOpen,
  installMaraoTapGuard,
  installPopupScrollGuard,
  isMaraoDashboardPath,
  syncMaraoTextScale,
} = await import(
  `data:text/javascript;base64,${Buffer.from(instrumentedSource).toString("base64")}`
);

test("preserves the existing Montserrat font stylesheet outside the card catalog", () => {
  assert.match(
    source,
    /https:\/\/fonts\.googleapis\.com\/css2\?family=Montserrat:wght@100;200;300;400;500;600;700;800;900/,
  );
  assert.match(source, /data-marao-font/);
});

test("recognizes generated Marao routes but not the editor", () => {
  assert.equal(isMaraoDashboardPath("/marao-dashboard/overview"), true);
  assert.equal(isMaraoDashboardPath("/marao-home"), true);
  assert.equal(isMaraoDashboardPath("/marao-dashboard-editor"), false);
  assert.equal(isMaraoDashboardPath("/lovelace/home"), false);
});

test("adds one owned text-scale meta and removes it outside Marao", () => {
  const documentRoot = fakeDocument();
  assert.equal(syncMaraoTextScale(documentRoot, "/marao-dashboard/overview"), true);
  assert.equal(syncMaraoTextScale(documentRoot, "/marao-dashboard/rooms"), true);
  assert.equal(documentRoot.head.querySelector('meta[name="text-scale"]').getAttribute("content"), "scale");
  assert.equal(syncMaraoTextScale(documentRoot, "/config/dashboard"), false);
  assert.equal(documentRoot.head.querySelector('meta[name="text-scale"]'), null);
});

test("preserves text-scale metadata owned by another frontend component", () => {
  const foreign = {
    getAttribute: (name) => name === "name" ? "text-scale" : name === "content" ? "legacy" : null,
    hasAttribute: () => false,
  };
  const documentRoot = fakeDocument(foreign);
  assert.equal(syncMaraoTextScale(documentRoot, "/marao-dashboard/overview"), false);
  assert.equal(documentRoot.head.querySelector('meta[name="text-scale"]'), foreign);
});

function fakeEventRoot(pathname = "/marao-dashboard/overview") {
  const listeners = new Map();
  return {
    location: { pathname },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    emit(type, event = {}) {
      event.type = type;
      listeners.get(type)?.(event);
    },
  };
}

function actionEvent(action = "tap") {
  const result = {
    detail: { action },
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
  return result;
}

test("blocks a tap action after a scrolling gesture", () => {
  const eventRoot = fakeEventRoot();
  installMaraoTapGuard(eventRoot);
  eventRoot.emit("touchstart", { touches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  eventRoot.emit("touchmove", { touches: [{ identifier: 1, clientX: 10, clientY: 30 }] });
  eventRoot.emit("touchend", { changedTouches: [{ identifier: 1, clientX: 10, clientY: 30 }] });
  const action = actionEvent();
  eventRoot.emit("action", action);
  assert.equal(action.prevented, true);
  assert.equal(action.stopped, true);

  const click = actionEvent();
  eventRoot.emit("click", click);
  assert.equal(click.prevented, true);
  assert.equal(click.stopped, true);
});

test("allows a stationary tap and non-tap actions", () => {
  const eventRoot = fakeEventRoot();
  installMaraoTapGuard(eventRoot);
  eventRoot.emit("touchstart", { touches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  eventRoot.emit("touchend", { changedTouches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  const tap = actionEvent();
  eventRoot.emit("action", tap);
  assert.equal(tap.prevented, false);

  const hold = actionEvent("hold");
  eventRoot.emit("action", hold);
  assert.equal(hold.prevented, false);
});

test("does not affect gestures outside generated Marao dashboards", () => {
  const eventRoot = fakeEventRoot("/lovelace/home");
  installMaraoTapGuard(eventRoot);
  eventRoot.emit("touchstart", { touches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  eventRoot.emit("touchmove", { touches: [{ identifier: 1, clientX: 10, clientY: 30 }] });
  eventRoot.emit("touchend", { changedTouches: [{ identifier: 1, clientX: 10, clientY: 30 }] });
  const action = actionEvent();
  eventRoot.emit("action", action);
  assert.equal(action.prevented, false);
});

function fakeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
  };
}

test("native popup touch scrolling stays browser-owned while legacy edges and the background remain guarded", () => {
  const previousWindow = globalThis.window;
  globalThis.Element = globalThis.HTMLElement;
  globalThis.ShadowRoot = class {};
  try {
    const root = globalThis.window = fakeEventRoot();
    root.location.hash = "#overview-blinds";
    root.MaraoDashboard = {};
    root.getComputedStyle = (element) => ({ overflowY: element.overflowY || "visible" });
    const sheet = new HTMLElement();
    sheet.classList = fakeClassList();
    sheet.classList.add("marao-popup-sheet");
    Object.assign(sheet, { scrollTop: 50, scrollHeight: 500, clientHeight: 200, overflowY: "auto", matches: () => false });
    const range = new HTMLElement();
    range.classList = fakeClassList();
    range.matches = (selector) => selector === 'input[type="range"][data-slider-key]';
    installPopupScrollGuard();
    const move = (path, type = "touchmove", y = 100, cancelable = true) => {
      root.emit("touchstart", { touches: [{ clientY: 100 }] });
      const event = { cancelable, touches: [{ clientY: y }], deltaY: 20, composedPath: () => path, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      root.emit(type, event);
      return event;
    };
    assert.equal(move([range, sheet]).prevented, false, "native horizontal slider movement reaches its default handler");
    assert.equal(move([sheet], "touchmove", 80).prevented, false, "Marao popup scrolls internally");
    const initialMove = move([sheet]);
    assert.equal(initialMove.prevented, false, "zero vertical movement must not cancel a WebView gesture before it scrolls");
    assert.equal(initialMove.stopped, false, "popup controls still receive their touch events");
    assert.equal(move([range, sheet], "wheel").prevented, false, "wheel over a slider still scrolls the popup");
    sheet.scrollTop = 0;
    assert.equal(move([sheet], "touchmove", 120).prevented, false, "CSS contains the native top edge without cancelling the gesture");
    sheet.scrollTop = 300;
    assert.equal(move([sheet], "touchmove", 80).prevented, false, "CSS contains the native bottom edge without cancelling the gesture");
    sheet.classList = fakeClassList();
    sheet.classList.add("bubble-pop-up");
    assert.equal(move([sheet], "touchmove", 80).prevented, true, "legacy bottom-edge guarding remains intact");
    sheet.scrollTop = 0;
    assert.equal(move([sheet], "touchmove", 120).prevented, true, "legacy top-edge guarding remains intact");
    assert.equal(move([range, sheet]).prevented, false, "legacy native sliders retain their default touch handling");
    assert.equal(move([]).prevented, true, "background remains blocked");
    const nativeScroll = move([], "touchmove", 80, false);
    assert.equal(nativeScroll.prevented, false, "a committed native scroll cannot be cancelled");
    assert.equal(nativeScroll.stopped, true, "non-cancelable events stay contained");
    root.location.pathname = "/config/dashboard";
    assert.equal(move([]).prevented, false, "other Home Assistant pages retain native scrolling");
  } finally { globalThis.window = previousWindow; }
});

function slideFixture() {
  const listeners = new Map();
  const captured = [];
  const released = [];
  const activeCaptures = new Set();
  const attributes = new Map();
  const track = {
    clientWidth: 262,
    offsetWidth: 262,
    classList: fakeClassList(),
    getBoundingClientRect: () => ({ left: 0, right: 262, top: 0, bottom: 64 }),
    setAttribute: (name, value) => attributes.set(name, String(value)),
    addEventListener: (type, listener) => listeners.set(type, listener),
    setPointerCapture(pointerId) {
      captured.push(pointerId);
      activeCaptures.add(pointerId);
    },
    hasPointerCapture: (pointerId) => activeCaptures.has(pointerId),
    releasePointerCapture(pointerId) {
      released.push(pointerId);
      activeCaptures.delete(pointerId);
    },
  };
  const thumb = { style: {}, getBoundingClientRect: () => ({ left: 4, right: 58, top: 5, bottom: 59 }) };
  const label = { style: {} };
  const nodes = { ".track": track, ".thumb": thumb, ".label": label };
  const slide = new MaraoSlideToOpen();
  slide.shadowRoot = {
    innerHTML: "",
    querySelector: (selector) => nodes[selector] || null,
  };
  slide.setAttribute("entity", "lock.front_door");
  slide.setAttribute("state", "locked");
  const serviceCalls = [];
  slide._hass = {
    states: { "lock.front_door": { state: "locked", attributes: { friendly_name: "Front Door" } } },
    callService: (...args) => serviceCalls.push(args),
  };
  return { attributes, captured, label, listeners, released, serviceCalls, slide, thumb, track };
}

function pointerEvent(track, clientX, clientY, pointerId = 1) {
  return {
    button: 0,
    clientX,
    clientY,
    currentTarget: track,
    pointerId,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  };
}

test('slide starts across the whole round handle for pointer and touch input without painting a fill', () => {
  for (const input of ['pointer', 'touch']) for (const [x, y] of [[5,32],[57,32],[31,6],[31,58],[31,32]]) {
    const { slide, track, thumb, label, serviceCalls } = slideFixture();
    const start = pointerEvent(track, x, y);
    if (input === 'touch') { delete start.pointerId; start.identifier = 7; }
    slide._start(start, start);
    assert.equal(slide._pointerId, input === 'touch' ? 7 : 1);
    assert.equal(start.prevented, false);
    const move = { ...start, clientX: x + 200 };
    slide._move(move, move);
    assert.equal(thumb.style.transform, 'translateX(200px)');
    assert.equal(label.style.opacity, '0');
    slide._end(move, move);slide._end(move, move);
    assert.equal(serviceCalls.length, 1);
    assert.equal(label.style.opacity, '1');
    slide.disconnectedCallback();
  }
});

test('slide start follows the measured handle after layout changes and rejects the surrounding track', () => {
  const { slide, track, thumb, serviceCalls } = slideFixture();
  thumb.getBoundingClientRect = () => ({ left: 4, right: 58, top: 37, bottom: 91 });
  track.getBoundingClientRect = () => ({ left: 0, right: 262, top: 0, bottom: 128 });
  for (const [x,y] of [[3,64],[59,64],[31,36],[31,92],[150,64]]) {
    const start = pointerEvent(track,x,y);slide._start(start,start);
    assert.equal(slide._pointerId,null);
    const move = pointerEvent(track,250,64);slide._move(move,move);slide._end(move,move);
  }
  assert.equal(serviceCalls.length,0);
  for (const [x,y] of [[5,64],[57,64],[31,38],[31,90]]) {
    const start=pointerEvent(track,x,y);slide._start(start,start);assert.equal(slide._pointerId,1);
    slide._cancel({currentTarget:track},start);
  }
  assert.equal(serviceCalls.length,0);
});

test('access tracks survive unrelated HA updates and refresh when the connection changes', () => {
  const { slide, listeners } = slideFixture();
  let writes = 0, html = '';
  Object.defineProperty(slide.shadowRoot, 'innerHTML', { get: () => html, set: value => { writes++; html = value; } });
  slide._render();
  const boundListeners = listeners.size;
  slide.hass = { ...slide._hass, states: { ...slide._hass.states, 'sensor.other': { state: '10' } } };
  assert.equal(writes, 1);
  assert.equal(listeners.size, boundListeners);
  slide.hass = { ...slide._hass, connected: false };
  assert.equal(writes, 2);
  assert.match(html, /aria-disabled="true"/);
  slide.hass = { ...slide._hass, connected: true };
  assert.equal(writes, 3);
  assert.match(html, /aria-disabled="false"/);
});

test("slide control keeps vertical gestures available for page scrolling", () => {
  const { captured, slide, track } = slideFixture();
  const start = pointerEvent(track, 10, 10);
  slide._start(start, start);
  assert.equal(start.prevented, false);
  assert.deepEqual(captured, []);

  const verticalMove = pointerEvent(track, 14, 26);
  slide._move(verticalMove, verticalMove);
  assert.equal(verticalMove.prevented, false);
  assert.equal(slide._pointerId, null);
  assert.equal(slide._progress, 0);
  assert.deepEqual(captured, []);
});

test("slide control cancels when the browser owns a non-cancelable touch gesture", () => {
  for (const alreadyDragging of [false, true]) {
    const { captured, released, serviceCalls, slide, track } = slideFixture();
    const start = pointerEvent(track, 10, 10);
    slide._start(start, start);
    if (alreadyDragging) {
      const horizontal = pointerEvent(track, 110, 12);
      slide._move(horizontal, horizontal);
    }
    const nativeScroll = pointerEvent(track, 240, 12);
    nativeScroll.cancelable = false;
    slide._move(nativeScroll, nativeScroll);
    slide._end(nativeScroll, nativeScroll);
    assert.equal(nativeScroll.prevented, false);
    assert.equal(slide._pointerId, null);
    assert.equal(slide._progress, 0);
    assert.equal(track.classList.contains("dragging"), false);
    assert.deepEqual(released, alreadyDragging ? [1] : []);
    assert.deepEqual(captured, alreadyDragging ? [1] : []);
    assert.deepEqual(serviceCalls, []);
  }
});

test("slide control captures only horizontal intent and resets partial or cancelled gestures", () => {
  const { captured, released, serviceCalls, slide, track } = slideFixture();
  const start = pointerEvent(track, 10, 10);
  slide._start(start, start);
  const horizontalMove = pointerEvent(track, 110, 12);
  slide._move(horizontalMove, horizontalMove);
  assert.equal(horizontalMove.prevented, true);
  assert.equal(track.classList.contains("dragging"), true);
  assert.deepEqual(captured, [1]);
  assert.equal(slide._progress, 0.5);

  const end = pointerEvent(track, 110, 12);
  slide._end(end, end);
  assert.equal(slide._progress, 0);
  assert.deepEqual(released, [1]);
  assert.deepEqual(serviceCalls, []);

  const secondStart = pointerEvent(track, 10, 10, 2);
  slide._start(secondStart, secondStart);
  const secondMove = pointerEvent(track, 50, 11, 2);
  slide._move(secondMove, secondMove);
  slide._cancel({ currentTarget: track }, undefined);
  assert.equal(slide._pointerId, null);
  assert.equal(slide._progress, 0);
  assert.equal(track.classList.contains("dragging"), false);
  assert.deepEqual(released, [1, 2]);
});

test("slide control cancels completion when the pointer is released outside", () => {
  const { serviceCalls, slide, track } = slideFixture();
  const start = pointerEvent(track, 10, 10);
  slide._start(start, start);
  const complete = pointerEvent(track, 240, 10);
  slide._move(complete, complete);
  const outside = pointerEvent(track, 280, 10);
  slide._end(outside, outside);
  assert.deepEqual(serviceCalls, []);
  assert.equal(slide._progress, 0);
});

test("slide control gives one strong haptic per milestone and distinct completion feedback", () => {
  globalThis.__maraoTestHaptics.length = 0;
  const { serviceCalls, slide, track } = slideFixture();
  const start = pointerEvent(track, 10, 10);
  slide._start(start, start);

  const tenPercent = pointerEvent(track, 30, 11);
  slide._move(tenPercent, tenPercent);
  const sameBucket = pointerEvent(track, 38, 11);
  slide._move(sameBucket, sameBucket);
  assert.deepEqual(globalThis.__maraoTestHaptics, ["heavy", "heavy"]);

  const complete = pointerEvent(track, 194, 11);
  slide._move(complete, complete);
  const end = pointerEvent(track, 194, 11);
  const beforeCompletion = globalThis.__maraoTestHaptics.length;
  slide._end(end, end);
  assert.deepEqual(serviceCalls, [["lock", "unlock", { entity_id: "lock.front_door" }]]);
  assert.equal(globalThis.__maraoTestHaptics.at(-1), "heavy");
  assert.equal(globalThis.__maraoTestHaptics.length, beforeCompletion + 1);
  assert.equal(track.classList.contains("completing"), true);
  slide.disconnectedCallback();
});

test("slide control catches a rejected access service", async () => {
  globalThis.__maraoTestActionErrors.length = 0;
  const { slide } = slideFixture();
  slide._hass.callService = () => Promise.reject(new Error("Access denied"));
  slide._trigger();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(globalThis.__maraoTestActionErrors, ["Access denied"]);
});

test("slide control cannot execute through the keyboard", () => {
  const { serviceCalls, slide } = slideFixture();
  slide._setProgress(1);
  for (const key of ["Enter", " ", "End", "ArrowRight"]) {
    slide._key({ key, preventDefault() {} });
  }
  assert.deepEqual(serviceCalls, []);
  assert.equal(slide._progress, 1);

  let prevented = false;
  slide._key({ key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(slide._progress, 0);
});

test("slide control remains available in every known access state", () => {
  const { slide } = slideFixture();
  slide.setAttribute("state", "unknown");
  slide._hass.states["lock.front_door"].state = "unknown";
  assert.equal(slide._disabled(), true);

  slide.setAttribute("state", "unavailable");
  slide._hass.states["lock.front_door"].state = "unavailable";
  assert.equal(slide._disabled(), true);

  slide.setAttribute("state", "unlocked");
  slide._hass.states["lock.front_door"].state = "unlocked";
  assert.equal(slide._disabled(), false);

  slide.setAttribute("state", "locking");
  slide._hass.states["lock.front_door"].state = "locking";
  assert.equal(slide._disabled(), false);

  slide.setAttribute("state", "unlocking");
  slide._hass.states["lock.front_door"].state = "unlocking";
  assert.equal(slide._disabled(), false);

  slide.setAttribute("entity", "cover.front_gate");
  slide.setAttribute("state", "open");
  slide._hass.states = { "cover.front_gate": { state: "open" } };
  assert.equal(slide._disabled(), false);

  slide.setAttribute("state", "opening");
  slide._hass.states["cover.front_gate"].state = "opening";
  assert.equal(slide._disabled(), false);

  slide.setAttribute("state", "locked");
  slide._hass.connected = false;
  assert.equal(slide._disabled(), true);

  slide._hass.connected = true;
  slide._hass.connection = { connected: false };
  assert.equal(slide._disabled(), true);
});

test("slide control keeps an action-only label, meaningful semantics, and a large target", () => {
  const { slide } = slideFixture();
  slide._render();
  assert.match(slide.shadowRoot.innerHTML, /touch-action: pan-y/);
  assert.match(slide.shadowRoot.innerHTML, /role="slider"/);
  assert.match(slide.shadowRoot.innerHTML, /aria-orientation="horizontal"/);
  assert.match(slide.shadowRoot.innerHTML, /aria-valuetext="0%"/);
  assert.match(slide.shadowRoot.innerHTML, /aria-label="Unlock Front Door"/);
  assert.match(slide.shadowRoot.innerHTML, /<span class="label">Unlock<\/span>/);
  assert.doesNotMatch(slide.shadowRoot.innerHTML, /slide to unlock/i);
  assert.match(slide.shadowRoot.innerHTML, /width: 54px;\s+height: 54px;/);
  assert.match(slide.shadowRoot.innerHTML, /padding: 8px 16px 8px 72px/);
  assert.match(slide.shadowRoot.innerHTML, /top: calc\(50% - 27px\)/);
  assert.doesNotMatch(slide.shadowRoot.innerHTML, /padding: 8px 8px 72px|top: auto; bottom: 4px/);
  assert.match(slide.shadowRoot.innerHTML, /--marao-slide-foreground: var\(--primary-text-color\)/);
  assert.doesNotMatch(slide.shadowRoot.innerHTML, /class="fill"|marao-slide-progress/);
  assert.match(slide.shadowRoot.innerHTML, /font-size: max\(1\.125rem, var\(--font-size-primary\)\)/);
  assert.match(slide.shadowRoot.innerHTML, /<ha-icon icon="mdi:chevron-right" aria-hidden="true"><\/ha-icon>/);
  assert.doesNotMatch(slide.shadowRoot.innerHTML, /var\(--color-green\)/);
  assert.match(slide.shadowRoot.innerHTML, /marao-slide-complete 280ms/);

  slide._hass.language = "pt";
  slide._render();
  assert.match(slide.shadowRoot.innerHTML, /aria-label="Destrancar Front Door"/);
  assert.match(slide.shadowRoot.innerHTML, /<span class="label">Destrancar<\/span>/);
});

test("slide control uses the access action wording for covers", () => {
  const { slide } = slideFixture();
  slide.setAttribute("entity", "cover.front_door");
  slide.setAttribute("state", "closed");
  slide._hass.states = {
    "cover.front_door": { state: "closed", attributes: { friendly_name: "Front Door" } },
  };
  slide._render();
  assert.match(slide.shadowRoot.innerHTML, /aria-label="Open Front Door"/);
  assert.match(slide.shadowRoot.innerHTML, /<span class="label">Open<\/span>/);

  slide._hass.language = "pt";
  slide._render();
  assert.match(slide.shadowRoot.innerHTML, /aria-label="Abrir Front Door"/);
  assert.match(slide.shadowRoot.innerHTML, /<span class="label">Abrir<\/span>/);
});
