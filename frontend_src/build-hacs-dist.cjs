const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const integrationRoot = path.join(repoRoot, "custom_components", "marao_dashboard");
const stagingRoot = path.join(repoRoot, "ha-test", ".cache", "dist");
const distRoot = path.join(stagingRoot, "custom_components", "marao_dashboard");

function isLocalCache(name) {
  return name === ".DS_Store" || name === "__pycache__" || /\.py[co]$/.test(name);
}

// HACS downloads this integration directory, so validate source as well as staging.
function assertPackageBoundary(root, { allowLocalCache = false } = {}) {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (allowLocalCache && isLocalCache(entry.name)) continue;
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file).split(path.sep).join("/");
      if (
        entry.isSymbolicLink() || isLocalCache(entry.name) ||
        /(?:^|\/)(?:tests?|ha-test|fixtures?|node_modules|\.venv[^/]*|\.cache|\.artifacts|vendor|\.ssh|\.git)(?:\/|$)/i.test(relative) ||
        /(?:^|\/)(?:local(?:\.example)?\.json|secrets\.ya?ml|\.env(?:\.[^/]*)?|package(?:-lock)?\.json|requirements[^/]*\.txt|pytest\.ini|pyproject\.toml|id_(?:rsa|ed25519)(?:\.pub)?|.*\.(?:pem|key)|.*\.test\.js)$/i.test(relative) ||
        /(?:marao_test_|marao_dashboard_(?:card_test|test_)|(?:^|\/)\d*-?card-test\.yaml$)/i.test(relative)
      ) {
        throw new Error(`Development-only file cannot ship through HACS: ${relative}`);
      }
      if (entry.isDirectory()) {
        visit(file);
      } else if (/\.(?:py|js|json|ya?ml|html|css|txt)$/i.test(entry.name)) {
        const source = fs.readFileSync(file, "utf8");
        if (relative === "manifest.json" && (JSON.parse(source).requirements || []).some(
          (requirement) => /^(?:pytest(?:-[a-z-]+)?|coverage|playwright|home-assistant-frontend)(?:[=<>!~\[; ]|$)/i.test(requirement),
        )) {
          throw new Error("Test dependencies cannot ship through HACS: manifest.json requirements");
        }
        if (
          /marao_dashboard_test_|marao_test_|MARAO_TEST_EVENT_IMAGE|\bprovider["']?\s*(?:={2,3}|:)\s*["']test["']/.test(source) ||
          /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(source)
        ) {
          throw new Error(`Test fixture or credential content cannot ship through HACS: ${relative}`);
        }
      }
    }
  }
  visit(root);
}

function build() {
  assertPackageBoundary(integrationRoot, { allowLocalCache: true });
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.cpSync(integrationRoot, distRoot, {
    recursive: true,
    filter: (source) => !isLocalCache(path.basename(source)),
  });
  assertPackageBoundary(distRoot);
  console.log("HACS package boundary OK: source and staged integration");
}

if (require.main === module) build();
module.exports = { assertPackageBoundary, build };
