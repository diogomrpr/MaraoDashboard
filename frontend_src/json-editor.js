import './json-locale.js';
import * as monaco from "monaco-editor/editor/editor.api";
import { getWorker, jsonDefaults } from "monaco-editor/language/json/monaco.contribution";
// Register the installed JSON worker bridge before a model initializes standalone services.
import "monaco-editor/internal/common/workers";
import { buildJsonSchema } from "./editor-model.js";
import { publishDiagnostics } from './json-language.js';
import iconFont from '../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf';

const version = new URL(import.meta.url).searchParams.get("v");
let workerError;
let iconsReady;
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

export async function createEditor(host, value, catalog, entities, workerFailure, iconFailure = 'JSON icons could not load.', options = {}) {
  let draft; try { draft = JSON.parse(value); } catch { draft = options.draft || {}; }
  // The installed adapter publishes responses without a document-version guard.
  // Publish the same worker diagnostics with a document-version guard.
  jsonDefaults.setModeConfiguration({ ...jsonDefaults.modeConfiguration, diagnostics: false });
  const model = monaco.editor.createModel(value, "json");
  const schema = buildJsonSchema(catalog, entities, draft, options.dashboardUrl?.split('/').slice(0, 2).join('/') || '/marao-dashboard');
  jsonDefaults.setDiagnosticsOptions({ validate: true, allowComments: false, enableSchemaRequest: false, schemas: [{ uri: schema.$id, fileMatch: [model.uri.toString()], schema }] });
  const failed = new Promise((_resolve, reject) => { workerError = () => reject(new Error(workerFailure)); });
  let messages;
  try {
    iconsReady ||= (async () => {
      const url = new URL(iconFont, import.meta.url); if (version) url.searchParams.set('v', version);
      const font = new FontFace('codicon', `url("${url.href}")`);
      await font.load(); document.fonts.add(font);
    })().catch(() => { iconsReady = null; throw new Error(iconFailure); });
    await iconsReady;
    await Promise.race([failed, (async () => {
      const worker = await (await getWorker())(model.uri);
      await worker.doValidation(model.uri.toString());
    })()]);
    messages = document.createElement('div'); host.append(messages);
    const editor = monaco.editor.create(host, {
      ariaContainerElement: messages,
      // Use the standard textarea input path for reliable mobile typing/paste.
      editContext: false,
      model, automaticLayout: true, showFoldingControls: 'always',
      fixedOverflowWidgets: true,
    });
    editor.onDidDispose(() => messages.remove());
    editor.maraoSchemaKey = JSON.stringify([catalog, entities, draft?.pages?.map?.(page => page.path)]);
    return editor;
  } catch (error) { messages?.remove(); model.dispose(); throw error; }
  finally { workerError = null; }
}

export function setTheme(dark) { monaco.editor.setTheme(dark ? 'vs-dark' : 'vs'); }

export function installJsonAssistance(editor, host, catalog, entities, draft, dashboardUrl) {
  const model = editor.getModel();
  let disposed = false, timer, request = 0, schemaKey = editor.maraoSchemaKey, metadataDraft = draft;
  async function refresh() {
    if (disposed || model.isDisposed()) return;
    const version = model.getVersionId(), current = ++request;
    host.setAttribute('aria-busy', 'true');
    try {
      let parsed; try { parsed = JSON.parse(model.getValue()); } catch { parsed = metadataDraft; }
      const key = JSON.stringify([catalog, entities, parsed?.pages?.map?.(page => page.path)]);
      if (key !== schemaKey) {
        schemaKey = key; metadataDraft = parsed;
        const schema = buildJsonSchema(catalog, entities, parsed, dashboardUrl?.split('/').slice(0, 2).join('/') || '/marao-dashboard');
        jsonDefaults.setDiagnosticsOptions({ validate: true, allowComments: false, enableSchemaRequest: false,
          schemas: [{ uri: schema.$id, fileMatch: [model.uri.toString()], schema }] });
      }
      const worker = await (await getWorker())(model.uri);
      const diagnostics = await worker.doValidation(model.uri.toString());
      if (disposed || current !== request || version !== model.getVersionId()) return;
      publishDiagnostics(monaco, model, { uri: model.uri.toString(), version }, diagnostics);
      host.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (!disposed && current === request && version === model.getVersionId()) {
        host.setAttribute('aria-busy', 'false');
        host.dispatchEvent(new CustomEvent('json-assistance-error', { detail: error, bubbles: true, composed: true }));
      }
    }
  }
  const change = editor.onDidChangeModelContent(() => {
    host.setAttribute('aria-busy', 'true'); monaco.editor.setModelMarkers(model, 'marao-json', []);
    clearTimeout(timer); timer = setTimeout(refresh, 150);
  });
  const api = {
    updateMetadata(nextCatalog, nextEntities, nextDraft) { catalog = nextCatalog; entities = nextEntities; metadataDraft = nextDraft; refresh(); },
    dispose() { if (disposed) return; disposed = true; clearTimeout(timer); change.dispose(); host.removeAttribute('aria-busy'); },
  };
  editor.onDidDispose(() => api.dispose()); refresh();
  return api;
}

export { getWorker };
