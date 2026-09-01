const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = "custom_components/marao_dashboard/frontend";
const distFrontendRoot = "dist/custom_components/marao_dashboard/frontend";

const rootsToValidate = [
  `${frontendRoot}/dashboard`,
  `${frontendRoot}/themes`,
  "ha-test",
  `${distFrontendRoot}/dashboard`,
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

    if (entry.isDirectory()) {
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
const helperPackageSource = fs.readFileSync(path.join(repoRoot, helperPackagePath), "utf8");
const helperPackage = YAML.parse(helperPackageSource);
if (/platform:\s*template\b/.test(helperPackageSource)) {
  hasError = true;
  console.error(`${helperPackagePath} must use the modern top-level template integration.`);
}
for (const [platform, count] of Object.entries({
  light: 1,
  switch: 3,
  cover: 2,
  lock: 1,
  fan: 1,
  alarm_control_panel: 1,
  vacuum: 1,
})) {
  const entities = helperPackage.template?.flatMap((block) => block[platform] || []) || [];
  if (entities.length !== count) {
    hasError = true;
    console.error(`${helperPackagePath} must define ${count} modern template ${platform} entities.`);
  }
}
const templateVacuums = helperPackage.template?.flatMap((block) => block.vacuum || []) || [];
if (templateVacuums.some((vacuum) => "battery_level" in vacuum || "battery_level_template" in vacuum)) {
  hasError = true;
  console.error(`${helperPackagePath} must not use deprecated template vacuum battery options.`);
}

const templatePaths = collectYamlFiles(`${frontendRoot}/dashboard/MaraoDashboard/templates`);
const templateSource = templatePaths
  .map((relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8"))
  .join("\n");
for (const expected of [
  "hc_single_title_card:",
  "#container.no-label.no-state:has(> #name):not(:has(> :not(#img-cell):not(#name))) #name",
  "grid-row: 1 / -1 !important",
  "align-self: center !important",
]) {
  if (!templateSource.includes(expected)) {
    hasError = true;
    console.error(`Single-title cards must center their title generically: ${expected}`);
  }
}
const templateDefinitions = Object.assign({}, ...templatePaths.map((relativePath) =>
  YAML.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"))
));
const inheritsSingleTitle = (name, seen = new Set()) => name === "hc_single_title_card" || (
  !seen.has(name) &&
  (seen.add(name), [templateDefinitions[name]?.template].flat().filter(Boolean)
    .some((parent) => inheritsSingleTitle(parent, seen)))
);
const uncenteredTemplates = Object.keys(templateDefinitions).filter((name) => !inheritsSingleTitle(name));
if (uncenteredTemplates.length > 0) {
  hasError = true;
  console.error(`Button-card templates must inherit hc_single_title_card: ${uncenteredTemplates.join(", ")}`);
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
const dashboardSource = collectYamlFiles(`${frontendRoot}/dashboard/MaraoDashboard`)
  .map((relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8"))
  .join("\n");
const literalCardColors = dashboardSource.match(
  /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|(?:^|[:=,(]\s*|return\s+)["']?(?:white|black|red|blue|green|orange|yellow|purple|gr[ae]y)(?=["';,\s)]|$)/gim
) || [];
if (literalCardColors.length > 0) {
  hasError = true;
  console.error(`Dashboard cards must use theme variables, not literal colors: ${[...new Set(literalCardColors)].join(", ")}`);
}
const frontendSource = fs.readFileSync(path.join(repoRoot, frontendRoot, "MaraoDashboard.js"), "utf8");
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
  "setPointerCapture(point.pointerId)",
  "track.addEventListener(\"touchstart\"",
  "{ passive: false }",
  "static get observedAttributes()",
  "attributeChangedCallback(",
  "this._progress >= 0.92",
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
for (const expected of ["MARAO_DASHBOARD_FRONTEND_VERSION", "MaraoDashboard.js?v={MARAO_DASHBOARD_FRONTEND_VERSION}"]) {
  if (!frontendConstants.includes(expected)) {
    hasError = true;
    console.error(`Marao Dashboard frontend resource must be cache-busted: ${expected}`);
  }
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

if (/^\s{4}mode_selector:/m.test(templateSource)) {
  hasError = true;
  console.error("Climate card must not include the old mode_selector dropdown field.");
}
const climateTemplate = fs.readFileSync(
  path.join(repoRoot, frontendRoot, "dashboard/MaraoDashboard/templates/internal_templates/hc_climate_card.yaml"),
  "utf8"
);
for (const expected of [
  "return variables.mode_selector_hash && modes.length > 1 ? 'navigate' : 'call-service'",
  "service: climate.toggle",
  "heat: 'var(--color-red)'",
  "cool: 'var(--color-blue)'",
  "cold: 'var(--color-blue)'",
  "heat_cool: 'var(--color-purple)'",
  "auto: 'var(--color-gold)'",
  "dry: 'var(--color-yellow)'",
  "fan_only: 'var(--color-green)'",
  "? 'var(--active-text-color)'",
  "- overflow: hidden",
  "variables.graph_entity || entity.entity_id",
]) {
  if (!climateTemplate.includes(expected)) {
    hasError = true;
    console.error(`Climate card is missing expected toggle/color behavior: ${expected}`);
  }
}

const accessTemplate = fs.readFileSync(
  path.join(repoRoot, frontendRoot, "dashboard/MaraoDashboard/templates/internal_templates/hc_access_card.yaml"),
  "utf8"
);
for (const expected of [
  "hc_access_card:",
  "hc_access_action_card:",
  "hc_access_slide_action_card:",
  "hc_access_hold_action_card:",
  "tap_action:",
  "action: call-service",
  "press_action:",
  "release_action:",
  "window.setTimeout",
  "}, 1000);",
  "background-size: 0% 100%, auto",
  "ha-card:active",
  "transition: background-size 1s linear",
  "<marao-slide-to-open entity=",
  'state="${entity.state}"',
  "['open', 'opening', 'unlocking', 'unavailable']",
]) {
  if (!accessTemplate.includes(expected)) {
    hasError = true;
    console.error(`Access cards are missing expected safe action behavior: ${expected}`);
  }
}
const roomCardTemplate = fs.readFileSync(
  path.join(repoRoot, frontendRoot, "dashboard/MaraoDashboard/templates/internal_templates/hc_navigation_card.yaml"),
  "utf8"
);
const roomCardDefinition = roomCardTemplate.slice(roomCardTemplate.indexOf("hc_room_card:"));
for (const expected of [
  "room_navigation_path: /marao-dashboard/rooms",
  "navigation_path: \"[[[ return variables.room_navigation_path ]]]\"",
  "grid-row: 1 !important",
  "position: absolute",
  "top: 16px",
  "top: 42px",
  "justify-content: flex-start",
  "service: light.turn_off",
  "hold_action:\n          action: none",
  "double_tap_action:\n          action: none",
]) {
  if (!roomCardDefinition.includes(expected)) {
    hasError = true;
    console.error(`Room card is missing required navigation or lights-off behavior: ${expected}`);
  }
}
const usedThemeVars = [...new Set([...templateSource.matchAll(/var\(--([a-zA-Z0-9_-]+)/g)]
  .map((match) => match[1]))]
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

function directoryContainsFiles(root) {
  if (!fs.existsSync(root)) return false;
  return fs.readdirSync(root, { withFileTypes: true }).some((entry) =>
    entry.isFile() || (entry.isDirectory() && directoryContainsFiles(path.join(root, entry.name)))
  );
}

for (const relativeRoot of [`${frontendRoot}/vendor`, `${distFrontendRoot}/vendor`]) {
  if (directoryContainsFiles(path.join(repoRoot, relativeRoot))) {
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

const generatorSource = fs.readFileSync(
  path.join(repoRoot, "custom_components/marao_dashboard/generator.py"),
  "utf8"
);
for (const expected of [
  "overscroll-behavior: contain",
  "touch-action: pan-y",
  "height: 100%",
  "align-items: stretch",
  "align-content: start",
  "justify-content: flex-start",
  "position: fixed",
  "inset: auto 0 0 0",
  "max-height: 80vh",
  ".bubble-pop-up-container > .bubble-cards-container",
  "margin-top: 16px",
  '"columns": 1',
]) {
  if (!generatorSource.includes(expected)) {
    hasError = true;
    console.error(`Generated popup styles must prevent background page scrolling: ${expected}`);
  }
}

const cardTestPath = path.join(
  repoRoot,
  frontendRoot,
  "dashboard/MaraoDashboard/views/00-card-test.yaml"
);
const cardTest = YAML.parse(fs.readFileSync(cardTestPath, "utf8"));
if (!cardTest.cards?.length || cardTest.cards[0]?.type !== "vertical-stack") {
  hasError = true;
  console.error("Card test dashboard must start with a vertical-stack card.");
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

if (findCardType(cardTest.cards[0], "grid")) {
  hasError = true;
  console.error("Visible card test dashboard examples must stay in the single-column vertical stack.");
}

const timelineCards = findCardsByType(cardTest.cards[0], "custom:button-card")
  .filter((card) => card.template === "hc_timeline_card");
if (
  timelineCards.length !== 1 ||
  !timelineCards[0].entity ||
  findCardsByType(cardTest.cards[0], "custom:marao-state-timeline-card").length > 0
) {
  hasError = true;
  console.error("Card test dashboard must mount one Marao timeline through hc_timeline_card.");
}

if (findCardsByType(cardTest, "custom:navbar-card").some((card) => card.styles)) {
  hasError = true;
  console.error("Navbar CSS belongs in the navbar component, not the card test dashboard.");
}

for (const popup of findCardsByType(cardTest, "custom:bubble-card").filter(
  (card) => card.card_type === "pop-up"
)) {
  const styles = String(popup.styles || "");
  if (
    !styles.includes("overscroll-behavior: contain") ||
    !styles.includes("touch-action: pan-y") ||
    !styles.includes("height: 100%") ||
    !styles.includes("align-items: stretch") ||
    !styles.includes("align-content: start") ||
    !styles.includes("justify-content: flex-start") ||
    !styles.includes("position: fixed") ||
    !styles.includes("inset: auto 0 0 0") ||
    !styles.includes("max-height: 80vh") ||
    !styles.includes(".bubble-pop-up-container > .bubble-cards-container") ||
    !styles.includes("margin-top: 16px")
  ) {
    hasError = true;
    console.error(`${popup.hash || popup.name || "Bubble popup"} must contain scroll inside an 80vh popup.`);
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
  const popup = cardTest.cards.find((card) => card?.type === "custom:bubble-card" && card.hash === hash);
  const grid = popup?.cards?.[0];
  const columns = 1;
  if (
    grid?.type !== "grid" ||
    grid?.columns !== columns ||
    grid?.square !== false ||
    !findCardsByType(grid, "custom:button-card").some((card) => card.template === expectedTemplate)
  ) {
    hasError = true;
    console.error(`${hash} must contain a ${columns}-column grid of ${expectedTemplate} cards.`);
  }
}

const garageDoorPopup = cardTest.cards.find(
  (card) => card?.type === "custom:bubble-card" && card.hash === "#marao-dashboard-test-garage-door-popup"
);
if (!findCardsByType(garageDoorPopup?.cards?.[0], "custom:button-card").some(
  (card) => card.template === "hc_access_slide_action_card"
)) {
  hasError = true;
  console.error("Garage door popup must contain the slide-to-open access card.");
}

for (const hash of ["#marao-dashboard-test-lock-popup"]) {
  const popup = cardTest.cards.find((card) => card?.type === "custom:bubble-card" && card.hash === hash);
  const actions = findCardsByType(popup?.cards?.[0], "custom:button-card")
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
  (card) => card?.type === "custom:bubble-card" && card.hash === "#marao-dashboard-test-climate-popup"
);
const climatePopupCards = findCardsByType(climatePopup?.cards?.[0], "custom:button-card")
  .filter((card) => card.template === "hc_climate_card");
if (
  climatePopupCards.length === 0 ||
  climatePopupCards.some((card) => card.variables?.show_mode_buttons !== true)
) {
  hasError = true;
  console.error("Climate popup cards must enable inline mode buttons.");
}

const appleTvCard = findCardsByType(cardTest.cards[0], "custom:button-card").find(
  (card) => card.template === "hc_media_card" && card.variables?.apple_tv === true
);
const appleTvPopup = cardTest.cards.find(
  (card) => card?.type === "custom:bubble-card" && card.hash === "#marao-dashboard-test-apple-tv-popup"
);
if (
  appleTvCard?.variables?.popup_hash !== "#marao-dashboard-test-apple-tv-popup" ||
  !findCardsByType(appleTvPopup, "custom:button-card").some((card) => card.template === "hc_media_app_card") ||
  !String(JSON.stringify(appleTvPopup)).includes('"command":"top_menu"') ||
  !String(JSON.stringify(appleTvPopup)).includes('"command":"select"')
) {
  hasError = true;
  console.error("Card test dashboard must include an Apple TV media card and remote popup.");
}

const cardTestLastCard = cardTest.cards?.[cardTest.cards.length - 1];
if (
  cardTestLastCard?.type !== "vertical-stack" ||
  cardTestLastCard.cards?.[0]?.color_type !== "blank-card" ||
  !findCardType(cardTestLastCard, "custom:navbar-card")
) {
  hasError = true;
  console.error("Card test dashboard must end with the navbar stack and its bottom spacer.");
}

if (hasError) {
  process.exit(1);
}

console.log(`YAML OK: ${pathsToValidate.length} files`);
