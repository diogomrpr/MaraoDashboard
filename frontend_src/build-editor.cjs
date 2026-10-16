const esbuild = require("esbuild");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(repoRoot, "custom_components", "marao_dashboard", "frontend");
const check = process.argv.includes("--check");

const generatedFiles = [
  "MaraoDashboardPanel.js",
  "MaraoDashboardPanel.css",
  "MaraoDashboardJsonEditor.js",
  "MaraoDashboardJsonEditor.css",
  "MaraoDashboardEditorWorker.js",
  "MaraoDashboardJsonWorker.js",
  "MaraoNativeCatalog.js",
  "MaraoNativeCardEditor.js",
  "MaraoNativeCards.js",
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
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "marao-editor-"));
  try {
    const python = process.env.PYTHON || (fs.existsSync(path.join(repoRoot, ".venv/bin/python")) ? path.join(repoRoot, ".venv/bin/python") : "python3");
    const catalog = spawnSync(python, ["-c", "import json; from custom_components.marao_dashboard.native import native_catalog; print(json.dumps(native_catalog(), ensure_ascii=False, sort_keys=True))"], { cwd: repoRoot, encoding: "utf8" });
    if (catalog.status !== 0) throw new Error("Cannot generate native catalog: " + catalog.stderr);
    const catalogSource = "export const catalog = " + catalog.stdout.trim() + ";\n";
    fs.writeFileSync(path.join(outputRoot, "MaraoNativeCatalog.js"), catalogSource);
    const result = await esbuild.build({
      entryPoints: {
        MaraoDashboardPanel: path.join(repoRoot, "frontend_src", "MaraoDashboardPanel.js"),
        MaraoNativeCardEditor: path.join(repoRoot, "frontend_src", "MaraoNativeCardEditor.js"),
        MaraoNativeCards: path.join(repoRoot, "frontend_src", "MaraoNativeCards.js"),
        MaraoDashboardJsonEditor: path.join(repoRoot, "frontend_src", "json-editor.js"),
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
      metafile: true,
      plugins: [{
        name: "monaco-http-clipboard",
        setup(build) {
          build.onLoad({ filter: /[/\\]platform[/\\]clipboard[/\\]browser[/\\]clipboardService\.js$/ }, ({ path: filename }) => {
            const source = fs.readFileSync(filename, "utf8");
            const method = "installWebKitWriteTextWorkaround() {";
            if (source.split(method).length !== 2) throw new Error("Review Monaco's HTTP clipboard compatibility guard after updating the dependency.");
            // HTTP has no Clipboard API; keep Monaco's existing copy/paste fallback.
            return { contents: source.replace(method, method + "\n        if (!globalThis.navigator.clipboard?.write) return;"), loader: "js" };
          });
        },
      }],
      outdir: outputRoot,
      platform: "browser",
      target: "es2022",
    });
    const eager = Object.entries(result.metafile.outputs).filter(([file]) => /MaraoDashboardPanel\.(js|css)$/.test(file));
    for (const [file, details] of eager) {
      if (Object.keys(details.inputs).some(input => input.includes("node_modules/monaco-editor/"))) {
        throw new Error("Monaco must remain outside the eager Visual import graph.");
      }
      const limit = file.endsWith(".js") ? 144 * 1024 : 32 * 1024;
      if (details.bytes > limit) throw new Error(`Eager editor asset exceeds its ${limit}-byte budget: ${path.basename(file)}`);
    }
    fs.copyFileSync(
      path.join(repoRoot, "node_modules", "monaco-editor", "LICENSE"),
      path.join(outputRoot, "MonacoEditor.LICENSE.txt"),
    );

    const expected = [...generatedFiles, ...listFiles(path.join(outputRoot, "assets"), "assets")].sort();
    const stale = expected.filter((relative) => !sameFile(path.join(outputRoot, relative), path.join(frontendRoot, relative)));
    const committedAssets = listFiles(path.join(frontendRoot, "assets"), "assets");
    const extra = committedAssets.filter((relative) => !expected.includes(relative));
    if (!check) {
      for (const relative of stale) {
        const destination = path.join(frontendRoot, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(outputRoot, relative), destination);
      }
      // Only hashed fonts matching esbuild's managed asset names are obsolete.
      for (const relative of extra.filter((file) => /^assets[/\\][^/\\]+-[A-Z0-9]{8}\.ttf$/.test(file))) {
        fs.rmSync(path.join(frontendRoot, relative));
      }
      return;
    }
    if (stale.length || extra.length) {
      throw new Error(`Editor bundle is stale. Run npm run build:editor.\n${[...stale, ...extra].join("\n")}`);
    }

    const panel = fs.readFileSync(path.join(frontendRoot, "MaraoDashboardPanel.js"), "utf8");
    if (/cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/.test(panel)) {
      throw new Error("The editor bundle must not load Monaco from a CDN.");
    }
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
}

build().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
