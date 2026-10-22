const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const YAML = require("yaml");
const { api, connect, fingerprint, frontendAssetURL, readConfig, repoRoot, sourceFiles } = require("./client");

const haYamlOptions = { customTags: ['!include', '!include_dir_list', '!include_dir_named', '!include_dir_merge_list', '!include_dir_merge_named', '!secret', '!env_var']
  .map(tag => ({ tag, resolve: value => value })) };

const cacheRoot = path.join(__dirname, ".cache");
const remoteReceipt = ".marao-test-deployment.json";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";

function run(command, args, { input, allowFailure = false, inherit = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot, encoding: "utf8", input, stdio: inherit ? "inherit" : "pipe",
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    // Commands may handle configuration containing secrets; never echo their input/output.
    throw new Error(command + " failed" + (result.error?.code ? " (" + result.error.code + ")" : " with exit code " + result.status) + ".");
  }
  return result;
}

function ssh(config, command, options) {
  return run("ssh", [
    "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
    ...(config.sshKeyPath ? ["-i", config.sshKeyPath] : []),
    "-p", String(config.sshPort), config.sshUser + "@" + config.sshHost, command,
  ], options);
}

function targetKey(config) {
  return crypto.createHash("sha256").update(JSON.stringify([config.url, config.sshHost, config.sshPort, config.remoteConfigPath])).digest("hex");
}

function composeDashboard(config, view) {
  const { test_gallery, ...dashboard } = structuredClone(config);
  const cards = view.cards.filter((card) => !(typeof card === "string" && card.endsWith("/components/navigation/navbar.yaml")));
  if (cards.some((card) => typeof card === "string")) throw new Error("Gallery includes must be ordinary card objects.");
  if (dashboard.config_version === 2 && Array.isArray(dashboard.pages)) {
    dashboard.pages = [
      ...dashboard.pages.filter(page => page.path !== 'card-test'),
      { id: 'card-test', name: 'Cases', path: 'card-test', icon: 'mdi:test-tube', output_path: 'views/custom/01-cases.yaml', sections: [
        ...(view.entities || []).map(entity => ({ entities: [entity] })), ...cards.map(card => ({ cards: [card] })),
      ] },
    ];
    return dashboard;
  }
  dashboard.pages = { ...dashboard.pages, custom: [
    ...(dashboard.pages?.custom || []).filter((page) => page.path !== "card-test"),
    { name: "Cases", path: "card-test", icon: "mdi:test-tube", entities: view.entities || [], cards },
  ] };
  return dashboard;
}

function patchPackages(source) {
  const document = YAML.parseDocument(source, haYamlOptions);
  if (document.errors.length) throw new Error("The remote configuration.yaml could not be parsed.");
  let home = document.get("homeassistant", true);
  if (!home || (YAML.isScalar(home) && home.value == null)) { document.set("homeassistant", document.createNode({})); home = document.get("homeassistant", true); }
  if (!YAML.isMap(home)) throw new Error("The disposable instance must define homeassistant as a mapping in configuration.yaml.");
  const packages = home.get("packages", true);
  let helperPath = "packages/marao_dashboard_card_test_helpers.yaml";
  if (!packages) {
    const value = new YAML.Scalar("packages");
    value.tag = "!include_dir_named";
    home.set("packages", value);
  } else if (YAML.isScalar(packages) && packages.tag === "!include_dir_named") {
    const directory = String(packages.value).replace(/\/+$/, "");
    if (!directory || path.posix.isAbsolute(directory) || directory.split("/").includes("..")) throw new Error("The package include directory must stay inside the disposable configuration directory.");
    helperPath = directory + "/marao_dashboard_card_test_helpers.yaml";
  } else if (YAML.isMap(packages)) {
    const value = new YAML.Scalar(helperPath);
    value.tag = "!include";
    packages.set("marao_dashboard_test", value);
  } else {
    throw new Error("Use a packages mapping or !include_dir_named for the disposable instance.");
  }
  const updated = document.toString();
  return { source: updated, helperPath, changed: updated !== source };
}

function changePlan(previous, current, remoteFiles, files) {
  const groups = ["backend", "frontend", "fixtures", "dashboard"];
  const changed = Object.fromEntries(groups.map((group) => [
    group,
    previous.target !== current.target || previous[group] !== current[group] ||
      files.some((file) => file.group === group && remoteFiles.get(file.remote) !== file.hash),
  ]));
  return { ...changed, restart: changed.backend || changed.fixtures, reload: changed.frontend };
}

function copyClean(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const relative of sourceFiles(source)) {
    const output = path.join(destination, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(source, relative), output);
  }
}

function stageFixtures(integrationRoot, stage) {
  const { expandGallery, expandHelpers } = require("./cases");
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  copyClean(integrationRoot, path.join(stage, "custom_components/marao_dashboard"));
  const domains = fs.readdirSync(path.join(__dirname, "custom_components")).sort();
  for (const domain of domains) {
    const target = path.join(stage, "custom_components", domain);
    copyClean(path.join(__dirname, "custom_components", domain), target);
    fs.writeFileSync(path.join(target, "marao-fixture.json"), '{"owner":"marao-dashboard-tests"}\n');
  }
  const helper = expandHelpers(YAML.parse(fs.readFileSync(path.join(__dirname, "marao_dashboard_card_test_helpers.yaml"), "utf8")));
  const galleryDoc = YAML.parseDocument(fs.readFileSync(path.join(__dirname, "dashboard/views/00-card-test.yaml"), "utf8"));
  if (galleryDoc.errors.length) throw new Error("The gallery YAML is invalid.");
  const gallery = expandGallery(galleryDoc.toJS());
  const dashboard = composeDashboard(JSON.parse(fs.readFileSync(path.join(__dirname, "marao_dashboard_test_dashboard.json"), "utf8")), gallery);
  const dashboardPath = "dashboard/MaraoDashboard/dashboard.json";
  fs.mkdirSync(path.dirname(path.join(stage, dashboardPath)), { recursive: true });
  fs.writeFileSync(path.join(stage, dashboardPath), JSON.stringify(dashboard, null, 2) + "\n");
  return { stage, domains, helper, dashboard, dashboardPath };
}

async function waitReady(config) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const status = await api(config, "GET", "/api/config", undefined, { timeout: 5000 });
      if (status.state === "RUNNING") return;
    } catch { /* Restart temporarily closes the server; the bounded readiness check must succeed. */ }
    await delay(1000);
  }
  throw new Error("Home Assistant did not become ready within three minutes.");
}

async function restart(config) {
  console.log("Restarting the disposable Home Assistant for backend or fixture changes.");
  const supervised = await waitForSupervisorIdle(config);
  await api(config, "POST", "/api/services/homeassistant/check_config", {});
  await waitForSupervisorIdle(config);
  // Watch concurrently: restarting can close the request before it returns.
  const stopped = (async () => {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      try { await api(config, "GET", "/api/", undefined, { timeout: 2000 }); }
      catch { return true; }
      await delay(500);
    }
    return false;
  })();
  let requestError;
  try {
    if (supervised) {
      const client = await connect(config);
      try { await client.call({ type: "supervisor/api", endpoint: "/homeassistant/restart", method: "post" }); }
      finally { client.close(); }
    } else await api(config, "POST", "/api/services/homeassistant/restart", {});
  }
  catch (error) { requestError = error; }
  if (!await stopped) throw requestError || new Error("Home Assistant accepted the restart request but did not restart.");
  await waitReady(config);
  await waitForSupervisorIdle(config);
}

function activeCoreJob(jobs) {
  if (!Array.isArray(jobs)) throw new Error("Missing Supervisor job metadata.");
  return jobs.some(job => typeof job.name === "string" && job.name.startsWith("home_assistant_core_") && job.done !== true
    || activeCoreJob(job.child_jobs || []));
}

async function waitForSupervisorIdle(config) {
  const status = await api(config, "GET", "/api/config");
  if (!status.components.includes("hassio")) return false;
  const client = await connect(config);
  try {
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const { jobs } = await client.call({ type: "supervisor/api", endpoint: "/jobs/info", method: "get" });
      if (!activeCoreJob(jobs)) return true;
      await delay(500);
    }
    throw new Error("Supervisor Core job did not finish within three minutes.");
  } finally { client.close(); }
}

async function getEntries(config) {
  const connection = await connect(config);
  try { return await connection.call({ type: "config_entries/get" }); }
  finally { connection.close(); }
}

async function ensureEntry(config) {
  let entry = (await getEntries(config)).find((item) => item.domain === "marao_dashboard");
  if (!entry) {
    const flow = await api(config, "POST", "/api/config/config_entries/flow", { handler: "marao_dashboard" });
    if (flow.type === "form") await api(config, "POST", "/api/config/config_entries/flow/" + flow.flow_id, {});
    entry = (await getEntries(config)).find((item) => item.domain === "marao_dashboard");
  }
  if (!entry) throw new Error("Marao's integration entry was not created.");
  if (entry.state !== "loaded") throw new Error("Marao's integration entry is not loaded (" + entry.state + ").");
  return entry;
}

function referencedEntities(value, result = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\b(?:alarm_control_panel|binary_sensor|button|camera|climate|cover|device_tracker|fan|input_boolean|input_datetime|input_number|input_select|input_text|light|lock|media_player|number|person|remote|scene|script|select|sensor|switch|vacuum|weather)\.[a-z0-9_]+\b/g)) result.add(match[0]);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (!["service", "action", "perform_action", "action_service", "type"].includes(key)) referencedEntities(child, result);
    }
  }
  return result;
}

async function resetBaseline(config, helper) {
  const calls = [];
  for (const domain of ["input_boolean", "input_number", "input_select", "input_text"]) {
    for (const [name, settings] of Object.entries(helper[domain] || {})) {
      if (!name.startsWith("marao_dashboard_test_")) throw new Error("Refusing to reset a non-fixture helper.");
      const value = settings.initial ?? (domain === "input_select" ? settings.options[0] : undefined);
      if (value === undefined) continue;
      const service = domain === "input_boolean" ? (value ? "turn_on" : "turn_off") : domain === "input_select" ? "select_option" : "set_value";
      const data = { entity_id: domain + "." + name };
      if (domain !== "input_boolean") data[domain === "input_select" ? "option" : "value"] = value;
      calls.push(() => api(config, "POST", "/api/services/" + domain + "/" + service, data));
    }
  }
  // Limit independent helper updates to avoid flooding the disposable server.
  for (let offset = 0; offset < calls.length; offset += 6) await Promise.all(calls.slice(offset, offset + 6).map((call) => call()));
  for (const [domain, service, data] of require("./cases").baseline) {
    const resetFixture = domain === "marao_test_camera" && service === "reset";
    if (!resetFixture && !data.entity_id?.includes(".marao_dashboard_test_")) throw new Error("Refusing to apply a non-fixture baseline action.");
    await api(config, "POST", "/api/services/" + domain + "/" + service, data);
  }
}

function helperStateActions(states) {
  return Object.entries(states).map(([entity, value]) => {
    if (!/^input_(boolean|number|select|text)\.marao_dashboard_test_[a-z0-9_]+$/.test(entity)) throw new Error("Refusing to restore a non-fixture helper.");
    const domain = entity.split(".")[0];
    if (typeof value !== "string" || domain === "input_boolean" && !["on", "off"].includes(value)
      || domain === "input_number" && (!value.trim() || !Number.isFinite(Number(value)))) throw new Error("Invalid saved fixture helper state.");
    const service = domain === "input_boolean" ? (value === "on" ? "turn_on" : "turn_off") : domain === "input_select" ? "select_option" : "set_value";
    const data = { entity_id: entity };
    if (domain !== "input_boolean") data[domain === "input_select" ? "option" : "value"] = domain === "input_number" ? Number(value) : value;
    return [domain, service, data];
  });
}

async function restoreHelperStates(config, states) {
  const actions = helperStateActions(states);
  for (let offset = 0; offset < actions.length; offset += 6) {
    await Promise.all(actions.slice(offset, offset + 6).map(([domain, service, data]) => api(config, "POST", "/api/services/" + domain + "/" + service, data)));
  }
}

async function provisionFixtureAreas(config) {
  const fixtures = require('./cases.json').editorRoomCases.areas;
  const client = await connect(config);
  try {
    const areas = await client.call({ type: 'config/area_registry/list' });
    const registry = await client.call({ type: 'config/entity_registry/list' });
    for (const fixture of fixtures) {
      if (!fixture.area_id.startsWith('marao_fixture_') || !fixture.name.startsWith('Marao Fixture ')
        || fixture.entities.some(id => !/^[a-z_]+\.marao_dashboard_test_[a-z0-9_]+$/.test(id))) throw new Error('Refusing non-fixture registry changes');
      let area = areas.find(area => area.area_id === fixture.area_id);
      if (area && area.name !== fixture.name) throw new Error('Fixture area ID belongs to another area');
      if (!area) area = await client.call({ type: 'config/area_registry/create', name: fixture.name });
      if (area.area_id !== fixture.area_id) throw new Error('Fixture area ID is not stable');
      for (const entity_id of fixture.entities) {
        const entity = registry.find(entity => entity.entity_id === entity_id);
        if (!entity) throw new Error('Missing safe registry fixture: ' + entity_id);
        if (entity.area_id !== area.area_id) await client.call({ type: 'config/entity_registry/update', entity_id, area_id: area.area_id });
      }
    }
  } finally { client.close(); }
}

async function prepare(config = readConfig(), { dryRun = false } = {}) {
  if (Object.hasOwn(process.env, 'MARAO_BATCH_RECEIPT')) {
    if (Object.hasOwn(process.env, 'MARAO_UPGRADE_RECEIPT')) throw new Error('Batch and upgrade provenance cannot be mixed');
    const receipt = process.env.MARAO_BATCH_RECEIPT;
    if (!receipt || !path.isAbsolute(receipt)) throw new Error('A browser batch requires its absolute private receipt');
    if (dryRun) return { config };
    return require('./prepared-batch').verifyBatch(receipt);
  }
  if (Object.hasOwn(process.env, 'MARAO_UPGRADE_RECEIPT')) {
    const receipt = process.env.MARAO_UPGRADE_RECEIPT;
    if (!receipt?.trim()) throw new Error('A preserved-install check requires its private upgrade receipt.');
    const { candidateIdentity, readPreparedReceipt, verifyPrepared } = require('./upgrade/prepared');
    readPreparedReceipt(receipt, config, candidateIdentity());
    if (dryRun) {
      console.log('Would inspect the preserved installation without deployment, fixture copying, or generation.');
      return { config };
    }
    run(process.execPath, ['frontend_src/build-editor.cjs', '--check']);
    return verifyPrepared(config, receipt, { ssh, referencedEntities });
  }
  if (dryRun) {
    console.log("Would build the current workspace, deploy only Marao and its fixtures to " + config.url + ", provision Cases, and reload frontend changes or restart backend changes.");
    return { config };
  }
  const connection = await connect(config);
  let entries;
  try {
    if (!(await connection.call({ type: "auth/current_user" })).is_admin) throw new Error("The development token must belong to an administrator.");
    entries = await connection.call({ type: "config_entries/get" });
  } finally { connection.close(); }
  if (entries.some((entry) => ["frigate", "unifiprotect", "netatmo"].includes(entry.domain))) throw new Error("Test camera fixtures cannot replace a real Frigate, UniFi Protect or Netatmo integration.");
  const haConfig = await api(config, "GET", "/api/config");
  if (haConfig.config_dir !== config.remoteConfigPath) throw new Error("remoteConfigPath does not match this Home Assistant instance.");
  const root = config.remoteConfigPath;
  const upgradeMarker = quote(root + '/.marao-upgrade-active.json');
  const upgradeGuard = ssh(config, 'test ! -e ' + upgradeMarker + ' && test ! -L ' + upgradeMarker, { allowFailure: true });
  if (upgradeGuard.status !== 0) {
    throw new Error(upgradeGuard.status === 1
      ? 'An upgrade inspection is active. Fresh preparation requires verified cleanup; use its private receipt instead.'
      : 'Could not verify whether upgrade inspection is active; preparation stopped.');
  }
  const remoteConfig = root + "/configuration.yaml";
  const originalConfig = ssh(config, "cat " + quote(remoteConfig)).stdout;
  const patched = patchPackages(originalConfig);
  const previousResult = ssh(config, "cat " + quote(root + "/" + remoteReceipt), { allowFailure: true });
  let previous = {};
  if (previousResult.status === 0) { try { previous = JSON.parse(previousResult.stdout); } catch { throw new Error("The remote development deployment receipt is invalid."); } }

  // A fresh private folder keeps synchronized workspace caches out of deployment.
  const stagingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "marao-prepare-"));
  try {
    const editorSource = path.join(repoRoot, "frontend_src");
    const editorVersion = fingerprint(editorSource);
    run(process.execPath, ["frontend_src/build-editor.cjs"], { inherit: true });
    require("../frontend_src/build-hacs-dist.cjs").build(path.join(stagingDirectory, "package"));
    const integrationRoot = path.join(stagingDirectory, "package/custom_components/marao_dashboard");
    if (fingerprint(path.join(repoRoot, "custom_components/marao_dashboard")) !== fingerprint(integrationRoot)) {
      throw new Error("The staged package does not match the workspace; deployment stopped.");
    }
    const fixtureSource = () => fingerprint(__dirname, (file) =>
      file.startsWith("custom_components/") || file.startsWith("dashboard/") ||
      ["cases.js", "cases.json", "native-cases.js", "marao_dashboard_card_test_helpers.yaml", "marao_dashboard_test_dashboard.json"].includes(file));
    const fixtureVersion = fixtureSource();
    const fixture = stageFixtures(integrationRoot, path.join(stagingDirectory, "deploy"));
    for (const domain of fixture.domains) {
      const component = root + "/custom_components/" + domain;
      const owner = ssh(config, "if test -d " + quote(component) + "; then cat " + quote(component + "/manifest.json") + "; fi").stdout;
      if (owner) {
        const manifest = JSON.parse(owner);
        const marker = ssh(config, "cat " + quote(component + "/marao-fixture.json"), { allowFailure: true });
        const owned = marker.status === 0 && JSON.parse(marker.stdout).owner === "marao-dashboard-tests";
        const legacyFixture = domain.startsWith("marao_test_") && manifest.name?.startsWith("Marao Test");
        if (!owned && !legacyFixture) throw new Error("Refusing to overwrite a non-fixture custom integration: " + domain);
      }
    }
    const helperFile = path.join(fixture.stage, patched.helperPath);
    fs.mkdirSync(path.dirname(helperFile), { recursive: true });
    // Home Assistant uses YAML 1.1, where unquoted on/off are booleans.
    fs.writeFileSync(helperFile, YAML.stringify(fixture.helper, { schema: "yaml-1.1" }));
    const files = sourceFiles(fixture.stage).map((relative) => ({
      relative, remote: root + "/" + relative,
      hash: crypto.createHash("sha256").update(fs.readFileSync(path.join(fixture.stage, relative))).digest("hex"),
      group: relative.startsWith("custom_components/marao_dashboard/")
        ? (relative.startsWith("custom_components/marao_dashboard/frontend/") ? "frontend" : "backend")
        : relative === fixture.dashboardPath ? "dashboard" : "fixtures",
    }));
    const current = { target: targetKey(config) };
    for (const group of ["backend", "frontend", "fixtures", "dashboard"]) {
      current[group] = crypto.createHash("sha256").update(JSON.stringify(files.filter((file) => file.group === group).map(({ relative, hash }) => [relative, hash]))).digest("hex");
    }
    const remoteChecks = ssh(config, "sha256sum " + files.map((file) => quote(file.remote)).join(" "), { allowFailure: true });
    const remoteFiles = new Map(remoteChecks.stdout.split("\n").filter((line) => /^[a-f0-9]{64}  /.test(line)).map((line) => [line.slice(66), line.slice(0, 64)]));
    const changes = changePlan(previous, current, remoteFiles, files);
    changes.restart ||= patched.changed;
    const anyChanged = ["backend", "frontend", "fixtures", "dashboard"].some((group) => changes[group]);
    if (anyChanged) {
      const archive = path.join(stagingDirectory, "deploy.tar.gz");
      run("tar", ["--no-xattrs", "-czf", archive, "-C", fixture.stage, "."]);
      const remoteTemp = root + "/.marao-test-upload";
      ssh(config, "rm -rf " + quote(remoteTemp) + " && mkdir -p " + quote(remoteTemp));
      run("scp", ["-q", "-o", "BatchMode=yes", ...(config.sshKeyPath ? ["-i", config.sshKeyPath] : []), "-P", String(config.sshPort), archive, config.sshUser + "@" + config.sshHost + ":" + remoteTemp + "/deploy.tar.gz"]);
      ssh(config, "tar -xzf " + quote(remoteTemp + "/deploy.tar.gz") + " -C " + quote(remoteTemp));
      const commands = [];
      for (const domain of ["marao_dashboard", ...fixture.domains]) {
        commands.push("rm -rf " + quote(root + "/custom_components/" + domain));
        commands.push("mkdir -p " + quote(root + "/custom_components"));
        commands.push("mv " + quote(remoteTemp + "/custom_components/" + domain) + " " + quote(root + "/custom_components/" + domain));
      }
      for (const relative of [patched.helperPath, fixture.dashboardPath]) {
        commands.push("mkdir -p " + quote(path.posix.dirname(root + "/" + relative)));
        commands.push("mv " + quote(remoteTemp + "/" + relative) + " " + quote(root + "/" + relative));
      }
      commands.push("rm -f " + quote(root + "/dashboard/MaraoDashboard/dashboard/views/test/00-card-test.yaml"));
      commands.push("rm -rf " + quote(remoteTemp));
      ssh(config, commands.join(" && "));
    }
    if (patched.changed) {
      ssh(config, "cp " + quote(remoteConfig) + " " + quote(remoteConfig + ".marao-test.bak") + " && cat > " + quote(remoteConfig), { input: patched.source });
    }
    if (changes.restart) {
      // Retire only the old template fixture so its native replacement keeps the canonical ID.
      const connection = await connect(config);
      try {
        const registry = await connection.call({ type: 'config/entity_registry/list' });
        const old = registry.find(entity => entity.entity_id === 'cover.marao_dashboard_test_open_only_door');
        if (old?.platform === 'template' && old.unique_id === 'marao_dashboard_test_open_only_door') {
          await connection.call({ type: 'config/entity_registry/remove', entity_id: old.entity_id });
        }
      } finally { connection.close(); }
      await restart(config);
    }
    const entry = await ensureEntry(config);
    if (!changes.restart && changes.reload) {
      console.log("Reloading Marao's frontend and theme without restarting Home Assistant.");
      await api(config, "POST", "/api/services/homeassistant/reload_config_entry", { entry_id: entry.entry_id });
      await ensureEntry(config);
    }

    await resetBaseline(config, fixture.helper);
    await provisionFixtureAreas(config);
    await api(config, "POST", "/api/services/marao_dashboard/generate_dashboard", {});
    let ws = await connect(config);
    try {
      let panels = await ws.call({ type: "get_panels" });
      if (!panels["marao-dashboard"]) {
        ws.close();
        await restart(config);
        await ensureEntry(config);
        ws = await connect(config);
        panels = await ws.call({ type: "get_panels" });
      }
      if (!panels["marao-dashboard"]) throw new Error("The generated Marao dashboard was not registered.");
      const dashboard = await ws.call({ type: "lovelace/config", url_path: "marao-dashboard", force: true });
      if (dashboard.views.filter((view) => view.path === "card-test").length !== 1) throw new Error("Expected exactly one Cases view.");
      const maraoPanels = Object.entries(panels).filter(([name, panel]) => name.startsWith("marao-") && panel.component_name === "lovelace");
      if (maraoPanels.length !== 1) throw new Error("Expected exactly one Marao dashboard.");
      const states = await ws.call({ type: "get_states" });
      const present = new Set(states.map((state) => state.entity_id));
      const missing = [...referencedEntities(dashboard)].filter((entity) => !present.has(entity) && !entity.includes("_missing"));
      if (missing.length) throw new Error("The generated dashboard references missing fixture entities: " + missing.join(", "));
      const version = fingerprint(path.join(integrationRoot, "frontend"));
      for (const name of ["MaraoDashboard.js", "MaraoCards.js", "MaraoFrigateEventsCard.js", "MaraoDashboardPanel.js"]) {
        const actual = await api(config, "GET", frontendAssetURL(version, name), undefined, { text: true });
        if (actual !== fs.readFileSync(path.join(integrationRoot, "frontend", name), "utf8")) throw new Error("The served " + name + " is stale.");
      }
      const editor = panels["marao-dashboard-editor"];
      if (!JSON.stringify(editor).includes("v=" + version)) throw new Error("Marao's loaded frontend version does not match this workspace.");
      if (fingerprint(path.join(repoRoot, "custom_components/marao_dashboard")) !== fingerprint(integrationRoot)
        || fingerprint(editorSource) !== editorVersion || fixtureSource() !== fixtureVersion) {
        throw new Error("Workspace code changed during preparation. Run the command again to install the latest files.");
      }
      ssh(config, "cat > " + quote(root + "/" + remoteReceipt), { input: JSON.stringify(current) + "\n" });
      fs.mkdirSync(cacheRoot, { recursive: true });
      fs.writeFileSync(path.join(cacheRoot, "deployment.json"), JSON.stringify(current, null, 2) + "\n");
      console.log("Current workspace and safe fixtures ready: " + config.url + "/marao-dashboard/card-test");
      return { config, version, dashboard };
    } finally { ws.close(); }
  } finally { fs.rmSync(stagingDirectory, { recursive: true, force: true }); }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  Promise.resolve().then(() => prepare(readConfig(undefined, { dryRun }), { dryRun })).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { activeCoreJob, haYamlOptions, changePlan, composeDashboard, helperStateActions, patchPackages, prepare, referencedEntities, resetBaseline, restoreHelperStates, restart, ssh, targetKey, waitForSupervisorIdle };
