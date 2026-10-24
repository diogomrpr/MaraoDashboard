const { capture: captureScreenshot } = require('./verification-browser');
const { chromium } = require("playwright");
const { accessToken, setBrowserToken, assertCurrentFrontend, assertDisposableHaTarget, readConfig } = require("../ha-test/client");
const { prepare } = require("../ha-test/prepare");
const { measureCenteredIcons, titleLayoutIssues } = require("./test-ha-dashboard-e2e");
const { applyVisualPreferences, layoutIssues, scenarios, parseArgs, selectedRuns, contextOptionsForScenario, configurePageEmulation, emulationIssues } = require("./test-ha-dashboard-accessibility");

const tolerance = 0.5;

async function checkControlContrast(page) {
  const readings = await page.locator('.room-lights-off:not(:disabled),marao-slide-to-open .track[aria-disabled="false"],marao-card ha-card[style*="--marao-card-background"]:not([aria-disabled="true"]) :is(.title,.state,.climate,.current-temperature)').evaluateAll((controls) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const luminance = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const ratio = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
      return (values[1] + 0.05) / (values[0] + 0.05);
    };
    return controls.flatMap((control) => {
      const label = control.querySelector(".label") || control;
      const foreground = getComputedStyle(label).color;
      const surfaces = control.matches(".title,.state,.climate,.current-temperature")
        ? [control.closest("ha-card")]
        : [control, control.querySelector(".fill")].filter(Boolean);
      return surfaces.map((surface) => ({
        label: label.textContent.trim(),
        surface: surface.className,
        foreground,
        background: getComputedStyle(surface).backgroundColor,
        ratio: ratio(foreground, getComputedStyle(surface).backgroundColor),
      }));
    });
  });
  if (!readings.length || readings.some((item) => item.ratio < 4.5)) {
    throw new Error(`Card or action label contrast is below 4.5:1: ${JSON.stringify(readings.filter((item) => item.ratio < 4.5))}`);
  }
  console.log(`Card and action labels: minimum contrast ${Math.min(...readings.map((item) => item.ratio)).toFixed(2)}:1.`);
}

async function checkTextScaling(page) {
  const normal = scenarios.find((scenario) => scenario.name === "iphone-normal");
  const enlarged = scenarios.find((scenario) => scenario.name === "iphone-bold-text-200");
  const measure = () => page.locator(".scene-options > [data-scene-select],.wallbox-stepper .number-value,marao-energy-period-card .value,marao-energy-period-card .empty,.body.title-card .title,.current-temperature,.graph-card .state").evaluateAll((elements) =>
    elements.map((element) => ({ label: element.textContent.trim(), size: parseFloat(getComputedStyle(element).fontSize) })));
  await page.setViewportSize({ width: 390, height: 844 });
  await applyVisualPreferences(page, normal, "light");
  const before = await measure();
  await applyVisualPreferences(page, enlarged, "light");
  const after = await measure();
  if (!before.length || before.length !== after.length || after.some((item, index) => item.size < before[index].size * 1.99)) {
    throw new Error("Essential card readings and action labels must scale with 200% text.");
  }
  const issues = await layoutIssues(page);
  if (issues.length) throw new Error(`Enlarged card text: ${issues.join(", ")}`);
}

async function checkRoomComposition(page) {
  const rooms = await page.locator('marao-card').evaluateAll(cards => cards.filter(card => card._config?.template === 'md_room_card').map(card => {
    const root = card.shadowRoot, body = root.querySelector('.body'), title = root.querySelector('.title');
    const action = root.querySelector('[data-room-lights-off]'), decoration = root.querySelector('.room-artwork');
    const box = root.querySelector('ha-card').getBoundingClientRect(), b = body.getBoundingClientRect(), style = getComputedStyle(body);
    const target = action?.getBoundingClientRect(), glyph = action?.querySelector('ha-icon').getBoundingClientRect();
    const art = decoration?.getBoundingClientRect(), t = title?.getBoundingClientRect();
    const paths = node => [...(node?.querySelectorAll('path') || []), ...[...(node?.querySelectorAll('*') || [])].flatMap(element => element.shadowRoot ? paths(element.shadowRoot) : [])];
    const range = document.createRange(); if (title) range.selectNodeContents(title);
    const textBounds = title ? [...range.getClientRects()] : [];
    const artworkOverlapsText = paths(decoration).some(path => {
      const glyph = path.getBoundingClientRect();
      return textBounds.some(text => Math.min(glyph.right, art.right, text.right) - Math.max(glyph.left, art.left, text.left) > .5
        && Math.min(glyph.bottom, art.bottom, text.bottom) - Math.max(glyph.top, art.top, text.top) > .5);
    });
    const label = String(card._config.variables?.custom_label || '').trim();
    const lighting = card._config.variables?.light_entities || [];
    const state = root.querySelector('.state:not(.placeholder)');
    return { name: card._config.name, titleFits: !t || Math.abs(t.width - (b.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))) <= .5,
      normalState: !root.querySelector('.binary-cue') && (!state || Boolean(label) && !/[:：]$/.test(label) && state.textContent === label),
      semanticLighting: !lighting.length || Boolean((root.querySelector('[data-card-action]') || root.querySelector('ha-card')).getAttribute('aria-description')),
      actionFits: !target || target.width >= 48 && target.height >= 48 && target.left >= box.left && target.right <= box.right && target.top >= box.top && target.bottom <= box.bottom,
      glyphCentered: !glyph || Math.abs(glyph.left + glyph.width / 2 - target.left - target.width / 2) <= .5 && Math.abs(glyph.top + glyph.height / 2 - target.top - target.height / 2) <= .5,
      circle: !action || getComputedStyle(action).borderRadius === '50%',
      artwork: !art || decoration.getAttribute('aria-hidden') === 'true' && getComputedStyle(decoration).pointerEvents === 'none' && !artworkOverlapsText && !root.querySelector('.icon') && decoration.scrollWidth > decoration.clientWidth,
    };
  }));
  const failures = rooms.filter(room => !room.titleFits || !room.normalState || !room.semanticLighting || !room.actionFits || !room.glyphCentered || !room.circle || !room.artwork);
  if (!rooms.length || failures.length) throw new Error(`Room composition: ${JSON.stringify(failures)}`);
}

async function checkMediaShortcutIcons(page) {
  const icons = await page.locator(".marao-popup-sheet .body.media-app-card").evaluateAll((cards) => cards.map((card) => {
    const icon = (card.querySelector(".app-icon,.icon")).getBoundingClientRect();
    const body = card.getBoundingClientRect();
    return { name: card.querySelector(".title")?.textContent, width: icon.width, height: icon.height, offset: icon.left + icon.width / 2 - body.left - body.width / 2 };
  }));
  if (!icons.length || icons.some((icon) => Math.abs(icon.width - icon.height) > tolerance || Math.abs(icon.offset) > tolerance)) {
    throw new Error(`Media shortcut icons must be square and centered: ${JSON.stringify(icons)}`);
  }
}

async function checkNavbar(page) {
  await page.locator("marao-navbar-card:not([data-marao-navbar-placeholder]) .nav").first().waitFor({ state: "attached" });
  const issues = await page.locator("marao-navbar-card:not([data-marao-navbar-placeholder]) .nav").evaluateAll((navbars) => navbars.flatMap((navbar) => {
    const failures = [];
    const box = navbar.getBoundingClientRect();
    const links = [...navbar.querySelectorAll("a,button")].map((link) => link.getBoundingClientRect());
    for (const [index, rect] of links.entries()) {
      if (rect.width < 48 || rect.height < 48) failures.push(`link ${index} below 48px`);
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) failures.push(`link ${index} outside bar`);
      if (links.slice(index + 1).some((other) => rect.left < other.right - 1 && rect.right > other.left + 1 && rect.top < other.bottom - 1 && rect.bottom > other.top + 1)) failures.push(`link ${index} overlaps`);
    }
    return failures;
  }));
  if (issues.length) throw new Error(`Navbar: ${issues.join(", ")}`);
}

async function sliderHeaderChecks(page, output, scenario, theme) {
  const assert = require('node:assert/strict'), path = require('node:path');
  const families = ['md_light_card', 'md_fan_card', 'md_cover_card', 'md_access_slide_action_card'];
  const rendered = await page.locator('marao-card').evaluateAll(cards => cards.map(card => card._config?.template));
  for (const family of families) assert.ok(rendered.includes(family), 'Missing gallery family: ' + family);
  assert.deepEqual(await layoutIssues(page, families), [], 'Gallery header subjects');
          const card = page.locator('marao-card').filter({ has: page.locator('input[data-slider-key^="md_light_card:"]') }).first();
          await card.evaluate(element => element.shadowRoot.querySelector('.body').classList.remove('slider-header'));
          assert.ok((await titleLayoutIssues(page, ['md_light_card'])).length, 'A missing header layout must fail geometry');
          await card.evaluate(element => element.shadowRoot.querySelector('.body').classList.add('slider-header'));
          assert.deepEqual(await titleLayoutIssues(page, families), []);
          const width = await card.evaluate(element => { const width = element.style.width; element.style.width = '120px'; return width; });
          assert.deepEqual(await titleLayoutIssues(page, families), [], 'Narrow 120px card container');
          await card.evaluate((element, width) => { element.style.width = width; }, width);
          if (scenario.name === 'iphone-normal') assert.deepEqual(await titleLayoutIssues(page, ['md_navigation_card', 'md_room_card', 'md_switch_card', 'md_climate_card', 'md_media_card', 'md_number_card']), []);
          await page.evaluate(() => { location.hash = '#marao-dashboard-test-value-sliders-popup'; });
          await page.locator('.marao-popup-sheet input[data-slider-key]').first().waitFor({ state: 'visible' });
          await page.locator('.marao-popup-sheet').evaluate(async sheet => { await Promise.all(sheet.getAnimations().map(animation => animation.finished)); });
          await require('./test-ha-dashboard-accessibility').readySubtree(page, page.locator('.marao-popup-sheet'), scenario, theme);
          assert.deepEqual(await layoutIssues(page, families), [], 'Value-slider popup');
          await page.locator('.marao-popup-close').tap();
          await page.locator('.marao-popup-sheet').waitFor({ state: 'detached' });
          if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) {
            await card.scrollIntoViewIfNeeded();
            await captureScreenshot(card, { path: path.join(output, scenario.name + '-' + theme + '.png'), scale: 'device' });
          }
}

async function checkSliderHeaders() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const families = ['md_light_card', 'md_fan_card', 'md_cover_card', 'md_access_slide_action_card'];
  const config = readConfig(); assertDisposableHaTarget(config);
  await prepare(config);
  const tokens = await accessToken(config, config.url);
  const output = require('./verification-browser').artifactDirectory('slider-headers');
  for (const { scenario, theme } of selectedRuns(parseArgs())) {
    const browser = await chromium.launch();
    let page;
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { ...tokens, hassUrl: config.url, clientId: config.url + '/', expires: Date.now() + tokens.expires_in * 1000 });
      page = await context.newPage();
      await require("./camera-request-ledger").managedCameraLedger(context, page, { output, scenario: scenario.name, theme });
      await configurePageEmulation(context, page, scenario);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (require('./camera-request-ledger').isManualCameraConsoleMessage(message)) return; if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
      page.on('response', response => { if (require('./camera-request-ledger').isManualCameraTransport(response.url())) return; if (response.status() >= 400) errors.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
      const routes = ['card-test', ...(scenario.name === 'iphone-normal' ? ['living-room', 'native-example'] : [])];
      const checked = [];
      for (const route of routes) {
        await page.goto(config.url + '/marao-dashboard/' + route, { waitUntil: 'domcontentloaded' });
        await page.locator('marao-card .body').first().waitFor({ state: 'attached' });
        if (route === 'native-example') await page.locator('marao-native-light-card marao-card .body').first().waitFor({ state: 'attached' });
        await assertCurrentFrontend(page);
        await applyVisualPreferences(page, scenario, theme);
        assert.deepEqual(await emulationIssues(page, scenario, theme), []);
        const rendered = await page.locator('marao-card').evaluateAll(cards => cards.map(card => card._config?.template));
        for (const family of route === 'card-test' ? families : ['md_light_card']) assert.ok(rendered.includes(family), route + ': missing ' + family);
        assert.deepEqual(await layoutIssues(page, families), [], route);
        if (route === 'card-test') {
          await sliderHeaderChecks(page, output, scenario, theme);
        }
        if (route === 'native-example') {
          await page.locator('marao-native-light-card').first().evaluate(element => { element.preview = true; });
          assert.deepEqual(await layoutIssues(page, families), [], 'Read-only native preview');
        }
        if (route !== 'card-test') {
          const card = page.locator('marao-card').filter({ has: page.locator('input[data-slider-key^="md_light_card:"]') }).first();
          await card.scrollIntoViewIfNeeded();
          await captureScreenshot(card, { path: path.join(output, route + '-' + theme + '.png'), scale: 'device' });
        }
        await page.evaluate(() => document.fonts.ready);
        checked.push(route);
      }
      assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(output, scenario.name + '-' + theme + '.json'), JSON.stringify({ profile: scenario.name, theme, checked, passed: true }), { mode: 0o600 });
      console.log(`${scenario.name}/${theme}: slider headers, optional variants and popup geometry passed (${checked.join(', ')}).`);
    } catch (error) {
      if (page) await captureScreenshot(page, { path: path.join(output, scenario.name + '-' + theme + '-failure.png'), scale: 'device' });
      throw error;
    } finally { await browser.close(); }
  }
}

async function main() {
  if (process.argv.includes('--frontend-refresh')) return require('./test-frontend-refresh-local').run();
  if (process.argv.includes('--control-grid')) {
    const result = require('node:child_process').spawnSync(process.execPath, ['tests/test-ha-ui-batch.js', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
    if (result.status !== 0) throw new Error('Control grid alignment failed');
    return;
  }
  if (process.argv.includes('--access-label')) {
    const result = require('node:child_process').spawnSync(process.execPath, ['tests/test-ha-ui-batch.js', '--access', ...process.argv.slice(2).filter(arg => arg !== '--access-label')], { stdio: 'inherit', env: process.env });
    if (result.status !== 0) throw new Error('Access label alignment failed');
    return;
  }
  if (process.argv.includes('--editor-rendering')) {
    const result = require('node:child_process').spawnSync(process.execPath, ['tests/test-ha-editor.js', '--rendering-geometry', '--drag-geometry', '--scenario=narrow-320'], { stdio: 'inherit', env: process.env });
    if (result.status !== 0) throw new Error('Editor rendering alignment failed');
    return;
  }
  if (process.argv.includes('--slider-headers')) return checkSliderHeaders();
  if (process.argv.includes('--navbar')) {
    const result = require('node:child_process').spawnSync(process.execPath, [require('node:path').join(__dirname, 'test-ha-navbar-overflow.js'), '--scenario', 'narrow-320', '--alignment'], {stdio:'inherit',env:process.env});
    if (result.status !== 0) throw new Error('Navbar overflow alignment failed');
    return;
  }
  if (process.argv.includes('--editor-drag')) {
    const result = require('node:child_process').spawnSync(process.execPath, [require('node:path').join(__dirname, 'test-ha-editor.js'), '--drag-geometry', '--scenario=iphone-normal'], { stdio: 'inherit', env: process.env });
    if (result.status !== 0) throw new Error('Editor movement alignment failed');
    return;
  }
  if (process.argv.includes('--json-editor')) {
    const result = require('node:child_process').spawnSync(process.execPath,
      ['tests/test-ha-editor.js', '--json-geometry', '--scenario=iphone-normal'], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('JSON editor control alignment failed');
    return;
  }
  const config = readConfig();
  assertDisposableHaTarget(config);
  await prepare(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await accessToken(config, baseUrl);
  const browser = await chromium.launch();
  const errors = [];

  try {
    const context = await browser.newContext(require("./mobile-devices").iphone);
    await context.addInitScript(setBrowserToken, {
      ...tokens,
      hassUrl: baseUrl,
      clientId: `${baseUrl}/`,
      expires: Date.now() + tokens.expires_in * 1000,
    });
    const page = await context.newPage();
    await require("./camera-request-ledger").managedCameraLedger(context, page, { output: require("./verification-browser").artifactDirectory("alignment"), scenario: "iphone-normal", theme: "light" });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (require('./camera-request-ledger').isManualCameraConsoleMessage(message)) return;
      if (["error", "warning"].includes(message.type())) errors.push(message.text());
    });
    page.on("response", (response) => { if (require('./camera-request-ledger').isManualCameraTransport(response.url())) return;
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
    });

    await page.goto(
      `${baseUrl}/marao-dashboard/card-test?marao_alignment=${Date.now()}`,
      { waitUntil: "domcontentloaded" },
    );
    const appleTvCard = page.locator("marao-card").filter({
      has: page.locator(".title").filter({ hasText: /^\s*Apple TV\s*$/ }),
    }).first();
    await appleTvCard.locator("[data-card-action]").tap();
    const controls = page.locator(".marao-popup-sheet .body.icon-only");
    await controls.first().waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(350);

    await assertCurrentFrontend(page);
    await checkNavbar(page);
    await checkMediaShortcutIcons(page);

    const readings = await measureCenteredIcons(controls);
    if (readings.length !== 12) throw new Error(`Expected 12 Apple TV controls, found ${readings.length}.`);
    for (const item of readings) {
      const failed = item.missingElement
        || Math.abs(item.horizontalOffset) > tolerance
        || Math.abs(item.verticalOffset) > tolerance;
      console.log(
        `${item.label}: dx=${item.horizontalOffset?.toFixed(2) ?? "?"}px, dy=${item.verticalOffset?.toFixed(2) ?? "?"}px, `
        + `card=${item.cardWidth ?? "?"}x${item.cardHeight ?? "?"}, icon=${item.iconWidth ?? "?"}x${item.iconHeight ?? "?"} — ${failed ? "FAIL" : "PASS"}`,
      );
    }

    const failures = readings.filter((item) => item.missingElement
      || Math.abs(item.horizontalOffset) > tolerance
      || Math.abs(item.verticalOffset) > tolerance);
    if (failures.length) throw new Error(`Misaligned controls: ${JSON.stringify(failures)}`);

    await page.locator(".marao-popup-close").tap();
    await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
    await page.setViewportSize({ width: 195, height: 422 });
    const narrowNames = ["Battery low", "Battery medium", "Battery full", "Unknown control", "Unavailable control"];
    for (const name of narrowNames) {
      const card = page.locator("marao-card").filter({ has: page.locator(".title", { hasText: new RegExp(`^${name}$`) }) }).first();
      await card.scrollIntoViewIfNeeded();
      const issues = await card.evaluate((element) => {
        const root = element.shadowRoot;
        const failures = [];
        for (const child of root.querySelectorAll("ha-card,.body,.title,.state")) {
          const style = getComputedStyle(child);
          if (style.visibility === 'hidden') continue;
          const ellipsis = child.matches('.state') && style.textOverflow === 'ellipsis' && style.overflow === 'hidden';
          if (!ellipsis && child.scrollWidth > child.clientWidth + 1 || child.scrollHeight > child.clientHeight + 1) failures.push(`${child.className || child.localName} overflows`);
        }
        const icon = root.querySelector(".icon")?.getBoundingClientRect();
        for (const label of root.querySelectorAll(".title,.state")) {
          if (getComputedStyle(label).visibility === 'hidden') continue;
          const rect = label.getBoundingClientRect();
          if (icon && rect.left < icon.right - 1 && rect.right > icon.left + 1 && rect.top < icon.bottom - 1 && rect.bottom > icon.top + 1) failures.push("text overlaps icon");
        }
        for (const control of root.querySelectorAll("button,input")) {
          const rect = control.getBoundingClientRect();
          if (rect.width < 48 || rect.height < 48) failures.push(`target ${rect.width}x${rect.height} is below 48x48`);
        }
        return failures;
      });
      if (issues.length) throw new Error(`${name} at 195px: ${issues.join(", ")}`);
    }
    for (const width of [195, 180]) {
      await page.setViewportSize({ width, height: 422 });
      await checkNavbar(page);
      const galleryIssues = await layoutIssues(page);
      if (galleryIssues.length) throw new Error(`Gallery at ${width}px: ${galleryIssues.join(", ")}`);
      await appleTvCard.locator("[data-card-action]").tap();
      await controls.first().waitFor({ state: "visible" });
      await page.waitForTimeout(350);
      await checkMediaShortcutIcons(page);
      const zoomReadings = await measureCenteredIcons(controls);
      const issues = zoomReadings.filter((item) => item.missingElement
        || item.cardWidth < 48 || item.cardHeight < 48
        || Math.abs(item.iconWidth - item.iconHeight) > tolerance
        || Math.abs(item.horizontalOffset) > tolerance || Math.abs(item.verticalOffset) > tolerance);
      if (zoomReadings.length !== 12 || issues.length) throw new Error(`Apple TV at ${width}px: ${JSON.stringify(issues)}`);
      const clipped = await controls.evaluateAll((bodies) => bodies.some((body) => {
        const card = body.closest("ha-card");
        const action = body.getRootNode().querySelector("[data-card-action]").getBoundingClientRect();
        const box = card.getBoundingClientRect();
        return card.scrollWidth > card.clientWidth + 1 || card.scrollHeight > card.clientHeight + 1
          || action.width < 48 || action.height < 48 || action.left < box.left - 1 || action.right > box.right + 1;
      }));
      if (clipped) throw new Error(`Apple TV controls clipped at ${width}px.`);
      await page.locator(".marao-popup-close").tap();
      await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
      await page.locator("marao-card").filter({ has: page.locator(".title").filter({ hasText: /^Generic media player$/ }) }).first().locator("[data-card-action]").tap();
      const genericControls = page.locator(".marao-popup-sheet .body.icon-only");
      await genericControls.first().waitFor({ state: "visible" });
      const genericReadings = await measureCenteredIcons(genericControls);
      if (genericReadings.length !== 3 || genericReadings.some((item) => item.missingElement || item.cardWidth < 48 || item.cardHeight < 48 || Math.abs(item.horizontalOffset) > tolerance || Math.abs(item.verticalOffset) > tolerance)) throw new Error(`Generic media controls at ${width}px are too small or misaligned.`);
      await page.locator(".marao-popup-close").tap();
      await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
      const energy = page.locator("marao-energy-period-card").filter({ has: page.locator('button.surface[aria-label="Month Power"]') }).first();
      await energy.locator("button.surface").tap({ position: { x: 12, y: 12 } });
      await page.locator(".marao-popup-sheet marao-energy-period-card .period-nav").waitFor({ state: "visible" });
      await page.locator(".marao-popup-sheet").evaluate(async (sheet) => Promise.all(sheet.getAnimations().map((animation) => animation.finished)));
      const energyIssues = await layoutIssues(page);
      if (energyIssues.length) throw new Error(`Energy popup at ${width}px: ${energyIssues.join(", ")}`);
      await page.locator(".marao-popup-close").tap();
      await page.locator(".marao-popup-sheet").waitFor({ state: "detached" });
    }
    const normal = scenarios.find((scenario) => scenario.name === "iphone-normal");
    for (const theme of ["light", "dark"]) {
      await applyVisualPreferences(page, normal, theme);
      await checkControlContrast(page);
      await checkRoomComposition(page);
    }
    await checkTextScaling(page);
    if (errors.length) throw new Error(`Browser warnings/errors:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    console.log(`Marao card alignment OK (${readings.length} controls; tolerance ${tolerance}px; ${narrowNames.length} narrow cards; 195px/180px popups).`);
  } catch (error) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) await captureScreenshot(page, { path: require('node:path').join(require('./verification-browser').artifactDirectory('alignment'), 'failure.png'), scale: 'css' });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
module.exports = { checkRoomComposition, sliderHeaderChecks };
