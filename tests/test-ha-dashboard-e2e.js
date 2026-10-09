const fs = require("fs");
const path = require("path");
const { accessToken, setBrowserToken, api, assertCurrentFrontend, assertDisposableHaTarget, readConfig } = require("../ha-test/client");
const { prepare } = require("../ha-test/prepare");
const { concreteCases, manifest } = require("../ha-test/cases");
const { sliderReadings } = require("./value-slider-geometry");

const repoRoot = path.resolve(__dirname, "..");

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

async function slideGesture(page, track, points, { cancel = false } = {}) {
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
  await gesture([[1, 0]]);
  await assertCount(lock, "unlock", before, 1, "Completed access slide");
  const lockBefore = count(lock, "lock");
  await page.locator(".marao-popup-sheet marao-card").filter({
    has: page.locator(".title").filter({ hasText: exactText("Lock") }),
  }).locator("[data-card-action]").tap();
  await assertCount(lock, "lock", lockBefore, 1, "Explicit lock tap");
  await page.locator(".marao-popup-close").tap();
  await page.waitForFunction(() => !location.hash);

  const alarm = "alarm_control_panel.marao_dashboard_test_alarm";
  const hold = cardAction(page, "Arm away · hold");
  await hold.scrollIntoViewIfNeeded();
  const holdBox = await hold.boundingBox();
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
    await page.waitForTimeout(1250);
    await send("touchEnd");
    await assertCount(alarm, "alarm_arm_away", holdBefore, 1, "Completed security hold");
  } finally { await touch.detach(); }
}

async function checkCameraCases(page) {
  for (const example of manifest.eventCases) {
    await cardAction(page, example.name).tap();
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
    if (example.expectedStatus === "loading") {
      if (!await card.evaluate((element) => element._status === "loading"
        && Boolean(element.shadowRoot.querySelector('[role="status"]')?.textContent?.trim()))) {
        throw new Error("The delayed camera case did not show a readable loading state.");
      }
    }
    await page.waitForFunction(() => {
      const element = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet marao-camera-events-card");
      return element && !["idle", "loading"].includes(element._status);
    }, null, { timeout: 10000 });
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
        await page.waitForFunction(() => {
          const element = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet marao-camera-events-card");
          return element?._selected && element._selected.status !== "loading";
        });
        if (example.expectedDetailError) {
          const detail = await card.evaluate((element) => ({
            status: element._selected.status,
            error: element.shadowRoot.querySelector('[role="alert"]')?.textContent?.trim(),
          }));
          if (detail.status !== "error" || !detail.error) throw new Error(`${example.name}: event-detail failure was not reported clearly.`);
        } else {
          const media = card.locator(kind === "clip" ? ".detail video" : ".detail-image");
          await media.waitFor({ state: "visible" });
          await page.waitForFunction(({ kind }) => {
            const root = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet marao-camera-events-card")?.shadowRoot;
            const media = root?.querySelector(kind === "clip" ? ".detail video" : ".detail-image");
            return media && (kind === "clip" ? media.readyState >= 1 && !media.error : media.complete && media.naturalWidth > 0);
          }, { kind });
        }
        await card.locator('[data-action="back"]').tap();
      }
    }
    await page.locator(".marao-popup-close").tap();
    await page.waitForFunction(() => !location.hash);
  }
}

async function checkShowcaseActions(page, serviceCalls) {
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
  await page.evaluate(() => {
    window.__maraoActionErrors = [];
    window.addEventListener("hass-notification", (event) => window.__maraoActionErrors.push(event.detail.message));
  });
  await cardAction(page, failure.name).tap();
  await page.getByText(new RegExp(failure.expectedError)).first().waitFor({ state: "visible" });
  const notifications = await page.evaluate((expected) => window.__maraoActionErrors.filter((message) => message.includes(expected)).length, failure.expectedError);
  if (notifications !== 1) throw new Error(`One failed action produced ${notifications} error notifications.`);
}

async function checkHistoryCases(page) {
  const cards = page.locator("marao-card,marao-energy-period-card,marao-state-timeline-card");
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
  }, manifest.historyCases, { timeout: 10000 });
  const repeated = await page.evaluate((examples) => examples.flatMap(({ entity }) => {
    const requests = performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).searchParams.get("filter_entity_id") === entity);
    return requests.length > 3 ? [`${entity}: ${requests.length} history requests for three cards`] : [];
  }), manifest.historyCases);
  if (repeated.length) throw new Error(repeated.join("\n"));
}

async function checkOverviewPopups(page, config, screenshotRoot) {
  const lightIds = ["light.marao_dashboard_test_light", "light.marao_dashboard_test_room_light", "light.marao_dashboard_test_onoff_light"];
  await api(config, "POST", "/api/services/light/turn_off", { entity_id: lightIds });
  await page.waitForFunction((ids) => ids.every((id) => document.querySelector("home-assistant")?.hass.states[id]?.state === "off"), lightIds);
  const popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.map((card) => ({ hash: card._config.hash, name: card._config.name, modeSheet: card._config.cards?.some((child) => child.template === "hc_climate_card" && child.variables?.show_mode_buttons) })));
  for (const popup of popups) {
    const index = await page.locator("marao-card").evaluateAll((cards, hash) => cards.findIndex((card) => card._config.tap_action?.navigation_path === hash), popup.hash);
    if (index < 0) throw new Error(`${popup.name}: generated popup has no overview control.`);
    await page.locator("marao-card").nth(index).locator("[data-card-action]").tap();
    const sheet = page.locator(".marao-popup-sheet");
    await sheet.waitFor({ state: "visible" });
    await sheet.locator("marao-card").first().waitFor({ state: "visible" });
    if (!popup.modeSheet && await sheet.locator(".marao-popup-head > h2").textContent() !== popup.name) throw new Error(`${popup.name}: popup heading is missing.`);
    if (popup.hash === "#overview-blinds") {
      // Without HA's context providers this becomes a generic fallback symbol.
      await sheet.locator("ha-state-icon ha-icon ha-svg-icon").first().waitFor({ state: "visible" });
    }
    if (popup.hash === "#overview-lights") {
      const visibleIds = await sheet.locator("marao-card").evaluateAll((cards) => cards.filter((card) => card.getBoundingClientRect().height > 0).map((card) => card._config.entity));
      if (JSON.stringify(visibleIds) !== JSON.stringify(lightIds)) throw new Error("Inactive lights disappeared from the generated lighting popup.");
      if (screenshotRoot) {
        await sheet.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
        await page.screenshot({ path: path.join(screenshotRoot, "overview-lights-off.png"), scale: "css" });
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await sheet.waitFor({ state: "visible" });
      await sheet.locator("marao-card").first().waitFor({ state: "visible" });
      if (await sheet.locator(".marao-popup-head > h2").textContent() !== popup.name) throw new Error("Reloading the popup URL lost its heading.");
      await assertCurrentFrontend(page);
    }
    await sheet.locator(".marao-popup-close").tap();
    await page.waitForFunction(() => !location.hash);
  }
  await page.goto(`${config.url}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
  await page.goto(`${config.url}/marao-dashboard/overview#overview-lights`, { waitUntil: "domcontentloaded" });
  await page.locator(".marao-popup-sheet marao-card").first().waitFor({ state: "visible" });
  await page.locator(".marao-popup-close").tap();
  await page.waitForURL(`${config.url}/marao-dashboard/overview`);
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
    return card._config.template === "hc_camera_card" && (!state || ["unknown", "unavailable"].includes(state)) && card.shadowRoot.querySelector("img.camera");
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

async function checkDisconnected(browser, config) {
  const context = await browser.newContext(require("./mobile-devices").iphone);
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
  const entity = "switch.marao_dashboard_test_switch";
  const errors = [];
  const transportEvents = [];
  const serviceCalls = [];
  const subscriptions = [];
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
    transport = { socket, server };
    socket.onMessage((payload) => {
      const message = JSON.parse(String(payload));
      if (/subscribe|stream/.test(message.type)) subscriptions.push({ phase, type: message.type, id: message.id, subscription: message.subscription });
      const targets = message.target?.entity_id ?? message.service_data?.entity_id;
      if (message.type === "call_service" && (Array.isArray(targets) ? targets.includes(entity) : targets === entity)) serviceCalls.push(message.service);
      server.send(payload);
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
    const original = await page.evaluate((id) => document.querySelector("home-assistant").hass.states[id].state, entity);
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
      text: card.shadowRoot.querySelector(".state")?.textContent?.trim(),
    }));
    if (rendered.state !== authoritative.state || !rendered.text) throw new Error("Recovered card did not render authoritative state.");
    if (!transportEvents.length) throw new Error("The fault injection did not produce an observed transport disconnection.");
    await api(config, "POST", `/api/services/switch/turn_${original}`, { entity_id: entity });
    const rejections = await page.evaluate(() => window.__maraoUnhandledRejections);
    if (errors.length || rejections.length) throw new Error(`Disconnect scenario produced unexpected browser errors:\n${[...errors, ...rejections].join("\n")}\nSubscription lifecycle: ${JSON.stringify(subscriptions)}`);
    console.log("Live disconnect and authoritative recovery OK (disabled actions dispatched zero services).");
  } finally {
    await context.setOffline(false);
    await context.close();
  }
}

async function main() {
  const captureScreenshots = process.argv.includes("--screenshots");
  const screenshotRoot = path.join(__dirname, ".artifacts", "dashboard-e2e");
  if (captureScreenshots) fs.mkdirSync(screenshotRoot, { recursive: true });
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { throw new Error("Playwright is not installed."); }
  const config = readConfig();
  assertDisposableHaTarget(config);
  await prepare(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await accessToken(config, baseUrl);
  const browser = await chromium.launch();
  if (process.argv.includes("--disconnect-only")) {
    try { await checkDisconnected(browser, config); } finally { await browser.close(); }
    return;
  }
  const context = await browser.newContext(require("./mobile-devices").iphone);
  await context.addInitScript(setBrowserToken, {
    ...tokens, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + tokens.expires_in * 1000,
  });
  await context.addInitScript(() => {
    window.__maraoHaptics = [];
    window.addEventListener("haptic", (event) => window.__maraoHaptics.push(event.detail));
  });
  const page = await context.newPage();
  const serviceCalls = [];
  page.on("websocket", (socket) => socket.on("framesent", ({ payload }) => {
    let message;
    try { message = JSON.parse(String(payload)); } catch { return; }
    if (message.type !== "call_service") return;
    const entities = message.target?.entity_id ?? message.service_data?.entity_id ?? [];
    serviceCalls.push({ domain: message.domain, service: message.service, entities: Array.isArray(entities) ? entities : [entities] });
  }));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
  page.on("requestfailed", (request) => errors.push(`Failed ${request.resourceType()} request: ${new URL(request.url()).pathname} (${request.failure()?.errorText || "unknown error"})`));
  page.on("response", (response) => {
    if (response.status() >= 400 && ["document", "script", "stylesheet", "image", "font"].includes(response.request().resourceType())) {
      errors.push(`${response.status()} ${response.request().resourceType()} response: ${new URL(response.url()).pathname}`);
    }
  });
  const assertNoBrowserErrors = (label) => {
    if (!errors.length) return;
    const observed = errors.splice(0);
    throw new Error(`${label} produced browser warnings/errors:\n${observed.map((item) => `- ${item}`).join("\n")}`);
  };
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
      assertNoBrowserErrors("Popup and card content checks");
      console.log("Generated popups and gallery content checks passed.");
      return;
    }
    if (process.argv.includes("--actions-only")) {
      await page.goto(`${baseUrl}/marao-dashboard/card-test`, { waitUntil: "domcontentloaded" });
      await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
      await assertCurrentFrontend(page);
      await checkActionDispatches(page, serviceCalls);
      await checkShowcaseActions(page, serviceCalls);
      await checkCameraCases(page);
      assertNoBrowserErrors("Card interactions");
      console.log("Gallery action checks passed.");
      return;
    }
    await page.goto(`${baseUrl}/marao-dashboard/overview`, { waitUntil: "domcontentloaded" });
    await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    assertNoBrowserErrors("Overview");
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
      assertNoBrowserErrors(view.name);
      const result = await deepSnapshot();
      if (result.errors.length || result.warnings.length) throw new Error(`${view.name} rendered warnings/errors: ${JSON.stringify(result)}`);
      if (!result.nav) throw new Error(`${view.name} did not render custom:marao-navbar-card.`);
    }
    await page.goto(`${baseUrl}/marao-dashboard/energy`, { waitUntil: "domcontentloaded" });
    await page.locator("marao-navbar-card").first().waitFor({ state: "visible" });
    await assertCurrentFrontend(page);
    await scrollDashboard(page);
    assertNoBrowserErrors("Energy");
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
    await checkHistoryCases(page);
    await scrollDashboard(page);
    assertNoBrowserErrors("Card test dashboard");
    const cardTest = await deepSnapshot();
    if (cardTest.errors.length || cardTest.warnings.length) throw new Error(`Card test dashboard rendered warnings/errors: ${JSON.stringify(cardTest)}`);
    if (!cardTest.nav || cardTest.maraoCards < 10 || cardTest.popups < 1) throw new Error(`Card test dashboard rendered too few Marao cards: ${JSON.stringify(cardTest)}`);
    await checkStateCases(page, serviceCalls);
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
    assertNoBrowserErrors("Card interactions");
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
        await screenshotContext.close();
        if (screenshotErrors.length) {
          throw new Error(`${view.name} screenshot produced browser warnings/errors:\n${screenshotErrors.map((item) => `- ${item}`).join("\n")}`);
        }
      }
    }
    console.log(`Gallery interactions and page screenshots OK (${checks.length} generated views; ${cardTest.maraoCards} gallery cards).`);
    await checkDisconnected(browser, config);
    const popupCount = (serialized.match(/custom:marao-popup-card/g) || []).length;
    console.log(`Marao Dashboard e2e OK (${checks.length} generated view(s); ${cardTest.maraoCards} card-test cards; ${coloredCards} state-colored cards; ${popupCount} generated popup configuration(s))`);
    if (captureScreenshots) console.log(`Dashboard screenshots: ${screenshotRoot}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = { buildViewChecks, checkDisconnected, conditionalCardIsActive, dashboardNavigationViolations, measureCenteredIcons, normalizedPathname, scrollDashboard };
