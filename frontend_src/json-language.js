export function publishDiagnostics(monaco, model, identity, diagnostics) {
  if (model.isDisposed() || model.uri.toString() !== identity.uri || model.getVersionId() !== identity.version) return false;
  const severity = monaco.MarkerSeverity;
  monaco.editor.setModelMarkers(model, 'marao-json', diagnostics.map(issue => ({
    severity: ({ 1: severity.Error, 2: severity.Warning, 3: severity.Info, 4: severity.Hint })[issue.severity] || severity.Hint,
    startLineNumber: issue.range.start.line + 1, startColumn: issue.range.start.character + 1,
    endLineNumber: issue.range.end.line + 1, endColumn: issue.range.end.character + 1,
    message: issue.message, code: issue.code == null ? undefined : String(issue.code), source: issue.source,
  })));
  return true;
}
