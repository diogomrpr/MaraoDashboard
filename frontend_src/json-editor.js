import * as monaco from "monaco-editor/editor/editor.api";
import { getWorker, jsonDefaults } from "monaco-editor/language/json/monaco.contribution";
// Register the installed JSON worker bridge before a model initializes standalone services.
import "monaco-editor/internal/common/workers";
import { buildJsonSchema } from "./editor-model.js";

const version = new URL(import.meta.url).searchParams.get("v");
let workerError;
self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    const file = label === "json" ? "MaraoDashboardJsonWorker.js" : "MaraoDashboardEditorWorker.js";
    const url = new URL(`./${file}`, import.meta.url);
    if (version) url.searchParams.set("v", version);
    const worker = new Worker(url, { type: "module" });
    const reject = workerError;
    worker.addEventListener("error", () => reject?.(), { once: true });
    return worker;
  },
};

export async function createEditor(host, value, catalog, entities, workerFailure) {
  const schema = buildJsonSchema(catalog, entities);
  jsonDefaults.setDiagnosticsOptions({ validate: true, allowComments: false, schemas: [{ uri: schema.$id, fileMatch: ["*"], schema }] });
  monaco.editor.defineTheme("marao-light", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#ffffff" } });
  monaco.editor.defineTheme("marao-dark", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#111827" } });
  const model = monaco.editor.createModel(value, "json");
  const failed = new Promise((_resolve, reject) => { workerError = () => reject(new Error(workerFailure)); });
  try {
    await Promise.race([failed, (async () => {
      const worker = await (await getWorker())(model.uri);
      await worker.doValidation(model.uri.toString());
    })()]);
    const typography = getComputedStyle(host);
    return monaco.editor.create(host, {
      fontFamily: typography.fontFamily, fontSize: parseFloat(typography.fontSize), fontWeight: typography.fontWeight,
      model, folding: true, foldingStrategy: "auto", showFoldingControls: "never", automaticLayout: true, minimap: { enabled: false },
      formatOnPaste: true, formatOnType: true, scrollBeyondLastLine: false, tabSize: 2,
    });
  } catch (error) { model.dispose(); throw error; }
  finally { workerError = null; }
}

export function setTheme(dark) { monaco.editor.setTheme(dark ? "marao-dark" : "marao-light"); }

export { getWorker };
