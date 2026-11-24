// Playwright serializes this self-contained function into each document.
function probe({ origin, route }) {
  if (window.top !== window || location.origin !== origin) return;
  const docKey = crypto.randomUUID?.() ?? String(Math.random());
  performance.setResourceTimingBufferSize(4000);
  window.benchSignal({ event: "document", docKey });
  // Resource Timing reports completed encoded bodies, including cached bodies.
  // transferSize, in contrast, is zero for local cache hits.
  const resourceSummary = () => {
    let encoded = 0, maraoEncoded = 0, transfer = 0, count = 0;
    const assets = {};
    let cachedCount = 0;
    for (const entry of performance.getEntriesByType("resource")) {
      count++;
      encoded += entry.encodedBodySize;
      transfer += entry.transferSize;
      const pathname = new URL(entry.name).pathname;
      if (!/^\/(?:api\/marao_dashboard|marao_dashboard)\//.test(pathname) && !/^\/hacsfiles\/[^/]+\/[a-f0-9]{64}--/i.test(pathname)) continue;
      const name = pathname.split("/").pop().replace(/^[a-f0-9]{16,64}--/i, "").replace(/^fonts--/, "");
      if (!/^(?:Marao[a-zA-Z0-9._-]*|Montserrat[a-zA-Z0-9._-]*|marao-[a-zA-Z0-9._-]*)\.(?:[cm]?js|json|woff2|ttf|css)$/i.test(name)) continue;
      maraoEncoded += entry.encodedBodySize;
      assets[name] = (assets[name] ?? 0) + entry.encodedBodySize;
      if (!entry.transferSize) cachedCount++;
    }
    return { encoded, maraoEncoded, transfer, count, assets, cachedCount };
  };
  window.addEventListener("pagehide", () => {
    window.benchSignal({ event: "exit", docKey, resources: resourceSummary() });
  }, { once: true });
  // A redirect still counts toward bytes and elapsed time. Only the requested
  // view can produce a visible or usable milestone.
  if (location.pathname.replace(/\/$/, "") !== route.replace(/\/$/, "")) return;

  // Include slotted controls when walking the composed tree after hit testing.
  const parent = (el) => el?.assignedSlot || el?.parentElement || el?.getRootNode()?.host;
  const ancestors = function* (el) {
    while (el) {
      yield el;
      el = parent(el);
    }
  };
  function* elements(root) {
    if (!root) return;
    if (root.shadowRoot) yield* elements(root.shadowRoot);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let el = walker.nextNode(); el; el = walker.nextNode()) {
      yield el;
      if (el.shadowRoot) yield* elements(el.shadowRoot);
    }
  }
  function shown(el) {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.left < innerWidth && box.top < innerHeight && box.right > 0 && box.bottom > 0;
  }
  function hit(el) {
    const r = el.getBoundingClientRect();
    const x = (Math.max(0, r.left) + Math.min(innerWidth, r.right)) / 2;
    const y = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
    let at = document.elementFromPoint(x, y);
    while (at?.shadowRoot) {
      const next = at.shadowRoot.elementFromPoint(x, y);
      if (!next || next === at) break;
      at = next;
    }
    return [...ancestors(at)].includes(el);
  }
  let view = null, visibleDone = false, usableDone = false;
  const observe = () => {
    if (!view?.isConnected) view = [...elements(document)].find((el) => el.localName === "hui-view");
    if (!view) return {};
    const all = [...elements(view)];
    const cards = all.filter((el) => el.localName === "ha-card" && shown(el) && ![...ancestors(el)].some(
      (host) => /(?:^hui-(?:error|warning)(?:-card)?$|placeholder|skeleton|marao-navbar)/.test(host.localName) || host.matches?.('[inert],[aria-hidden="true"],[aria-busy="true"],[data-problem="error"]')
    ));
    const meaningful = (card) => !card.matches('[role="status"]') && !card.querySelector("ha-spinner,ha-circular-progress,mwc-circular-progress") && [...elements(card)].some((el) => {
      if (el.matches("style,script,template,slot") || !shown(el)) return false;
      if (el.matches("img,svg,canvas") && ![...ancestors(el)].some((host) => /spinner|progress-circular/.test(host.localName))) return true;
      return [...el.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    });
    const first = cards.find(meaningful);
    if (!first) return {};
    const controls = 'button,a[href],input:not([type="hidden"]),select,[role="button"],[role="switch"],[role="slider"],[role="link"],[tabindex="0"]';
    const usable = all.find((el) => {
      if (!el.matches(controls) || el.matches(':disabled,[aria-disabled="true"]') || !shown(el)) return false;
      const chain = [...ancestors(el)];
      if (!chain.some((host) => cards.includes(host) && meaningful(host)) || chain.some((host) => host.matches?.('[inert],[disabled],[aria-disabled="true"],[aria-hidden="true"]'))) return false;
      return hit(el);
    });
    const cardType = (el) => [...ancestors(el)].find((host) => host.localName?.startsWith("marao-") && !["marao-card", "marao-control"].includes(host.localName))?.localName ?? "ha-card";
    return { visible: cardType(first), usable: usable ? cardType(usable) : null };
  };
  const tick = () => {
    const found = observe();
    if ((!visibleDone && found.visible) || (!usableDone && found.usable)) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const now = observe();
        const marks = {};
        if (!visibleDone && found.visible && now.visible) {
          marks.visible = now.visible;
          visibleDone = true;
        }
        if (!usableDone && found.usable && now.usable) {
          marks.usable = now.usable;
          usableDone = true;
        }
        if (Object.keys(marks).length) window.benchSignal({ event: "mark", docKey, marks, resources: resourceSummary() });
        if (!usableDone || !visibleDone) setTimeout(tick, 40);
      }));
    } else if (!usableDone || !visibleDone) setTimeout(tick, 40);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick, { once: true });
  else tick();
}

module.exports = probe;
