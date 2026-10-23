const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { expandGallery, expandHelpers, validateCoverage } = require("../ha-test/cases.js");

const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = "custom_components/marao_dashboard/frontend";
const distFrontendRoot = "ha-test/.cache/dist/custom_components/marao_dashboard/frontend";

const rootsToValidate = [
  `${frontendRoot}/themes`,
  "ha-test",
  `${distFrontendRoot}/themes`,
];

function collectYamlFiles(root) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteRoot, entry.name);
    const relativePath = path.relative(repoRoot, absolutePath);

    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      files.push(...collectYamlFiles(relativePath));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

function normalizeHomeAssistantTags(source) {
  return source.replace(
    /!include(?:_dir_merge_named|_dir_merge_list|_dir_named|_dir_list)?\s+([^\n]+)/g,
    (_match, includePath) => JSON.stringify(includePath.trim())
  );
}

const pathsToValidate = rootsToValidate.flatMap(collectYamlFiles).sort();
let hasError = false;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

for (const relativePath of pathsToValidate) {
  const filePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(filePath, "utf8");

  if (source.trim() === "") {
    hasError = true;
    console.error(`Empty YAML file: ${relativePath}`);
    continue;
  }

  const doc = YAML.parseDocument(normalizeHomeAssistantTags(source), {
    prettyErrors: true,
    uniqueKeys: true,
  });

  if (doc.errors.length > 0) {
    hasError = true;
    console.error(`YAML errors in ${relativePath}`);
    for (const error of doc.errors) {
      console.error(error.message);
    }
  }
}

const helperPackagePath = "ha-test/marao_dashboard_card_test_helpers.yaml";
const testDashboardPath = "ha-test/marao_dashboard_test_dashboard.json";
const galleryPath = "ha-test/dashboard/views/00-card-test.yaml";
const helperPackageSource = fs.readFileSync(path.join(repoRoot, helperPackagePath), "utf8");
const helperPackage = expandHelpers(YAML.parse(helperPackageSource));
if (/platform:\s*template\b/.test(helperPackageSource)) {
  hasError = true;
  console.error(`${helperPackagePath} must use the modern top-level template integration.`);
}
for (const [platform, count] of Object.entries({
  light: 2,
  switch: 3,
  cover: 3,
  lock: 1,
  fan: 1,
  alarm_control_panel: 1,
  vacuum: 1,
})) {
  const entities = helperPackage.template?.flatMap((block) => block[platform] || []) || [];
  if (entities.length < count) {
    hasError = true;
    console.error(`${helperPackagePath} must define at least ${count} modern template ${platform} entities.`);
  }
}
const templateVacuums = helperPackage.template?.flatMap((block) => block.vacuum || []) || [];
if (!helperPackage.cover?.some(cover => cover.platform === 'marao_test_cover') ||
    !fs.existsSync(path.join(repoRoot, 'ha-test/custom_components/marao_test_cover/cover.py')) ||
    !fs.existsSync(path.join(repoRoot, 'ha-test/custom_components/marao_test_cover/manifest.json'))) {
  hasError = true;
  console.error('The gallery must define its native safe open-only cover fixture.');
}
if (templateVacuums.some((vacuum) => "battery_level" in vacuum || "battery_level_template" in vacuum)) {
  hasError = true;
  console.error(`${helperPackagePath} must not use deprecated template vacuum battery options.`);
}
if (
  !helperPackage.camera?.some((camera) => camera.platform === "marao_test_camera")
) {
  hasError = true;
  console.error(`${helperPackagePath} must define a safe local marao_test_camera entity.`);
}
for (const relativePath of [
  "ha-test/custom_components/marao_test_camera/manifest.json",
  "ha-test/custom_components/marao_test_camera/camera.py",
]) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    hasError = true;
    console.error(`Missing safe local camera helper: ${relativePath}`);
  }
}
if (
  !helperPackage.media_player?.some((player) => player.platform === "marao_test_media") ||
  !helperPackage.remote?.some((remote) => remote.platform === "marao_test_media")
) {
  hasError = true;
  console.error(`${helperPackagePath} must define a safe local media player and remote.`);
}
for (const relativePath of [
  "ha-test/custom_components/marao_test_media/manifest.json",
  "ha-test/custom_components/marao_test_media/media_player.py",
  "ha-test/custom_components/marao_test_media/remote.py",
]) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    hasError = true;
    console.error(`Missing safe local media helper: ${relativePath}`);
  }
}
for (const expected of [
  "marao_dashboard_test_wallbox_current:",
  "name: Marao Dashboard Test Month Energy",
  "name: Marao Dashboard Test Today Energy",
  "name: Marao Dashboard Test Month Cost",
  "name: Marao Dashboard Test Today Cost",
  "name: Marao Dashboard Test Open Only Door",
  "name: Marao Dashboard Test Unknown",
  "name: Marao Dashboard Test Unavailable",
  "name: Marao Dashboard Test Battery Low",
  "name: Marao Dashboard Test Locking",
]) {
  if (!helperPackageSource.includes(expected)) {
    hasError = true;
    console.error(`Card test fixture is missing the safe fake entity ${expected}.`);
  }
}

const templateSource = fs.readFileSync(
  path.join(repoRoot, frontendRoot, "MaraoCards.js"),
  "utf8",
);
const navigationSource = fs.readFileSync(path.join(repoRoot, frontendRoot, "MaraoNavigation.js"), "utf8");
for (const expected of ["class MaraoCard", "class MaraoNavbarCard", "class MaraoPopupCard", "customElements.define"]) {
  if (!`${templateSource}\n${navigationSource}`.includes(expected)) {
    hasError = true;
    console.error(`Marao frontend runtime is missing ${expected}.`);
  }
}
const themeSource = fs.readFileSync(
  path.join(repoRoot, frontendRoot, "themes/MaraoDashboard/marao-dashboard.yaml"),
  "utf8"
);
for (const expected of [
  "font-size-primary: 18px",
  "font-size-secondary: 16px",
  "font-size-state: 12px",
  "font-size-caption: 14px",
]) {
  if (!themeSource.includes(expected)) {
    hasError = true;
    console.error(`Marao Dashboard theme must preserve smartphone typography: ${expected}`);
  }
}
if (/font-size:\s*(?:10|11|12|13)px\b/.test(templateSource)) {
  hasError = true;
  console.error("Dashboard templates must use theme state/caption variables for text below 14px.");
}
const gallerySource = fs.readFileSync(path.join(repoRoot, galleryPath), "utf8");
const dashboardSource = gallerySource;
if (/!include|type:\s*custom:marao-navbar-card/.test(gallerySource)) {
  hasError = true;
  console.error("The generator must supply the Cases navbar through the ordinary custom-page interface.");
}
for (const expectedCard of [
  "hc_camera_card",
  "hc_light_card",
  "hc_cover_card",
  "hc_access_card",
  "hc_access_action_card",
  "hc_switch_card",
  "hc_climate_card",
  "hc_fan_card",
  "hc_media_card",
  "hc_media_app_card",
  "hc_sensor_card",
  "hc_number_card",
  "hc_wallbox_current_card",
  "hc_vacuum_card",
  "hc_battery_card",
  "hc_dishwasher_card",
  "hc_washing_machine_card",
  "hc_graph_card",
  "hc_toggle_graph_card",
  "marao-state-timeline-card",
  "hc_navigation_card",
  "marao-energy-period-card",
]) {
  if (!gallerySource.includes(expectedCard)) {
    hasError = true;
    console.error(`Card test gallery is missing ${expectedCard}.`);
  }
}
for (const expectedGalleryVariant of [
  "name: Light without slider",
  "name: Fan without slider",
  "name: Open-only door",
  "name: Climate",
  "name: Marao Dashboard Test Single Mode Climate",
  "name: Month Power",
  "name: Today Power",
  "name: Month Cost",
  "name: Today Cost",
  "title: State simulators",
  "shortcuts: [6, 12, 16]",
  "shortcuts: [16]",
  "shortcuts: [6, 16]",
  "name: Generic media player",
  "name: Fixed-height popup",
  "name: Unknown control",
  "name: Unavailable control",
  "name: Battery low",
  "name: Locking",
]) {
  if (!gallerySource.includes(expectedGalleryVariant)) {
    hasError = true;
    console.error(`Card test gallery is missing behavior variant: ${expectedGalleryVariant}.`);
  }
}
const literalCardColors = dashboardSource.match(
  /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|(?:^|[:=,(]\s*|return\s+)["']?(?:white|black|red|blue|green|orange|yellow|purple|gr[ae]y)(?=["';,\s)]|$)/gim
) || [];
if (literalCardColors.length > 0) {
  hasError = true;
  console.error(`Dashboard cards must use theme variables, not literal colors: ${[...new Set(literalCardColors)].join(", ")}`);
}
const frontendSource = ["MaraoDashboard.js", "MaraoRuntime.js"].map(file =>
  fs.readFileSync(path.join(repoRoot, frontendRoot, file), "utf8")).join("\n");
for (const expected of [
  "function installPopupScrollGuard()",
  "popupScrollGuardInstalled",
  "popupScrollGuardVersion",
  "Boolean(window.location.hash)",
  "path.slice(0, popupIndex + 1)",
  "window.addEventListener(\"touchmove\", guardScroll",
  "window.addEventListener(\"wheel\", guardScroll",
  "class MaraoSlideToOpen extends HTMLElement",
  "if (!this.shadowRoot) return",
  "track.setPointerCapture?.(point.pointerId)",
  "track.addEventListener(\"touchstart\"",
  "{ passive: false }",
  "static get observedAttributes()",
  "attributeChangedCallback(",
  "this._progress >= MARAO_SLIDE_COMPLETE_AT",
  "height: 64px",
  "path.some(isSlideToOpen)",
  "class MaraoStateTimelineCard extends HTMLElement",
  "connectedCallback()",
  "this.getRootNode()?.host?._hass",
  "history/period/${start.toISOString()}",
  "24 * 60 * 60 * 1000",
  "index * 4 * 60 * 60 * 1000",
  "touch-action: none",
  "plot.addEventListener(\"pointermove\"",
  "plot.addEventListener(\"touchmove\"",
  "var(--ha-card-background)",
  "var(--primary-color)",
]) {
  if (!frontendSource.includes(expected)) {
    hasError = true;
    console.error(`Marao Dashboard frontend must block background scrolling while popups are open: ${expected}`);
  }
}

const frontendConstants = fs.readFileSync(
  path.join(repoRoot, "custom_components/marao_dashboard/const.py"),
  "utf8"
);
if (!frontendConstants.match(/MARAO_DASHBOARD_MODULES\s*=\s*\(\s*MARAO_DASHBOARD_BOOTSTRAP,\s*\)/s)) {
  hasError = true;
  console.error("Only the registry-gated Marao dashboard entry module may be registered with Home Assistant.");
}
for (const expected of [
  'customElements?.get("home-assistant")',
  "await waitForHomeAssistantRegistry();",
  "registerMaraoCards();",
  'import(`./MaraoFrigateEventsCard.js${MARAO_RESOURCE_QUERY}`).then(module => module.registerMaraoCameraEventCards())',
]) {
  if (!frontendSource.includes(expected)) {
    hasError = true;
    console.error(`Marao dashboard bootstrap must wait for Home Assistant and retry card registration: ${expected}`);
  }
}
const registryReady = frontendSource.indexOf("await waitForHomeAssistantRegistry();");
const cardsImport = frontendSource.indexOf("const cardsModule = await import(");
const cardsRegistration = frontendSource.indexOf("registerMaraoCards();");
const eventsRegistration = frontendSource.indexOf("module.registerMaraoCameraEventCards()");
if (!(registryReady >= 0 && registryReady < cardsImport && cardsImport < cardsRegistration && cardsRegistration < eventsRegistration)) {
  hasError = true;
  console.error("Marao must wait for Home Assistant before loading cards, then retry optional event registration after its import resolves.");
}

if (fs.existsSync(path.join(repoRoot, "custom_components/marao_dashboard/strings.json"))) {
  hasError = true;
  console.error("custom_components/marao_dashboard must use translations/<language>.json, not strings.json.");
}

const backendTranslationsPath = "custom_components/marao_dashboard/translations/en.json";
if (!fs.existsSync(path.join(repoRoot, backendTranslationsPath))) {
  hasError = true;
  console.error("Missing custom_components/marao_dashboard/translations/en.json.");
} else {
  const translations = readJson(backendTranslationsPath);
  for (const expected of [
    "config.step.user.title",
    "config.step.user.description",
    "services.generate_dashboard.name",
    "services.generate_dashboard.description",
    "services.generate_dashboard.fields.config_path.name",
    "services.generate_dashboard.fields.dashboard_key.name",
    "services.generate_dashboard.fields.dry_run.name",
  ]) {
    const value = expected.split(".").reduce((current, key) => current?.[key], translations);
    if (!value) {
      hasError = true;
      console.error(`Missing English backend translation key: ${expected}`);
    }
  }
}

for (const relativePath of ["custom_components/marao_dashboard/translations/en.json", "custom_components/marao_dashboard/translations/pt.json"]) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    hasError = true;
    console.error(`Missing translation file: ${relativePath}`);
  }
}

const englishFrontendKeys = new Set(
  [...frontendSource.matchAll(/"([^"]+)":\s*"[^"]*"/g)]
    .map((match) => match[1])
    .filter((key) => key.includes("."))
);
const usedFrontendKeys = new Set(
  [...`${templateSource}\n${frontendSource}`.matchAll(/(?:MaraoDashboard\?\.localize\?\.|MaraoDashboard\.localize|localize)\(\s*["']([^"']+)["']/g)]
    .map((match) => match[1])
);
for (const match of templateSource.matchAll(/^\s+title_key:\s+([a-z0-9_.-]+)\s*$/gmi)) {
  usedFrontendKeys.add(match[1]);
}
usedFrontendKeys.add("common.active_count");
usedFrontendKeys.add("common.all_off");
for (const key of usedFrontendKeys) {
  if (!englishFrontendKeys.has(key)) {
    hasError = true;
    console.error(`Missing English frontend translation key: ${key}`);
  }
}

const usedThemeVars = [...new Set([...templateSource.matchAll(/var\(--([a-zA-Z0-9_-]+)/g)]
  .map((match) => match[1]))]
  .filter((name) => name.startsWith("font-size-"))
  .filter((name) => name !== "slide-progress")
  .sort();

for (const relativePath of collectYamlFiles(`${frontendRoot}/themes/MaraoDashboard`)) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  const definedThemeVars = new Set([...source.matchAll(/^\s+([a-zA-Z0-9_-]+):/gm)]
    .map((match) => match[1]));
  const missing = usedThemeVars.filter((name) => !definedThemeVars.has(name));
  if (missing.length > 0) {
    hasError = true;
    console.error(`Missing theme variables in ${relativePath}: ${missing.join(", ")}`);
  }
}

const integrationDirectories = fs.readdirSync(path.join(repoRoot, "custom_components"), {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory() && fs.existsSync(
  path.join(repoRoot, "custom_components", entry.name, "manifest.json"),
)).map((entry) => entry.name);
if (integrationDirectories.length !== 1 || integrationDirectories[0] !== "marao_dashboard") {
  hasError = true;
  console.error(`HACS repositories must contain one integration: ${integrationDirectories.join(", ")}`);
}

for (const relativeRoot of [`${frontendRoot}/vendor`, `${distFrontendRoot}/vendor`]) {
  if (fs.existsSync(path.join(repoRoot, relativeRoot))) {
    hasError = true;
    console.error(
      `Third-party dashboard bundles must not be packaged under ${relativeRoot}; install them independently with HACS.`
    );
  }
}
for (const match of templateSource.matchAll(/onclick="([^"]*)"/g)) {
  if (!match[1].includes("CustomEvent('haptic'") && !match[1].includes('CustomEvent("haptic"')) {
    hasError = true;
    console.error("Inline onclick handlers must dispatch heavy haptic feedback.");
  }
}

const cardTestPath = path.join(repoRoot, galleryPath);
const cardTest = expandGallery(YAML.parse(normalizeHomeAssistantTags(fs.readFileSync(cardTestPath, "utf8"))));
for (const error of validateCoverage(cardTest)) {
  hasError = true;
  console.error(error);
}
const visibleGallery = { cards: (cardTest.cards || []).filter(card => card.type !== "custom:marao-popup-card") };
if (!cardTest.cards?.some(card => card.type === "vertical-stack")) {
  hasError = true;
  console.error("Card test dashboard must include its stacked controls section.");
}

function findCardType(value, type) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => findCardType(entry, type));
  if (value.type === type) return true;
  return Object.values(value).some((entry) => findCardType(entry, type));
}

function findCardsByType(value, type) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => findCardsByType(entry, type));
  const current = value.type === type ? [value] : [];
  return current.concat(Object.values(value).flatMap((entry) => findCardsByType(entry, type)));
}

const testDashboard = readJson(testDashboardPath);
const expectedGuidedPages = ["security", "energy", "wallbox", "media"];
if (
  testDashboard.name !== "Marao Dashboard" ||
  testDashboard.slug !== "dashboard" ||
  testDashboard.config_version !== 2 || testDashboard.pages?.filter(page => page.subview).length < 3 ||
  !expectedGuidedPages.every((path) => testDashboard.pages?.some(page => page.path === path)) ||
  !testDashboard.pages?.some(page => page.path === "appliances")
) {
  hasError = true;
  console.error("The canonical test dashboard must contain realistic rooms, every guided page, and a custom page.");
}

const testViewPaths = new Set([
  "overview",
  "rooms",
  "security",
  "energy",
  "wallbox",
  "media",
  "card-test",
  ...(testDashboard.pages || []).map((page) => page.path),
]);
const popupHashes = new Set([cardTest, testDashboard].flatMap((source) => findCardsByType(source, "custom:marao-popup-card").map((card) => card.hash)));
const popupRoles = new Set(['hc_entity_group_card', 'hc_scene_collection_card', 'hc_energy_period_card', 'hc_graph_card', 'hc_climate_card', 'hc_media_card', 'hc_camera_card', 'hc_access_card']);
const collectGeneratedPopups = value => {
  if (Array.isArray(value)) return value.forEach(collectGeneratedPopups);
  if (!value || typeof value !== 'object') return;
  if (popupRoles.has(value.template) && (value.template !== 'hc_graph_card' || value.variables?.history_popup)) {
    for (const key of ['popup_hash', 'mode_selector_hash']) if (value.variables?.[key]) popupHashes.add(value.variables[key]);
  }
  Object.values(value).forEach(collectGeneratedPopups);
};
collectGeneratedPopups(testDashboard.pages);
const navigationTargets = [];
const collectNavigation = (value) => {
  if (Array.isArray(value)) return value.forEach(collectNavigation);
  if (!value || typeof value !== "object") return;
  for (const key of ["navigation_path", "room_navigation_path", "popup_hash"]) {
    if (typeof value[key] === "string") navigationTargets.push(value[key]);
  }
  if (value.type === "custom:marao-navbar-card") {
    for (const route of value.routes || []) if (typeof route?.url === "string") navigationTargets.push(route.url);
  }
  Object.values(value).forEach(collectNavigation);
};
collectNavigation(cardTest);
collectNavigation(testDashboard.pages);
for (const route of testDashboard.navigation || []) {
  if (route && typeof route === "object" && typeof route.url === "string") {
    navigationTargets.push(route.url);
  }
}
for (const target of navigationTargets) {
  if (target.startsWith("#")) {
    if (!popupHashes.has(target)) {
      hasError = true;
      console.error(`Gallery navigation targets a missing popup: ${target}`);
    }
    continue;
  }
  const match = target.match(/^\/marao-dashboard\/([^/?#]+)/);
  if (!match || !testViewPaths.has(match[1])) {
    hasError = true;
    console.error(`Test navigation must resolve inside /marao-dashboard: ${target}`);
  }
}
for (const route of testDashboard.navigation || []) {
  const page = typeof route === "string" ? route : null;
  if (page && !testViewPaths.has(page)) {
    hasError = true;
    console.error(`Canonical navbar targets a missing page: ${page}`);
  }
}

const editorSource = fs.readFileSync(
  path.join(repoRoot, "custom_components/marao_dashboard/editor.py"),
  "utf8"
);
const catalogTemplates = [...new Set(
  [...editorSource.matchAll(/"id":\s*"(hc_[a-z0-9_]+_card)"/g)].map((match) => match[1])
)];
const visibleMaraoCards = findCardsByType(visibleGallery, "custom:marao-card");
const visibleTemplates = visibleMaraoCards.map((card) => card.template).filter(Boolean);
const nativeCatalog = JSON.parse(fs.readFileSync(path.join(repoRoot, frontendRoot, "MaraoNativeCatalog.js"), "utf8")
  .replace(/^export const catalog = /, "").trim().replace(/;$/, ""));
for (const template of catalogTemplates) {
  let count = template === "hc_timeline_card"
    ? findCardsByType(visibleGallery, "custom:marao-state-timeline-card").length
    : ['hc_entity_group_card', 'hc_scene_collection_card', 'hc_energy_period_card', 'hc_media_app_card'].includes(template)
      ? (cardTest.entities || []).filter((entity) => entity.template === template).length
    : visibleTemplates.filter((candidate) => candidate === template).length;
  const nativeType = nativeCatalog.cards.find(card => card.id === template)?.type;
  if (nativeType) count += findCardsByType(visibleGallery, nativeType).length;
  if (count < 1) {
    hasError = true;
    console.error(`Card test dashboard must include at least one visible ${template} example; found ${count}.`);
  }
}

const allGalleryTemplates = new Set(
  findCardsByType(cardTest, "custom:marao-card").map((card) => card.template).filter(Boolean)
);
for (const template of [
  "hc_access_action_card",
  "hc_access_hold_action_card",
  "hc_access_slide_action_card",
  "hc_base_card",
  "hc_blinds_popup_card",
  "hc_climate_popup_card",
  "hc_glance_card",
  "hc_header_card",
  "hc_lights_popup_card",
  "hc_maintenance_popup_card",
  "hc_media_app_card",
  "hc_room_card",
  "hc_scene_card",
  "hc_security_card",
  "hc_title_card",
  "hc_weather_card",
]) {
  if (!allGalleryTemplates.has(template)) {
    hasError = true;
    console.error(`Card test dashboard is missing the supported ${template} template.`);
  }
}

for (const type of ["custom:marao-popup-card", "custom:marao-camera-events-card"]) {
  if (!findCardType(cardTest, type)) {
    hasError = true;
    console.error(`Card test dashboard is missing the supported ${type} component.`);
  }
}

const timelineCards = findCardsByType(visibleGallery, "custom:marao-state-timeline-card");
if (
  timelineCards.length < 1 ||
  timelineCards.some((card) => !card.entity)
) {
  hasError = true;
  console.error("Card test dashboard must mount a native Marao state timeline with an entity.");
}

for (const popup of findCardsByType(cardTest, "custom:marao-popup-card")) {
  if (!popup.hash || !popup.cards) {
    hasError = true;
    console.error(`${popup.hash || popup.title || "Marao popup"} must define a scrollable popup.`);
  }
}

const gridPopupCardExpectations = {
  "#marao-dashboard-card-test-popup": "hc_sensor_card",
  "#marao-dashboard-test-blinds-popup": "hc_cover_card",
  "#marao-dashboard-test-lights-popup": "hc_light_card",
  "#marao-dashboard-test-lock-popup": "hc_access_action_card",
  "#marao-dashboard-test-garage-door-popup": "hc_access_action_card",
  "#marao-dashboard-test-maintenance-popup": "hc_battery_card",
};
for (const [hash, expectedTemplate] of Object.entries(gridPopupCardExpectations)) {
  const popup = cardTest.cards.find((card) => card?.type === "custom:marao-popup-card" && card.hash === hash);
  const grid = popup?.cards?.[0];
  const columns = 1;
  if (
    grid?.type !== "grid" ||
    grid?.columns !== columns ||
    grid?.square !== false ||
    !findCardsByType(grid, "custom:marao-card").some((card) => card.template === expectedTemplate)
  ) {
    hasError = true;
    console.error(`${hash} must contain a ${columns}-column grid of ${expectedTemplate} cards.`);
  }
}

const garageDoorPopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === "#marao-dashboard-test-garage-door-popup"
);
if (!findCardsByType(garageDoorPopup?.cards?.[0], "custom:marao-card").some(
  (card) => card.template === "hc_access_slide_action_card"
)) {
  hasError = true;
  console.error("Garage door popup must contain the slide-to-open access card.");
}

for (const hash of ["#marao-dashboard-test-lock-popup"]) {
  const popup = cardTest.cards.find((card) => card?.type === "custom:marao-popup-card" && card.hash === hash);
  const actions = findCardsByType(popup?.cards?.[0], "custom:marao-card")
    .filter((card) => ["hc_access_action_card", "hc_access_slide_action_card"].includes(card.template));
  if (
    popup?.cards?.[0]?.columns !== 1 ||
    actions.length !== 2 ||
    actions[0]?.template !== "hc_access_slide_action_card" ||
    actions[0]?.variables?.action_requires_hold !== false ||
    actions[1]?.template !== "hc_access_action_card"
  ) {
    hasError = true;
    console.error(`${hash} must contain a full-width slide action followed by a normal access action card.`);
  }
}

const climatePopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === "#marao-dashboard-test-climate-popup"
);
const climatePopupCards = findCardsByType(climatePopup?.cards?.[0], "custom:marao-card")
  .filter((card) => card.template === "hc_climate_card");
if (
  climatePopupCards.length === 0 ||
  climatePopupCards.some((card) => card.variables?.show_mode_buttons !== true)
) {
  hasError = true;
  console.error("Climate popup cards must enable inline mode buttons.");
}

const climateModePopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === "#climate-mode-test"
);
const climateModeCard = climateModePopup?.cards?.[0];
if (
  climateModePopup?.title ||
  climateModeCard?.template !== "hc_climate_card" ||
  climateModeCard?.name !== "Climate" ||
  climateModeCard?.variables?.show_mode_buttons !== true
) {
  hasError = true;
  console.error("Climate mode popup must show the normal climate card without a duplicate popup title.");
}

const multiModeClimatePopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === "#multi-mode-climate-test"
);
const multiModeClimateCard = multiModeClimatePopup?.cards?.[0];
if (
  multiModeClimatePopup?.title ||
  multiModeClimatePopup?.entity !== "climate.marao_dashboard_test_multi_mode_climate" ||
  multiModeClimateCard?.template !== "hc_climate_card" ||
  multiModeClimateCard?.name !== "Multi Mode Climate" ||
  multiModeClimateCard?.variables?.show_mode_buttons !== true
) {
  hasError = true;
  console.error("Card test dashboard must include the functional multi-mode test climate popup.");
}

const singleModeClimateCard = visibleMaraoCards.find(
  (card) => card.entity === "climate.marao_dashboard_test_single_mode_climate"
);
if (
  singleModeClimateCard?.template !== "hc_climate_card" ||
  !singleModeClimateCard.variables?.mode_selector_hash ||
  cardTest.cards.some((card) => card?.hash === singleModeClimateCard.variables.mode_selector_hash)
) {
  hasError = true;
  console.error("Card test dashboard must include a single-mode climate card whose tap cannot open a popup.");
}

const cameraCard = visibleMaraoCards.find((card) => card.template === "hc_camera_card");
const cameraPopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === cameraCard?.variables?.popup_hash
);
if (
  cameraCard?.entity !== "camera.marao_dashboard_test_camera" ||
  !cameraPopup ||
  !findCardsByType(cameraPopup, "custom:marao-camera-events-card").some(
    (card) => card.entity === cameraCard.entity
  )
) {
  hasError = true;
  console.error("Card test dashboard must include the safe fake camera and its events popup.");
}

const appleTvCard = findCardsByType(visibleGallery, "custom:marao-card").find(
  (card) => card.template === "hc_media_card" && card.variables?.apple_tv === true
);
const appleTvPopup = cardTest.cards.find(
  (card) => card?.type === "custom:marao-popup-card" && card.hash === "#marao-dashboard-test-apple-tv-popup"
);
const appleTvAppGrid = appleTvPopup?.cards?.find(
  (card) => card?.type === "grid" && card.cards?.some((item) => item.template === "hc_media_app_card")
);
if (
  appleTvCard?.variables?.popup_hash !== "#marao-dashboard-test-apple-tv-popup" ||
  appleTvAppGrid?.columns !== 2 ||
  appleTvAppGrid.cards.some((card) => card.show_state !== false) ||
  !String(JSON.stringify(appleTvPopup)).includes('"command":"top_menu"') ||
  !String(JSON.stringify(appleTvPopup)).includes('"command":"select"')
) {
  hasError = true;
  console.error("Card test dashboard must include two-column Apple TV app shortcuts and a remote popup.");
}

const graphEntity = "sensor.marao_dashboard_test_graph_history";
const graphCards = findCardsByType(visibleGallery, "custom:marao-card").filter((card) =>
  ["hc_graph_card", "hc_toggle_graph_card"].includes(card.template) || card.variables?.show_graph === true
);
const hasGraphCard = (template, entity = graphEntity) => graphCards.some((card) =>
  card.template === template && (card.variables?.graph_entity || card.variables?.power_entity || card.entity) === entity
);
if (
  findCardsByType(cardTest, "history-graph").length ||
  graphCards.length < 3 ||
  !hasGraphCard("hc_graph_card") ||
  !hasGraphCard("hc_toggle_graph_card") ||
  !hasGraphCard("hc_switch_card")
) {
  hasError = true;
  console.error("Card test graph cards must use Marao's shared SVG graph with the simulated history sensor, without native history-graph cards.");
}

if (hasError) {
  process.exit(1);
}

console.log(`YAML OK: ${pathsToValidate.length} files`);
