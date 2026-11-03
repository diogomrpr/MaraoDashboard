# Proposal

## Why

Marao uses ordinary Home Assistant storage dashboards, but external agents lack installed-version native-card definitions and cannot rely on an open browser to reconcile managed popups. Provide portable, read-only authoring support so existing ha-mcp tools can save coherent, reviewed changes.

## What Changes

- Publish installed-version metadata, native configuration JSON Schema, examples and an agent guide through the release manifest.
- Ship a local Node CLI for describing, validating and planning dashboard edits with the existing shared validators and popup planner.
- Return coherent parent/source documents, ownership diagnostics and bounded MCP-compatible JSON Patch operations without network access or writes.
- Document fresh-read/hash, review, save and authoritative-readback recovery responsibilities.

## Capabilities

### New Capabilities

- `agent-dashboard-authoring`: Versioned discovery and portable read-only planning for ordinary HA dashboard edits.

### Modified Capabilities

None. Existing native-dashboard-editing and navigation-popups contracts remain authoritative; external explicit authoring reuses their preservation and ownership rules.

## Impact

All public native Marao families, supported generic/legacy aliases, navbar settings and managed popup sources are described. Changes affect frontend build/package metadata, pure authoring code, documentation and targeted Node tests. No Python backend, MCP server, UI redesign, new dependencies, production access or automatic device actions. Metadata is additive; root settings and managed-popup versions remain 1, saved configurations stay unchanged on installation, and historical source schemas/fixtures remain immutable. Agents are assumed to have local Node execution alongside ha-mcp; direct end-to-end MCP connectivity is not claimed.
