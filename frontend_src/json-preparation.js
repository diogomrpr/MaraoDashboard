// JSON-only initialization stays outside the eager Visual bundle.
export async function prepareJson(current, attempt, serializeConfig) {
await this._jsonStage('module', async () => {
  const module = this._jsonModule ? Promise.resolve(this._jsonModule) : (async () => {
    const url = new URL(this._jsonUrl('MaraoDashboardJsonEditor.js', true));
    if (attempt > 1) url.searchParams.set('retry', String(attempt));
    const value = await import(url.href); if (current()) this._jsonModule = value; return value;
  })();
  const styled = this._jsonStyled ? Promise.resolve() : new Promise((resolve, reject) => {
      const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = this._jsonUrl('MaraoDashboardJsonEditor.css');
      style.onload = () => { this._jsonStyled = true; this._jsonCancel = null; resolve(); };
      style.onerror = () => { style.remove(); reject(new Error(this._t('jsonStylesFailed'))); };
      this._jsonCancel = () => { style.remove(); reject(new Error(this._t('jsonStylesFailed'))); };
      this.shadowRoot.append(style);
    });
  await Promise.all([module, styled]);
});
if (!current()) return;
await this._jsonStage('context', () => this._ensureEditorContext());
if (!current()) return;
const editor = await this._jsonStage('editor', async () => {
  await this._ensureEditorContext();
  return this._jsonStage('schema-model', () => this._jsonModule.createEditor(this.shadowRoot.getElementById('monaco'), this._jsonDraft ?? this._source(), this._catalog, this._entities, this._t('jsonWorkerFailed'), this._t('jsonIconsFailed'), {
  draft: serializeConfig(this._model), dashboardUrl: this._dashboardUrl,
  stage: (name, action) => this._jsonStage(name, action),
  source: () => this._jsonDraft ?? this._source(),
}));
});
if (!current()) { editor.getModel()?.dispose(); editor.dispose(); return; }
this._monaco = editor;
this._setEditorSource(this._jsonDraft ?? this._source());
await this._ensureEditorContext();
await this._jsonStage('assistance', () => {
  this._jsonAssistance = this._jsonModule.installJsonAssistance(editor, this.shadowRoot.getElementById('monaco'), this._catalog, this._entities, serializeConfig(this._model), this._dashboardUrl);
});
if (!current()) return;
this.shadowRoot.getElementById('monaco').addEventListener('json-assistance-error', event => this._setStatus(this._error(event.detail), 'error'), { signal: (this._jsonEvents = new AbortController()).signal });
this._setMonacoTheme();
editor.onDidChangeModelContent(() => {
  if (this._settingEditor || this._busy) return;
  this._jsonDraft = editor.getValue(); this._dirty = this._jsonDraft.trim() !== this._savedSource.trim(); this._updateHeader();
});
this._setEditorSource(this._jsonDraft ?? this._source());
this._jsonReadyAt = performance.now();
}
