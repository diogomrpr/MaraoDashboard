import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {};
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
const instrumentedSource = `${source}\nexport { installMaraoTapGuard, isMaraoDashboardPath, syncMaraoTextScale };`;
const { installMaraoTapGuard, isMaraoDashboardPath, syncMaraoTextScale } = await import(
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
