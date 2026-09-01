const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, ".ha-local.json");
const statePath = path.join(repoRoot, ".ha-local-sync-state.json");
const dryRun = process.argv.includes("--dry-run");

function readConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error("Missing .ha-local.json. Copy .ha-local.example.json and adjust it if needed.");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const requiredStrings = ["url", "username", "password", "sshHost", "sshUser", "remoteConfigPath"];
  for (const key of requiredStrings) {
    if (!config[key] || typeof config[key] !== "string") {
      throw new Error(`.ha-local.json requires a string ${key}.`);
    }
  }

  const sshPort = Number(config.sshPort || 22);
  if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) {
    throw new Error(".ha-local.json requires sshPort to be a valid TCP port.");
  }
  if (!config.remoteConfigPath.startsWith("/")) {
    throw new Error(".ha-local.json remoteConfigPath must be an absolute path, usually /config.");
  }
  if (config.sshKeyPath && typeof config.sshKeyPath !== "string") {
    throw new Error(".ha-local.json sshKeyPath must be a string when provided.");
  }

  const sshKeyPath = config.sshKeyPath ? path.resolve(repoRoot, config.sshKeyPath) : undefined;
  if (sshKeyPath && !fs.existsSync(sshKeyPath)) {
    throw new Error(`Configured sshKeyPath does not exist: ${sshKeyPath}`);
  }

  return { ...config, sshPort, sshKeyPath };
}

function copyDir(source, destination, options = {}) {
  const excludedNames = new Set(options.excludedNames || []);
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || excludedNames.has(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath, options);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function hashDir(root) {
  const hash = crypto.createHash("sha256");

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = path.relative(root, absolutePath);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        hash.update(relativePath);
        hash.update(fs.readFileSync(absolutePath));
      }
    }
  }

  visit(root);
  return hash.digest("hex");
}

function readState() {
  if (!fs.existsSync(statePath)) return {};
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function assertBuiltPaths() {
  const integrationRoot = path.join(repoRoot, "dist/custom_components/marao_dashboard");
  const frontendRoot = path.join(integrationRoot, "frontend");
  const helperPackage = path.join(repoRoot, "ha-test/marao_dashboard_card_test_helpers.yaml");
  if (!fs.existsSync(integrationRoot) || !fs.existsSync(frontendRoot)) {
    throw new Error("Missing dist output. Run npm run build:hacs before syncing.");
  }
  if (!fs.existsSync(helperPackage)) {
    throw new Error("Missing ha-test/marao_dashboard_card_test_helpers.yaml.");
  }
  return { integrationRoot, frontendRoot, helperPackage };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio || "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const detail = result.stderr ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${command} failed with exit code ${result.status}.${detail}`);
  }
  return result;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function sshTarget(config) {
  return `${config.sshUser}@${config.sshHost}`;
}

function runSsh(config, remoteCommand) {
  const keyArgs = config.sshKeyPath ? ["-i", config.sshKeyPath] : [];
  run("ssh", [...keyArgs, "-p", String(config.sshPort), sshTarget(config), remoteCommand]);
}

function runScp(config, source, destination) {
  const keyArgs = config.sshKeyPath ? ["-i", config.sshKeyPath] : [];
  run("scp", [...keyArgs, "-P", String(config.sshPort), "-r", source, `${sshTarget(config)}:${destination}`]);
}

function stageDashboard(frontendRoot) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "marao-dashboard-sync-"));
  const dashboardRoot = path.join(tempRoot, "MaraoDashboard");
  copyDir(frontendRoot, dashboardRoot);
  return { tempRoot, dashboardRoot };
}

function syncFiles(config, paths) {
  const { tempRoot, dashboardRoot } = stageDashboard(paths.frontendRoot);
  const remoteTmp = `${config.remoteConfigPath}/.marao-dashboard-sync-${Date.now()}`;
  const remotePackage = `${config.remoteConfigPath}/packages/marao_dashboard_card_test_helpers.yaml`;
  const remoteConfig = `${config.remoteConfigPath}/configuration.yaml`;

  try {
    if (dryRun) {
      console.log(`Would SSH to ${sshTarget(config)}:${config.sshPort}`);
      if (config.sshKeyPath) console.log(`Would use SSH key ${config.sshKeyPath}`);
      console.log(`Would replace ${config.remoteConfigPath}/www/community/MaraoDashboard from ${dashboardRoot}`);
      console.log(`Would replace ${config.remoteConfigPath}/custom_components/marao_dashboard from ${paths.integrationRoot}`);
      console.log(`Would remove legacy ${config.remoteConfigPath}/custom_components/marao_dashboard_generator`);
      console.log(`Would install/update ${remotePackage} from ${paths.helperPackage}`);
      return;
    }

    runSsh(
      config,
      [
        `rm -rf ${shellQuote(remoteTmp)}`,
        `mkdir -p ${shellQuote(remoteTmp)}`,
        `mkdir -p ${shellQuote(`${config.remoteConfigPath}/www/community`)}`,
        `mkdir -p ${shellQuote(`${config.remoteConfigPath}/custom_components`)}`,
        `mkdir -p ${shellQuote(`${config.remoteConfigPath}/packages`)}`,
      ].join(" && ")
    );
    runScp(config, dashboardRoot, `${remoteTmp}/MaraoDashboard`);
    runScp(config, paths.integrationRoot, `${remoteTmp}/marao_dashboard`);
    runScp(config, paths.helperPackage, `${remoteTmp}/marao_dashboard_card_test_helpers.yaml`);
    runSsh(
      config,
      [
        `if grep -q '^homeassistant:' ${shellQuote(remoteConfig)} && ! grep -q 'packages: !include_dir_named packages' ${shellQuote(remoteConfig)}; then echo 'configuration.yaml already has a homeassistant block. Add "packages: !include_dir_named packages" before syncing.'; exit 1; fi`,
        `if ! grep -q 'packages: !include_dir_named packages' ${shellQuote(remoteConfig)}; then cp ${shellQuote(remoteConfig)} ${shellQuote(`${remoteConfig}.marao-dashboard-packages.bak`)} && printf '\\nhomeassistant:\\n  packages: !include_dir_named packages\\n' >> ${shellQuote(remoteConfig)}; fi`,
        `rm -rf ${shellQuote(`${config.remoteConfigPath}/www/community/MaraoDashboard`)}`,
        `rm -rf ${shellQuote(`${config.remoteConfigPath}/custom_components/marao_dashboard`)}`,
        `rm -rf ${shellQuote(`${config.remoteConfigPath}/custom_components/marao_dashboard_generator`)}`,
        `rm -rf ${shellQuote(`${config.remoteConfigPath}/themes/MaraoDashboard`)}`,
        `mv ${shellQuote(`${remoteTmp}/MaraoDashboard`)} ${shellQuote(`${config.remoteConfigPath}/www/community/MaraoDashboard`)}`,
        `mv ${shellQuote(`${remoteTmp}/marao_dashboard`)} ${shellQuote(`${config.remoteConfigPath}/custom_components/marao_dashboard`)}`,
        `mv ${shellQuote(`${remoteTmp}/marao_dashboard_card_test_helpers.yaml`)} ${shellQuote(remotePackage)}`,
        `mkdir -p ${shellQuote(`${config.remoteConfigPath}/themes`)}`,
        `cp -R ${shellQuote(`${config.remoteConfigPath}/www/community/MaraoDashboard/themes/MaraoDashboard`)} ${shellQuote(`${config.remoteConfigPath}/themes/MaraoDashboard`)}`,
        `rmdir ${shellQuote(remoteTmp)}`,
      ].join(" && ")
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function request(method, url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "https:" ? https : http;
  const body = options.body || "";
  const allowedStatuses = new Set(options.allowedStatuses || []);

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method,
        headers: {
          "Content-Length": Buffer.byteLength(body),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if ((res.statusCode < 200 || res.statusCode >= 300) && !allowedStatuses.has(res.statusCode)) {
            reject(new Error(`${method} ${target.pathname} returned ${res.statusCode}: ${data}`));
            return;
          }
          resolve(data ? JSON.parse(data) : {});
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getAccessToken(config) {
  const baseUrl = config.url.replace(/\/$/, "");
  const clientId = `${baseUrl}/`;
  const redirectUri = `${baseUrl}/?auth_callback=1`;

  const flow = await request("POST", `${baseUrl}/auth/login_flow`, {
    body: JSON.stringify({
      client_id: clientId,
      handler: ["homeassistant", null],
      redirect_uri: redirectUri,
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (!flow.flow_id) {
    throw new Error("Home Assistant auth flow response did not include a flow_id.");
  }

  const login = await request("POST", `${baseUrl}/auth/login_flow/${flow.flow_id}`, {
    body: JSON.stringify({
      client_id: clientId,
      username: config.username,
      password: config.password,
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (login.type !== "create_entry" || !login.result) {
    throw new Error("Home Assistant login did not return an authorization code.");
  }

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: login.result,
    client_id: clientId,
  }).toString();
  const token = await request("POST", `${baseUrl}/auth/token`, {
    body: tokenBody,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!token.access_token) {
    throw new Error("Home Assistant auth response did not include an access token.");
  }
  return token.access_token;
}

async function restartHomeAssistant(config) {
  const token = await getAccessToken(config);
  await request("POST", `${config.url.replace(/\/$/, "")}/api/services/homeassistant/restart`, {
    body: "{}",
    allowedStatuses: [504],
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function reloadThemes(config) {
  const token = await getAccessToken(config);
  await request("POST", `${config.url.replace(/\/$/, "")}/api/services/frontend/reload_themes`, {
    body: "{}",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function main() {
  const config = readConfig();
  const paths = assertBuiltPaths();
  const integrationHash = hashDir(paths.integrationRoot);
  const previousState = readState();
  const integrationChanged = previousState.integrationHash !== integrationHash;

  syncFiles(config, paths);

  if (dryRun) {
    console.log("");
    console.log(`Home Assistant: ${config.url}`);
    console.log(`Integration code changed: ${integrationChanged ? "yes" : "no"}`);
    console.log(integrationChanged ? "Would restart Home Assistant." : "Would skip restart.");
    return;
  }

  writeState({
    integrationHash,
    syncedAt: new Date().toISOString(),
  });

  console.log("");
  if (integrationChanged) {
    try {
      await restartHomeAssistant(config);
      console.log("Home Assistant restart requested because integration code changed.");
    } catch (error) {
      console.warn(`Files synced, but Home Assistant restart failed: ${error.message}`);
      console.warn("Restart Home Assistant manually before testing Python integration changes.");
    }
  } else {
    try {
      await reloadThemes(config);
      console.log("Frontend themes reload requested.");
    } catch (error) {
      console.warn(`Files synced, but frontend theme reload failed: ${error.message}`);
      console.warn("Reload themes or restart Home Assistant manually before testing theme changes.");
    }
    console.log("Integration code unchanged; skipped Home Assistant restart.");
  }
  console.log(`Visual check: ${config.url}`);
  console.log("For dashboard/frontend-only changes, refresh the browser and clear Home Assistant frontend cache if needed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
