# Design

## Context

See [proposal.md](proposal.md) for scope, measured motivation and the affected-card set, and [the builder delta](specs/visual-builder/spec.md) for behavior. Design is required because this performance change crosses rendering, focus/gesture lifetime, source replacement and browser verification.

`MaraoDashboardPanel.js` builds the Visual view through `_renderVisual`, which replaces `#visual-view` contents. `_renderPageManager` creates all section/card rows before setting expansion state. `_roomAction`, `_pageAction`, `_commitCardMove` and card/group/media dialog completions repeatedly call the full renderer. General text changes already update the model without a full render and should keep that behavior. `_switchTab` currently normalizes and rebuilds Visual even when returning from unchanged JSON.

The canonical document is format 2. `editor-model.js` owns normalization, ordered serialization, card occurrence identities, page operations and preservation. `config/get` converts supported historical sources read-only before the current page manager uses them; legacy JSON similarly goes through the existing server preview. Existing fallback renderers are not a second migration surface to redesign. The shared drag helper binds to the shadow root and resolves targets from current section geometry; it must remain bound once through partial updates.

Current tests cover panel/model semantics, canonical pages, page management, JSON continuity and actual touch moves. `tests/measure-ha-editor.js` still enlarges `model.rooms`, which does not enlarge a format-2 page array, and assumes a ready document contains an entity row. Both assumptions need correction to measure this change. `tests/verification-map.js` currently maps panel changes primarily to `editor-ui`; the affected refresh/drag/JSON/performance checks need an explicit bounded mapping.

## Goals / Non-Goals

**Goals:** Keep the complete model authoritative while reducing mounted native controls and repeated component initialization. Make update scope explicit and preserve page identity, focus, current actions and cleanup through every shared mutation path.

**Non-Goals:** A generic diff engine, framework, new dependency, background rendering queue, persistent preference store or alternative serializer. The server API, runtime cards, native HA dashboard editor and generated output are outside this presentation change.

## Decisions

### 1. Keep the shell stable and use explicit update boundaries

Split rendering into the existing stable shell, page headers, mounted section bodies, General form and navbar. Add a small set of direct update helpers in the panel, rather than a general rendering framework. Reuse `_entityList`, `_entityRow`, catalog-backed forms and model operations. Full reconstruction is appropriate for first load and validated document replacement; it is not the fallback for routine mutations.

Apply the same refresh policy to every shared caller:

| Mutation | Required refresh |
| --- | --- |
| Add/edit/delete/reorder card, group, scenes or attached media options | Affected mounted section; dirty/status feedback and deliberate focus restoration |
| Same-page section transfer | Source and destination sections once; moved occurrence focus |
| Section layout/add/remove/reorder | Changed section structure, positions and relevant page controls; retain unaffected section bodies where their data is unchanged |
| Page reorder | Move existing header/body containers and update current positional metadata and boundary buttons |
| Pin/unpin or navbar reorder | Navbar and affected header pin state; retain page bodies and General inputs |
| Page rename/edit | Changed header, dependent page selectors and visible owned shortcut/reference labels; update closed pages through the model only |
| Page creation/duplication/deletion | Insert/remove the relevant container, reconcile affected references and selectors, and update adjacent positions/actions |
| Accepted source replacement | Reconcile expansion identity, rebuild from the accepted complete model and invalidate obsolete UI work |

Use one delegated action listener on the stable page-manager boundary, or equivalent once-bound handlers that resolve current coordinates at dispatch. Do not leave closures with stale indices after page/section reordering. Reuse existing `movePageCard`, `renamePage`, `duplicatePage`, `deletePage` and serialization; no parallel mutation implementation. Refresh dependency sets explicitly, including page references changed by rename/delete, rather than rebuilding unrelated controls defensively.

Alternative: replacing only the whole page manager would still recreate unrelated page controls. Replacing a changed section is a sufficient first boundary; row-level diffing is unnecessary.

### 2. Mount body controls only while a page is expanded

Create all page headers immediately. On the first successful saved-source load in a fresh panel, initialize expansion with only `landing_page`. Empty and raw-only landing pages are valid and need no row sentinel. A page's body is built from the current model on expand and removed on collapse; the header and complete model remain. Reopening rebuilds one page and cannot reuse stale body data. Multiple pages may stay open, and deliberately creating/duplicating a page also expands the new page.

Opening or collapsing a page calls neither `_setDirty` nor a management request. Do not create hidden body controls, discover entities or populate templates to make an unopened page appear complete. Keep the existing localized empty/raw-card guidance and touch-sized native expansion affordance. Ignore bubbled expansion events belonging to another panel. Stop an active gesture before removing its source or destination controls.

Alternative: retaining every body after first opening is cheaper to reopen but accumulates controls indefinitely. Unmounting on collapse gives a clear bound and makes the latest model the only source for a reopened body. Viewport virtualization would add measurement/placeholders and scrolling complexity without being needed for the chosen page-level bound.

### 3. Keep identities and presentation state outside serialized data

Maintain page/container references and expansion bookkeeping on the panel, never in persisted JSON or new generated IDs. In-model moves and Visual renames transfer state with the same page object. Across normalization/replacement, match an existing explicit page ID first, otherwise the unchanged unique path; ambiguous or unmatched pages are treated as new and start collapsed. Do not infer identity from names or list positions. Prune removed keys. A fresh panel resets to the landing-page default; same-panel discard/save/history replacement retains states for matched surviving pages. Changing the landing selector mid-session does not reset other expansions.

Do not rebuild Visual on an unchanged JSON return. Keep the existing JSON validation and Monaco source/history/view-state behavior; valid changed JSON can replace the complete model after expansion reconciliation. Invalid or unsupported input leaves the accepted document and presentation unchanged. A newly introduced page in JSON starts closed, unlike an explicitly created Visual page opened for immediate editing.

Before replacing/removing affected controls, cancel stale drag state and capture only the focus needed for the completed action. Restore focus to the moved occurrence, appropriate surviving action, page header or page manager; do not automatically jump a user to the top. Reuse the current lifecycle/revision checks to reject obsolete asynchronous focus/form work, and abort root listeners on disconnect. Reconnect must not accumulate handlers.

### 4. Preserve the existing validation and persistence boundary

All edits still alter the same model and reach `serializeConfig`, `validateConfig` and explicit Save & Generate. Unmounted bodies never stand in for absent data. No change is planned to Python validation, generator, migration, history, protected YAML or save recovery. Existing legacy-format conversions and canonical card/popup identities must stay unchanged.

Use current provenance-backed historical/converted model fixtures and independently written expected JSON for opening/collapsing, duplicate occurrences, grouped selections, explicit empty containers, unknown fields, raw cards and nested options. Render-only operations compare the complete source before/after. Local mutations compare against independently specified changed content and unchanged closed pages. Do not regenerate expected data with the implementation under test or rewrite archived fixtures.

The main builder baseline has older navbar/folding text superseded by the current repository contract and completed changes. Add only this change's builder requirements; do not reintroduce the five-entry navbar limit or custom Monaco presentation while touching related paths.

### 5. Verify structural bounds and actual responsiveness

Extend existing panel/browser checks rather than introducing another test framework. Deterministic assertions establish zero body rows on collapsed pages, node identity retention for unrelated native forms/sections, single action dispatch, current coordinates after reorder/rename, complete serialization and cancellation/disposal. Tests must open a page through its visible native header before interacting with deferred controls, rather than restoring eager rendering for test convenience.

Adapt `measure-ha-editor.js` to valid format-2 page fixtures, with unique page paths/IDs and valid references when enlarged. Use safe fake entities only, with a large document held in the browser draft rather than saved. Count real mounted controls, including shadow trees where useful. Install timing listeners once, snapshot arrays at each sample and separate startup from subsequent interaction long tasks. Measure native-field readiness even when the landing page is empty, first page expansion, same/cross-section local edits and reopen; also retain the assertion that Visual requests no JSON-only assets.

Capture paired before/after samples on the same fixture, browser/device profile and asset fingerprints: three serial cold/warm samples at normal CPU and a 4× CPU slowdown. Report medians, long tasks and actual input-to-visible-update or clearly labeled frame-boundary timings; do not call two animation frames a measured paint. Compare initial controls and local edit cost as unopened pages grow. Acceptance requires the deterministic bounds and measured reductions in startup/control work and local-edit delay; investigate regressions instead of selecting a favorable run. Avoid a hardware-specific absolute timing threshold or expanding this into a full mobile performance matrix.

Register the measurement/check inputs with scoped verification. Use existing editor/drag/JSON checks and focused model preservation/generation checks as selected by changed paths. Select alignment because icon-only page/card action lifetime is affected even if geometry is reused. Inspect safe existing `ha-test/cases.json` examples plus a realistic Studio/Living Room page under the same `/marao-dashboard`; update their test expectations and add only missing distinct empty/flat/section/raw/duplicate cases. Keep test-only data outside the shipped integration.

## Risks / Trade-offs

- Stale action positions after DOM moves -> resolve current coordinates, reindex affected containers and test neighboring pages/sections after repeated reorder/delete.
- Partial refresh misses a renamed link or selector -> enumerate dependency refreshes and independently assert cross-page references and current labels.
- Unmounting loses data or focus -> retain all values in the model, complete edits before rendering, cancel stale work and restore a surviving semantic control.
- Reopening a large page still costs work -> measure that first-use cost; no claim that page-level deferral makes a single enormous page cheap.
- Users can open every page again -> retain that choice; local edits must remain scoped even when all bodies are mounted.
- Existing tests assume eager rows -> change setup to visible expansion, retaining action/preservation assertions rather than weakening them.

## Migration Plan

No source, public API, generated contract or config-entry migration. Keep dashboard format and package-version handling unchanged. Rebuild the panel with the existing reproducible asset build and budgets; deploy compatible UI assets together only when implementation is requested and verified.

Pure timing/rendering tests remain read-only, including saved-source comparison before/after. For existing Save/reload/Discard/history scenarios, retain exact private backups of source, generated output and affected owned state before writes, preflight, and use the current recovery helpers. Verify restoration and disposable cleanup, including on interruption/failure. Preserve concurrent unrelated edits and report failed rollback.

For a UI-only deployment rollback without writes, restore the matching prior assets. If persistence verification wrote data, restore the matching package and exact saved source/generated/owned-state baseline together. During future release preparation, require scoped preserved-install proof only if actual implementation expands into persistence, ownership or installation behavior; such expansion must first update this plan. Publication still requires scoped `verify:publish` and applicable exact-commit checks. No release, full-suite or parallel execution is authorized by this planning request.
