# Design

## Context

See [proposal.md](proposal.md) for the outcome and [the card delta](specs/card-behaviors/spec.md) for acceptance. Inspection began at `e613bf85422a9b749e58c0618f7f9c5327c6e2dc`. This change contains planning artifacts only; unrelated popup-editing work is outside its scope.

`MaraoCards.js` currently holds an eight-entry brand array. `mediaAppBrand()` matches a normalized source, falling back to the configured name only when no source exists. The result controls both artwork and normal brand colors. Images already exist under `frontend/media-apps/` and in HACS `dist/`, with provenance in `SOURCES.md`.

The native editor uses the shipped catalog and shared `ha-form` methods. Standalone app cards expose source/name/icon; `_openMediaOptions()` exposes the same data for nested apps. `createMediaContent()` composes nested app entries into the shared app role for popup and inline media. Its current mapping copies the source but has no explicit logo field. Metadata/starter and retained Python generation mappings construct equivalent cards.

The baseline card spec still uses historical `hc_*` wording. The accepted `use-md-card-namespace` change and current code establish `md_*` as the current names with historical compatibility. This proposal preserves those effective identifiers and the native editing ownership established by `use-home-assistant-dashboard-editor`; it does not restore the retired builder or its save workflow.

## Goals / Non-Goals

**Goals:** Reuse one small brand definition for available choices, source aliases and presentation. Apply explicit choices uniformly to standalone, inline and popup shortcuts while keeping launch configuration independent.

**Non-Goals:** No new icon namespace, asset upload system, image service, media discovery, global dashboard writer or artwork redesign. Keep the existing native editor, app tile geometry, semantic names and authoritative availability handling.

## Decisions

### 1. Share the existing brand metadata

Move the existing array and its matching logic into a small shipped `MaraoMediaApps.js` module, adding human-readable brand labels. The runtime, editor choice builder and JavaScript validation consume that definition. Keep `mediaAppBrand()` available to existing consumers/tests through a compatible export if needed.

Resolve files relative to the installed runtime module using Marao's current asset URL mechanism, including the flat HACS graph. Do not store filesystem paths, package identities or image URLs in card configuration. Retain the existing files, brand colors, symbol styling and source credits.

Alternative considered: duplicate the eight choices in each editor or expose the full card runtime to the editor. A small shared data/helper module avoids drift and runtime side effects without adding a registry framework or dependency.

### 2. Store an optional logo ID separately from the source

Use `variables.app_logo` for standalone/generic app cards and `logo` on each nested app entry. The values are the existing brand IDs: `netflix`, `spotify`, `youtube`, `disney-plus`, `prime-video`, `apple-tv`, `plex`, `meo`.

An omitted or empty value means Automatic. The editor's Automatic choice clears an existing override through the normal field patcher. Opening an editor must not materialize defaults. Resolution checks an explicit valid logo first; otherwise it follows the exact current source/name matching rule and configured-icon fallback. The chosen brand supplies both artwork and its normal surface palette; availability/error presentation keeps precedence.

Reject unsupported nonempty IDs in the shared JavaScript validation/runtime configuration path with a localized error. Never interpret an ID as a URL. Preserve invalid saved data for correction rather than replacing it or writing guessed defaults.

Alternative considered: infer a logo by changing the source or write a bundled image URL into `icon`. Both couple appearance to launch behavior or package URLs and would undermine existing custom settings.

### 3. Reuse native forms and complete configuration events

Add an App logo field to the existing catalog/form path. Build a native dropdown from the shared brand list, with a localized Automatic option. Brand names stay recognizable; English and Portuguese UI labels/help/errors belong in `frontend_src/editor-labels.js`. HA's existing card preview shows the result; no separate logo-browser UI is needed.

Use the same choice helper in `_openMediaOptions()` for app add/edit dialogs. Continue patching only changed fields and spreading existing app objects, preserving unknown data, source strings, fallback icons, order and cancellation behavior. Keep normal form control sizing and surrounding Marao typography. No theme-token or app-grid changes are required.

### 4. Carry the choice through every existing app-card mapping

| Boundary | Required handling |
| --- | --- |
| `frontend_src/native-card-editor.js`, `card-form-tools.js` | Expose/patch standalone and nested choices without altering sibling fields. |
| `frontend_src/editor-model.js` | Validate optional IDs and describe the standalone/nested fields in existing schemas. |
| Shipped `marao-catalog.json`, Python `editor.py` catalog | Keep the optional standalone setting aligned; no saved default is inserted. |
| `frontend_src/card-composition.js` | Map nested `logo` to child `variables.app_logo` for the common inline/popup content. |
| `frontend_src/native-metadata.js`, Python `editor.py` media metadata | Preserve the option when an existing app entry becomes a standalone descriptor. |
| Retained `generator.py` media-view/popup mappings | Preserve the same optional choice where these supported compatibility paths construct app cards; absent choices leave existing output unchanged. |
| `MaraoCards.js` | Use one selected brand for artwork and normal surface presentation, preserving action payloads and problem handling. |
| `build-editor.cjs`, `build-native.cjs` | Rebuild owned bundles and flat HACS assets with the shared module and all eight existing images. |

This is additive configuration support, not a new builder, integration API or generation-on-reload behavior. Historical saved inputs and archived generated outputs remain immutable.

### 5. Demonstrate and verify only the changed contract

Update the existing Media app documentation/playground and safe `ha-test` examples with one explicit-logo/custom-source case and a representative nested app; retain an Automatic example. Keep fixtures outside shipped code. Document the eight available names, YAML fields, source independence and Automatic fallback.

Use small assertions in existing tests for: explicit versus automatic resolution and unchanged source dispatch; standalone/nested edit preservation and invalid IDs; composition into popup/inline children; and all selectable assets resolving in the built HACS package. Extend existing media tests rather than creating a browser harness or gallery matrix. Capture a task snapshot at implementation start and review the selector's behavior plan for `labels`, `native-source` and `packaging`; that plan does not require running every mapped suite. Add a narrow existing generator assertion only for mappings actually changed.

Routine visual review belongs to the user. No new automated browser, transport, camera, full-suite or mobile-matrix work is implied. Confirm installation with the existing helper's asset/readiness checks.

## Risks / Trade-offs

- **Selection disappears in a composed shortcut** → Cover the existing mapping boundaries, including standalone descriptors derived from nested options, with independent expected field values.
- **Appearance changes which app launches** → Keep logo IDs out of source/action data and assert the original target/source payload after a logo change.
- **A choice works in source layout but fails in HACS** → Reuse the asset resolver and assert each selected image exists and resolves in the flat release graph.
- **Artwork obscures availability or errors** → Reuse current problem priority and disabled behavior; selection must not change them.
- **Known logos are useful with custom source names** → Offer all bundled choices independently of the entity's source list; selecting a logo does not promise that its app exists on the player.

## Migration Plan

No source-format or config-entry migration is required. Inspected v0.20.0 and v0.21.1 saved-source fixtures have no `logo`/`app_logo` fields. Their independently expected transformation is unchanged: no choice is inserted and no existing value is rewritten. Extend current opt-in expectations rather than rewriting provenance-backed historical fixtures.

Implementation rebuilds owned editor/HACS assets and batches installation on disposable `192.168.0.28` after final edits. Use `prepareFrontend()` directly for compatible frontend-only changes; use one `ha:sync` when the planned Python or fixture updates require full preparation. Preserve the current dashboard/configuration and safe helper state through existing preparation/backup behavior. Do not automatically save a dashboard when rendering or loading the package.

If rollback is needed after deliberate test configuration edits, restore the matching saved package and exact affected dashboard/configuration snapshot together through existing recovery tools, checking for concurrent edits first. Keep exact backups until readiness succeeds and report recovery failures. This planning workflow performs no deployment or dashboard writes.
