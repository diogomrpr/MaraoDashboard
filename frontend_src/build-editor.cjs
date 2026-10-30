const esbuild = require("esbuild");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(repoRoot, "custom_components", "marao_dashboard", "frontend");
const check = process.argv.includes("--check");
const entries = {
  MaraoNativeModel: 'legacy-model.js',
  MaraoNativeDashboard: 'native-strategy.js',
  MaraoNativeBootstrap: 'native-bootstrap.js',
  MaraoNativeCards: 'native-cards.js',
  MaraoNativeCardEditor: 'native-card-editor.js',
  MaraoDashboardSettings: 'dashboard-settings-dialog.js',
  MaraoOrdinaryMigration: 'ordinary-migration-ui.js',
  MaraoTheme: 'native-theme.js',
  MaraoHistoryData: 'history-data.js',
  MaraoHistoryChart: 'history-chart.js',
};
const generatedFiles = [...Object.keys(entries).map(name => name + '.js'),
  'marao-owned-assets.json', 'YAML.LICENSE.txt', 'ChartJS.LICENSE.txt', 'KurkleColor.LICENSE.txt'];
// These are generated outputs of the retired builder, never user-owned assets.
const retiredFiles = ['MaraoDashboardPanel.js', 'MaraoDashboardPanel.css', 'MaraoLovelaceEditor.js',
  'MaraoSourceImport.js', 'MaraoFloorPlanEditor.js', 'MaraoDashboardEditorLabels.js',
  'MaraoDashboardJsonEditor.js', 'MaraoDashboardJsonPreparation.js', 'MaraoDashboardJsonEditor.css',
  'MaraoDashboardEditorWorker.js', 'MaraoDashboardJsonWorker.js', 'MonacoEditor.LICENSE.txt'];
const managedFont = file => /^assets[/\\][^/\\]+-[A-Z0-9]{8}\.ttf$/.test(file);

function sameFile(left, right) {
  return fs.existsSync(left) && fs.existsSync(right) && fs.readFileSync(left).equals(fs.readFileSync(right));
}
function listFiles(root, prefix = "") {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(path.join(root, entry.name), relative) : [relative];
  }).sort();
}
async function build() {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-native-editor-'));
  try {
    const sourceFiles = listFiles(frontendRoot).filter(file => !retiredFiles.includes(file) && !managedFont(file)
      && !/(?:^|\/)(?:\.DS_Store|__pycache__)(?:\/|$)|\.py[co]$/.test(file));
    const ownedAssets = [...new Set([...sourceFiles, ...generatedFiles])].sort();
    fs.writeFileSync(path.join(outputRoot, 'marao-owned-assets.json'), JSON.stringify(ownedAssets) + '\n');
    const result = await esbuild.build({
      entryPoints: Object.fromEntries(Object.entries(entries).map(([name, file]) => [name, path.join(repoRoot, 'frontend_src', file)])),
      bundle: true, entryNames: '[name]', assetNames: 'assets/[name]-[hash]', format: 'esm', legalComments: 'eof',
      loader: {'.ttf': 'file'}, minify: true, metafile: true, outdir: outputRoot, platform: 'browser', target: 'es2022',
      plugins: [{
        name: 'marao-owned-assets',
        setup(build) {
          build.onLoad({filter: /[/\\]marao-owned-assets\.json$/}, () => ({contents: JSON.stringify(ownedAssets), loader: 'json'}));
        },
      }, {
        name: 'marao-owned-theme',
        setup(build) {
          build.onLoad({filter: /[/\\]themes[/\\]MaraoDashboard[/\\]marao-dashboard\.yaml$/}, ({path: filename}) => ({contents: JSON.stringify(require('yaml').parse(fs.readFileSync(filename, 'utf8'))), loader: 'json'}));
        },
      }],
    });
    for (const [file, details] of Object.entries(result.metafile.outputs)) {
      const inputs = Object.keys(details.inputs);
      if (inputs.some(input => /node_modules\/monaco-editor\/|frontend_src\/(?:MaraoDashboardPanel|json-[^/]+)\./.test(input))) {
        throw new Error('The native frontend must not include the retired dashboard builder or Monaco: ' + path.basename(file));
      }
      if (!file.endsWith('MaraoHistoryChart.js') && inputs.some(input => /node_modules\/(chart\.js|@kurkle\/color)\//.test(input))) {
        throw new Error('Chart.js must remain in the on-demand numeric detail bundle.');
      }
    }
    fs.copyFileSync(path.join(repoRoot, 'node_modules', 'yaml', 'LICENSE'), path.join(outputRoot, 'YAML.LICENSE.txt'));
    for (const [dependency, filename] of [['chart.js', 'ChartJS.LICENSE.txt'], ['@kurkle/color', 'KurkleColor.LICENSE.txt']]) {
      fs.copyFileSync(path.join(repoRoot, 'node_modules', dependency, 'LICENSE.md'), path.join(outputRoot, filename));
    }
    for (const name of Object.keys(entries)) {
      const source = fs.readFileSync(path.join(outputRoot, name + '.js'), 'utf8');
      if (/cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/.test(source)) throw new Error('Native frontend assets must not load runtime code from a CDN.');
    }
    const expected = [...generatedFiles, ...listFiles(path.join(outputRoot, 'assets'), 'assets')].sort();
    const stale = expected.filter(relative => !sameFile(path.join(outputRoot, relative), path.join(frontendRoot, relative)));
    const obsolete = [...retiredFiles.filter(relative => fs.existsSync(path.join(frontendRoot, relative))),
      ...listFiles(path.join(frontendRoot, 'assets'), 'assets').filter(relative => managedFont(relative) && !expected.includes(relative))];
    if (check) {
      if (stale.length || obsolete.length) throw new Error('Native editor bundle is stale. Run npm run build:editor.\n' + [...stale, ...obsolete].join('\n'));
    } else {
      for (const relative of stale) {
        const destination = path.join(frontendRoot, relative);
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.copyFileSync(path.join(outputRoot, relative), destination);
      }
      for (const relative of obsolete) fs.rmSync(path.join(frontendRoot, relative));
    }
  } finally { fs.rmSync(outputRoot, {recursive: true, force: true}); }
}
build().catch(error => { console.error(error.message || error); process.exitCode = 1; });
