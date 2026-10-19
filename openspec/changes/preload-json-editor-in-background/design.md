# Design

## Context

See [proposal.md](proposal.md) for motivation and scope and the [Visual builder](specs/visual-builder/spec.md) and [integration lifecycle](specs/integration-lifecycle/spec.md) deltas for acceptance behavior. Design is necessary because this performance change crosses backend work selection, asynchronous native controls, optional resources, validation and draft lifetime.

The current `config/get` handler in `custom_components/marao_dashboard/__init__.py` collects the entire registry and areas before `_management_payload` loads/converts the source, computes all creation templates and lists History. `MaraoDashboardPanel._load` waits for that full payload. Format-2 rendering creates all page headers, General and navbar controls but initially mounts only the landing-page body. `_entityRow` needs compact classification/label definitions and primary entity names/states/device classes; group rows need only their configured member count and raw cards only their count. `_mountForm` starts `_containForm` asynchronously, so `_loaded` and the return from `_renderVisual` are not proof that native controls are usable.

`_ensureMonaco` currently performs all first-use work on demand. It awaits module/styles and then icon font and initial worker validation before creating the editor. Its `_jsonLoading` state also disables Save/Discard/History and causes `_save` to return. Reusing that foreground path unchanged for background preparation would degrade Visual usability. The JSON module is separate and several MiB uncompressed; the build already enforces a Monaco-free eager dependency graph and 144 KiB JS / 32 KiB CSS budgets.

## Goals / Non-Goals

**Goals:** Make required server work and usable native controls the startup boundary; overlap independent optional transport; prepare JSON with cooperative browser scheduling; retain complete validation, one authoritative local document and compatible management callers.

**Non-Goals:** A partially hydrated source, a generic scheduler or cache framework, a second serializer/converter, a replacement editor, or runtime card changes. This is not a backend worker-pool tuning exercise. Browser and HA capacity are separate: a request can run while browser rendering is busy, while browser module evaluation must wait for an appropriate browser opportunity.

## Decisions

### 1. Add finite read scopes while preserving existing requests

Extend the existing administrator `marao_dashboard/config/get` command with a validated optional `scope`, defaulting to `full`. Keep the existing unscoped response and `{config: source}` preview behavior intact. Permit explicit source previews only with the existing full semantics; reject incompatible scoped/source combinations rather than silently ignore fields.

| Scope | Consumer | Response/work |
| --- | --- | --- |
| `full` (default) | Existing tooling and supported source previews | Existing complete response, unchanged |
| `initial` | Visible Visual startup | Complete canonical source, route/conversion/path information, compact display catalog and initial landing-row primary metadata |
| `context` | Deferred JSON and detailed Visual editing/validation | Full catalog, entities, areas and creation templates; no source or History |
| `history` | Explicit History opening | Version list; no source conversion, registry collection or templates |

Context groups data that shares the full registry/catalog snapshot, avoiding a cascade of separate entity, area, catalog and template requests. History is independent and not read speculatively. A normal opening therefore uses one initial read followed by one deferred context read, plus optional static resources; History adds a read only when used. Share each in-flight scope across consumers. Do not merge saved-source reads with explicit-source preview requests, retain stale metadata indefinitely or build one request per entity.

Keep permission, structured-error and recovery checks in the shared management boundary. Share source loading, ordered conversion, route identity and catalog definitions; scopes select products before their expensive producers run. Do not obtain the old full payload and then remove keys. Snapshot mutable HA registries on the supported HA thread, keep filesystem work in the existing executor pattern and avoid holding write/recovery locks while awaiting optional client work.

### 2. Preserve the complete source, narrow auxiliary startup work

The full saved document stays in the initial response. Page-header rename/delete/duplicate/reorder and reference updates affect unopened pages, and `_setDirty` serializes the complete model. A partial source would require a different patch/hydration architecture or prevent visible controls from operating. Preserve current normalization and serialization, including unknown/raw content and explicit emptiness.

Derive the initial expanded page from the accepted canonical `landing_page`, not hard-coded Home. Collect the primary entity IDs actually needed by its displayed rows in one batch, using keyed registry/state lookups and shared metadata formatting. Do not scan/format the whole registry and filter afterward. A compact catalog projection includes the current version and `id`, `label`, `entity_optional`, `domains` and `device_classes` needed for automatic row classification, derived from the real catalog. Group members and raw-card bindings are excluded unless independently needed by visible primary rows. Empty/raw-only landing pages are valid and need no artificial entity sentinel.

For current format 2, the canonical conversion path needs no full discovery snapshot; skip optional full areas, template generation and History enumeration. For supported older configurations, acquire whatever registry/area context ordered conversion actually requires before returning the document. Missing, ambiguous and newer input remain errors; no empty discovery fallback, starter reset or writes. Reuse existing historical fixtures and independently expected canonical output to prove unchanged conversion rather than redefining it.

### 3. Make progressive context explicit at every consumer

Keep display-only initial context separate from full editing-context readiness. Absence from a subset is not evidence that an entity is missing. Record which display IDs were checked, including confirmed absence, and the full-context loaded/error/in-flight state. Detailed catalog consumers must not accidentally read compact definitions as complete schemas.

After the required initial request/resources finish, start the single deferred context read without awaiting it in the Visual readiness path. Its network/server work may overlap remaining frontend rendering. Applying its large payload, schema construction and optional JSON initialization wait for browser idle capacity unless a user explicitly needs that data. A feature-demanded result can be applied immediately for that feature. HA WebSocket response decoding happens before the consumer receives the object and cannot be postponed merely by delaying assignment; measure that cost too, and defer the optional request until native readiness if early delivery reproducibly harms main startup. Merge metadata safely without replacing the model, raw draft, saved-source baseline, History or current focus.

Gate every dependent path through its specific prerequisites: existing card/group/media option editing, Add flows, expansion of another page, automatic expansion after duplication, and retained expanded pages after accepted source replacement. Show localized inline/dialog loading and retry where needed. Keep independent General edits, page rename/pin/order, individual delete/reorder and scrolling usable. Capture lifecycle/model/occurrence identity around awaits so an action never edits an index that moved while context loaded.

Save and JSON acceptance await the full context before calling existing whole-document validation, including group membership, energy units and unopened pages. A clicked Save acknowledges immediately and enters its ordinary single-operation guard before awaiting context, guarding editing in the active view and coalescing repeated Save presses. After context is ready, sample/validate the same guarded current source and dispatch generation once; a superseded lifecycle or document cancels the obsolete attempt without a write. A context failure releases the guard, preserves source and sends no generation. Background JSON preparation alone cannot disable or bypass a Visual Save, and a Visual Save must not promote unrelated Monaco CPU stages. Preserve Discard and history confirmations; invalidate document-dependent template projections after a newer save/discard/restore while retaining reusable independent module resources. Explicit metadata refresh uses `context`, not another full-source read.

History opens a local loading state and joins a `history` request. Only a successful empty response means there are no versions; failure offers Retry, and Restore requires a loaded version. A late list must not replace newer History returned by Save/Restore. Independent scoped requests can run concurrently when actually needed; do not serialize History behind Monaco or start it just because the header contains a History button.

### 4. Separate optional transport from browser computation

Use three explicit milestones: required initial I/O complete; native Visual controls usable; JSON ready. Native readiness covers the initially mounted required forms/controls, their custom-element definition/update completion and a render opportunity. It excludes collapsed bodies and all optional requests. Propagate required-control failures instead of marking readiness from `_loaded` or `networkidle`.

```text
initial read + required main resources
                 |
                 +--> deferred context request ------+
                 +--> optional file fetches ----------+--> idle processing
                 |                                   |        |
                 v                                   |        v
       Visual native controls ready -----------------+--> JSON ready

explicit feature selection --> promote shared prerequisites, then act once
History selection          --> independent History read
```

For early file transport, prefer browser fetch-only prefetch hints for the known versioned JSON module, CSS and worker URLs. These do not evaluate the module. Delay them if required main resources are still pending, and do not await them on the critical path. Use the browser HTTP cache, matching version/locale/credentials identities; verify actual reuse and avoid a second body transfer caused by mismatched URLs. Do not use `modulepreload` as a claim that only network work occurs, create blob-based imports, add persistent caches or invent a resource manifest unless the existing build graph requires a small generated asset list. Fonts can be fetched once their normal bundled URL is available.

Prefetch is advisory; the [HTML link prefetch contract](https://html.spec.whatwg.org/multipage/links.html#link-type-prefetch) allows browser discretion. Resource hints do not prove completion or cache reuse. Foreground correctness must use the actual module/style/worker initialization promises and report real failures.

### 5. Use idle opportunities for bounded preparation stages

After native Visual readiness, schedule optional browser work with feature-detected `requestIdleCallback`, checking remaining budget before starting the next stage. Yield between module import/evaluation, applying deferred metadata and preparing the schema/model, and hidden editor initialization. Fetch independent styles/font resources and perform worker work concurrently where their dependencies permit; do not serialize unrelated waits. Recheck visibility, lifecycle and active Visual interactions/document operations before continuing. Resume from meaningful completion/interaction events, without a recurring polling loop.

Do not specify an idle timeout that forces heavy work through a busy period. If no idle opportunity occurs, leave CPU-heavy preparation pending; if the API is unsupported, retain fetch-only warming and explicit on-demand CPU initialization. Explicit JSON selection removes the optional idle wait and promotes the same attempt. Initial loading still blocks JSON until the document exists. Repeated selection cannot create a second worker/model/editor.

The [W3C idle-callback draft](https://www.w3.org/TR/requestidlecallback/) provides an estimated deadline and permits indefinite postponement under load. It does not make a monolithic dynamic import, later promise continuation or Monaco construction preemptible. Schedule every substantial continuation deliberately; measure module evaluation and editor construction separately. If an existing monolithic stage causes reproducible input stalls, split only the implicated optional initialization/import boundary with the existing bundler before acceptance. Do not claim that calling `import()` inside one idle callback proves responsiveness.

### 6. Share preparation and preserve the latest document

Reuse `_lifecycle`, requested-tab guards and the existing single initialization promise, adding only the distinction between background preparation and a foreground waiting consumer. Background work does not set global `_busy`, disable independent Visual actions or display the foreground loading status. Foreground JSON selection presents existing localized progress until the shared attempt is usable. Success while Visual is selected never changes the tab, focus or scroll.

Module and font caches contain resources, never authority over the draft. Sample/reconcile the current model or exact raw text after asynchronous boundaries, before installing content listeners and before revealing JSON. Use document/metadata revisions and model identity to discard obsolete document-dependent results. A background `setValue` must not publish an old `_jsonDraft`, mark the document dirty, replace a successful save/discard, or reset unchanged undo/selection/folding. Keep full validation and invalid-JSON tab guards at their existing acceptance boundaries.

On disconnect, cancel pending idle callbacks and owned requests/hints where cancellable, abort listeners, and dispose abandoned editor/model/assistance instances. Dynamic imports or HA reads that cannot be cancelled still need lifecycle guards. Reconnect starts only missing live resources and retains the current draft. Exiting the editor schedules no new optional work.

### 7. Keep failure visible and retry deliberate

Track independent configuration, context, History and JSON errors; one Retry must target the failed operation. Background JSON or context failure presents localized nonmodal feedback without disabling the usable Visual page. Preserve raw resource/exception evidence and stop automatic attempts. Later idle/HA events or repeated ordinary tab selection do not create retry loops; an explicit Retry recovers the failed scope/stage once. A superseded or disposed consumer is cancellation, not a swallowed real initialization failure. Keep stock Monaco presentation, theme selection and native assistance, and add any new surrounding copy in English and Portuguese.

### 8. Verify work selection, timing and behavior separately

Update `tests/frontend/editor-panel.test.js`, `json-editor.test.js`, `tests/test-ha-editor.js`, `json-editor-checks.js`, `editor-rendering-checks.js`, `measure-ha-editor.js`, backend `test_init.py`/security coverage and `verification-map.js` for the actual changed paths. Replace blanket no-JSON-resource assertions with phase ordering and eager-bundle independence. Readiness helpers must use usable native controls, not `networkidle`, which optional traffic can prolong. Observe workers/resources from navigation so warming cannot escape lifetime counts.

Backend tests independently assert default/preview compatibility, administrator denial and invalid combinations for every scope; mock optional producers to fail if canonical initial loading invokes them. Assert exact initial entity IDs/fields and unchanged independent historical conversion, recovery guards and saved bytes. Deferred scopes must not silently reproduce full-response work.

Use controlled idle callbacks, delayed context/resources and actual panel action methods to prove no optional CPU work before readiness/idle, continued local action dispatch, one foreground promotion, no forced busy-period initialization, genuine missing versus unloaded metadata, latest drafts and cleanup. Cover real module/CSS/font/worker failures and Retry; do not weaken console/resource assertions. Test real Save dispatch with safe local stubs while warmup is pending, including edits before Save, guarded editing/repeated presses during the context wait, obsolete-document cancellation and guard recovery on error; then retain existing protected disposable Save/Discard/Restore scenarios where selected.

Extend paired measurements on the same safe fixture, browser/profile and asset identities: three serial cold/warm samples at normal and 4x CPU slowdown. Record initial/context/History request counts, response bytes and durations, including response decoding; first native-control readiness; preparation stages; first JSON opening before and after preparation; and input responsiveness during warmup. Keep each switch direction separate. Acceptance requires deterministic dependency bounds, reduced initial optional server/payload work, improved prepared first JSON opening and no reproducible main startup/interaction regression. Report frame-boundary timings honestly, not as measured paint; preserve old timing files and use new private outputs.

Run the smallest covering `test:affected` selection serially after the final batch edit. Reuse existing canonical Cases and Studio fixtures for preservation and representative UI; no runtime case expansion is necessary. Update `docs/docs/installation/configuration.md` and focused development guidance. Inspect loading, failure/Retry, usable Visual controls and prepared JSON in both themes plus relevant narrow/text/zoom/landscape profiles; reuse reviewed geometry because control geometry is unchanged. Do not select runtime alignment, historical live upgrades or a full mobile matrix unless the actual implementation expands those contracts.

## Risks / Trade-offs

- Partial metadata mistaken for missing entities or complete schemas -> explicit readiness/coverage and feature-local prerequisites before rendering warnings or validating.
- A small response still performs all optional backend work -> scope producers before collection and assert non-invocation, selective lookups and per-scope timings.
- Optional requests delay a later foreground request or hold shared locks -> prioritize critical startup; narrow consistent snapshots; share in-flight reads and avoid speculative History.
- Module evaluation or construction stalls Visual input -> staged idle scheduling, deliberate async continuations and paired input/long-task evidence; split the implicated optional boundary if required.
- Idle starvation or unsupported APIs leaves JSON unprepared -> no forced heavy timer fallback; explicit selection always promotes normal initialization.
- Background results restore obsolete drafts/templates/History -> separate source/resource authority, revision/lifecycle guards and independently specified race expectations.
- More bytes/memory are used for users who never open JSON -> only one scoped context/readiness pipeline per connected lifetime, no optional work after removal and no speculative History.

## Migration Plan

This is an additive management-read and loading change. Keep existing full callers, source previews, ordered saved-release conversion, serialized output and generation semantics unchanged; no format or config-entry migration is required. Supported historical fixtures have identical independent expected JSON, not newly transformed output. Update the new deltas only: the baseline's previous lazy-only wording and completed change artifacts remain historical until a later requested sync/archive.

Rebuild compatible backend and frontend assets, run selected checks, deploy the batch only to disposable `192.168.0.28` and confirm the served fingerprint before measurements/inspection. Background/read-only measurements preserve source/generated output/History and verify that preservation. Tests that explicitly Save or Restore retain exact private source/generated/owned-state backups, preflight, atomic writes, recovery and verified cleanup; retain concurrent unrelated edits and report rollback failures.

Rollback a read-only deployment with the matching prior package assets. If a selected persistence scenario wrote data, restore the matching package together with exact saved JSON, generated output and affected owned state; never roll back assets alone against changed test data. A later push/tag/release requires scoped `verify:publish` and applicable exact-commit validation. Scoped live preserved-install/`verify:release` proof is required only if implementation actually changes persistence, generated ownership or installation/upgrade behavior; expand the plan before such work. No implementation, deployment, release, full suite or parallel test execution is authorized by creating these artifacts.
