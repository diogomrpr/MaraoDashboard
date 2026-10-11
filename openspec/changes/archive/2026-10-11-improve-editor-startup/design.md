# Design

## Context

See [proposal.md](proposal.md) for the reproduced symptom and dated measurements. This design is needed because startup, asynchronous tab changes, resource packaging and cache versions must remain coherent.

The end-to-end path is Home Assistant's registered custom panel → fingerprinted `MaraoDashboardPanel.js` → `connectedCallback`/`hass` setter → `_load` → administrator `marao_dashboard/config/get` → normalization/serialization → `_renderVisual` → native HA forms and selectors. `_management_payload` reads the saved document, plans its dashboard URL, enumerates history and includes registry/area/catalog metadata. The measured API response is under 205 ms on the disposable instance, so it is not established as the dominant delay.

`frontend_src/MaraoDashboardPanel.js` statically imports Monaco and its JSON contribution. `build-editor.cjs` bundles those into the panel before the custom element can register. `_ensureMonaco` delays editor *creation* until JSON opens, but not Monaco download/evaluation or its extracted CSS. The current panel contains approximately 3.94 MB of Monaco in a 3.99 MB module; its CSS is approximately 164 KB. This is confirmed unnecessary work on Visual's critical path, not proof of the whole post-toolbar cause.

After the toolbar renders, `_load` awaits the entire management response before inserting visual content. There is no initial loading message. `_busy` prevents overlapping configuration calls, but after a failure `_loaded` stays false and another `hass` assignment can request again. The plain JSON tab can also be activated before the model/catalog are ready. `_switchTab` assumes Monaco is immediately available; `disconnectedCallback` disposes it without clearing its reference. These paths need safe handling once asset loading becomes asynchronous.

## Goals / Non-Goals

**Goals:** Reduce the wait for usable content, separate Visual from JSON-only resources, expose loading honestly, preserve one local draft and provide recoverable asynchronous loading.

**Non-Goals:** Removing Monaco features, changing the catalog/model/schema, editing generated cards, redesigning the builder, adding caching frameworks or telemetry, changing HA authentication or splitting the management API without evidence. No generator/theme/runtime-card changes are expected; the affected dashboard-card set is empty.

## Decisions

### 1. Measure the reported gap as well as the initial bundle

Use the existing Playwright dependency and private artifact directory to measure navigation → panel definition → shell → management request/response → visual DOM → usable native controls. Capture resource bytes/counts and long tasks using test-only browser instrumentation, not a shipped telemetry feature. Request IDs, counts and timings are enough; do not store config bodies, credentials or entity metadata in public reports.

Record at least three cold and three warm samples with the same fixture document and browser profile before and after the change. Define readiness by an enabled, populated General form control and navigation/card lists, not toolbar appearance or network-idle. Separately record first JSON use and subsequent tab switches. The planning browser permits qualitative DOM/console inspection but does not expose a full performance trace; the existing API and local bundle measurements must not be presented as browser stage timings.

If visual rendering or native-component readiness dominates after the response, fix that measured portion in the existing render/mount path. Check required HA control readiness and large synchronous room/page mounting before considering broader changes. Do not add arbitrary sleeps, eager-load unrelated HA panels, recreate HA selectors, or reduce functionality. A smaller bundle alone is insufficient to close the user-reported issue. Any upstream or backend contract change that proves necessary must be recorded explicitly before widening scope.

### 2. Separate the existing JSON editor into one local entry

Move Monaco imports, JSON language setup, Monaco themes and worker environment into a JSON-specific source module. Keep panel/model/Visual code in the initial entry. Load the module and its extracted stylesheet through native asynchronous loading only on a deliberate JSON request. Use a single in-flight promise, reuse successful initialization, and clear recoverable failed attempts for explicit retry. There is no idle prefetch: it would bring the large dependency back onto the user's startup path.

Prefer two explicit editor entry points in the existing esbuild build over a generic chunk-loader or a new bundler. Keep dedicated editor/JSON worker outputs and Monaco license. Resolve lazy module, stylesheet and worker URLs from the current panel asset base with its fingerprint query; native dynamic imports do not automatically propagate the importing URL's query. Load CSS successfully before claiming JSON is ready. Test real resource failure/retry behavior, including any cached failed import, rather than assuming clearing a promise alone guarantees recovery.

Update the generated-file inventory, build/check comparison and shipped package checks for the new entry and CSS. Keep existing managed font handling and content-derived fingerprinting. Verify every editor asset is bundled locally and no old build output or CDN dependency remains. No integration registration change is required unless a focused check identifies an asset path problem.

Initial structural budgets are **128 KiB for eager panel JavaScript** and **32 KiB for eager panel CSS**, uncompressed. These leave room above the approximately 50 KB of current non-Monaco JavaScript. Build metadata must also prove Monaco is absent from the eager import graph; size alone is not proof. Deferred JSON resources have no arbitrary size target because existing features are retained.

### 3. Keep initialization and tab activation safe

Reuse the current panel state, adding only the small in-flight/error and active-request guards needed for asynchronous startup. Show English/Portuguese loading text in the existing status/content area from shell creation. Until configuration is ready, prevent Save, History, Open dashboard and JSON initialization from using missing data. Preserve native semantic controls and existing theme treatment.

Commit a successfully parsed configuration to the model, render Visual, and then enable ready actions. A failed load exposes one readable error and explicit retry; ordinary HA updates must not start an automatic retry loop. Reuse that flow for deliberate Discard/Restore reloads while preserving their confirmations and failure behavior.

During JSON loading leave Visual usable. On completion read the latest local document, not an earlier captured draft. Respect the latest requested tab; delayed completion cannot steal focus or reopen JSON after the user returned to Visual. Preserve unknown fields, invalid-JSON protection, format/schema/entity support and dirty state. Guard format/save/discard interactions while JSON initialization is incomplete rather than dereferencing a missing editor.

When the panel leaves/reconnects, dispose and clear the editor/listeners appropriately; a completed import or stale management response must not populate a removed or replaced panel. Revisit must reconstruct usable controls instead of retaining a disposed editor reference. Avoid a general state machine or background autosave.

### 4. Preserve existing APIs and data ownership

Keep `config/get`, generation and restoration authorization/payload behavior, history and backend validation. The Python tests in `tests/components/marao_dashboard/test_init.py` cover management payloads and generated URLs; extend only relevant resource/fingerprint checks if those paths change. Do not cache source/configuration across installations or mutate saved data during read-only performance runs.

Use the existing disposable fixture document for representative content. A test-only larger document may be supplied through a mocked read response using safe fake entity references to measure rendering, without saving it. No new card behavior exists, so canonical gallery duplicates are unnecessary. Existing gallery and realistic pages remain on `/marao-dashboard`.

## Risks / Trade-offs

- First JSON use pays the deferred download/initialization cost → show loading, keep Visual usable, reuse successful initialization and report its timing separately.
- Monaco removal speeds panel arrival but may leave the post-toolbar wait unchanged → measure both navigation-to-ready and shell-to-ready; identify and fix remaining measured editor work before declaring the task solved.
- HA native components and large documents can dominate rendering → profile control readiness and render stages with representative and larger safe documents; make only the measured shared-path correction.
- Lazy resources can mix cache versions or fail → explicit current-version URLs, packaging checks, readable failure and an actually tested retry.
- Asynchronous completion can lose unsaved changes or reopen the wrong tab → use current draft and active request/lifecycle guards; test delayed/reordered completion and navigation.
- Timings vary with device and cache → compare matched cold/warm samples; keep structural budgets deterministic and do not claim physical iPhone or Safari testing.

## Migration Plan

No configuration/data migration or new user installation step. Rebuild committed editor outputs from their editable source, stage the package and verify build consistency before deployment. Keep credentials and detailed traces ignored.

Deploy only to disposable `192.168.0.28` using the existing dry run/sync workflow and verify the served fingerprint. Run focused editor/model/build/browser checks during iteration. After the last edit and focused check, make the final visual and interactive editor pass on the required mobile/text/theme profiles, checking loading/errors, controls, dialogs, focus, draft preservation and repeat navigation. Confirm a representative generated page is unaffected. No full gallery audit or icon-only card alignment check is required unless the implementation changes card/shared layout scope.

Document the lazy entry, generated-file ownership and reproducible performance check in the local-development guide. Rollback restores the prior complete editor asset set and reloads the integration/browser; saved configuration and generated dashboards are unchanged. Publishing remains a separate action requiring `npm run verify:publish` and matching CI gates.
