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
const source = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url),
  "utf8",
);
const sourceWithoutFrontendImports = source.slice(source.indexOf("const MARAO_FONT_URL"));
const instrumentedSource = `
const haptic = (value) => globalThis.__maraoTestHaptics.push(value);
const callServiceWithNotification = (hass, ...args) => {
  try {
    return Promise.resolve(hass.callService(...args)).catch((error) => {
      globalThis.__maraoTestActionErrors.push(error.message);
    });
  } catch (error) {
    globalThis.__maraoTestActionErrors.push(error.message);
  }
};
${sourceWithoutFrontendImports}
export { MaraoSlideToOpen, installMaraoTapGuard, isMaraoDashboardPath, syncMaraoTextScale };
`;
globalThis.__maraoTestHaptics = [];
globalThis.__maraoTestActionErrors = [];
const {
  MaraoSlideToOpen,
  installMaraoTapGuard,
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
  const fill = { style: {} };
  const thumb = { style: {} };
  const nodes = { ".track": track, ".fill": fill, ".thumb": thumb };
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
  return { attributes, captured, fill, listeners, released, serviceCalls, slide, thumb, track };
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
  slide._end(end, end);
  assert.deepEqual(serviceCalls, [["lock", "unlock", { entity_id: "lock.front_door" }]]);
  assert.equal(globalThis.__maraoTestHaptics.at(-1), "success");
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

test("slide control is disabled for unknown and disconnected entities", () => {
  const { slide } = slideFixture();
  slide.setAttribute("state", "unknown");
  assert.equal(slide._disabled(), true);

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
  assert.match(slide.shadowRoot.innerHTML, /marao-slide-complete 280ms/);

  slide._hass.language = "pt";
  slide._render();
  assert.match(slide.shadowRoot.innerHTML, /aria-label="Destrancar Front Door"/);
  assert.match(slide.shadowRoot.innerHTML, /<span class="label">Destrancar<\/span>/);
});
