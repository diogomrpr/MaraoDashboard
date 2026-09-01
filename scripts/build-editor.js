const esbuild = require("esbuild");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(repoRoot, "custom_components", "marao_dashboard", "frontend");
const check = process.argv.includes("--check");
const outputRoot = check ? fs.mkdtempSync(path.join(os.tmpdir(), "marao-editor-")) : frontendRoot;

const generatedFiles = [
  "MaraoDashboardPanel.js",
  "MaraoDashboardPanel.css",
  "MaraoDashboardEditorWorker.js",
  "MaraoDashboardJsonWorker.js",
  "MonacoEditor.LICENSE.txt",
];

function sameFile(left, right) {
  return fs.existsSync(left) && fs.existsSync(right) && fs.readFileSync(left).equals(fs.readFileSync(right));
}

function listFiles(root, prefix = "") {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(path.join(root, entry.name), relative) : [relative];
  }).sort();
}

async function build() {
  if (!check) {
    for (const file of generatedFiles) fs.rmSync(path.join(frontendRoot, file), { force: true });
    fs.rmSync(path.join(frontendRoot, "assets"), { recursive: true, force: true });
  }

  await esbuild.build({
    entryPoints: {
      MaraoDashboardPanel: path.join(repoRoot, "frontend_src", "MaraoDashboardPanel.js"),
      MaraoDashboardEditorWorker: path.join(repoRoot, "node_modules", "monaco-editor", "esm", "vs", "editor", "editor.worker.js"),
      MaraoDashboardJsonWorker: path.join(repoRoot, "node_modules", "monaco-editor", "esm", "vs", "language", "json", "json.worker.js"),
    },
    bundle: true,
    entryNames: "[name]",
    assetNames: "assets/[name]-[hash]",
    format: "esm",
    legalComments: "eof",
    loader: { ".ttf": "file" },
    minify: true,
    outdir: outputRoot,
    platform: "browser",
    target: "es2022",
  });
  fs.copyFileSync(
    path.join(repoRoot, "node_modules", "monaco-editor", "LICENSE"),
    path.join(outputRoot, "MonacoEditor.LICENSE.txt"),
  );

  if (!check) return;
  const expected = [...generatedFiles, ...listFiles(path.join(outputRoot, "assets"), "assets")].sort();
  const stale = expected.filter((relative) => !sameFile(path.join(outputRoot, relative), path.join(frontendRoot, relative)));
  const committedAssets = listFiles(path.join(frontendRoot, "assets"), "assets");
  const extra = committedAssets.filter((relative) => !expected.includes(relative));
  fs.rmSync(outputRoot, { recursive: true, force: true });
  if (stale.length || extra.length) {
    throw new Error(`Editor bundle is stale. Run npm run build:editor.\n${[...stale, ...extra].join("\n")}`);
  }

  const panel = fs.readFileSync(path.join(frontendRoot, "MaraoDashboardPanel.js"), "utf8");
  if (/cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/.test(panel)) {
    throw new Error("The editor bundle must not load Monaco from a CDN.");
  }
}

build().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
