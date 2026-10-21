const fs = require("fs");
const assert = require('node:assert/strict');
const path = require("path");
const { accessToken, setBrowserToken, api, assertCurrentFrontend, assertDisposableHaTarget, readConfig } = require("../ha-test/client");
const { prepare } = require("../ha-test/prepare");
const { concreteCases, manifest } = require("../ha-test/cases");
const { sliderReadings } = require("./value-slider-geometry");

const repoRoot = path.resolve(__dirname, "..");

function dashboardScenario(argv, scenarios) {
  const index = argv.indexOf('--scenario');
  const assigned = argv.find(argument => argument.startsWith('--scenario='))?.slice('--scenario='.length);
  const separated = index < 0 ? undefined : argv[index + 1];
  if (assigned !== undefined && separated !== undefined && assigned !== separated) throw new Error('Conflicting mobile scenarios');
  const name = assigned ?? (index < 0 ? 'iphone-normal' : separated);
  const scenario = scenarios.find(value => value.name === name);
  if (!scenario) throw new Error('Unknown mobile scenario: ' + String(name));
  return scenario;
}

function normalizedPathname(value) {
  const pathname = new URL(value).pathname;
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function dashboardNavigationViolations(dashboard, dashboardKey) {
  const viewPaths = new Set((dashboard.views || []).map((view, index) =>
    String(view.path ?? index).replace(/^\/+/, "")
  ));
  const popupHashes = new Set();
  const targets = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value.type === "custom:marao-popup-card" && typeof value.hash === "string") {
      popupHashes.add(value.hash);
    }
    for (const key of ["navigation_path", "room_navigation_path", "popup_hash"]) {
      if (typeof value[key] === "string") targets.push(value[key]);
    }
    if (value.type === "custom:marao-navbar-card") {
      for (const route of value.routes || []) {
        if (typeof route?.url === "string") targets.push(route.url);
      }
    }
    Object.values(value).forEach(visit);
  };
  visit(dashboard);

  return targets.flatMap((target) => {
    if (target.startsWith("#")) {
      return popupHashes.has(target) ? [] : [`Unresolved popup route ${target}`];
    }
    let pathname;
    try {
      pathname = new URL(target, "http://homeassistant.test").pathname.replace(/\/+$/, "");
    } catch {
      return [`Invalid navigation route ${target}`];
    }
    const prefix = `/${dashboardKey}/`;
    if (!pathname.startsWith(prefix)) return [`Route leaves /${dashboardKey}: ${target}`];
    const viewPath = pathname.slice(prefix.length).split("/", 1)[0];
    return viewPaths.has(viewPath) ? [] : [`Route targets missing view ${target}`];
  });
}

function conditionalCardIsActive(card, entityStates = {}) {
  if (card?.type !== "conditional") return true;
  return (card.conditions || []).every((condition) => {
    const actual = entityStates[condition?.entity];
    if (actual === undefined) return false;
    if (condition.state !== undefined) return (Array.isArray(condition.state) ? condition.state : [condition.state]).includes(actual);
    if (condition.state_not !== undefined) return !(Array.isArray(condition.state_not) ? condition.state_not : [condition.state_not]).includes(actual);
    return false;
  });
}

function buildViewChecks(dashboard, dashboardUrl, entityStates = {}) {
  const walk = (value, counts) => {
    if (Array.isArray(value)) return value.forEach((item) => walk(item, counts));
    if (!value || typeof value !== "object") return;
    if (value.type === "conditional") {
      if (conditionalCardIsActive(value, entityStates)) walk(value.card, counts);
      return;
    }
    if (value.type === "custom:marao-card") counts["marao-card"] = (counts["marao-card"] || 0) + 1;
    if (value.type === "custom:marao-popup-card") counts["marao-popup-card"] = (counts["marao-popup-card"] || 0) + 1;
    if (value.type === "custom:marao-navbar-card") counts["marao-navbar-card"] = (counts["marao-navbar-card"] || 0) + 1;
    Object.values(value).forEach((item) => walk(item, counts));
  };
  return (dashboard.views || []).map((view, index) => {
    const configuredCounts = {};
    walk(view.cards || [], configuredCounts);
    const pathName = String(view.path ?? index).replace(/^\/+/, "");
    return { name: view.title || pathName, path: pathName, url: `/${String(dashboardUrl).split("/").filter(Boolean)[0]}/${pathName}`, configuredCounts };
  });
}

function exactText(value) {
  return new RegExp(`^\\s*${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
}

function cardByTitle(page, title) {
  return page.locator("marao-card").filter({
    has: page.locator(".title").filter({ hasText: exactText(title) }),
  }).first();
}

function cardAction(page, title) {
  return cardByTitle(page, title).locator("[data-card-action]");
}

async function titleLayoutIssues(page, families = [], subtree) {
  return page.locator("marao-card,marao-state-timeline-card,marao-energy-period-card,marao-camera-events-card,marao-frigate-events-card").evaluateAll((cards, { families, subtree }) => cards.filter(card => (!subtree || card === subtree || subtree.contains(card)) && (!families.length || families.includes(card._config?.template || card.localName))).flatMap((card) => {
    const title = card.shadowRoot?.querySelector(".body > .title,.compact-copy > .title,header > h2,.surface > h2");
    if (!title || !title.getBoundingClientRect().width) return [];
    const parent = title.parentElement;
    const style = getComputedStyle(parent);
    const contentWidth = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const rect = title.getBoundingClientRect();
    const name = card._config?.name || card._config?.title || card._config?.template || card.localName;
    const issues = [];
    const surface = title.closest('ha-card,.surface');
    if (surface && getComputedStyle(surface).overflow !== 'visible') {
      const box = surface.getBoundingClientRect(), surfaceStyle = getComputedStyle(surface);
      const range = document.createRange(); range.selectNodeContents(title);
      for (const line of range.getClientRects()) for (const edge of ['Left', 'Right']) {
        const radius = Math.min(parseFloat(surfaceStyle[`borderTop${edge}Radius`]) || 0, box.width / 2, box.height / 2);
        const x = Math.max(0, radius - (edge === 'Left' ? line.left - box.left : box.right - line.right));
        const y = Math.max(0, radius - (line.top - box.top));
        if (x * x + y * y > radius * radius + .25) issues.push(`${name}: title text is clipped by a rounded corner`);
      }
    }
    const config = card._config || {};
    const service = config.variables?.action_service || config.tap_action?.service || config.tap_action?.perform_action;
    const sliderHeader = ['hc_light_card', 'hc_fan_card', 'hc_cover_card', 'hc_access_card', 'hc_access_slide_action_card'].includes(config.template)
      || config.template === 'hc_access_action_card' && ['lock.lock','cover.close_cover'].includes(service)
      || config.template === 'hc_access_hold_action_card' && /^(lock|cover)\./.test(config.entity || '')
      || config.template?.startsWith('hc_access_') && ['lock.unlock', 'cover.open_cover'].includes(service);
    const compact = parent.classList.contains('compact-copy'), header = compact ? parent.parentElement : null;
    if (compact) {
      const body = header.closest('.body'), icon = header.querySelector(':scope > .icon');
      const copy = parent.getBoundingClientRect(), head = header.getBoundingClientRect(), picture = icon?.getBoundingClientRect();
      if (!sliderHeader || !body.classList.contains('slider-header')) issues.push(`${name}: missing compact family header marker`);
      if (Math.abs(rect.width - copy.width) > 1 || rect.left < head.left - .5 || rect.right > head.right + .5) issues.push(`${name}: compact title does not use its text block`);
      if (picture) {
        const adjacent = Math.abs((copy.top + copy.bottom - picture.top - picture.bottom) / 2) <= 1 && copy.right <= picture.left - 4;
        const primarySize = parseFloat(getComputedStyle(title).getPropertyValue?.('--font-size-primary')) || 18;
        const constrainedWrap = head.width < primarySize * 3 + picture.width + 8 - .5 && copy.bottom <= picture.top - 4
          && picture.left >= head.left - .5 && picture.right <= head.right + .5 && picture.bottom <= head.bottom + .5;
        if (!adjacent && !constrainedWrap) issues.push(`${name}: compact reading block and icon overlap or misalign`);
      }
      for (const child of body.children) if (child !== header) {
        const other = child.getBoundingClientRect();
        if (other.width && other.height && other.top < head.bottom - 1) issues.push(`${name}: control appears above its compact header`);
      }
      return issues;
    }
    const icon = sliderHeader ? parent.querySelector(':scope > .icon') : null;
    const iconBox = icon?.getBoundingClientRect();
    const titleWidth = contentWidth - (iconBox ? iconBox.width + parseFloat(style.columnGap) : 0);
    if (Math.abs(rect.width - titleWidth) > 1) issues.push(`${name}: title uses ${rect.width}px of ${titleWidth}px available title width`);
    if (iconBox && (Math.abs((rect.top + rect.bottom - iconBox.top - iconBox.bottom) / 2) > 1
      || rect.right > iconBox.left - parseFloat(style.columnGap) + 1)) issues.push(`${name}: title and icon do not share a separated header row`);
    for (const child of parent.children) {
      const other = child.getBoundingClientRect();
      if (child !== title && child !== icon && other.width && other.height && other.top < (iconBox ? Math.max(rect.bottom, iconBox.bottom) : rect.bottom) - 1) issues.push(`${name}: content appears alongside or above its title`);
    }
    return issues;
  }), { families, subtree });
}

async function measureCenteredIcons(locator) {
  return locator.evaluateAll((bodies) => bodies.map((body, index) => {
    const root = body.getRootNode();
    const icon = body.querySelector(".icon");
    const card = body.closest("ha-card");
    const action = root?.querySelector?.("[data-card-action]");
    const label = action?.getAttribute("aria-label")
      || icon?.querySelector("ha-icon")?.getAttribute("icon")
      || `Control ${index + 1}`;
    if (!icon || !card) return { index, label, missingElement: true };
    const cardBox = card.getBoundingClientRect();
    const iconBox = icon.getBoundingClientRect();
    return {
      index,
      label,
      horizontalOffset: (iconBox.left + iconBox.width / 2) - (cardBox.left + cardBox.width / 2),
      verticalOffset: (iconBox.top + iconBox.height / 2) - (cardBox.top + cardBox.height / 2),
      cardWidth: cardBox.width,
      cardHeight: cardBox.height,
      iconWidth: iconBox.width,
      iconHeight: iconBox.height,
    };
  }));
}

async function scrollDashboard(page, { screenshotPrefix, onSegment } = {}) {
  // HA scrolls inside its shell; fullPage screenshots alone miss those cards.
  await page.evaluate(() => document.fonts?.ready);
  const scroller = await page.locator("marao-card").first().evaluateHandle((card) => {
    for (let element = card; element; element = element.assignedSlot || element.parentElement || element.getRootNode()?.host) {
      if (element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 1
        && ["auto", "scroll"].includes(getComputedStyle(element).overflowY)) return element;
    }
    return document.scrollingElement;
  });
  let position = 0;
  let segment = 0;
  let previous;
  let stalled = 0;
  try {
    for (;;) {
      await scroller.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), position);
      await page.waitForTimeout(150);
      await page.evaluate(() => document.fonts?.ready);
      await onSegment?.();
      if (screenshotPrefix) {
        await page.screenshot({ path: `${screenshotPrefix}-${String(++segment).padStart(3, "0")}.png`, scale: "css" });
      }
      const current = await scroller.evaluate((element) => ({
        top: element.scrollTop, height: element.scrollHeight, viewport: element.clientHeight,
        selected: element.localName + (element.id ? `#${element.id}` : ""),
        connected: element.isConnected,
      }));
      const { top, height, viewport } = current;
      const bottom = top + viewport >= height - 1;
      const stableLayout = previous && height === previous.height && viewport === previous.viewport;
      // Lazy rendering can change the height and clamp a requested position.
      // Compare actual progress only after layout settles, and confirm the end.
      stalled = !bottom && stableLayout && top <= previous.top + 0.5 ? stalled + 1 : 0;
      if (!current.connected || viewport <= 0 || stalled >= 3) {
        throw new Error(`The dashboard could not be scrolled through completely: ${JSON.stringify({ url: new URL(page.url()).pathname, ...current, requested: position, previous })}`);
      }
      if (bottom && stableLayout && Math.abs(top - previous.top) <= 1) break;
      position = Math.min(height - viewport, top + Math.max(1, Math.floor(viewport * 0.75)));
      previous = current;
    }
    await scroller.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    const titleIssues = await titleLayoutIssues(page);
    if (titleIssues.length) throw new Error(titleIssues.join("\n"));
  } finally {
    await scroller.dispose();
  }
}

async function checkStateCases(page, serviceCalls) {
  const cases = concreteCases();
  const result = await page.locator("marao-card,marao-energy-period-card,marao-state-timeline-card").evaluateAll((cards, examples) => {
    const failures = [];
    const states = document.querySelector("home-assistant").hass.states;
    for (const example of examples) {
      const card = cards.find((element) => element._config?.name === example.name && element._config?.entity === example.entity);
      if (!card) { failures.push(`${example.id}: gallery card missing`); continue; }
      if (example.idleHoldProgressHidden) {
        const progress = card.shadowRoot.querySelector(".hold-progress rect");
        if (!progress || Number(getComputedStyle(progress).opacity) !== 0) failures.push(`${example.id}: idle hold progress is visible`);
      }
      const actual = states[example.entity]?.state;
      const numericMatch = actual !== undefined && Number.isFinite(Number(example.state)) && Number(actual) === Number(example.state);
      if (example.missing ? actual !== undefined : actual !== example.state && !numericMatch) {
        failures.push(`${example.id}: expected ${example.state}; found ${actual ?? "missing"}`);
      }
      if (!example.disabled) continue;
      const root = card.shadowRoot;
      const controls = [...root.querySelectorAll('button,input,select,[role="slider"]')];
      const visit = (element) => {
        if (element.shadowRoot) {
          controls.push(...element.shadowRoot.querySelectorAll('button,input,select,[role="slider"]'));
          element.shadowRoot.querySelectorAll("*").forEach(visit);
        }
      };
      root.querySelectorAll("*").forEach(visit);
      if (controls.some((control) => !control.disabled && control.getAttribute("aria-disabled") !== "true")) {
        failures.push(`${example.id}: unknown/unavailable/missing entity has an enabled control`);
      }
      // Native activation must leave disabled controls inert.
      controls.filter((control) => control.matches("button,input,select")).forEach((control) => control.click());
    }
    return failures;
  }, cases);
  await page.waitForTimeout(100);
  if (serviceCalls.some((call) => cases.some((example) => example.disabled && call.entities.includes(example.entity)))) {
    result.push("A disabled gallery case dispatched a service action.");
  }
  if (result.length) throw new Error(`Gallery state coverage failed:\n${result.join("\n")}`);
}

async function slideGesture(page, track, points, { cancel = false, afterStart } = {}) {
  await page.locator(".marao-popup-sheet").evaluate((sheet) => Promise.all(sheet.getAnimations().map((animation) => animation.finished)));
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  if (!box) throw new Error("The safe access slide has no visible track.");
  let previous = { x: box.x + 24, y: box.y + box.height / 2 };
  const session = await page.context().newCDPSession(page);
  const send = (type, point) => session.send("Input.dispatchTouchEvent", {
    type, touchPoints: point ? [{ ...point, id: 1 }] : [],
  });
  try {
    await send("touchStart", previous);
    if (afterStart) await afterStart();
    for (const [progress, vertical] of points) {
      const next = { x: box.x + 24 + progress * (box.width - 42), y: box.y + box.height / 2 + vertical };
      for (let step = 1; step <= 8; step++) {
        await send("touchMove", { x: previous.x + (next.x - previous.x) * step / 8, y: previous.y + (next.y - previous.y) * step / 8 });
      }
      previous = next;
    }
    await send(cancel ? "touchCancel" : "touchEnd");
  } finally { await session.detach(); }
}

async function checkActionDispatches(page, serviceCalls) {
  const count = (entity, service) => serviceCalls.filter((call) => call.entities.includes(entity) && call.service === service).length;
  const assertCount = async (entity, service, before, expected, label) => {
    await page.waitForTimeout(150);
    const actual = count(entity, service) - before;
    if (actual !== expected) throw new Error(`${label} dispatched ${actual} ${service} calls; expected ${expected}.`);
  };
  const lock = "lock.marao_dashboard_test_lock";
  await cardAction(page, "Lock access").tap();
  const track = page.locator(".marao-popup-sheet marao-slide-to-open .track");
  const gesture = (points, options) => slideGesture(page, track, points, options);
  const before = count(lock, "unlock");
  await gesture([]);
  await gesture([[0.3, 0]]);
  await gesture([[0.01, 30]]);
  await gesture([[1, 0], [0, 0]]);
  await gesture([[1, 0], [1, -80]]);
  await gesture([[1, 0]], { cancel: true });
  await assertCount(lock, "unlock", before, 0, "Cancelled access gestures");
  const unrelated = "input_boolean.marao_dashboard_test_light";
  const original = await page.evaluate(entity => document.querySelector('home-assistant').hass.states[entity].state, unrelated);
  const idleTrack = await track.elementHandle();
  await page.evaluate(entity => document.querySelector('home-assistant').hass.callService('input_boolean', 'toggle', {entity_id: entity}), unrelated);
  await page.waitForFunction(({entity, original}) => document.querySelector('home-assistant').hass.states[entity].state !== original, {entity: unrelated, original});
  assert.equal(await idleTrack.evaluate(element => element.isConnected), true, 'An unrelated HA update replaced the idle access track');
  await page.evaluate(({entity, original}) => document.querySelector('home-assistant').hass.callService('input_boolean', original === 'on' ? 'turn_on' : 'turn_off', {entity_id: entity}), {entity: unrelated, original});
  await page.waitForFunction(({entity, original}) => document.querySelector('home-assistant').hass.states[entity].state === original, {entity: unrelated, original});
  await idleTrack.dispose();
  await gesture([[1, 0]], { afterStart: async () => {
    await page.evaluate(entity => document.querySelector('home-assistant').hass.callService('input_boolean', 'toggle', {entity_id: entity}), unrelated);
    await page.waitForFunction(({entity, original}) => document.querySelector('home-assistant').hass.states[entity].state !== original, {entity: unrelated, original});
  } });
  await assertCount(lock, "unlock", before, 1, "Completed access slide during unrelated HA update");
  await page.evaluate(({entity, original}) => document.querySelector('home-assistant').hass.callService('input_boolean', original === 'on' ? 'turn_on' : 'turn_off', {entity_id: entity}), {entity: unrelated, original});
  const lockBefore = count(lock, "lock");
  await page.locator(".marao-popup-sheet marao-card").filter({
    has: page.locator(".title").filter({ hasText: exactText("Lock") }),
  }).locator("[data-card-action]").tap();
  await assertCount(lock, "lock", lockBefore, 1, "Explicit lock tap");
  await page.locator(".marao-popup-close").tap();
  await page.waitForFunction(() => !location.hash);

  const alarm = "alarm_control_panel.marao_dashboard_test_alarm_no_code";
  const hold = cardAction(page, "Arm away · hold");
  await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
  await hold.scrollIntoViewIfNeeded();
  await hold.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  let holdBox;
  await require('playwright/test').expect.poll(async () => {
    holdBox = await hold.boundingBox();
    return Boolean(holdBox && holdBox.width >= 48 && holdBox.height >= 48);
  }, { message: "The safe security hold must have a visible touch target" }).toBe(true);
  const point = { x: holdBox.x + holdBox.width / 2, y: holdBox.y + holdBox.height / 2 };
  const holdBefore = count(alarm, "alarm_arm_away");
  const touch = await page.context().newCDPSession(page);
  const send = (type, target) => touch.send("Input.dispatchTouchEvent", { type, touchPoints: target ? [{ ...target, id: 1 }] : [] });
  try {
    await send("touchStart", point);
    await page.waitForTimeout(300);
    await send("touchEnd");
    await send("touchStart", point);
    await send("touchMove", { x: holdBox.x - 10, y: point.y });
    await page.waitForTimeout(1250);
    await send("touchEnd");
    await send("touchStart", point);
    await send("touchCancel");
    await page.waitForTimeout(1250);
    await assertCount(alarm, "alarm_arm_away", holdBefore, 0, "Cancelled security holds");
    await send("touchStart", point);
    // Keep holding until the browser processes its timer, even under test load.
    await require('playwright/test').expect.poll(() => count(alarm, "alarm_arm_away"), {
      timeout: 3000, message: "A continuously held security control must dispatch once",
    }).toBe(holdBefore + 1);
    await send("touchEnd");
    await assertCount(alarm, "alarm_arm_away", holdBefore, 1, "Completed security hold");
  } finally { await touch.detach(); }
}

function isDelayedCameraRequest(message) {
  return message?.type === 'frigate/events/get' && message.instance_id === 'marao_test'
    && Array.isArray(message.cameras) && message.cameras.length === 1 && message.cameras[0] === 'loading' && Number.isInteger(message.id);
}

function refreshDelayedCameraLoading(element) {
  const config = element._config;
  if (config?.entity !== 'camera.marao_dashboard_test_camera' || config.event_provider !== 'frigate'
    || config.frigate_instance_id !== 'marao_test' || config.frigate_camera !== 'loading') throw Error('Only the safe delayed camera fixture may be refreshed');
  const button = element.shadowRoot.querySelector('[data-action="refresh"]');
  if (!button || button.disabled || ['idle', 'loading'].includes(element._status)) throw Error('Finish the existing event request before refreshing');
  const before = element._request;
  button.click();
  return { status: element._status, requestAdvanced: element._request === before + 1,
    readable: Boolean(element.shadowRoot.querySelector('[role="status"]')?.textContent?.trim()) };
}

async function waitForCameraEvents(page, card) {
  const element = await card.elementHandle();
  try {
    // Keep data polling independent of the page's timer/frame scheduling.
    await require('playwright/test').expect.poll(() => element.evaluate(element =>
      element.isConnected && ['ready', 'error'].includes(element._status)),
    { timeout: 10000, intervals: [50] }).toBe(true);
  } catch (error) {
    try {
      const observed = await element.evaluate(element => ({ connected: element.isConnected, status: element._status,
        request: element._request, events: element._events?.length }));
      const current = await card.evaluate(element => ({ connected: element.isConnected, status: element._status,
        request: element._request, events: element._events?.length }));
      const detail = '\nCamera event state after failed wait: ' + JSON.stringify({ observed, current });
      error.message += detail; error.stack += detail;
    } catch (diagnosticError) { error.message += '\nCamera event diagnostic failed: ' + diagnosticError.name; }
    throw error;
  } finally { await element.dispose(); }
}

async function checkCameraCases(page) {
  for (const example of manifest.eventCases) {
    if (page.__cameraRequestLedger) await page.__cameraRequestLedger.boundary('requested camera event navigation: ' + example.name,
      () => cardAction(page, example.name).tap(), { terminal: false });
    else await cardAction(page, example.name).tap();
    const card = page.locator(".marao-popup-sheet marao-camera-events-card");
    await card.waitFor({ state: "visible" });
    if (example.expectedDisabled) {
      const status = await card.evaluate((element) => ({
        status: element.shadowRoot.querySelector("[data-status]")?.dataset.status,
        enabled: [...element.shadowRoot.querySelectorAll("button,input,select")].some((control) => !control.disabled),
      }));
      if (status.status !== example.expectedStatus || status.enabled) {
        throw new Error(`${example.name}: neutral camera event controls must be disabled (${status.status}).`);
      }
      await page.locator(".marao-popup-close").tap();
      await page.waitForFunction(() => !location.hash);
      continue;
    }
    let delayedRequestsBefore;
    if (example.expectedStatus === "loading") {
      await waitForCameraEvents(page, card);
      delayedRequestsBefore = page.__cameraDelayedRequests.length;
      const loading = await card.evaluate(refreshDelayedCameraLoading);
      if (loading.status !== 'loading' || !loading.requestAdvanced || !loading.readable) {
        throw new Error("The delayed camera case did not show a readable loading state.");
      }
    }
    await waitForCameraEvents(page, card);
    if (delayedRequestsBefore !== undefined) assert.equal(page.__cameraDelayedRequests.length, delayedRequestsBefore + 1, 'One explicit Refresh must send one real delayed provider request');
    if (example.expectedStatus === "error") {
      if (!await card.locator('[role="alert"]').innerText()) throw new Error("Camera provider errors must be readable.");
    } else {
      const status = await card.evaluate((element) => ({ status: element._status, count: element._events.length }));
      if (status.status === "error" || (example.expectedEmpty ? status.count !== 0 : status.count === 0)) {
        throw new Error(`${example.name}: unexpected camera event state ${JSON.stringify(status)}.`);
      }
      const kinds = await card.evaluate((element) => {
        const seen = new Set();
        return element._events.flatMap((event, index) => {
          const kind = element._provider === "unifi_protect" || event.has_clip ? "clip" : "snapshot";
          if (seen.has(kind)) return [];
          seen.add(kind);
          return [{ kind, index }];
        });
      });
      if (example.expectedMediaKinds && example.expectedMediaKinds.some((kind) => !kinds.some((item) => item.kind === kind))) {
        throw new Error(`${example.name}: missing expected event media kinds.`);
      }
      for (const { index, kind } of kinds) {
        await card.locator('[data-action="event"]').nth(index).tap();
        await page.waitForFunction(({ element, expectedError }) => element.isConnected && element._selected
          && (expectedError ? element._selected.status === "error" : element._selected.status !== "loading"),
        { element: await card.elementHandle(), expectedError: Boolean(example.expectedDetailError) });
        if (example.expectedDetailError) {
          const detail = await card.evaluate((element) => ({
            status: element._selected.status,
            error: element.shadowRoot.querySelector('[role="alert"]')?.textContent?.trim(),
          }));
          if (detail.status !== "error" || !detail.error) throw new Error(`${example.name}: event-detail failure was not reported clearly.`);
        } else {
          const media = card.locator(kind === "clip" ? ".detail video" : ".detail-image");
          await media.waitFor({ state: "visible" });
          await page.waitForFunction(({ media, kind }) => media.isConnected
            && (kind === "clip" ? media.readyState >= 1 && !media.error : media.complete && media.naturalWidth > 0),
          { media: await media.elementHandle(), kind });
        }
        await card.locator('[data-action="back"]').tap();
      }
    }
    await page.locator(".marao-popup-close").tap();
    await page.waitForFunction(() => !location.hash);
  }
}

async function checkShowcaseActions(page, serviceCalls, output) {
  const vacuumEntity = "vacuum.marao_dashboard_test_vacuum_commands";
  const vacuum = cardByTitle(page, "Vacuum segment commands");
  for (const [index, service, state] of [[0, "start", "cleaning"], [1, "pause", "paused"], [2, "return_to_base", "returning"]]) {
    const before = serviceCalls.filter((call) => call.entities.includes(vacuumEntity)).length;
    await vacuum.locator(`[data-vacuum-action="${index}"]`).tap();
    await page.waitForFunction(({ entity, state }) => document.querySelector("home-assistant").hass.states[entity]?.state === state, { entity: vacuumEntity, state });
    const calls = serviceCalls.filter((call) => call.entities.includes(vacuumEntity)).slice(before);
    if (calls.length !== 1 || calls[0].service !== service) throw new Error(`Vacuum ${service} must dispatch once.`);
  }
  for (let index = 3; index <= 5; index++) {
    const count = await page.evaluate((entity) => document.querySelector("home-assistant").hass.states[entity].attributes.command_count, vacuumEntity);
    await vacuum.locator(`[data-vacuum-action="${index}"]`).tap();
    await page.waitForFunction(({ entity, count }) => document.querySelector("home-assistant").hass.states[entity].attributes.command_count === count + 1, { entity: vacuumEntity, count });
    const segments = await page.evaluate((entity) => document.querySelector("home-assistant").hass.states[entity].attributes.last_segments, vacuumEntity);
    if (segments.length !== 1 || segments[0] !== 18 + index) throw new Error("Vacuum dispatched the wrong segment.");
  }
  for (let count = 1; count <= 5; count++) {
    const entity = `input_select.marao_dashboard_test_case_scene_options_${count}`;
    const card = page.locator("marao-card").filter({ has: page.locator("[data-scene-option]") }).filter({
      has: page.locator(".title").filter({ hasText: exactText(`Scene with ${["one", "two", "three", "four", "five"][count - 1]} option${count > 1 ? "s" : ""}`) }),
    });
    const choices = card.locator("[data-scene-option]");
    if (await choices.count() !== count) throw new Error(`${entity}: expected ${count} visible choices.`);
    const option = await choices.last().getAttribute("data-scene-option");
    const before = serviceCalls.filter((call) => call.entities.includes(entity)).length;
    await choices.last().tap();
    await page.waitForFunction(({ entity, option }) => document.querySelector("home-assistant").hass.states[entity]?.state === option, { entity, option });
    await page.waitForTimeout(150);
    const calls = serviceCalls.filter((call) => call.entities.includes(entity)).slice(before);
    if (calls.length !== 1 || calls[0].service !== "select_option") throw new Error(`${entity}: choosing a scene must dispatch select_option once.`);
    if (await choices.last().getAttribute("aria-pressed") !== "true") throw new Error(`${entity}: authoritative scene choice is not selected.`);
  }
  const dual = manifest.dualClimateCase;
  const dualCard = cardByTitle(page, dual.name);
  const values = () => page.evaluate((entity) => {
    const state = document.querySelector("home-assistant").hass.states[entity];
    return { low: state.attributes.target_temp_low, high: state.attributes.target_temp_high };
  }, dual.entity);
  const before = await values();
  await dualCard.locator('[data-number-step="increase"]').tap();
  await page.waitForFunction(({ entity, low }) => document.querySelector("home-assistant").hass.states[entity].attributes.target_temp_low > low, { entity: dual.entity, low: before.low });
  const after = await values();
  if (after.high - after.low !== before.high - before.low || after.high <= before.high) throw new Error("Dual climate setpoints did not preserve their interval.");
  await dualCard.locator('[data-number-step="decrease"]').tap();
  const mixedRoom = cardByTitle(page, "Room · one light unavailable");
  if (!await mixedRoom.locator("[data-room-lights-off]").isDisabled()) throw new Error("A mixed room group must disable its all-lights-off control.");
  const failure = manifest.actionErrorCase;
  const failedCard = cardByTitle(page, failure.name);
  const failedService = failure.service.split('.')[1];
  const countFailure = () => serviceCalls.filter(call => call.service === failedService).length;
  const beforeFailure = countFailure();
  await page.evaluate(() => {
    window.__maraoActionErrors = [];
    if (!window.__maraoActionErrorListener) {
      window.__maraoActionErrorListener = event => window.__maraoActionErrors.push(event.detail.message);
      window.addEventListener("hass-notification", window.__maraoActionErrorListener);
    }
  });
  await cardAction(page, failure.name).tap();
  await failedCard.locator('.problem[role="alert"]').filter({ hasText: failure.expectedError }).waitFor({ state: 'visible' });
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await failedCard.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}-failed.png`, scale: 'css' });
  }
  if (await failedCard.locator('ha-card').getAttribute('data-problem') !== 'error' || countFailure() !== beforeFailure + 1) throw new Error('Reported failure lost its owning surface or dispatched more than once.');
  const notifications = await page.evaluate((expected) => window.__maraoActionErrors.filter((message) => message.includes(expected)).length, failure.expectedError);
  if (notifications !== 1) throw new Error(`One failed action produced ${notifications} error notifications.`);
  await failedCard.evaluate(card => { card.hass = { ...card.hass, states: { ...card.hass.states } }; });
  if (await failedCard.locator('.problem[role="alert"]').count() !== 1) throw new Error('An unrelated state update cleared the reported failure.');
  const simulateFailure = cardAction(page, 'Simulate safe action failure');
  await simulateFailure.tap();
  await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['input_boolean.marao_dashboard_test_action_failure'].state === 'off');
  try {
    await cardAction(page, failure.name).tap();
    await page.waitForFunction(card => !card._actionError && !card.shadowRoot.querySelector('[data-problem="error"]'), await failedCard.elementHandle());
    if (countFailure() !== beforeFailure + 2) throw new Error('Explicit retry did not dispatch exactly once.');
    const afterNotifications = await page.evaluate(expected => window.__maraoActionErrors.filter(message => message.includes(expected)).length, failure.expectedError);
    if (afterNotifications !== 1) throw new Error('Successful retry duplicated a failure notification.');
    if (output) await page.screenshot({ path: `${output}-recovered.png`, scale: 'css' });
  } finally {
    await cardAction(page, 'Simulate safe action failure').tap();
    await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['input_boolean.marao_dashboard_test_action_failure'].state === 'on');
  }
}

async function checkMediaRecovery(page, serviceCalls, output) {
  const assert = require('node:assert/strict');
  const helper = 'input_boolean.marao_dashboard_test_media_failure';
  const cards = ['Camera preview · failed media', 'Media artwork · failed media'].map(name => cardByTitle(page, name));
  const waitFailure = async card => {
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(card => card._config.template === 'hc_camera_card' ? card._camera?.state === 'error' && card._camera.reason === 'poster_failed' : Boolean(card._mediaError), await card.elementHandle());
  };
  const capture = async name => {
    if (!output) return;
    fs.mkdirSync(output, { recursive: true });
    for (const [index, card] of cards.entries()) {
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: path.join(output, `${name}-${index}.png`), scale: 'css', style: 'marao-navbar-card { visibility: hidden !important; }' });
    }
  };
  const setFailure = async enabled => {
    const before = serviceCalls.filter(call => call.entities.includes(helper)).length;
    await page.evaluate(({ helper, enabled }) => document.querySelector('home-assistant').hass.callService('input_boolean', enabled ? 'turn_on' : 'turn_off', { entity_id: helper }), { helper, enabled });
    await page.waitForFunction(({ helper, enabled }) => document.querySelector('home-assistant').hass.states[helper].state === (enabled ? 'on' : 'off'), { helper, enabled });
    assert.equal(serviceCalls.filter(call => call.entities.includes(helper)).length, before + 1);
  };
  try {
    for (const theme of ['light', 'dark']) {
      const { applyVisualPreferences, scenarios } = require('./test-ha-dashboard-accessibility');
      await applyVisualPreferences(page, scenarios.find(scenario => scenario.name === 'iphone-normal'), theme);
      for (const card of cards) {
        await waitFailure(card);
        assert.equal(await card.locator('ha-card').getAttribute('data-problem'), 'error');
        assert.equal(await card.locator('img.camera-poster[src]:not([hidden]),ha-camera-stream,.media-artwork img').count(), 0);
        await card.evaluate(card => {
          card.__mediaFailureCount = 0;
          if (!card.__mediaFailureListener) {
            card.__mediaFailureListener = event => { if (event.target.localName === 'img' && event.target.isConnected) card.__mediaFailureCount++; };
            card.shadowRoot.addEventListener('error', card.__mediaFailureListener, true);
          }
          card.hass = { ...card.hass, states: { ...card.hass.states } };
        });
        assert.equal(await card.evaluate(card => card.__mediaFailureCount), 0, 'Unrelated updates must not retry failed media.');
        await card.locator('[data-media-retry],.camera-feedback button').tap();
        await waitFailure(card);
        assert.equal(await card.evaluate(card => card.__mediaFailureCount), 1, 'Explicit retry must load one current image.');
      }
      await capture(`${theme}-failed-after-explicit-retry`);
      await setFailure(false);
      for (const card of cards) {
        await card.scrollIntoViewIfNeeded();
        if (await card.evaluate(card => card._config.template === 'hc_camera_card')) await card.locator('.camera-feedback button').tap();
        await page.waitForFunction(card => {
          if (card._config.template === 'hc_camera_card') {
            const image = card._camera?.poster;
            return card._camera?.state === 'snapshot' && !image.hidden && image.complete && image.naturalWidth > 0;
          }
          const image = card.shadowRoot.querySelector('.media-artwork img');
          return !card._mediaError && !card.shadowRoot.querySelector('[data-problem]') && image?.complete && image.naturalWidth > 0;
        }, await card.elementHandle());
      }
      await capture(`${theme}-recovered`);
      const example = manifest.eventCases.find(example => example.id === 'media_error');
      assert.ok(example);
      await cardAction(page, example.name).tap();
      const events = page.locator('.marao-popup-sheet marao-camera-events-card');
      await events.locator('[data-action="event"]').first().tap();
      await page.waitForFunction(card => {
        const image = card.shadowRoot.querySelector('.detail-image');
        return card._selected?.status === 'ready' && image?.complete && image.naturalWidth > 0 && !card.shadowRoot.querySelector('[data-problem]');
      }, await events.elementHandle());
      await events.locator('[data-action="back"]').tap();
      await page.locator('.marao-popup-close').tap();
      await page.waitForFunction(() => !location.hash);
      await setFailure(true);
      for (const card of cards) await waitFailure(card);
    }
    console.log('Camera preview, artwork and event media: explicit retry, no automatic retry and recovery passed in both themes.');
  } finally {
    if (await page.evaluate(helper => document.querySelector('home-assistant').hass.states[helper].state !== 'on', helper)) await setFailure(true);
  }
}

async function checkNativeSurfaces(page) {
  await page.waitForFunction(() => {
    function ready(root) {
      for (const element of root?.children || []) {
        if (element.localName.startsWith('marao-native-') && (element._loading || !element._children?.length)) return false;
        if (element.getAttribute('data-graph-history-state') === 'loading' || element.getAttribute('data-history-state') === 'loading') return false;
        if (!ready(element.shadowRoot) || !ready(element)) return false;
      }
      return true;
    }
    return ready(document);
  }, undefined, { timeout: 20000 });
  const result = await page.locator('marao-card').evaluateAll(async (cards, example) => {
    const target = cards.find(card => card._config.name === example.name && card._config.entity === example.entity);
    if (!target) throw new Error('Missing native-surface gallery fixture');
    await Promise.all(cards.map(card => card.shadowRoot.querySelector('ha-card')?.updateComplete));
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const read = () => ({ height: document.scrollingElement.scrollHeight, top: document.scrollingElement.scrollTop });
    const before = read(), surfaces = cards.map(card => card.shadowRoot.querySelector('ha-card'));
    const hass = document.querySelector('home-assistant').hass;
    for (const card of cards) card.hass = { ...hass, states: { ...hass.states } };
    const during = read();
    await Promise.all(cards.map(card => card.shadowRoot.querySelector('ha-card')?.updateComplete));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { before, during, after: read(), replaced: cards.filter((card, index) => card.shadowRoot.querySelector('ha-card') !== surfaces[index]).length };
  }, manifest.nativeSurfaceCase);
  assert.equal(result.replaced, 0, 'HA updates replaced native card surfaces');
  assert.deepEqual(result.during, result.before, 'HA updates temporarily collapsed or clamped the gallery');
  assert.deepEqual(result.after, result.before, 'HA updates changed the unchanged gallery layout');
}

async function installHistoryLoadingGate(page, baseUrl) {
  const origin = new URL(baseUrl).origin, pattern = '**/api/history/period/**';
  let released = false, held = 0, resolve;
  const pending = new Promise(done => { resolve = done; });
  const handler = async route => {
    const url = new URL(route.request().url());
    if (!released && route.request().method() === 'GET' && url.origin === origin && url.pathname.startsWith('/api/history/period/')
      && url.searchParams.getAll('filter_entity_id').length === 1
      && url.searchParams.get('filter_entity_id') === 'sensor.marao_dashboard_test_history_loading') {
      held++; await pending;
    }
    await route.continue();
  };
  await page.route(pattern, handler);
  return {
    release() { released = true; resolve(); },
    get held() { return held; },
    async dispose() { released = true; resolve(); await page.unroute(pattern, handler); },
  };
}

async function checkHistoryCases(page, { loading = true } = {}) {
  const cards = page.locator("marao-card,marao-energy-period-card,marao-state-timeline-card");
  if (loading) try {
    await page.waitForFunction(() => {
      const mounted = new Set();
      const visit = (root) => {
        root.querySelectorAll("marao-card,marao-energy-period-card,marao-state-timeline-card").forEach((card) => {
          if (card.shadowRoot?.querySelector("[data-history-state],[data-graph-history-state]")) mounted.add(card._config.name);
        });
        root.querySelectorAll("*").forEach((element) => { if (element.shadowRoot) visit(element.shadowRoot); });
      };
      visit(document);
      return ["Graph", "Energy", "Timeline"].every((label) => mounted.has(`${label} history · loading`));
    });
    for (const example of manifest.historyCases) {
      for (const label of ["Graph", "Energy", "Timeline"]) {
        const name = `${label} history · ${example.id}`;
        if (example.expectedStatus === "loading") {
          const state = await cards.evaluateAll((elements, name) => {
            const root = elements.find((card) => card._config.name === name)?.shadowRoot;
            return root?.querySelector("[data-history-state]")?.dataset.historyState || root?.querySelector("[data-graph-history-state]")?.dataset.graphHistoryState;
          }, name);
          if (state !== "loading") throw new Error(`${name}: expected a visible loading state, found ${state}.`);
        }
      }
    }
  } finally { page.__historyLoadingGate?.release(); }
  await page.waitForLoadState('networkidle');
  await page.waitForFunction((examples) => {
    const elements = [];
    const visit = (root) => {
      root.querySelectorAll("marao-card,marao-energy-period-card,marao-state-timeline-card").forEach((card) => elements.push(card));
      root.querySelectorAll("*").forEach((element) => { if (element.shadowRoot) visit(element.shadowRoot); });
    };
    visit(document);
    return examples.every((example) => ["Graph", "Energy", "Timeline"].every((label) => {
      const card = elements.find((item) => item._config.name === `${label} history · ${example.id}`);
      const state = card?.shadowRoot.querySelector("[data-history-state]")?.dataset.historyState || card?.shadowRoot.querySelector("[data-graph-history-state]")?.dataset.graphHistoryState;
      return state === (example.expectedStatus === "loading" ? "ready" : example.expectedStatus);
    }));
  }, manifest.historyCases, { timeout: 10000 }).catch(async error => {
    const states = await cards.evaluateAll(elements => elements.filter(card => /^(Graph|Energy|Timeline) history · /.test(card._config.name)).map(card => ({
      name: card._config.name, state: card.shadowRoot.querySelector('[data-history-state]')?.dataset.historyState || card.shadowRoot.querySelector('[data-graph-history-state]')?.dataset.graphHistoryState,
    })));
    fs.mkdirSync(path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'dashboard-e2e'), { recursive: true });
    fs.writeFileSync(path.join(require('./verification-browser').artifactDirectory('dashboard-e2e'), 'history-failure.json'), JSON.stringify(states, null, 2), { mode: 0o600 });
    throw error;
  });
  const repeated = await page.evaluate((examples) => examples.flatMap(({ entity }) => {
    const requests = performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).searchParams.get("filter_entity_id") === entity);
    return requests.length > 3 ? [`${entity}: ${requests.length} history requests for three cards`] : [];
  }), manifest.historyCases);
  if (repeated.length) throw new Error(repeated.join("\n"));
}

async function checkOverviewPopups(page, config, screenshotRoot) {
  const lightIds = ["light.marao_dashboard_test_light", "light.marao_dashboard_test_room_light", "light.marao_dashboard_test_onoff_light"];
  const baseline = await Promise.all(lightIds.map(id => api(config, 'GET', '/api/states/' + id)));
  const { inspectPopups, scenarios } = require('./test-ha-dashboard-accessibility');
  const output = path.join(screenshotRoot || path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'dashboard-e2e'), 'overview-popups');
  fs.mkdirSync(output, { recursive: true });
  const sheet = page.locator('.marao-popup-sheet');
  const empty = sheet.locator('.marao-popup-content > [role="status"]');
  const checkEmpty = async () => {
    await empty.filter({ hasText: /^(No active entities|Sem entidades ativas)$/ }).waitFor({ state: 'visible' });
    assert.equal(await sheet.locator('marao-card').count(), 0, 'Active-only lighting must omit every inactive member');
    assert.match(await empty.textContent(), /^(No active entities|Sem entidades ativas)$/);
    assert.equal(await sheet.locator('.marao-popup-head > h2').textContent(), 'Lights');
  };
  try {
    await api(config, 'POST', '/api/services/light/turn_off', { entity_id: lightIds });
    await page.waitForFunction(ids => ids.every(id => document.querySelector('home-assistant').hass.states[id]?.state === 'off'), lightIds);
    assert.deepEqual(await inspectPopups(page, scenarios.find(scenario => scenario.name === 'iphone-normal'), 'light', output, 'overview'), []);
    const open = async hash => {
      const index = await page.locator('marao-card').evaluateAll((cards, hash) => cards.findIndex(card => card._config.tap_action?.navigation_path === hash), hash);
      assert.ok(index >= 0, hash + ': missing Home control');
      await page.locator('marao-card').nth(index).locator('[data-card-action]').tap();
      await sheet.waitFor({ state: 'visible' });
    };
    await open('#overview-blinds');
    await sheet.locator('ha-state-icon ha-icon ha-svg-icon').first().waitFor({ state: 'visible' });
    await sheet.locator('.marao-popup-close').tap();
    await open('#overview-lights');
    await checkEmpty();
    if (screenshotRoot) await page.screenshot({ path: path.join(screenshotRoot, 'overview-lights-off.png'), scale: 'css' });
    await api(config, 'POST', '/api/services/light/turn_on', { entity_id: lightIds[1] });
    await page.waitForFunction(id => [...document.querySelector('home-assistant').shadowRoot.querySelectorAll('.marao-popup-content > marao-card')].some(card => card._config.entity === id), lightIds[1]);
    assert.deepEqual(await sheet.locator('marao-card').evaluateAll(cards => cards.map(card => card._config.entity)), [lightIds[1]], 'Active-only lighting must contain exactly the active member');
    await api(config, 'POST', '/api/services/light/turn_off', { entity_id: lightIds[1] });
    await checkEmpty();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sheet.waitFor({ state: 'visible' });
    await checkEmpty();
    await assertCurrentFrontend(page);
    await sheet.locator('.marao-popup-close').tap();
    await page.waitForFunction(() => !location.hash);
    await page.goto(config.url + '/marao-dashboard/card-test', { waitUntil: 'domcontentloaded' });
    await page.goto(config.url + '/marao-dashboard/overview#overview-lights', { waitUntil: 'domcontentloaded' });
    await checkEmpty();
    await sheet.locator('.marao-popup-close').tap();
    await page.waitForURL(config.url + '/marao-dashboard/overview');
  } finally {
    for (const state of baseline) {
      const data = { entity_id: state.entity_id };
      if (state.state === 'on' && state.attributes.brightness != null) data.brightness = state.attributes.brightness;
      await api(config, 'POST', '/api/services/light/' + (state.state === 'on' ? 'turn_on' : 'turn_off'), data);
    }
  }
}

async function checkGeneratedMedia(page, config, screenshotRoot) {
  await page.goto(`${config.url}/marao-dashboard/media`, { waitUntil: "domcontentloaded" });
  for (const [name, count] of [["Living Room Apple TV", 12], ["Living Room Music", 3]]) {
    const action = cardAction(page, name);
    await action.waitFor({ state: "visible" });
    await action.tap();
    const sheet = page.locator(".marao-popup-sheet");
    await sheet.locator(".body.icon-only").first().waitFor({ state: "visible" });
    if (await sheet.locator(".body.icon-only").count() !== count || await sheet.locator(".marao-popup-head > h2").textContent() !== name) throw new Error(`${name}: generated media controls or heading are missing.`);
    if (count === 12) {
      const entity = "media_player.marao_dashboard_test_apple_tv";
      await api(config, "POST", "/api/services/media_player/media_pause", { entity_id: entity });
      await api(config, "POST", "/api/services/media_player/media_seek", { entity_id: entity, seek_position: 100 });
      await page.waitForFunction((entity) => document.querySelector("home-assistant").hass.states[entity]?.attributes.media_position === 100, entity);
      for (const [icon, position] of [["mdi:rewind-10", 90], ["mdi:fast-forward-30", 120]]) {
        await sheet.locator("marao-card").filter({ has: page.locator(`ha-icon[icon="${icon}"]`) }).locator("[data-card-action]").tap();
        await page.waitForFunction(({ entity, position }) => document.querySelector("home-assistant").hass.states[entity]?.attributes.media_position === position, { entity, position });
      }
      const remote = "remote.marao_dashboard_test_apple_tv";
      const up = sheet.locator("marao-card").filter({ has: page.locator('ha-icon[icon="mdi:chevron-up"]') }).locator("[data-card-action]");
      const state = () => page.evaluate((entity) => document.querySelector("home-assistant").hass.states[entity].attributes, remote);
      const before = await state();
      await up.tap();
      await page.waitForFunction(({ entity, count }) => document.querySelector("home-assistant").hass.states[entity]?.attributes.command_count === count + 1, { entity: remote, count: before.command_count });
      if ((await state()).hold_secs !== 0) throw new Error("Short remote tap became a hold command.");
      const box = await up.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(1400);
      await page.mouse.up();
      await page.waitForTimeout(200);
      const held = await state();
      if (held.command_count !== before.command_count + 2 || held.hold_secs !== 1) throw new Error("Remote hold did not dispatch its alternate command exactly once.");
    }
    await page.locator(".marao-popup-close").tap();
    await page.waitForURL(`${config.url}/marao-dashboard/media`);
  }
  if (screenshotRoot) await page.screenshot({ path: path.join(screenshotRoot, "media-all-players.png"), scale: "css" });
  await assertCurrentFrontend(page);
}

async function checkCardContent(page, serviceCalls) {
  const binaryIssues = await page.locator('marao-card').evaluateAll(cards => {
    const issues = [], backgrounds = new Map();
    for (const card of cards) {
      const name = card._config?.name || '', root = card.shadowRoot;
      if (!name.startsWith('Binary ') && !/^Motion · (on|off)$/.test(name) && !/^Appliance running contract · (idle|running)$/.test(name) && !/^Lock · (locked|unlocked)$/.test(name)) continue;
      const entity = card._config.variables?.toggle_entity || card._config.entity, state = card._hass.states[entity];
      const surface = root.querySelector('ha-card'), accessible = root.querySelector('[role="img"][aria-label]');
      const active = ['on', 'running', 'unlocked'].includes(state.state);
      if (root.querySelector('.binary-cue') || surface?.dataset.binaryState !== String(active) || !accessible?.getAttribute('aria-label')) issues.push(`${name}: unexpected badge or missing semantic state`);
      if (root.querySelector('.state') && !['Binary configured label and reading'].includes(name)) issues.push(`${name}: redundant current-state line`);
      if (['on', 'off'].includes(state.state) && entity.startsWith('binary_sensor.') && !accessible?.getAttribute('aria-label').includes(card._hass.formatEntityState(state))) issues.push(`${name}: lost localized device-class state`);
      if (name.startsWith('Binary configured')) {
        if (root.querySelector('.state')?.textContent !== 'Reading corner' || !root.querySelector('.climate')?.textContent.includes('W')) issues.push(`${name}: useful label or reading missing`);
      }
      const pair = name.replace(/ · (on|off)$/, '');
      if (pair !== name) {
        const entries = backgrounds.get(pair) || {};
        entries[state.state] = getComputedStyle(root.querySelector('ha-card')).backgroundColor;
        backgrounds.set(pair, entries);
      }
    }
    for (const [pair, values] of backgrounds) if (!values.on || !values.off || values.on === values.off) issues.push(`${pair}: active/inactive backgrounds agree`);
    const graph = cards.find(card => card._config.name === 'Numeric graph with binary toggle');
    if (!graph?.shadowRoot.querySelector('.state')?.textContent.includes('W') || graph.shadowRoot.querySelector('ha-card')?.dataset.binaryState !== 'true') issues.push('Numeric toggle graph lost its reading or actual-toggle state');
    const summary = cards.find(card => card._config.name === 'Summary · all off');
    if (summary?.shadowRoot.querySelector('.state')) issues.push('All-off summary retained redundant state');
    return issues;
  });
  if (binaryIssues.length) throw new Error(`Binary presentation failed: ${binaryIssues.join('; ')}`);
  const idleStrokes = await page.locator("marao-card .hold-progress rect").evaluateAll((lines) =>
    lines.filter((line) => Number(getComputedStyle(line).opacity) !== 0).length
  );
  if (idleStrokes) throw new Error("Idle hold controls show stray progress strokes.");
  for (const state of ["unknown", "unavailable"]) {
    const remote = page.locator("marao-card").filter({ has: page.locator(`[data-card-action][title^="Remote target · ${state}"]`) });
    if (!await remote.locator("[data-card-action]").isDisabled()) throw new Error(`Remote ${state} target kept its action enabled.`);
  }
  for (const title of ["Summary · active secondary", "Summary · unavailable primary"]) {
    const summary = cardByTitle(page, title);
    if (!await summary.locator("[data-card-action]").isEnabled() || !await summary.locator(".state").textContent().then((value) => value.includes("1 active"))) throw new Error(`${title}: ignored active secondary entity.`);
  }
  if (!await cardAction(page, "Summary · all unavailable").isDisabled()) throw new Error("Entirely unavailable summary stayed enabled.");
  for (const title of ["On/off light", "Single-speed fan"]) {
    if (await cardByTitle(page, title).locator('input[type="range"]').count()) throw new Error(`${title}: unsupported slider displayed.`);
  }
  const glance = page.locator("marao-card").filter({ hasText: "Mixed availability readings" });
  const readings = await glance.locator(".reading dd").allTextContents();
  if (readings.length !== 2 || !readings[0].includes("W") || !readings[1].trim()) throw new Error("Glance readings lost values, units or unavailable state.");
  const forecast = cardByTitle(page, "Weather with forecast");
  if (await forecast.locator(".reading").count() !== 2) throw new Error("The forecast card did not render its safe forecast data.");
  if (!await page.locator('marao-card').filter({ has: page.locator('.body.glance-card') }).count()) throw new Error("The gallery is missing glance layouts.");
  const stalePreviews = await page.locator("marao-card").evaluateAll((cards) => cards.filter((card) => {
    const state = card._hass?.states?.[card._config.entity]?.state;
    return card._config.template === "hc_camera_card" && (!state || ["unknown", "unavailable"].includes(state)) && card.shadowRoot.querySelector("img.camera-poster[src]:not([hidden]),ha-camera-stream");
  }).length);
  if (stalePreviews) throw new Error("Unavailable camera cards displayed old previews.");
  const mediaPresentation = await page.locator("marao-card").evaluateAll((cards) => cards.filter((card) => card._config.template === "hc_media_card").map((card) => ({
    name: card._config.name, state: card._hass?.states?.[card._config.entity]?.state,
    optOut: card._config.variables?.hc_show_background_art === false,
    artwork: Boolean(card.shadowRoot.querySelector(".media-artwork")),
    summary: card.shadowRoot.querySelector(".climate")?.textContent,
  })));
  if (!mediaPresentation.some((card) => card.state === "playing" && card.artwork && card.summary?.includes("Synthetic"))) throw new Error("Playing media lost its fixture artwork or summary.");
  if (!mediaPresentation.some((card) => card.optOut && !card.artwork && card.summary?.includes("Synthetic"))) throw new Error("Media artwork opt-out lost its summary or displayed artwork.");
  if (mediaPresentation.some((card) => ["off", "unknown", "unavailable"].includes(card.state) && card.artwork)) throw new Error("Inactive media displayed old artwork.");
  await cardAction(page, "Generic media player").tap();
  const mediaButtons = page.locator(".marao-popup-sheet marao-card");
  await mediaButtons.first().waitFor({ state: "visible" });
  if (await mediaButtons.count() !== 3 || (await mediaButtons.locator(".body").allTextContents()).some((value) => value.trim())) throw new Error("Generic media controls must render three icons without leaking action text.");
  for (const [index, service] of ["media_previous_track", "media_play_pause", "media_next_track"].entries()) {
    const before = serviceCalls.filter((call) => call.service === service && call.entities.includes("media_player.marao_dashboard_test_audio")).length;
    await mediaButtons.nth(index).locator("[data-card-action]").tap();
    await page.waitForTimeout(250);
    const after = serviceCalls.filter((call) => call.service === service && call.entities.includes("media_player.marao_dashboard_test_audio")).length;
    if (after !== before + 1) throw new Error(`Generic media ${service} did not dispatch exactly once to its safe fixture.`);
  }
  await page.waitForFunction(() => {
    const state = document.querySelector("home-assistant")?.hass?.states["media_player.marao_dashboard_test_audio"];
    return state?.state === "playing" && state.attributes.media_title === "Synthetic next programme";
  });
  const disabledMedia = await page.locator("marao-card").evaluateAll((cards) => cards.filter((card) => card._config.variables?.action_label_key?.startsWith("media.") && /case_media_(unknown|unavailable)$/.test(card._config.entity)).map((card) => card.shadowRoot.querySelector("[data-card-action]")?.disabled));
  if (disabledMedia.length !== 6 || disabledMedia.some((disabled) => disabled !== true)) throw new Error("Unknown/unavailable media controls must remain disabled.");
  await page.locator(".marao-popup-close").tap();
  await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
  const navigation = cardAction(page, "Rooms page");
  if (await navigation.isDisabled()) throw new Error("Entity-free room navigation is disabled.");
  await navigation.tap();
  await page.waitForURL("**/marao-dashboard/rooms");
}

async function checkDisconnected(browser, config, functionalCompleted = false) {
  const { scenarios, contextOptionsForScenario, configurePageEmulation } = require('./test-ha-dashboard-accessibility');
  const scenario = dashboardScenario(process.argv, scenarios);
  const context = await browser.newContext(contextOptionsForScenario(scenario, 'light'));
  const token = accessToken(config);
  await context.addInitScript(setBrowserToken, {
    ...token, hassUrl: config.url, clientId: `${config.url}/`, expires: Date.now() + token.expires_in * 1000,
  });
  await context.addInitScript(() => {
    window.__maraoUnhandledRejections = [];
    window.addEventListener("unhandledrejection", ({ reason }) => {
      if (reason?.message) window.__maraoUnhandledRejections.push(`${reason.code || reason.name || "Error"}: ${reason.message}${reason.stack ? `\n${reason.stack}` : ""}`);
    });
  });
  const page = await context.newPage();
  await configurePageEmulation(context, page, scenario);
  const entity = "switch.marao_dashboard_test_switch";
  const errors = [];
  const transportEvents = [];
  const serviceCalls = [];
  let original;
  const subscriptions = [];
  const nativeFailures = [];
  let connection = 0;
  let phase = "connected";
  let transport;
  // Chromium's HTTP offline emulation does not reliably block WebSocket
  // reconnects. Cut the real transport and reject retries until recovery.
  await context.routeWebSocket(`${config.url.replace(/^http/, "ws")}/api/websocket`, async (socket) => {
    if (phase === "offline") {
      transportEvents.push("Home Assistant WebSocket retry blocked during outage");
      await socket.close({ code: 1013, reason: "Marao test outage" });
      return;
    }
    const server = socket.connectToServer();
    const connectionId = ++connection;
    transport = { socket, server };
    socket.onMessage((payload) => {
      const message = JSON.parse(String(payload));
      if (/subscribe|stream/.test(message.type)) subscriptions.push({ phase, connection: connectionId, type: message.type, id: message.id, subscription: message.subscription });
      const targets = message.target?.entity_id ?? message.service_data?.entity_id;
      if (message.type === "call_service" && (Array.isArray(targets) ? targets.includes(entity) : targets === entity)) serviceCalls.push(message.service);
      server.send(payload);
    });
    server.onMessage(payload => {
      const messages = JSON.parse(String(payload));
      for (const message of Array.isArray(messages) ? messages : [messages]) {
        if (message.type === 'result' && message.success === false) nativeFailures.push({ connection: connectionId, id: message.id, code: message.error?.code, message: message.error?.message });
      }
      socket.send(payload);
    });
  });
  const expectedOfflineError = (message) => phase === "offline" && (
    /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_NETWORK_IO_SUSPENDED/.test(message)
    || /WebSocket connection to ['"].*\/api\/websocket.*failed/.test(message)
  );
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (!["warning", "error"].includes(message.type())) return;
    if (expectedOfflineError(message.text())) transportEvents.push(message.text());
    else {
      const source = message.location().url;
      errors.push(`${message.text()}${source ? ` (${new URL(source).pathname})` : ""}`);
    }
  });
  page.on("requestfailed", (request) => {
    const message = `${request.failure()?.errorText}: ${new URL(request.url()).pathname}`;
    if (expectedOfflineError(message)) transportEvents.push(message);
    else errors.push(message);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
  });
  try {
    await page.goto(`${config.url}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
    const action = cardAction(page, "Switch + graph");
    await action.waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    if (await action.isDisabled()) throw new Error("The safe switch action was disabled before disconnection.");
    original = await page.evaluate((id) => document.querySelector("home-assistant").hass.states[id].state, entity);
    const warning = await page.evaluate(() => document.querySelector("home-assistant").hass.localize("ui.notification_toast.connection_lost"));
    if (!warning) throw new Error("Home Assistant did not provide its localized connection warning.");
    // HA loads its native notification component on first use. Load it while
    // online so the deliberate outage does not block that JavaScript download.
    const readiness = "Marao connection test ready";
    await page.evaluate((message) => {
      document.querySelector("home-assistant").dispatchEvent(new CustomEvent("hass-notification", {
        bubbles: true, composed: true, detail: { message },
      }));
    }, readiness);
    await page.getByText(readiness, { exact: true }).and(page.locator(".message")).waitFor({ state: "visible" });
    await page.getByText(readiness, { exact: true }).and(page.locator(".message")).waitFor({ state: "hidden" });
    phase = "offline";
    await context.setOffline(true);
    await transport.server.close({ code: 1001, reason: "Marao test outage" });
    await transport.socket.close({ code: 1001, reason: "Marao test outage" });
    transportEvents.push("Home Assistant WebSocket closed during outage");
    await page.waitForFunction(() => document.querySelector("home-assistant")?.hass?.connected === false);
    for (const title of ["Switch + graph", "Light + slider", "Number", "Arm away · hold", "Open-only door"]) {
      const disabled = await cardByTitle(page, title).locator('button,input,select,[role="slider"]').evaluateAll((controls) =>
        controls.length > 0 && controls.every((control) => control.disabled || control.getAttribute("aria-disabled") === "true")
      );
      if (!disabled) throw new Error(`${title}: disconnected fixture controls remained enabled.`);
    }
    const before = serviceCalls.length;
    await action.evaluate((element) => element.click());
    await page.waitForTimeout(150);
    if (serviceCalls.length !== before) throw new Error("A disconnected control dispatched a service call.");
    await page.getByText(warning, { exact: true }).and(page.locator(".message")).waitFor({ state: "visible", timeout: 5000 });
    const next = original === "on" ? "off" : "on";
    await api(config, "POST", `/api/services/switch/turn_${next}`, { entity_id: entity });
    phase = "recovering";
    await context.setOffline(false);
    await page.waitForFunction(({ id, state }) => {
      const hass = document.querySelector("home-assistant")?.hass;
      return hass?.connected === true && hass.states[id]?.state === state;
    }, { id: entity, state: next });
    phase = "connected";
    if (await action.isDisabled()) throw new Error("Fixture action did not recover after reconnecting.");
    await page.getByText(warning, { exact: true }).and(page.locator(".message")).waitFor({ state: "hidden" });
    const authoritative = await api(config, "GET", `/api/states/${entity}`);
    const rendered = await cardByTitle(page, "Switch + graph").evaluate((card) => ({
      state: card._hass.states[card._config.entity].state,
      active: card.shadowRoot.querySelector('ha-card')?.dataset.binaryState,
      semanticState: card.shadowRoot.querySelector('.icon[role="img"]')?.getAttribute('aria-label'),
      problem: card.shadowRoot.querySelector('[data-problem]')?.dataset.problem,
    }));
    if (rendered.state !== authoritative.state || rendered.active !== String(authoritative.state === 'on') || !rendered.semanticState || rendered.problem) throw new Error("Recovered card did not render authoritative state.");
    if (!transportEvents.length) throw new Error("The fault injection did not produce an observed transport disconnection.");
    const rejections = await page.evaluate(() => window.__maraoUnhandledRejections);
    const evidencePath = process.argv.find(arg => arg.startsWith('--reconnect-evidence='))?.slice(21);
    if (evidencePath) {
      assert.ok(path.isAbsolute(evidencePath), 'Reconnect evidence must use an absolute private path');
      fs.writeFileSync(evidencePath, JSON.stringify({ version: 1, target: config.url, checked_at: new Date().toISOString(), functional_completed: functionalCompleted,
        ...(process.argv.includes('--disconnect-only') ? { scope: 'connection-only' } : {}),
        safe_actions_disabled: true, disconnected_dispatches: 0, authoritative_recovery: true, errors, rejections, subscriptions, native_failures: nativeFailures }), { mode: 0o600 });
    }
    if (errors.length || rejections.length) {
      const error = new Error(`Disconnect scenario produced unexpected browser errors:\n${[...errors, ...rejections].join("\n")}\nSubscription lifecycle: ${JSON.stringify(subscriptions)}`);
      error.stage = 'disconnect-browser-errors';
      throw error;
    }
    console.log("Live disconnect and authoritative recovery OK (disabled actions dispatched zero services).");
  } finally {
    await context.setOffline(false);
    if (original !== undefined) await api(config, "POST", `/api/services/switch/turn_${original}`, { entity_id: entity });
    await context.close();
  }
}

async function captureClimateFeedback(page, name, target, output, visualProfile) {
  const assert = require("node:assert/strict");
  if (!output) return;
  fs.mkdirSync(output, { recursive: true });
  const sheet = page.locator('.marao-popup-sheet');
  if (await sheet.count()) await sheet.evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  // A connected ha-card can still lack its native slot; scrolling then clamps the gallery.
  if (target) await target.evaluate(async element => {
    await element.shadowRoot.querySelector('ha-card')?.updateComplete;
    element.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  const verifyProfile = async () => {
    if (!visualProfile) return;
    const { applyVisualPreferences, emulationIssues } = require('./test-ha-dashboard-accessibility');
    await applyVisualPreferences(page, visualProfile.scenario, visualProfile.theme);
    assert.deepEqual(await emulationIssues(page, visualProfile.scenario, visualProfile.theme), [], 'Climate capture lost its mobile profile');
  };
  await verifyProfile();
  // Text preferences can reflow the gallery after the first scroll.
  if (target) await target.evaluate(async element => {
    await element.shadowRoot.querySelector('ha-card')?.updateComplete;
    element.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (target) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const visible = await target.evaluate(async element => {
        await element.shadowRoot.querySelector('ha-card')?.updateComplete;
        const heading = element.shadowRoot.querySelector('.title');
        if (!heading?.getClientRects().length) return true;
        const title = heading.getBoundingClientRect();
        let minimumTop = 0;
        for (let parent = element; parent; parent = parent.assignedSlot || parent.parentElement || parent.getRootNode()?.host) {
          if (parent.classList?.contains('marao-popup-sheet')) {
            minimumTop = parent.querySelector('.marao-popup-head').getBoundingClientRect().bottom;
            break;
          }
        }
        if (title.top >= minimumTop && title.bottom <= innerHeight) return true;
        // HA's shifted fullscreen shell can leave scrollIntoView above the viewport.
        let scrolled = false;
        for (let parent = element; parent; parent = parent.assignedSlot || parent.parentElement || parent.getRootNode()?.host) {
          if (parent.clientHeight > 0 && parent.scrollHeight > parent.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowY)) {
            parent.scrollBy({ top: title.top - minimumTop - 14, behavior: 'instant' }); scrolled = true; break;
          }
        }
        if (!scrolled) document.scrollingElement.scrollBy({ top: title.top - minimumTop - 14, behavior: 'instant' });
        return false;
      });
      if (visible) break;
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const title = await target.evaluate(element => {
      const heading = element.shadowRoot.querySelector('.title');
      const { top, bottom, left, right } = heading?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0, right: 0 };
      let minimumTop = 0;
      const scrollers = [];
      for (let parent = element; parent; parent = parent.assignedSlot || parent.parentElement || parent.getRootNode()?.host) {
        if (parent.scrollHeight > parent.clientHeight) scrollers.push({ tag: parent.localName, height: parent.scrollHeight,
          viewport: parent.clientHeight, top: parent.scrollTop, overflow: getComputedStyle(parent).overflowY });
        if (parent.classList?.contains('marao-popup-sheet')) {
          minimumTop = parent.querySelector('.marao-popup-head').getBoundingClientRect().bottom;
          break;
        }
      }
      return { top, bottom, left, right, width: innerWidth, height: innerHeight,
        visible: Boolean(heading?.getClientRects().length),
        minimumTop, scrollers };
    });
    assert.ok(!title.visible || title.top >= title.minimumTop - .5 && title.bottom <= title.height + .5 && title.left >= -.5 && title.right <= title.width + .5,
      `${name}: the captured card title is outside the viewport: ${JSON.stringify(title)}`);
    const valueIssues = await target.evaluate(element => {
      const issues = [];
      for (const output of element.shadowRoot.querySelectorAll('.number-value')) {
        const track = output.closest('.number-stepper').getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(output);
        for (const rect of range.getClientRects()) if (rect.width && rect.height
          && (rect.left < track.left - .5 || rect.right > track.right + .5 || rect.top < track.top - .5 || rect.bottom > track.bottom + .5)) {
          issues.push(output.textContent + ': target value extends outside its rounded control');
        }
      }
      for (const button of element.shadowRoot.querySelectorAll('.number-stepper button')) {
        const rect = button.getBoundingClientRect();
        if (rect.width && rect.height && (rect.width < 48 || rect.height < 48)) issues.push('A numeric button is smaller than 48px');
      }
      return issues;
    });
    assert.deepEqual(valueIssues, [], name);
  }
  await page.screenshot({ path: path.join(output, `${name}.png`), scale: 'css' });
  const navbar = await page.locator('marao-navbar-card nav').boundingBox();
  const bottom = navbar.y - 8;
  if (target && await target.evaluate((element, limit) => element.getBoundingClientRect().height > limit - 16, bottom)) {
    await verifyProfile();
    for (let attempt = 0; attempt < 3; attempt++) {
    const limit = (await page.locator('marao-navbar-card nav').boundingBox()).y - 8;
    await target.evaluate((element, limit) => {
      const distance = Math.max(0, element.getBoundingClientRect().bottom - limit);
      let scrolled = false;
      for (let parent = element; parent; parent = parent.assignedSlot || parent.parentElement || parent.getRootNode()?.host) {
        if (parent.clientHeight > 0 && parent.scrollHeight > parent.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowY)) {
          parent.scrollBy({ top: distance, behavior: 'instant' });
          scrolled = true;
          break;
        }
      }
      if (!scrolled) document.scrollingElement.scrollBy({ top: distance, behavior: 'instant' });
    }, limit);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (await target.evaluate((element, limit) => element.getBoundingClientRect().bottom <= limit + .5, limit)) break;
    }
    const limit = (await page.locator('marao-navbar-card nav').boundingBox()).y - 8;
    assert.ok(await target.evaluate((element, limit) => element.getBoundingClientRect().bottom <= limit + .5, limit),
      `${name}: the captured card bottom is obscured by the navbar`);
    await page.screenshot({ path: path.join(output, `${name}-bottom.png`), scale: 'css' });
  }
}

function climateFeedbackSnapshot(card, phase) {
  const read = () => {
    const state = card.hass.states[card._config.entity];
    return { mode: card.shadowRoot.querySelector('.state')?.textContent.trim(), target: card.shadowRoot.querySelector('.number-value')?.textContent,
      pending: Boolean(card.shadowRoot.querySelector('.climate-pending')), selected: card.shadowRoot.querySelector('.climate-mode.active')?.dataset.climateMode,
      reported: state.state, temperature: state.attributes.temperature, low: state.attributes.target_temp_low, high: state.attributes.target_temp_high,
      current: state.attributes.current_temperature, activity: state.attributes.hvac_action ?? null };
  };
  if (phase === 'observe') {
    card.__feedbackObserver?.disconnect();
    card.__feedbackPending = undefined;
    // A real rejection can arrive before Playwright returns from the tap.
    card.__feedbackObserver = new MutationObserver(() => {
      const state = read();
      if (state.pending && !card.__feedbackPending) card.__feedbackPending = state;
    });
    card.__feedbackObserver.observe(card.shadowRoot, { childList: true, subtree: true });
    return;
  }
  if (phase === 'observed') {
    card.__feedbackObserver.disconnect();
    const pending = card.__feedbackPending;
    delete card.__feedbackObserver; delete card.__feedbackPending;
    return pending;
  }
  return read();
}

async function checkClimateFeedback(page, serviceCalls, output, visualProfile) {
  const assert = require('node:assert/strict');
  if (output) {
    fs.mkdirSync(output, { recursive: true });
    for (const name of fs.readdirSync(output)) if (name.endsWith('.png')) fs.unlinkSync(path.join(output, name));
  }
  const examples = manifest.climateFeedbackCases;
  const delayed = examples.find(example => example.id === 'delayed_confirmation');
  const duplicate = cardByTitle(page, 'Delayed climate duplicate');
  const cardFor = example => cardByTitle(page, example.name).filter({ has: page.locator('.climate-modes') });
  const snapshot = card => card.evaluate(climateFeedbackSnapshot);
  const callsFor = entity => serviceCalls.filter(call => call.domain === 'climate' && call.entities.includes(entity));
  const capture = (name, target) => captureClimateFeedback(page, name, target, output, visualProfile);
  const waitReported = async (entity, values) => page.waitForFunction(({ entity, values }) => {
    const state = document.querySelector('home-assistant').hass.states[entity];
    return Object.entries(values).every(([key, value]) => (key === 'state' ? state.state : state.attributes[key]) === value);
  }, { entity, values });
  const reset = () => page.evaluate(() => document.querySelector('home-assistant').hass.callService('marao_test_camera', 'reset', {}, undefined, false));
  await page.evaluate(() => {
    window.__climateFeedbackNotifications = [];
    document.addEventListener('hass-notification', event => window.__climateFeedbackNotifications.push(event.detail.message));
  });
  try {
    await reset();
    const card = cardFor(delayed);
    for (const mode of ['heat', 'cool', 'off']) {
      const before = await snapshot(card), count = callsFor(delayed.entity).length;
      const control = card.locator(`[data-climate-mode="${mode}"]`);
      if (mode === 'heat') {
        await control.focus();
        await control.press('Enter');
        assert.equal(await card.evaluate(card => card.shadowRoot.activeElement?.dataset.climateMode), mode);
      } else await control.tap();
      const immediate = await snapshot(card);
      assert.equal(immediate.selected, mode);
      assert.equal(immediate.pending, true, `Immediate feedback for mode ${mode}`);
      assert.equal(immediate.reported, before.reported);
      assert.equal(immediate.current, before.current);
      assert.equal(immediate.activity, before.activity);
      assert.equal(callsFor(delayed.entity).length, count + 1);
      assert.equal((await snapshot(duplicate)).mode, immediate.mode);
      await capture(`mode-${mode}-pending`, card);
      await waitReported(delayed.entity, { state: mode });
      await card.locator('.climate-pending').waitFor({ state: 'detached' });
      if (mode === 'heat') {
        // Focus restoration waits for the replacement ha-card's Lit render.
        await page.waitForFunction(card => card.shadowRoot.activeElement?.dataset.climateMode === 'heat', await card.elementHandle());
        assert.equal(await card.evaluate(card => card.shadowRoot.activeElement?.dataset.climateMode), mode);
      }
    }
    const start = callsFor(delayed.entity).length;
    const increase = card.locator('[data-number-step="increase"]');
    await increase.focus();
    await increase.press('Enter');
    assert.equal(await card.evaluate(card => card.shadowRoot.activeElement?.dataset.numberStep), 'increase');
    for (let index = 1; index < 3; index += 1) await increase.tap();
    assert.equal((await snapshot(card)).target, '22.5');
    assert.equal((await snapshot(card)).temperature, 21);
    assert.deepEqual(callsFor(delayed.entity).slice(start).map(call => call.data.temperature), [21.5, 22, 22.5]);
    assert.equal((await snapshot(duplicate)).target, '22.5');
    // Open from the header; the centered stepper is an independent control.
    await duplicate.locator('[data-card-action]').tap({ position: { x: 24, y: 24 } });
    const sheet = page.locator('.marao-popup-sheet');
    await sheet.waitFor({ state: 'visible' });
    assert.equal(await sheet.locator('.number-value').innerText(), '22.5');
    assert.equal(await sheet.locator('marao-card').evaluate((copy, original) =>
      Boolean(copy.shadowRoot.querySelector('.climate-pending')) === Boolean(original.shadowRoot.querySelector('.climate-pending')),
    await card.elementHandle()), true, 'The sheet must share the original pending state');
    await capture('duplicate-sheet-pending', sheet.locator('marao-card'));
    await sheet.locator('.marao-popup-close').tap();
    const afterSheet = await snapshot(card);
    // Large viewport captures can finish after HA confirms the requested target.
    assert.equal(afterSheet.pending, afterSheet.temperature !== 22.5);
    await waitReported(delayed.entity, { temperature: 22.5 });
    await card.locator('.climate-pending').waitFor({ state: 'detached' });

    const expiry = [];
    for (const example of examples.filter(example => example.id !== delayed.id)) {
      assert.ok(example.entity.startsWith('climate.marao_dashboard_test_feedback_'));
      const card = cardFor(example), before = await snapshot(card);
      const count = callsFor(example.entity).length;
      const notificationCount = await page.evaluate(() => window.__climateFeedbackNotifications.length);
      await card.evaluate(climateFeedbackSnapshot, 'observe');
      if (example.id === 'delayed_ack') await card.locator('[data-climate-mode="heat"]').tap();
      else await card.locator('[data-number-step="increase"]').tap();
      const immediate = await card.evaluate(climateFeedbackSnapshot, 'observed');
      assert.equal(immediate?.pending, true, `Immediate feedback for ${example.id}: ${JSON.stringify({ before, immediate, current: await snapshot(card), dispatched: callsFor(example.entity).length - count })}`);
      assert.equal(immediate.reported, before.reported);
      assert.equal(immediate.current, before.current);
      assert.equal(immediate.activity, before.activity);
      assert.equal(callsFor(example.entity).length, count + 1);
      const request = callsFor(example.entity).at(-1).data;
      const requestedTarget = Object.fromEntries(['temperature', 'target_temp_low', 'target_temp_high']
        .filter(key => Object.hasOwn(request, key)).map(key => [key, request[key]]));
      await capture(`${example.id}-pending`, card);
      if (example.behavior === 'reject') {
        await card.locator('.climate-pending').waitFor({ state: 'detached' });
        assert.equal((await snapshot(card)).target, before.target);
        const messages = await page.evaluate(() => window.__climateFeedbackNotifications);
        assert.equal(messages.length, notificationCount + 1);
        assert.match(messages.at(-1), /Climate fixture rejected the change/);
        await capture(`${example.id}-rejected`, card);
      } else if (example.behavior === 'unconfirmed' || example.behavior === 'corrected') {
        if (example.behavior === 'corrected') {
          await waitReported(example.entity, Object.fromEntries(Object.entries(requestedTarget).map(([key, value]) => [key, value + .5])));
          assert.equal((await snapshot(card)).target, immediate.target);
          assert.equal((await snapshot(card)).pending, true);
        }
        expiry.push({ example, card });
      } else {
        await waitReported(example.entity, example.id === 'delayed_ack' ? { state: 'heat' } : requestedTarget);
        await card.locator('.climate-pending').waitFor({ state: 'detached' });
      }
    }
    for (const { example, card } of expiry) {
      await card.locator('.climate-pending').waitFor({ state: 'detached', timeout: 35000 });
      const state = await snapshot(card);
      assert.equal(state.target, example.dual_target ? `${state.low}–${state.high}` : String(state.temperature));
      await capture(`${example.id}-expired`, card);
    }
    const messages = await page.evaluate(() => window.__climateFeedbackNotifications);
    assert.equal(messages.filter(message => /not confirmed|não confirmada/.test(message)).length, expiry.length, `Expiry notifications for safe fixtures: ${JSON.stringify(messages)}`);
    console.log('Climate feedback: immediate modes, rapid steps, shared sheet, confirmation, rejection and expiry passed.');
  } finally {
    await reset();
    await page.reload();
    await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
  }
}

async function checkEntityGroups(page, serviceCalls, output, scenario, theme, config) {
  const { namedCard } = require('./test-ha-room-cards');
  const { applyVisualPreferences, layoutIssues } = require('./test-ha-dashboard-accessibility');
  fs.mkdirSync(output, { recursive: true });
  const before = serviceCalls.length;
  for (const group of manifest.entityGroupCases) {
    const card = namedCard(page, group.name);
    await card.waitFor({ state: 'visible' });
    assert.equal(await card.evaluate(card => card._config.id), group.id);
    assert.equal(await card.evaluate(card => card._config.entity), undefined);
    await card.scrollIntoViewIfNeeded();
    const disabled = await card.locator('[data-card-action]').isDisabled();
    if (disabled) {
      assert.match(await card.locator('.problem').textContent(), /Unknown|Unavailable|Entity missing|Desconhecido|Indisponível|Entidade em falta/);
      continue;
    }
    await card.locator('[data-card-action]').tap();
    const overlay = page.locator('.marao-popup-overlay');
    await overlay.waitFor({ state: 'visible' });
    assert.equal(await overlay.locator('h2').textContent(), group.name);
    await applyVisualPreferences(page, scenario, theme);
    await page.waitForFunction(() => {
      const root = document.querySelector('home-assistant').shadowRoot;
      return root.querySelector('.marao-popup-content')?.children.length > 0;
    });
    const rows = overlay.locator('.marao-popup-content > marao-card');
    const ids = await rows.evaluateAll(cards => cards.map(card => card._config.entity));
    const members = group.entities.map(member => typeof member === 'string' ? member : member.entity_id);
    if (group.popup_filter === 'all') assert.deepEqual(ids, members);
    else {
      const expected = await page.evaluate(({ type, members }) => members.filter(id => {
        const state = document.querySelector('home-assistant').hass.states[id]?.state;
        return type === 'light' ? state === 'on' : type === 'cover' ? ['open','opening'].includes(state)
          : type === 'climate' ? state != null && !['off','unknown','unavailable'].includes(state)
          : /^\d+(\.\d+)?$/.test(state || '') && Number(state) < 20;
      }), { type: group.entity_type, members });
      assert.deepEqual(ids, expected);
    }
    assert.deepEqual(await layoutIssues(page), [], group.id + ': popup geometry');
    await page.screenshot({ path: path.join(output, `${group.id}.png`), scale: 'css' });
    await overlay.locator('.marao-popup-close').tap();
    await overlay.waitFor({ state: 'detached' });
  }
  assert.equal(serviceCalls.length, before, 'Opening/filtering groups actuated a member');
  const active = manifest.entityGroupCases.find(group => group.id === 'gallery-light-active');
  await namedCard(page, active.name).locator('[data-card-action]').tap();
  const overlay = page.locator('.marao-popup-overlay');
  await overlay.waitFor({ state: 'visible' });
  const popups = page.locator('marao-popup-card');
  const hash = await namedCard(page, active.name).evaluate(card => card._config.tap_action.navigation_path);
  const index = await popups.evaluateAll((elements, hash) => elements.findIndex(element => element._config.hash === hash), hash);
  assert.ok(index >= 0, 'Active light group is missing its configured popup: ' + hash);
  const popup = popups.nth(index);
  await page.waitForFunction(popup => popup._groupChildren?.size > 0, await popup.elementHandle());
  await popup.evaluate(popup => { popup.__groupFirst = popup._groupChildren.get('light.marao_dashboard_test_case_light_on'); });
  const changeLights = async (service, entities) => {
    assert.ok(entities.every(entity => /^light\.marao_dashboard_test_/.test(entity)));
    await api(config, 'POST', '/api/services/light/' + service, { entity_id: entities });
    await page.waitForFunction(({ popup, entities, state }) => entities.every(entity => popup._hass.states[entity].state === state), {
      popup: await popup.elementHandle(), entities, state: service === 'turn_on' ? 'on' : 'off',
    });
  };
  await changeLights('turn_on', ['light.marao_dashboard_test_case_light_off']);
  assert.equal(await popup.evaluate(popup => popup.__groupFirst === popup._groupChildren.get('light.marao_dashboard_test_case_light_on')), true, 'Retained eligible slider was remounted');
  const heldSlider = overlay.locator('input[data-slider-key="hc_light_card:light.marao_dashboard_test_case_light_on"]');
  await heldSlider.scrollIntoViewIfNeeded();
  const sliderBox = await heldSlider.boundingBox(), sliderValue = Number(await heldSlider.inputValue());
  const touch = await page.context().newCDPSession(page);
  const touchPoint = { x: sliderBox.x + 24 + (sliderBox.width - 48) * sliderValue / 100, y: sliderBox.y + 24, id: 1 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
  assert.equal(await heldSlider.evaluate(input => input.getRootNode().host._sliderGesture?.input === input), true, 'Grouped slider gesture did not start');
  await changeLights('turn_off', ['light.marao_dashboard_test_onoff_light']);
  assert.equal(await heldSlider.evaluate(input => input.getRootNode().host._sliderGesture?.input === input), true, 'Eligible HA update cancelled a held group slider');
  await popup.evaluate(popup => {
    const removed = popup._groupChildren.get('light.marao_dashboard_test_case_light_off');
    removed.shadowRoot.querySelector('button')?.focus();
    popup.__groupRemoved = removed;
  });
  await changeLights('turn_off', ['light.marao_dashboard_test_case_light_on', 'light.marao_dashboard_test_case_light_off', 'light.marao_dashboard_test_onoff_light']);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.detach();
  assert.equal(await popup.evaluate(popup => popup.__groupFirst._sliderGesture), null, 'Removed group slider retained its gesture');
  assert.equal(await popup.evaluate(popup => popup.__groupRemoved.isConnected), false);
  assert.equal(await overlay.locator('.marao-popup-content [role="status"]').textContent(), 'No active entities');
  assert.equal(await popup.evaluate(popup => popup._overlay.querySelector('.marao-popup-close') === popup._overlay.getRootNode().activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await overlay.evaluate(overlay => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    while (active && !overlay.contains(active)) active = active.getRootNode()?.host;
    return Boolean(active);
  }), true, 'Group popup must trap keyboard focus');
  assert.equal(serviceCalls.length, before, 'Live filtering dispatched a service');
  await changeLights('turn_on', ['light.marao_dashboard_test_case_light_on']);
  await changeLights('turn_off', ['light.marao_dashboard_test_case_light_off', 'light.marao_dashboard_test_onoff_light']);
  await popup.evaluate(popup => { delete popup.__groupRemoved; delete popup.__groupFirst; });
  await overlay.locator('.marao-popup-close').tap();
  await overlay.waitFor({ state: 'detached' });
  const openGroup = async id => {
    await namedCard(page, manifest.entityGroupCases.find(group => group.id === id).name).locator('[data-card-action]').tap();
    await page.locator('.marao-popup-sheet').waitFor({ state: 'visible' });
    await page.locator('.marao-popup-sheet').evaluate(sheet => Promise.all(sheet.getAnimations().map(animation => animation.finished)));
    await page.locator('.marao-popup-sheet marao-card').first().waitFor({ state: 'visible' });
    await applyVisualPreferences(page, scenario, theme);
  };
  const { checkPointerInteraction } = require('./test-ha-value-sliders');
  for (const [id, entity] of [['gallery-light-all','light.marao_dashboard_test_case_light_on'], ['gallery-cover-all','cover.marao_dashboard_test_case_cover_open']]) {
    await openGroup(id);
    const example = concreteCases().find(card => card.entity === entity);
    await checkPointerInteraction(page, page.context(), config, example, serviceCalls, 'touch', '.marao-popup-sheet');
    await page.locator('.marao-popup-close').tap();
    await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
  }
  await openGroup('gallery-cover-all');
  const accessCards = page.locator('.marao-popup-sheet marao-card');
  const openOnly = 'cover.marao_dashboard_test_open_only_door';
  assert.equal(await page.evaluate(entity => document.querySelector('home-assistant').hass.states[entity].attributes.supported_features, openOnly), 1, 'Open-only fixture must advertise only OPEN');
  const openOnlyIndex = await accessCards.evaluateAll((cards, entity) => cards.findIndex(card => card._config.entity === entity), openOnly);
  assert.ok(openOnlyIndex >= 0, 'Open-only member is missing');
  const openOnlyCard = accessCards.nth(openOnlyIndex);
  assert.equal(await openOnlyCard.evaluate(card => card._config.template), 'hc_access_slide_action_card');
  assert.equal(await openOnlyCard.locator('marao-slide-to-open').count(), 1, 'Open-only access must expose the strict slide control');
  assert.equal(await openOnlyCard.locator('input[type="range"], [data-card-action]').count(), 0, 'Open-only access must not expose ordinary position or tap actions');
  const openOnlyHelper = 'input_boolean.marao_dashboard_test_open_only_door';
  const openOnlyBaseline = await api(config, 'GET', '/api/states/' + openOnlyHelper);
  const openOnlyCount = () => serviceCalls.filter(call => call.entities.includes(openOnly) && call.service === 'open_cover').length;
  try {
    await api(config, 'POST', '/api/services/input_boolean/turn_off', { entity_id: openOnlyHelper });
    await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].state === 'closed', openOnly);
    const openOnlyTrack = openOnlyCard.locator('marao-slide-to-open .track'), before = openOnlyCount();
    for (const [points, options] of [[[[.3,0]],{}], [[[.01,30]],{}], [[[1,0]],{cancel:true}]]) await slideGesture(page, openOnlyTrack, points, options);
    assert.equal(openOnlyCount(), before, 'Cancelled open-only access must not dispatch');
    await slideGesture(page, openOnlyTrack, [[1,0]]);
    await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].state === 'open', openOnly);
    assert.equal(openOnlyCount(), before + 1, 'Completed open-only access must dispatch once');
  } finally {
    await api(config, 'POST', '/api/services/input_boolean/' + (openOnlyBaseline.state === 'on' ? 'turn_on' : 'turn_off'), { entity_id: openOnlyHelper });
    await page.waitForFunction(({entity, state}) => document.querySelector('home-assistant').hass.states[entity].state === state,
      {entity: openOnly, state: openOnlyBaseline.state === 'on' ? 'open' : 'closed'});
  }
  const accessIndex = await accessCards.evaluateAll(cards => cards.findIndex(card => card._config.entity === 'cover.marao_dashboard_test_garage_door'));
  assert.ok(accessIndex >= 0, 'Safe garage member is missing');
  const access = accessCards.nth(accessIndex);
  assert.equal(await access.locator('input[type="range"]').count(), 0, 'Access cover must not expose a blind slider');
  await access.locator('[data-card-action]').tap();
  const track = page.locator('.marao-popup-sheet marao-slide-to-open .track');
  const garage = 'cover.marao_dashboard_test_garage_door';
  const count = () => serviceCalls.filter(call => call.entities.includes(garage) && call.service === 'open_cover').length;
  const accessBefore = count();
  for (const [points, options] of [[[[.3,0]],{}], [[[.01,30]],{}], [[[1,0]],{cancel:true}]]) await slideGesture(page, track, points, options);
  assert.equal(count(), accessBefore, 'Incomplete/vertical/cancelled grouped access gesture dispatched');
  await slideGesture(page, track, [[1,0]]);
  await page.waitForTimeout(150);
  assert.equal(count(), accessBefore + 1, 'Completed grouped access slide must dispatch once');
  await api(config, 'POST', '/api/services/cover/close_cover', { entity_id: garage });
  await page.locator('.marao-popup-close').tap();
  await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
  await openGroup('gallery-battery-all');
  assert.equal(await page.locator('.marao-popup-sheet [data-card-action], .marao-popup-sheet input, .marao-popup-sheet [data-number-step]').count(), 0, 'Battery members must remain read-only');
  await page.locator('.marao-popup-close').tap();
  await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
  await openGroup('gallery-climate-all');
  const climateCalls = entity => serviceCalls.filter(call => call.domain === 'climate' && call.entities.includes(entity));
  const climateMembers = page.locator('.marao-popup-sheet marao-card');
  for (const entity of ['climate.marao_dashboard_test_case_climate_heat', 'climate.marao_dashboard_test_dual_target_climate']) {
    const index = await climateMembers.evaluateAll((cards, entity) => cards.findIndex(card => card._config.entity === entity), entity);
    assert.ok(index >= 0);
    const member = climateMembers.nth(index);
    const initial = await member.locator('.number-value').textContent(), count = climateCalls(entity).length;
    await member.locator('[data-number-step="increase"]').tap();
    await page.waitForFunction(({ member, initial }) => !member.shadowRoot.querySelector('.climate-pending') && member.shadowRoot.querySelector('.number-value').textContent !== initial, { member: await member.elementHandle(), initial });
    assert.equal(climateCalls(entity).length, count + 1, 'Grouped climate target must dispatch once');
    const call = climateCalls(entity).at(-1);
    assert.equal(call.service, 'set_temperature');
    assert.ok(entity.includes('dual_target') ? call.data.target_temp_low != null && call.data.target_temp_high != null : call.data.temperature != null);
    await member.locator('[data-number-step="decrease"]').tap();
    await page.waitForFunction(({ member, initial }) => !member.shadowRoot.querySelector('.climate-pending') && member.shadowRoot.querySelector('.number-value').textContent === initial, { member: await member.elementHandle(), initial });
    assert.equal(climateCalls(entity).length, count + 2);
  }
  const thermostat = 'climate.marao_dashboard_test_case_climate_heat';
  const modeIndex = await climateMembers.evaluateAll((cards, entity) => cards.findIndex(card => card._config.entity === entity), thermostat);
  await climateMembers.nth(modeIndex).locator('[data-card-action]').tap();
  const modes = page.locator('.marao-popup-sheet [data-climate-mode="cool"]');
  await modes.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.marao-popup-sheet h2').isVisible(), false, 'Actual mode-sheet title behavior must remain intact');
  const modeBefore = climateCalls(thermostat).length;
  await modes.tap();
  await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].state === 'cool', thermostat);
  assert.equal(climateCalls(thermostat).length, modeBefore + 1);
  assert.equal(climateCalls(thermostat).at(-1).service, 'set_hvac_mode');
  await api(config, 'POST', '/api/services/climate/set_hvac_mode', { entity_id: thermostat, hvac_mode: 'heat' });
  await page.locator('.marao-popup-close').tap();
  await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
  console.log(`Entity Groups ${scenario.name}/${theme}: typed filters, empty states, visible titles, retained nodes and focus passed.`);
}

async function main() {
  const captureScreenshots = process.argv.includes("--screenshots");
  const screenshotRoot = require('./verification-browser').artifactDirectory('dashboard-e2e');
  if (captureScreenshots) fs.mkdirSync(screenshotRoot, { recursive: true });
  let chromium;
  try { ({ [process.argv.includes("--webkit") ? "webkit" : "chromium"]: chromium } = require("playwright")); } catch { throw new Error("Playwright is not installed."); }
  const config = readConfig();
  assertDisposableHaTarget(config);
  await prepare(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await accessToken(config, baseUrl);
  let browser = await chromium.launch();
  if (process.argv.includes("--disconnect-only")) {
    try { await checkDisconnected(browser, config); } finally { await browser.close(); }
    return;
  }
  const { applyVisualPreferences, scenarios, contextOptionsForScenario, configurePageEmulation } = require('./test-ha-dashboard-accessibility');
  let scenario;
  try { scenario = dashboardScenario(process.argv, scenarios); }
  catch (error) {
    try { await browser.close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Invalid browser scenario and browser cleanup failed'); }
    throw error;
  }
  const serviceCalls = [];
  let errors;
  const cameraSelected = process.argv.includes('--camera-only') || process.argv.includes('--camera-live-only') || process.argv.includes('--camera-slow-only');
  const createSession = async theme => {
    const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
    try {
    const sessionErrors = [];
    const cameraLedger = cameraSelected ? await require('./camera-request-ledger').cameraRequestLedger(context, { output: screenshotRoot, scenario: scenario.name, theme }) : null;
    await context.addInitScript(setBrowserToken, {
      ...tokens, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + tokens.expires_in * 1000,
    });
    await context.addInitScript(() => {
      window.__maraoHaptics = [];
      window.addEventListener("haptic", (event) => window.__maraoHaptics.push(event.detail));
    });
    const page = await context.newPage();
    page.__cameraDelayedRequests = [];
    if (process.argv.includes('--history-only')) page.__historyLoadingGate = await installHistoryLoadingGate(page, baseUrl);
    cameraLedger?.attach(page);
    await configurePageEmulation(context, page, scenario);
    page.on("websocket", (socket) => socket.on("framesent", ({ payload }) => {
      let message;
      try { message = JSON.parse(String(payload)); } catch { return; }
      for (const request of Array.isArray(message) ? message : [message]) if (isDelayedCameraRequest(request)) page.__cameraDelayedRequests.push({ id: request.id });
      if (message.type !== "call_service") return;
      const entities = message.target?.entity_id ?? message.service_data?.entity_id ?? [];
      serviceCalls.push({ domain: message.domain, service: message.service, entities: Array.isArray(entities) ? entities : [entities], data: message.service_data });
    }));
    page.on("pageerror", (error) => sessionErrors.push(error.message));
    page.on("console", (message) => { if (["error", "warning"].includes(message.type())) sessionErrors.push(message.text()); });
    if (!cameraLedger) page.on("requestfailed", (request) => sessionErrors.push(`Failed ${request.resourceType()} request: ${new URL(request.url()).pathname} (${request.failure()?.errorText || "unknown error"})`));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        sessionErrors.push(`${response.status()} ${response.request().resourceType()} response: ${new URL(response.url()).pathname}`);
      }
    });
    return { context, page, errors: sessionErrors };
    } catch (error) {
      try { await context.close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Browser session setup and context cleanup failed'); }
      throw error;
    }
  };
  const requestedTheme = process.argv.find(arg => arg.startsWith('--theme='))?.slice(8) || 'light';
  assert.ok(['light', 'dark'].includes(requestedTheme), 'Unknown e2e theme');
  let context, page;
  try { ({ context, page, errors } = await createSession(requestedTheme)); }
  catch (error) {
    try { await browser.close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Initial browser session setup and browser cleanup failed'); }
    throw error;
  }
  const assertNoBrowserErrors = async (label) => {
    await page.__cameraRequestLedger?.assert();
    if (!errors.length) return;
    const observed = errors.splice(0);
    const nativeReports = serviceCalls.filter(call => call.domain === 'system_log' && call.service === 'write').map(call => call.data?.message);
    throw new Error(`${label} produced browser warnings/errors:\n${observed.map((item) => `- ${item}`).join("\n")}\nNative error reports: ${JSON.stringify(nativeReports)}`);
  };
  if (process.argv.includes('--toggle-only')) {
    const entity = 'switch.marao_dashboard_test_switch';
    try {
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') { await browser.close(); browser = await chromium.launch(); ({ context, page, errors } = await createSession(theme)); }
        await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: 'domcontentloaded' });
        const action = cardAction(page, 'Switch + graph');
        assert.equal(await cardByTitle(page, 'Switch + graph').evaluate(card => card._config.entity), entity, 'Toggle must target the safe fixture');
        await action.waitFor({ state: 'visible' }); await assertCurrentFrontend(page);
        await applyVisualPreferences(page, scenario, theme);
        const before = await page.evaluate(id => document.querySelector('home-assistant').hass.states[id]?.state, entity);
        assert.ok(['on', 'off'].includes(before), 'Safe switch fixture is unavailable');
        const count = serviceCalls.length;
        await action.tap();
        await page.waitForFunction(({ id, before }) => document.querySelector('home-assistant').hass.states[id]?.state !== before, { id: entity, before });
        assert.equal(serviceCalls.length - count, 1, 'Completed toggle must dispatch once');
        assert.deepEqual(serviceCalls.at(-1).entities, [entity]);
        assert.equal(await page.evaluate(() => window.__maraoHaptics.at(-1)), 'heavy');
        await assertNoBrowserErrors('Safe toggle/' + theme);
        await page.screenshot({ path: path.join(screenshotRoot, 'toggle-' + theme + '.png'), scale: 'css' });
      }
    } catch (error) {
      await page.screenshot({ path: path.join(screenshotRoot, 'toggle-failure.png'), scale: 'css' }); throw error;
    } finally { await browser.close(); }
    return;
  }
  if (process.argv.includes('--chart-details-only')) {
    const geometryOnly = process.argv.includes('--chart-geometry');
    try {
      let coldAssets = 0;
      if (!geometryOnly) {
        await page.goto(`${baseUrl}/marao-dashboard/overview`, { waitUntil: 'domcontentloaded' });
        await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
        await assertCurrentFrontend(page); await page.waitForLoadState('networkidle');
        coldAssets = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/MaraoHistoryChart.js')).length);
        assert.equal(coldAssets, 0, 'Ordinary Home load fetched the detailed Chart.js bundle');
      }
      await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: 'domcontentloaded' });
      await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
      await assertCurrentFrontend(page); await applyVisualPreferences(page, scenario, requestedTheme);
      await require('./history-detail-checks').checkHistoryDetails(page, serviceCalls, { scenario, theme: requestedTheme, geometryOnly, coldAssets });
      await page.waitForLoadState('networkidle'); await assertNoBrowserErrors(`Chart details/${scenario.name}/${requestedTheme}`);
      console.log(`Chart details ${scenario.name}/${requestedTheme}: exact readings, windows, retained resources, safe inspection and selected geometry passed.`);
    } catch (error) {
      await require('./verification-browser').capture(page, { path: path.join(screenshotRoot, `chart-details-${scenario.name}-${requestedTheme}-failure.png`), scale: 'css' });
      throw error;
    } finally { await browser.close(); }
    return;
  }
  const cameraSlowOnly = process.argv.includes('--camera-slow-only');
  const cameraLiveOnly = process.argv.includes('--camera-live-only') || cameraSlowOnly;
  const selectedCheck = cameraLiveOnly ? 'camera' : ['actions', 'camera', 'history'].find(name => process.argv.includes('--' + name + '-only'));
  if (selectedCheck) {
    let completedTheme = false;
    let selectedError;
    try {
      for (const theme of cameraLiveOnly ? [requestedTheme] : ['light', 'dark']) {
        if (completedTheme) {
          const retiredLedger = page.__cameraRequestLedger;
          await browser.close(); await retiredLedger?.assert();
          await assertNoBrowserErrors(selectedCheck + '/closed context');
          browser = await chromium.launch(); ({ context, page, errors } = await createSession(theme));
        }
        await page.goto(`${baseUrl}/marao-dashboard/${cameraSlowOnly ? 'security' : cameraLiveOnly ? 'entrance' : 'card-test'}`, { waitUntil: 'domcontentloaded' });
        await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
        await assertCurrentFrontend(page);
        if (selectedCheck === 'history') await checkHistoryCases(page);
        if (cameraLiveOnly) {
          const target = await require('./camera-live-native-checks').cameraCardByName(page, cameraSlowOnly ? 'Slow connection camera' : 'Front Door Camera · automatic live video').elementHandle();
          try { await applyVisualPreferences(page, scenario, theme, target); } finally { await target.dispose(); }
        } else await applyVisualPreferences(page, scenario, theme);
        if (cameraSlowOnly) await require('./camera-slow-native-checks').checkSlowCamera(page, serviceCalls, {output:screenshotRoot});
        else if (selectedCheck === 'camera') await require('./camera-live-native-checks').checkNativeCameraPlayback(page, serviceCalls, { output: screenshotRoot, scenario: scenario.name, theme, geometryOnly: cameraLiveOnly });
        if (!cameraLiveOnly && selectedCheck !== 'history') await ({ actions: checkActionDispatches, camera: checkCameraCases })[selectedCheck](page, serviceCalls);
        if (selectedCheck === 'camera') await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        else await page.waitForLoadState('networkidle');
        if (selectedCheck === 'camera') await page.__cameraRequestLedger.stopForClose();
        await assertNoBrowserErrors(selectedCheck + '/' + theme);
        completedTheme = true;
      }
    } catch (error) {
      selectedError = error;
      if (!page.isClosed()) await page.screenshot({ path: path.join(screenshotRoot, selectedCheck + '-failure.png'), scale: 'css' });
      throw error;
    } finally {
      const retiredLedger = page.__cameraRequestLedger;
      try {
        try { if (retiredLedger && !page.isClosed()) await retiredLedger.stopForClose(); }
        finally { await browser.close(); await retiredLedger?.assert(); await assertNoBrowserErrors(selectedCheck + '/closed context'); }
      } catch (cleanupError) {
        if (selectedError) throw new AggregateError([selectedError, cleanupError], `Selected ${selectedCheck} assertion: ${selectedError.message}\nCleanup diagnostics: ${cleanupError.message}`);
        throw cleanupError;
      }
    }
    return;
  }
  if (process.argv.includes('--media-only')) {
    try {
      await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: 'domcontentloaded' });
      await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
      await assertCurrentFrontend(page);
      await checkMediaRecovery(page, serviceCalls, path.join(screenshotRoot, 'media-recovery'));
      await page.waitForLoadState('networkidle');
      await assertNoBrowserErrors('Media recovery');
    } finally { await browser.close(); }
    return;
  }
  if (process.argv.includes('--groups-only')) {
    try {
      for (const theme of ['light','dark']) {
        if (theme === 'dark') { await browser.close(); browser = await chromium.launch(); ({ context, page, errors } = await createSession(theme)); }
        await page.goto(`${baseUrl}/marao-dashboard/card-test`);
        await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
        await assertCurrentFrontend(page);
        await applyVisualPreferences(page, scenario, theme);
        await checkEntityGroups(page, serviceCalls, path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), `entity-groups-${scenario.name}-${theme}`), scenario, theme, config);
        await page.waitForLoadState('networkidle');
        await assertNoBrowserErrors(`Entity Groups (${theme})`);
      }
    } finally {
      await browser.close();
      await api(config, 'POST', '/api/services/marao_test_camera/reset', {});
    }
    return;
  }
  if (process.argv.includes('--climate-only')) {
    try {
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') {
          // Chromium can lose touch emulation when a mobile session changes theme.
          await browser.close();
          browser = await chromium.launch();
          ({ context, page, errors } = await createSession(theme));
        }
        await page.goto(`${baseUrl}/marao-dashboard/${cameraSlowOnly ? 'security' : cameraLiveOnly ? 'entrance' : 'card-test'}`, { waitUntil: 'domcontentloaded' });
        await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
        await assertCurrentFrontend(page);
        await applyVisualPreferences(page, scenario, theme);
        await checkNativeSurfaces(page);
        await checkClimateFeedback(page, serviceCalls, path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), `climate-feedback-${scenario.name}-${theme}`), { scenario, theme });
        await page.waitForLoadState('networkidle');
        await assertNoBrowserErrors(`Climate feedback (${theme})`);
        console.log(`Climate feedback, single dispatch and keyboard focus OK (${theme}).`);
      }
    } finally { await browser.close(); }
    return;
  }
  const deepSnapshot = () => page.evaluate(() => {
    const elements = [];
    const visit = (root) => {
      for (const child of root?.children || []) { elements.push(child); visit(child.shadowRoot); visit(child); }
    };
    visit(document.documentElement);
    return {
      tags: elements.map((element) => element.localName),
      errors: elements.filter((element) => element.localName === "hui-error-card").map((element) => element.textContent?.trim() || "error"),
      warnings: elements.filter((element) => element.localName === "hui-warning").map((element) => element.textContent?.trim() || "warning"),
      nav: elements.some((element) => element.localName === "marao-navbar-card"),
      maraoCards: elements.filter((element) => element.localName === "marao-card").length,
      popups: elements.filter((element) => element.localName === "marao-popup-card").length,
    };
  });
  try {
    if (process.argv.includes("--ui-only")) {
      await page.goto(`${baseUrl}/marao-dashboard/overview`, { waitUntil: "domcontentloaded" });
      await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
      await assertCurrentFrontend(page);
      await checkOverviewPopups(page, config, captureScreenshots ? screenshotRoot : null);
      await checkGeneratedMedia(page, config, captureScreenshots ? screenshotRoot : null);
      await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
      await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
      await checkCardContent(page, serviceCalls);
      await assertNoBrowserErrors("Popup and card content checks");
      console.log("Generated popups and gallery content checks passed.");
      return;
    }
    if (process.argv.includes("--actions-only")) {
      await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
      await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
      await assertCurrentFrontend(page);
      for (const theme of ['light', 'dark']) {
        await applyVisualPreferences(page, scenario, theme);
        await checkActionDispatches(page, serviceCalls);
        await checkShowcaseActions(page, serviceCalls, captureScreenshots ? path.join(screenshotRoot, 'action-recovery', `${scenario.name}-${theme}`) : undefined);
      }
      await checkCameraCases(page);
      await checkMediaRecovery(page, serviceCalls, captureScreenshots ? path.join(screenshotRoot, 'media-recovery') : undefined);
      await assertNoBrowserErrors("Card interactions");
      console.log("Gallery action checks passed.");
      return;
    }
    await page.goto(`${baseUrl}/marao-dashboard/overview`, { waitUntil: "domcontentloaded" });
    await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    await assertNoBrowserErrors("Overview");
    const overview = await deepSnapshot();
    if (overview.errors.length || overview.warnings.length) throw new Error(`Overview rendered warnings/errors: ${JSON.stringify(overview)}`);
    if (!overview.nav) throw new Error("Overview did not render custom:marao-navbar-card.");
    await checkOverviewPopups(page, config, captureScreenshots ? screenshotRoot : null);
    await checkGeneratedMedia(page, config, captureScreenshots ? screenshotRoot : null);

    const dashboard = await page.evaluate(async () => {
      const hass = document.querySelector("home-assistant")?.hass;
      if (!hass) throw new Error("Home Assistant frontend API unavailable.");
      const payload = await hass.callWS({ type: "marao_dashboard/config/get" });
      const url = payload.dashboard_url || "/marao-dashboard/overview";
      const key = url.split("/").filter(Boolean)[0];
      return {
        payload,
        config: await hass.callWS({ type: "lovelace/config", url_path: key, force: true }),
        maraoDashboardPanels: Object.entries(hass.panels || {})
          .filter(([path, panel]) => path.startsWith("marao-") && panel.component_name === "lovelace")
          .map(([path]) => path),
        states: Object.fromEntries(Object.entries(hass.states || {}).map(([entity, state]) => [entity, state.state])),
      };
    });
    if (JSON.stringify(dashboard.maraoDashboardPanels) !== JSON.stringify(["marao-dashboard"])) {
      throw new Error(`Expected one Marao Lovelace dashboard, found: ${JSON.stringify(dashboard.maraoDashboardPanels)}`);
    }
    const serialized = JSON.stringify(dashboard.config);
    for (const type of ["custom:marao-card", "custom:marao-navbar-card"]) {
      if (!serialized.includes(type)) throw new Error(`Generated dashboard is missing ${type}.`);
    }
    if (["custom:button-card", "custom:bubble-card", "custom:navbar-card"].some((type) => serialized.includes(type))) {
      throw new Error("Generated dashboard still references a retired upstream card.");
    }
    const dashboardKey = dashboard.payload.dashboard_url.split("/").filter(Boolean)[0];
    const navigationViolations = dashboardNavigationViolations(dashboard.config, dashboardKey);
    if (navigationViolations.length) {
      throw new Error(`Dashboard navigation is not self-contained:\n${navigationViolations.map((item) => `- ${item}`).join("\n")}`);
    }
    const checks = buildViewChecks(dashboard.config, dashboard.payload.dashboard_url, dashboard.states);
    for (const view of checks) {
      await page.goto(`${baseUrl}${view.url}`, { waitUntil: "domcontentloaded" });
      await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
      await assertCurrentFrontend(page);
      await scrollDashboard(page);
      await page.waitForLoadState('networkidle');
      await assertNoBrowserErrors(view.name);
      const result = await deepSnapshot();
      if (result.errors.length || result.warnings.length) throw new Error(`${view.name} rendered warnings/errors: ${JSON.stringify(result)}`);
      if (!result.nav) throw new Error(`${view.name} did not render custom:marao-navbar-card.`);
    }
    await page.goto(`${baseUrl}/marao-dashboard/energy`, { waitUntil: "domcontentloaded" });
    await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    await scrollDashboard(page);
    await page.waitForLoadState('networkidle');
    await assertNoBrowserErrors("Energy");
    const housePowerGraph = cardByTitle(page, "House Power").locator("svg.graph-background");
    if (await housePowerGraph.count() !== 1 || !await housePowerGraph.isVisible() || await housePowerGraph.locator("polyline.line").count() !== 1) {
      throw new Error("House Power did not render Marao's visible SVG background graph.");
    }
    const cardTestView = (dashboard.config.views || []).find((view) => view.path === "card-test");
    const cardTestSerialized = JSON.stringify(cardTestView);
    for (const type of ["custom:marao-card", "custom:marao-popup-card", "custom:marao-navbar-card"]) {
      if (!cardTestSerialized.includes(type)) throw new Error(`Card test dashboard is missing ${type}.`);
    }
    await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
    await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    // The dedicated history visit holds the initial request to prove loading;
    // this later gallery revisit checks the completed states and request counts.
    await checkHistoryCases(page, { loading: false });
    await scrollDashboard(page);
    await assertNoBrowserErrors("Card test dashboard");
    const cardTest = await deepSnapshot();
    if (cardTest.errors.length || cardTest.warnings.length) throw new Error(`Card test dashboard rendered warnings/errors: ${JSON.stringify(cardTest)}`);
    if (!cardTest.nav || cardTest.maraoCards < 10 || cardTest.popups < 1) throw new Error(`Card test dashboard rendered too few Marao cards: ${JSON.stringify(cardTest)}`);
    await checkStateCases(page, serviceCalls);
    await checkNativeSurfaces(page);
    await checkClimateFeedback(page, serviceCalls, captureScreenshots ? path.join(screenshotRoot, 'climate-feedback') : undefined);
    await page.waitForFunction(() => {
      const graphs = new Set();
      const visit = root => {
        root.querySelectorAll('marao-card').forEach(card => {
          if (card.shadowRoot?.querySelector('svg.graph-background polyline.line')?.getAttribute('points')?.trim()) graphs.add(card._config.name);
        });
        root.querySelectorAll('*').forEach(element => { if (element.shadowRoot) visit(element.shadowRoot); });
      };
      visit(document);
      return ['Switch + graph', 'Graph', 'Toggle graph'].every(name => graphs.has(name));
    }, undefined, { timeout: 10000 });
    const graphCards = await page.locator("marao-card").evaluateAll((cards) => cards.map((card) => {
      const root = card.shadowRoot;
      const graph = root?.querySelector("svg.graph-background");
      const line = graph?.querySelector("polyline.line");
      const rect = graph?.getBoundingClientRect();
      return {
        title: root?.querySelector(".title")?.textContent?.trim(),
        visible: Boolean(rect && rect.width > 0 && rect.height > 0),
        points: line?.getAttribute("points") || "",
      };
    }).filter((card) => ["Switch + graph", "Graph", "Toggle graph"].includes(card.title)));
    const missingGraphs = ["Switch + graph", "Graph", "Toggle graph"].filter((title) => !graphCards.some((card) =>
      card.title === title && card.visible && card.points.trim()
    ));
    if (missingGraphs.length) throw new Error(`Card test dashboard did not render Marao SVG graphs for: ${missingGraphs.join(", ")}.`);
    if (await page.locator("hui-history-graph-card").count()) {
      throw new Error("Card test dashboard still rendered a retired native history graph.");
    }
    const coloredCards = await page.evaluate(() => {
      const cards = [];
      const visit = (root) => {
        for (const child of root?.children || []) {
          if (child.localName === "marao-card") {
            const card = child.shadowRoot?.querySelector("ha-card");
            if (card?.style.getPropertyValue("--marao-card-background")) cards.push(card);
          }
          visit(child.shadowRoot);
          visit(child);
        }
      };
      visit(document.documentElement);
      return cards.length;
    });
    if (coloredCards < 4) throw new Error(`Card test dashboard did not apply state colors (${coloredCards} colored cards).`);
    const climatePalette = Object.fromEntries(await page.locator("marao-card").evaluateAll((cards) => cards.map((card) => [
      card.shadowRoot?.querySelector(".title")?.textContent?.trim(),
      card.shadowRoot?.querySelector("ha-card")?.style.getPropertyValue("--marao-card-background"),
    ]).filter(([name]) => /^Climate · (Heat|Cool|Heat\/Cool|Auto|Dry|Fan|Off)$/.test(name))));
    const expectedClimatePalette = {
      "Climate · Heat": "var(--color-red)",
      "Climate · Cool": "var(--color-blue)",
      "Climate · Heat/Cool": "var(--color-purple)",
      "Climate · Auto": "var(--color-gold)",
      "Climate · Dry": "var(--color-yellow)",
      "Climate · Fan": "var(--color-green)",
      "Climate · Off": "",
    };
    if (JSON.stringify(climatePalette) !== JSON.stringify(expectedClimatePalette)) {
      throw new Error(`Climate state palette did not render correctly: ${JSON.stringify(climatePalette)}`);
    }
    await page.locator('marao-card input[type="range"]').first().dispatchEvent("pointerdown");
    if (await page.evaluate(() => window.__maraoHaptics.at(-1)) !== "heavy") {
      throw new Error("Slider presses must emit strong haptic feedback.");
    }
    const sliderProgress = await sliderReadings(page);
    const sliderFailures = sliderProgress.filter(({ issues }) => issues.length);
    if (!sliderProgress.length || sliderFailures.length) {
      throw new Error(`Card test slider geometry failed: ${JSON.stringify(sliderFailures)}`);
    }
    const roomLights = ["light.marao_dashboard_test_light", "light.marao_dashboard_test_room_light"];
    await page.evaluate(async (entities) => {
      await document.querySelector("home-assistant").hass.callService("light", "turn_on", { entity_id: entities });
    }, roomLights);
    await page.waitForFunction((entities) => entities.every((entity) =>
      document.querySelector("home-assistant")?.hass?.states?.[entity]?.state === "on"
    ), roomLights);
    const roomLightsOff = cardByTitle(page, "Room card").locator("[data-room-lights-off]");
    if (await roomLightsOff.count() !== 1 || await roomLightsOff.isDisabled()) {
      throw new Error("Room card did not expose an enabled all-lights-off action for the safe test lights.");
    }
    const roomPathBefore = new URL(page.url()).pathname;
    await roomLightsOff.tap();
    await page.waitForFunction((entities) => entities.every((entity) =>
      document.querySelector("home-assistant")?.hass?.states?.[entity]?.state === "off"
    ), roomLights);
    if (new URL(page.url()).pathname !== roomPathBefore) {
      throw new Error("Room all-lights-off action navigated instead of staying on the current card.");
    }
    const independentSlider = page.locator('input[data-slider-key="hc_cover_card:cover.marao_dashboard_test_cover"]');
    if (await independentSlider.isEnabled()) {
      const cover = "cover.marao_dashboard_test_cover";
      await page.evaluate(async () => {
        await document.querySelector("home-assistant").hass.callService("input_number", "set_value", {
          entity_id: "input_number.marao_dashboard_test_cover_position", value: 100,
        });
      });
      await page.waitForFunction((entity) => document.querySelector("home-assistant").hass.states[entity]?.attributes.current_position === 100, cover);
      const callsBefore = serviceCalls.filter((call) => call.entities.includes(cover)).length;
      await independentSlider.evaluate((input) => {
        input.value = "60";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const independentCheck = await independentSlider.evaluate((input) => ({
        target: Number(input.value),
        current: Number(input.dataset.sliderCurrent),
        progress: Number.parseFloat(input.style.getPropertyValue("--marao-slider-progress")),
      }));
      if (independentCheck.target !== 60 || independentCheck.current <= independentCheck.target || independentCheck.progress > independentCheck.target) {
        throw new Error(`Cover slider progress exceeded its target thumb: ${JSON.stringify(independentCheck)}`);
      }
      if (serviceCalls.filter((call) => call.entities.includes(cover)).length !== callsBefore) throw new Error("Cover slider dispatched before completing the interaction.");
      await independentSlider.dispatchEvent("change");
      await page.waitForFunction((entity) => document.querySelector("home-assistant").hass.states[entity]?.attributes.current_position === 60, cover);
      const calls = serviceCalls.filter((call) => call.entities.includes(cover)).slice(callsBefore);
      if (calls.length !== 1 || calls[0].service !== "set_cover_position") throw new Error("Cover slider must dispatch one native position action.");
    }
    await cardAction(page, "Bubble popup").tap();
    await page.waitForTimeout(50);
    const popupLayout = await page.evaluate(() => {
      const sheet = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet");
      const columns = [];
      const visit = (root) => {
        root?.querySelectorAll?.("#columns > div:nth-child(1)").forEach((element) => columns.push(element));
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(document);
      if (!sheet) return null;
      const style = getComputedStyle(sheet);
      const rect = sheet.getBoundingClientRect();
      return {
        animationName: style.animationName,
        width: Math.round(rect.width),
        maxWidth: style.maxWidth,
        columnWidth: columns[0] ? Math.round(columns[0].getBoundingClientRect().width) : null,
      };
    });
    if (!popupLayout || popupLayout.animationName !== "marao-popup-slide-up") {
      throw new Error(`Card test popup did not use the slide-up animation: ${JSON.stringify(popupLayout)}`);
    }
    if (popupLayout.columnWidth && popupLayout.maxWidth !== `${popupLayout.columnWidth}px`) {
      throw new Error(`Card test popup did not match the first column width: ${JSON.stringify(popupLayout)}`);
    }
    await page.locator(".marao-popup-close").tap();
    await cardAction(page, "Lock access").tap();
    const lockEntity = await page.locator('.marao-popup-sheet marao-card').first().evaluate(card => card._config.entity);
    if (lockEntity !== 'lock.marao_dashboard_test_lock') throw new Error('Lock presentation check must use the safe gallery lock.');
    const lockState = await page.evaluate(entity => document.querySelector('home-assistant').hass.states[entity].state, lockEntity);
    const lockCues = await page.locator('.marao-popup-sheet marao-card').evaluateAll(cards => cards.map(card => card.shadowRoot.querySelector('ha-card')?.dataset.binaryState));
    if (lockCues.some(active => active !== String(lockState === 'unlocked'))) throw new Error('Access action states do not match the authoritative lock state.');
    if (lockState === 'locked') {
      const inactive = await page.locator('.marao-popup-sheet marao-card').evaluateAll(cards => cards.map(card => card.shadowRoot.querySelector('ha-card').style.getPropertyValue('--marao-card-background')));
      if (inactive.some(background => background)) throw new Error('Inactive binary lock actions did not use their normal neutral surface.');
      const count = serviceCalls.filter(call => call.entities.includes(lockEntity) && call.service === 'unlock').length;
      await slideGesture(page, page.locator('.marao-popup-sheet marao-slide-to-open .track'), [[1, 0]]);
      await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].state === 'unlocked', lockEntity);
      if (serviceCalls.filter(call => call.entities.includes(lockEntity) && call.service === 'unlock').length !== count + 1) throw new Error('Valid lock slide must dispatch once.');
    }
    const lockActionBackgrounds = await page.locator(".marao-popup-sheet marao-card").evaluateAll((cards) =>
      cards.map((card) => card.shadowRoot?.querySelector("ha-card")?.style.getPropertyValue("--marao-card-background"))
    );
    if (!lockActionBackgrounds.includes("var(--color-red)") || !lockActionBackgrounds.includes("var(--color-green)")) {
      throw new Error(`Lock popup did not render red unlock and green lock cards: ${JSON.stringify(lockActionBackgrounds)}`);
    }
    const lockSliderLabel = (await page.locator(".marao-popup-sheet marao-slide-to-open .label").innerText()).trim();
    if (!["Unlock", "Destrancar"].includes(lockSliderLabel)) {
      throw new Error(`Lock slider label must be the localized single-word Unlock label, got: ${lockSliderLabel}`);
    }
    if (lockState === 'locked') {
      const lockIndex = await page.locator('.marao-popup-sheet marao-card').evaluateAll(cards => cards.findIndex(card => card._config.variables?.action_service === 'lock.lock'));
      if (lockIndex < 0) throw new Error('Missing explicit safe Lock action.');
      await page.locator('.marao-popup-sheet marao-card').nth(lockIndex).locator('[data-card-action]').tap();
      await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].state === 'locked', lockEntity);
    }
    await page.locator(".marao-popup-close").tap();
    await cardAction(page, "Climate").tap();
    if ((await page.locator(".marao-popup-head h2").innerText()).trim()) {
      throw new Error("Climate mode popup still rendered a duplicate heading.");
    }
    const climateModes = page.locator(".marao-popup-sheet [data-climate-mode]");
    if (await climateModes.count() < 2) throw new Error("Multi-mode climate did not render its mode choices.");
    const climateModeLayout = await page.locator(".marao-popup-sheet .climate-modes").evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      buttonHeight: Math.round(element.querySelector("button").getBoundingClientRect().height),
      buttonFontSize: parseFloat(getComputedStyle(element.querySelector("button")).fontSize),
      labels: [...element.querySelectorAll("button")].map((button) => button.textContent.trim()),
      icons: [...element.querySelectorAll("button ha-icon")].map((icon) => icon.getAttribute("icon")),
      backgrounds: [...element.querySelectorAll("button")].map((button) => getComputedStyle(button).backgroundColor),
    }));
    if (
      climateModeLayout.columns !== 2 ||
      climateModeLayout.buttonHeight < 56 ||
      climateModeLayout.buttonFontSize < 18 ||
      climateModeLayout.icons.length !== climateModeLayout.labels.length ||
      climateModeLayout.icons.some((icon) => !icon) ||
      new Set(climateModeLayout.backgrounds).size !== 1 ||
      climateModeLayout.labels.some((label) => label[0] !== label[0].toUpperCase())
    ) {
      throw new Error(`Climate modes must use a large two-column grid: ${JSON.stringify(climateModeLayout)}`);
    }
    const climateStateFontSize = await page.locator(".marao-popup-sheet .climate-card .state").evaluate(
      (element) => parseFloat(getComputedStyle(element).fontSize)
    );
    if (climateStateFontSize < 18) throw new Error(`Climate state text is too small: ${climateStateFontSize}px`);
    const climateCurrentTemperature = page.locator(".marao-popup-sheet .climate-card .current-temperature");
    if (await climateCurrentTemperature.count() !== 1) throw new Error("Climate card did not render its current temperature value.");
    const climateCurrentTemperatureDetails = await climateCurrentTemperature.evaluate((element) => ({
      text: element.textContent.trim(),
      fontSize: parseFloat(getComputedStyle(element).fontSize),
    }));
    if (
      !climateCurrentTemperatureDetails.text ||
      /current|[°º]/i.test(climateCurrentTemperatureDetails.text) ||
      climateCurrentTemperatureDetails.fontSize < 28
    ) {
      throw new Error(`Climate current temperature must be a large unitless value: ${JSON.stringify(climateCurrentTemperatureDetails)}`);
    }
    const climateTemperature = page.locator('.marao-popup-sheet [data-number-step="increase"]').first();
    if (await climateTemperature.count() !== 1) throw new Error("Climate target temperature stepper did not render.");
    const climateSetpointContrast = await page.locator(".marao-popup-sheet .climate-stepper").evaluate((element) => {
      const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (value) => rgb(value).map((channel) => {
        channel /= 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const styles = getComputedStyle(element);
      const light = Math.max(luminance(styles.backgroundColor), luminance(styles.color));
      const dark = Math.min(luminance(styles.backgroundColor), luminance(styles.color));
      return (light + 0.05) / (dark + 0.05);
    });
    if (climateSetpointContrast < 4.5) {
      throw new Error(`Climate setpoint contrast is too low: ${climateSetpointContrast.toFixed(2)}:1`);
    }
    const climateTargetBefore = await page.locator(".marao-popup-sheet .number-value").first().innerText();
    await climateTemperature.tap();
    await page.waitForTimeout(500);
    const climateTargetAfter = await page.locator(".marao-popup-sheet .number-value").first().innerText();
    if (climateTargetAfter === climateTargetBefore) throw new Error("Climate target temperature increase button did not update the target.");
    if (/[°º]/.test(climateTargetAfter)) throw new Error(`Climate target still shows a temperature unit: ${climateTargetAfter}`);
    await page.locator('.marao-popup-sheet [data-number-step="decrease"]').first().tap();
    await page.waitForTimeout(500);
    await page.locator(".marao-popup-close").tap();
    await cardAction(page, "Multi Mode Climate").tap();
    const multiModeClimateModes = page.locator(".marao-popup-sheet [data-climate-mode]");
    if (await multiModeClimateModes.count() < 6) {
      throw new Error("Multi-mode climate example did not render all common HVAC modes.");
    }
    await multiModeClimateModes.filter({ hasText: exactText("Cool") }).tap();
    await page.waitForTimeout(500);
    if ((await page.locator(".marao-popup-sheet .climate-card .state").innerText()).trim() !== "Cool") {
      throw new Error("Multi-mode climate example did not apply the selected mode.");
    }
    await page.locator(".marao-popup-close").tap();
    const numberCard = cardByTitle(page, "Number");
    if (await numberCard.locator('input[type="range"]').count()) {
      throw new Error("Number card still rendered a slider instead of the shared number stepper.");
    }
    const numberValue = numberCard.locator(".number-value");
    const numberBefore = await numberValue.innerText();
    await numberCard.locator('[data-number-step="increase"]').tap();
    await page.waitForTimeout(500);
    if (await page.evaluate(() => window.__maraoHaptics.at(-1)) !== "heavy") {
      throw new Error("Button presses must emit strong haptic feedback.");
    }
    const numberAfter = await numberValue.innerText();
    if (numberAfter === numberBefore) throw new Error("Number card increase button did not update its value.");
    await numberCard.locator('[data-number-step="decrease"]').tap();
    await page.waitForTimeout(500);
    const temperatureBefore = await page.evaluate(() => Number(
      document.querySelector("home-assistant")?.hass?.states?.["input_number.marao_dashboard_test_temperature"]?.state
    ));
    const temperatureAfter = temperatureBefore === 20 ? 20.5 : 20;
    await page.evaluate(async (value) => {
      await document.querySelector("home-assistant").hass.callService("input_number", "set_value", {
        entity_id: "input_number.marao_dashboard_test_temperature",
        value,
      });
    }, temperatureAfter);
    await page.waitForFunction((value) => Number(
      document.querySelector("home-assistant")?.hass?.states?.["sensor.marao_dashboard_test_temperature"]?.state
    ) === value, temperatureAfter);
    await page.waitForFunction((value) => {
      const readings = [];
      const visit = (root) => {
        root?.querySelectorAll?.(".climate").forEach((element) => readings.push(element.textContent || ""));
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(document);
      return readings.some((reading) => reading.includes(value) && !/[°º]/.test(reading));
    }, String(temperatureAfter));
    await page.evaluate(async (value) => {
      await document.querySelector("home-assistant").hass.callService("input_number", "set_value", {
        entity_id: "input_number.marao_dashboard_test_temperature",
        value,
      });
    }, temperatureBefore);
    await cardAction(page, "Apple TV").tap();
    const remoteButtons = page.locator(".marao-popup-sheet .body.icon-only");
    if (await remoteButtons.count() < 9) throw new Error("Apple TV remote buttons did not render as icon-only controls.");
    if ((await remoteButtons.allTextContents()).some((label) => label.trim())) {
      throw new Error("Apple TV remote buttons rendered text instead of icons only.");
    }
    const misalignedRemoteButtons = (await measureCenteredIcons(remoteButtons))
      .filter((item) => item.missingElement || Math.abs(item.horizontalOffset) > 0.5 || Math.abs(item.verticalOffset) > 0.5);
    if (misalignedRemoteButtons.length) {
      throw new Error(`Apple TV remote icons are not centered in their cards: ${JSON.stringify(misalignedRemoteButtons)}`);
    }
    await page.locator(".marao-popup-close").tap();
    const garageAction = cardAction(page, "Garage door access");
    if (await garageAction.isEnabled()) {
      await garageAction.tap();
      const actionTrack = page.locator(".marao-popup-sheet marao-slide-to-open .track");
      if (await actionTrack.count() !== 1) throw new Error("Garage door popup did not render a slide-to-open control.");
      await slideGesture(page, actionTrack, [[1, 0]]);
      await page.waitForTimeout(500);
      if (await actionTrack.getAttribute("aria-valuenow") !== "0") throw new Error("Slide-to-open control did not reset after the action.");
      await page.locator(".marao-popup-close").tap();
    }
    await checkActionDispatches(page, serviceCalls);
    await checkShowcaseActions(page, serviceCalls);
    await checkCameraCases(page);
    await checkMediaRecovery(page, serviceCalls, captureScreenshots ? path.join(screenshotRoot, 'media-recovery') : undefined);
    await assertNoBrowserErrors("Card interactions");
    await checkCardContent(page, serviceCalls);
    if (captureScreenshots) {
      await context.close();
      for (const view of checks) {
        const screenshotContext = await browser.newContext(require("./mobile-devices").iphone);
        await screenshotContext.addInitScript(setBrowserToken, {
          ...tokens, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + tokens.expires_in * 1000,
        });
        const screenshotPage = await screenshotContext.newPage();
        const screenshotErrors = [];
        screenshotPage.on("pageerror", (error) => screenshotErrors.push(error.message));
        screenshotPage.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) screenshotErrors.push(message.text());
        });
        screenshotPage.on("requestfailed", (request) => {
          screenshotErrors.push(`Failed ${request.resourceType()} request: ${new URL(request.url()).pathname} (${request.failure()?.errorText || "unknown error"})`);
        });
        await screenshotPage.goto(`${baseUrl}${view.url}`, { waitUntil: "domcontentloaded" });
        await screenshotPage.locator("marao-navbar-card").first().waitFor({ state: "visible", timeout: 10000 });
        await assertCurrentFrontend(screenshotPage);
        const filename = view.url.split("/").filter(Boolean).at(-1).replace(/[^a-z0-9-]/gi, "-");
        await scrollDashboard(screenshotPage, { screenshotPrefix: path.join(screenshotRoot, filename) });
        await screenshotPage.waitForLoadState('networkidle');
        await screenshotContext.close();
        if (screenshotErrors.length) {
          throw new Error(`${view.name} screenshot produced browser warnings/errors:\n${screenshotErrors.map((item) => `- ${item}`).join("\n")}`);
        }
      }
    }
    console.log(`Gallery interactions and page screenshots OK (${checks.length} generated views; ${cardTest.maraoCards} gallery cards).`);
    await checkDisconnected(browser, config, true);
    const popupCount = (serialized.match(/custom:marao-popup-card/g) || []).length;
    console.log(`Marao Dashboard e2e OK (${checks.length} generated view(s); ${cardTest.maraoCards} card-test cards; ${coloredCards} state-colored cards; ${popupCount} generated popup configuration(s))`);
    if (captureScreenshots) console.log(`Dashboard screenshots: ${screenshotRoot}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((error) => {
  const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'dashboard-e2e');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'failure.txt'), error.stack || error.message, { mode: 0o600 });
  const evidencePath = process.argv.find(arg => arg.startsWith('--reconnect-evidence='))?.slice(21);
  if (evidencePath && path.isAbsolute(evidencePath)) fs.writeFileSync(evidencePath + '.exit.json', JSON.stringify({ stage: error.stage || null, message: error.message }), { mode: 0o600 });
  console.error(error.message || error); process.exitCode = 1;
});

module.exports = { captureClimateFeedback, climateFeedbackSnapshot, buildViewChecks, checkDisconnected, checkHistoryCases, installHistoryLoadingGate, conditionalCardIsActive, dashboardNavigationViolations, dashboardScenario, isDelayedCameraRequest, refreshDelayedCameraLoading, waitForCameraEvents, measureCenteredIcons, normalizedPathname, scrollDashboard, titleLayoutIssues };
