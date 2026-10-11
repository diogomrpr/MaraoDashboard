# Design

## Context

See [proposal.md](proposal.md) for the symptom and scope assumption. This design resolves the editor choice, touch-control approach and compatibility with the separate startup proposal before implementation.

The existing path is administrator panel → configuration/catalog/entity metadata → shared local model → `_switchTab` → `_ensureMonaco` → JSON model and diagnostics → `_save` → backend validation and YAML generation. `frontend_src/editor-model.js` builds the schema and preserves unknown options/raw cards. The editor is pinned to Monaco 0.56.0, packaged by esbuild with local editor/JSON workers and CSS. No new editor is necessary. Microsoft's [Monaco README](https://github.com/microsoft/monaco-editor/blob/main/README.md) identifies it as the editor derived from VS Code and notes that mobile browsers are not officially supported.

Current editor options include JSON language, automatic layout, formatting and two-space indentation, but no explicit folding presentation. Pinned defaults are `folding: true`, `foldingStrategy: "auto"` and `showFoldingControls: "mouseover"`. JSON folding ranges are enabled in its language defaults. A read-only build inspection confirmed folding registration, formatting, suggestions, hover and find in the current bundle; importing the full editor/language collection is not justified. In the running JSON tab, the visible expanded lists had no folding decorations even after the view loaded. This establishes the failure, not whether its remaining cause is range production, controller activation or shadow-root rendering.

The screenshot also shows a diagnostic marker on the disposable weather selection. The fixture document uses `sensor.marao_dashboard_test_weather`, while the schema's weather suggestions/enum accept `weather.*`. That mismatch must be reconciled at the fixture/schema contract; do not disable schema diagnostics to make the browser check pass.

## Goals / Non-Goals

**Goals:** Restore structural folding through the installed editor, make it practical on touch screens, and preserve the current document and JSON assistance. Prove the behavior through a real rendered editor, not only configuration flags.

**Non-Goals:** A full VS Code workbench, iframe/server/add-on, extension marketplace, direct YAML editing, extra languages, a replacement parser, new dependencies, persistent fold preferences, a toolbar of unrelated editing commands or a duplicate Monaco instance. Dashboard-card set: empty. No runtime card/theme token/generator contract changes are planned.

## Decisions

### 1. Fix the existing folding path and retain JSON assistance

Use the current Monaco instance/model and built-in structural folding, explicitly enabling folding with the JSON language's automatic strategy. In the focused browser regression, isolate whether the installed editor exposes supported fold/unfold actions, whether its local JSON worker returns ranges for a valid nested fixture, and whether those ranges hide/show the correct lines. Compare that result with rendered decorations and loaded CSS. Correct only the failing initialization/provider/rendering boundary. Do not claim setting one option alone fixes the reproduced absence.

Keep schema validation, schema/entity completions, formatting, indentation, undo/redo and find. Use Monaco's supported public actions/APIs; avoid production access to private folding controllers. Do not hand-build a JSON parser or force indentation-only folding to mask a broken JSON worker. Full `editor.main` imports or another editor would duplicate an installed capability and increase download/evaluation cost without establishing the cause.

### 2. Use native touch controls for the current region

Add two localized, always-visible native buttons beside Format JSON: **Collapse region** and **Expand region**. The user places the caret on or inside the list/object and activates the corresponding built-in editor action. The buttons wrap with the existing actions row, have internal accessible names, remain visibly at least 48 × 48 CSS pixels and do not require hover. Restore editor focus before running the action without changing its selection. An inapplicable command is a harmless no-op and never changes the draft.

Set `showFoldingControls: "never"` to avoid retaining Monaco's small mouse-oriented gutter targets as a second inaccessible interaction path. Keep the editor's collapsed-region indicator and native keyboard fold/unfold commands. The identifiable collapsed range supplies the view state; the toolbar labels explicitly describe the operation. This uses two small semantic controls rather than enlarging every source line to 48 pixels or maintaining custom fold buttons for each virtualized gutter row. Source text keeps its existing scalable presentation and editing behavior. Do not add hover-only affordances, hidden enlarged hit areas or visible focus-only styling.

Add English/Portuguese labels to the panel's existing text catalog. Keep controls unavailable until the editor exists and respect the loading/error handling established by the startup change. No new toolbar command framework or general preference is needed.

### 3. Keep folding separate from the document

Fold/unfold actions operate on the editor view; `_save` must still read the entire model value, never visible DOM text. Fold operations must not call `setValue`, serialization, generation or the model-content dirty handler. Reuse the live editor across tab switches; `_setEditorSource` already avoids replacement when the source string is unchanged. Preserve that behavior and the view state for an unchanged document. When actual Visual edits, formatting, discard or restore replace/change text, let Monaco recompute ranges; do not apply stale line-number folds to another source.

Use nested valid arrays/objects, unknown fields and raw cards to prove hidden content survives validation and save. Include invalid JSON/configuration inside a collapsed region to verify diagnostics and invalid-JSON tab protection still apply. Save checks must use safe fixture configuration, preserve the disposable baseline and restore it through the existing workflow. No silent autosave or stored-data migration.

### 4. Compose with `improve-editor-startup`

If folding is applied first, change the current editor creation/options and panel toolbar; the startup change must carry those settings/actions into its deferred JSON module intact. If startup is applied first, work in that module and use its ready/loading hooks. Both orders use a single editor instance and the same local model.

Keep folding, JSON providers, CSS and workers in the existing local JSON resource graph. Do not reintroduce eager Monaco imports, CDN loading or unrelated languages, or weaken the startup proposal's eager-size budgets. Keep the worker/static URL fingerprints and generated asset inventory aligned. Avoid duplicating lifecycle/retry machinery from the other change.

### 5. Verify the actual interaction and document boundaries

Use the pinned Playwright dependency and `ha-test/client` disposable authentication/target guards for a focused editor browser check under `tests/`. Reuse the editor-startup browser check if it exists at implementation time; otherwise add one narrow check, not a new framework. Use safe, non-secret nested configuration in test-only fixtures or a mocked read response. Never store administrator document bodies/tokens in public traces.

Assert folding and unfolding reduce/restore rendered content for the selected array/object, nested and sibling independence, keyboard equivalence, unchanged full source/dirty state/undo history, unchanged-tab view preservation, reflow and localized toolbar sizing. Check format, schema/entity assistance, invalid content, discard/restore and saving folded content using the existing model/generator checks where applicable. Valid fixtures must have no diagnostics; invalid fixtures must have the expected readable error. Resolve the identified weather fixture mismatch at its source and keep any changed weather example aligned in Cases and its realistic page.

Run the focused browser/model check plus `npm run build:editor` and `npm run check:editor`. Stage/package checks are needed only if the asset inventory changes. No full gallery audit or icon-only card alignment run is needed for the editor-only fold controls. If a fixture correction changes a rendered weather card, add that card to the affected set, run its focused check and inspect both its Cases and realistic-page examples.

## Risks / Trade-offs

- Monaco officially excludes mobile support → Marao owns verification on its automated 320px/iPhone/Android portrait/landscape profiles, both themes and normal/bold/200% text/200% zoom/bold plus 200% text. Report real iPhone/Safari verification only if actually performed.
- Selecting a region before using the toolbar is less immediate than a desktop gutter arrow → keep two concise, always-visible touch buttons and document caret-based operation; do not retain undersized interactive gutter controls.
- Restoring folds after a changed document could hide wrong lines → preserve only unchanged-editor view state and let changed models recompute folding normally.
- A passing build can still ship broken worker/provider/CSS behavior → assert real collapsed/expanded output, completion/validation availability, console/resource health and repeat navigation.
- Separate startup work could lose the fix or duplicate the editor → exercise the resulting deferred entry and both first/repeated JSON activation after combining changes.

## Migration Plan

No user installation, configuration or data migration. Rebuild owned assets from source and use the existing dry-run/sync workflow only for disposable `192.168.0.28`; confirm its served fingerprint. Keep detailed screenshots/logs ignored.

After the final edit and focused automated check, finish with visual and interactive inspection of the JSON editor and any newly affected weather fixture cards on the required mobile/text/theme profiles. Check toolbar wrapping, semantic labels, alignment, source clipping/scrolling, collapsed indicators, JSON assistance, tab/draft behavior and console/resource errors. Confirm a representative generated page retains the saved folded content. The unaffected gallery does not need duplicate editor examples.

Rollback restores the previous complete editor asset set and any changed safe fixtures, then reloads; saved administrator configuration must remain intact. Publishing is a separate action and requires `npm run verify:publish` before any push/tag/release plus the published-commit CI gates.

## Confirmed implementation findings — 2026-10-10

A read-only browser interception of the saved-release editor on the disposable
instance reproduced the defect: `editor.fold` was absent and the selected room
lines retained identical positions. The initial editor was created before the
installed JSON language's asynchronous worker bridge registered its editor
contributions. The current deferred JSON entry registers that same installed
bridge before standalone services initialize, then waits for its worker before
creating the editor. Public JSON worker ranges and fold/unfold actions now hide
and restore nested room arrays, independently of siblings. No full editor/main
import, extra languages, parser or private folding controller is used.

The user separately approved a narrow build-time HTTP clipboard guard: Monaco's
iPhone workaround assumes a Clipboard API that HTTP does not expose. The guarded
method retains the existing fallback and the build rejects an unrecognized
upstream method. Native worker failures now settle JSON initialization and offer
localized explicit retry. These fixes are shared with `improve-editor-startup`.

The safe weather fixture now uses modern native template weather with the same
condition helper, temperature and forecast attributes. Cases expansion uses its
`condition` field for neutral states. Weather and Header are therefore included
in the final affected-card set, with their existing Cases and Overview examples;
no shipped card behavior or stored administrator configuration format changed.
