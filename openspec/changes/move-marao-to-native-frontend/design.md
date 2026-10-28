# Design

## Context

See [proposal.md](proposal.md) for scope and explicitly accepted removals. Implementation is authorized. On 2026-10-25 the user selected guided manual migration for simplicity. The target is strictly frontend-only; do not build a new Python transition integration. The released legacy package remains the recoverable old side until the administrator removes it.

### Refreshed repository baseline and retained contracts

Reviewed baseline: `459084c120e2641b6fa1b72fc74a822cf43b310d` (repository version v0.21.1). Since the first implementation baseline `d9bda6d2e2cbce844da3e307194322b6662ca6e1`, changes are concentrated in `MaraoCards.js`, `MaraoRuntime.js`, `MaraoNavigation.js`, their focused tests, quality/usage guidance and version metadata. The Python generator/catalog, source format 2 and generated contract 3 did not change in that commit range. Keep the exact supported configuration and reuse the current runtime rather than porting an older snapshot.

| Retained behavior | Owner and existing evidence | Native-transition acceptance |
| --- | --- | --- |
| Strict-slide final release | `MaraoSlideToOpen._end`; `marao-text-scale.test.js`, `marao-security.test.js` | Use the final touch/pointer position, allow right-edge overtravel within the vertical lane, require established horizontal intent and reject incomplete/reversed/out-of-lane/cancelled gestures without duplicate dispatch |
| Access popup hierarchy | `MaraoPopupCard._accessEntity/_updateAccessHeader`, `MaraoCard._inAccessPopup`; `marao-card-visibility.test.js` | Keep matching popup/action entity bindings so state/icon appear once in the growing header, opening text stays in the slider, and decorative action icons/centered close labels retain current behavior; state updates must not replace the active slider |
| Request feedback | Existing shared action outcome and slider lifecycle | Preserve Sending/accepted/error/skipped feedback, target guards and haptics; request acknowledgment never proves a physical outcome |
| Navbar and sheet spacing | `navbarBottomGap`; `marao-navbar-card.test.js` | One shared gap: 24px minimum and twice the lowered iPhone safe-area offset; include page clearance, history/detail/color sheets, modal focus, overflow and shell restoration |
| Earlier integrated additions | Current catalog/model, `MaraoSensorThresholds.js` and existing secondary-trigger consumers | Preserve thresholds, explicit optional settings, history icon/hold versus primary actions, energy totals, alarm layout, exhaust and embedded HA-card behavior |

The existing untracked `MaraoSource.js`, compiler, JSON catalog/labels and narrow tests, plus dirty editor-model/generated-panel changes, are experimental foundations. Review their actual diff before reuse; neither their existence nor earlier pass counts prove current full parity. Keep unrelated duplicate files untouched. The resumed implementation snapshot is recorded in implementation notes.

Current source paths establish the real boundaries:

| Owner | Current responsibility | Target disposition |
| --- | --- | --- |
| `__init__.py`, `config_flow.py`, `config_patch.py`, `legacy_migration.py`, `native_storage.py` | Setup, admin commands, YAML/theme/resource ownership, registration, recoverable saves and upgrades | Frozen legacy reference/recovery package; remove through supported HA/HACS operations during manual migration |
| `generator.py`, `page_model.py`, `page_migration.py`, `card_names.py`, `card_yaml.py`, `editor.py` | Source parsing, ordered conversion, catalog/templates, validation and compilation | Shared frontend modules used by strategy, builder, imports, preview and tests |
| `history.py` | Configuration snapshots plus file-operation recovery | Remove product History/Restore; preserve old archives in exact per-instance backups |
| `frontend_assets.py`, bootstrap, `MaraoFrontendUpdates.js` | Versioned API assets and server-originated refresh | Replace with HACS resources, content-addressed frontend assets and native configuration notifications |
| `frontend_src/` | Builder, shared draft, Monaco and native-card editor interoperability | Preserve, replacing data/persistence adapters and removing History |
| Existing shipped cards/runtime | Native HA states/actions, charts, recorder statistics, camera and provider APIs | Reuse; preserve current behavior and mobile contracts |
| `camera_events.py` | Netatmo cache access, permission-scoped typed metadata | Remove; retain native camera and only a small native-media recording adapter |

The stable reference is HA 2026.10.4 with frontend 20260930.5. This supports a [custom strategy and editor](https://github.com/home-assistant/frontend/blob/20260930.5/src/panels/lovelace/strategies/types.ts#L20), [arbitrary strategy options](https://github.com/home-assistant/frontend/blob/20260930.5/src/data/lovelace/config/strategy.ts), and [native dashboard saves](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lovelace/websocket.py#L149). These facts do not establish migration, cache or HACS handoff success.

Important native limitations: dashboard configuration reads are available to authenticated users, including for hidden/admin-only dashboards; only writes are admin-only. Native saves replace the document without an expected-revision/CAS parameter. The current ordinary Marao save also lacks an editor revision parameter; its stronger concurrent-edit protections apply to migration/recovery, not every competing editor save.

## Goals / Non-Goals

**Goals:** one native stored document per existing dashboard; one compiler/model shared by all frontend paths; preserve the supported builder/runtime and existing route; privately recover the transition; remove Python dependence and prove an actual later frontend update without an HA restart.

**Non-goals:** emulate a private native store using hidden panels, introduce encrypted browser history/key management, write arbitrary server files from the frontend, add an external app/runtime, restore retired native card wrappers, or promise exact parity for the explicitly removed features. No new third-party cards/frameworks or runtime CDN are introduced.

## Decisions

### 1. Native dashboard strategy with the existing Marao editor

Register a custom Marao dashboard strategy and its editor through the released frontend entry. Keep all existing project custom elements and vanilla JavaScript/Shadow DOM architecture. The strategy returns the normal Lovelace configuration, including current navbar, sections, popups and embedded HA cards. Rendering and service dispatch remain separate; compilation and migration never actuate an entity.

Store the editable source in the strategy options, not browser storage. The storage envelope has its own integer version, the strategy type, a `source_json` string, a compiler-contract identifier. Preserve the exact current source text on a no-conversion migration; preserve the original bytes separately when a supported legacy source must convert. There is no version-history array. Package version, envelope version, source `config_version` and compiler contract are independent; reject invalid/future markers without resetting to a starter.

The source is authoritative. A derived digest is useful for already-stale draft detection but is neither authorization nor a server CAS guarantee. The compiler works in memory and never persists conversions merely because a regular user opens the dashboard. An administrator explicitly saves an accepted conversion through the same validator/compiler path.

Preserve the full builder as a strategy editor and an editor view within the same dashboard root. Choose a noncolliding internal editor path without renaming any saved user view; retain that path in the envelope metadata. Replace the standalone `/marao-dashboard-editor` panel with a documented link to that view; document the replacement for old editor bookmarks. Do not claim a backend-free server redirect remains after removal. The editor view is not in ordinary configured navigation and exposes editing controls only to administrators; server authorization still protects saves.

Alternative rejected: one public compiled dashboard plus an allegedly private hidden dashboard for source/history. Native configuration reads do not enforce that privacy boundary, and two stores introduce unnecessary commit inconsistency now that History is removed.

### 2. Move transformations once; reuse runtime controls

Extract/port source validation, canonical card names, page-model conversion, template creation, entity/area snapshots, popup identities, layout compilation and raw-card parsing into ordinary frontend modules. Reuse `editor-model.js`, the installed YAML library, existing locale catalogs and existing runtime components. Do not introduce a second JavaScript implementation for preview versus normal rendering.

Use a simple ordered list of pure adjacent source-format migrations, starting with the existing 0→1→2 sequence. Each step consumes its declared format and supplied metadata, preserves unknown data and validates its result before advancing the working version. Historical native `title`/`views` documents have a separate adapter into their documented source-format boundary; HA storage versions, native-envelope versions, compiler contracts and package releases are never migration-step numbers. Changing existing JSON structure or meaning requires the next source format and one previous→next step; compatible optional settings need no artificial step. Keep historical defaults independent of the latest catalog, retain earlier steps, and test independent adjacent expectations plus every historical fixture through to current. A failed/missing step exposes no successful partial result and leaves input untouched.

Ship the same engine in a ready-to-open offline browser artifact. Its default flow is Paste JSON → Translate → Copy/Download, with automatic format detection and a compact summary. Accept source JSON, supported historical HA storage wrappers and the native source envelope. Preserve exact current source text when conversion is unnecessary. Infer deterministic values first, then ask only required unresolved questions through short localized fields/selections on the same page, retaining input and answers when revisited. Do not require technical metadata JSON, intermediate releases, HA login, the HA builder, a CLI or local server. Supplemental metadata/custom cards remain optional advanced inputs; known unresolved references or declared missing content receive plain-language guidance without silent loss or evaluating server-only YAML. Never infer unseen room membership or claim that pasted JSON recovers files it did not contain. Keep data in memory, make copy/download user initiated, and prove cold startup with networking blocked and usable output when clipboard permission is denied.

Preserve supported source semantics, raw/unknown fields, list/object shapes, explicit emptiness and deletions, custom labels, provider/stream selections, section order, navigation, entity-free shortcuts, numeric values and native service descriptors. Discovery remains a one-time starter action; regular rendering cannot rediscover or refill deleted controls. Native registry/state APIs provide the inputs currently assembled in Python; missing required metadata blocks the affected conversion instead of becoming an empty default.

Initially compare the frontend compiler against independently specified expected documents and released output while the old integration remains operational. Python output is a useful differential oracle, never the sole expected result. A new compiler contract is deliberate and versioned. Normalize only documented representation differences such as YAML-to-object serialization; compare behavioral identities, all public options and ownership references exactly.

The current `test_frontend_compiler.py` imports the workspace Python generator; it is a current-implementation differential check, not execution of a frozen released package. Keep its independent expected assertions and add exact released artifacts separately. Complete input/output validation at every migration boundary, fixed native-adapter entry at format 2, historical-default isolation and lossless numeric handling before trusting converter output. Reject a required conversion that cannot preserve a value rather than silently rounding or dropping it. Consolidate the exported catalog/labels into one maintained source; do not maintain parallel Python and JS catalog tables after the transition.

**Manual conversion uses the offline browser tool.** Export unsaved drafts and capture exact per-instance source/generated/custom/archive/package backups before any removal. Supply the actual JSON and any protected custom fragments to the shared converter. Missing required membership/address information uses its simple conditional questions. Optional metadata remains an advanced input. Changed inputs invalidate the result. Review native source visibility and retired-service dependencies before import; no server-side compiler or bridge is introduced.

### 3. Native persistence, disclosed visibility and bounded save behavior

Submit the complete validated envelope in one native save. Keep the existing Save & Generate label/workflow initially: compile/validate locally, submit the native source, then consume HA's native update notifications. Errors reported by HA retain the unsaved draft. Unsaved edits stay local; Discard reloads the saved source; exported JSON remains portable. Native sensor/recorder history continues unchanged.

**Native save semantics are explicitly accepted (2026-10-25).** HA updates the in-memory dashboard and emits `lovelace_updated` before writing storage; its storage helper can log a write failure without reporting it to the save caller. Native Save success, update notifications and subsequent native reads are therefore not independent disk-durability proof. Use the same behavior as built-in dashboards, keep manual source/draft export, and preserve drafts on reported failures. Do not add a permanent backend, patch HA storage or block the transition waiting for stronger native guarantees. The isolated reproduction and upstream report are [core #188548](https://github.com/home-assistant/core/issues/188548). Exact manual migration backups and matching package-plus-data recovery remain mandatory.

**Visibility is a breaking contract and a migration gate.** Explain that any authenticated HA user able to request dashboard configuration can read `source_json`; a hidden or administrator-only panel does not change that. Inspect known sensitive settings, `legacy_storage_dashboard`, raw/unknown fields and references, reporting paths/reasons without secret values. Detection cannot prove arbitrary user content is non-sensitive. Require explicit administrator acknowledgment of native configuration visibility and a reviewed disposition for any content with unresolved privacy requirements. Never silently publish, redact, drop or relocate such content. If native APIs cannot satisfy a retained privacy requirement, migration stays blocked until an equivalent native capability exists or the user explicitly approves a separate contract change; no fallback backend is added.

Use native update notifications and a pre-save read to reject drafts whose saved baseline has already changed. Retain/export the local draft and provide reload/retry guidance. A same-origin browser lock can serialize its own tabs if already available, but cannot coordinate other devices. **A simultaneous two-device read/check/save race can still be last-writer-wins.** Record that native limit; do not pretend to add cross-device transactions. Lossless migration is a separate obligation: stop editing on all clients after exporting their drafts, preserve the exact old installation, and verify the converted document before removing the legacy route. Native registration and document import are separate manual steps. An interruption leaves the private backup and downloaded target available; inspect actual native state and retry or restore rather than claiming atomic activation or automatic recovery.

Editor navigation uses the existing HA internal-navigation helper. Open dashboard stays in the current app/tab and retains the cached unsaved draft. After HA acknowledges a successful Save & Generate, reconcile the saved source and clear dirty/busy state while keeping the current editor view and Visual/JSON tab open. Only the explicit Open dashboard action navigates to the saved landing page. Failed saves stay in the editor; detached or superseded documents do not redirect. The strategy editor's Apply action remains inside HA dashboard settings until their separate save. The original permanent landing-page editor link is superseded by `admin-navbar-maintenance-menu`: administrators reach the internal editor through the three-second navbar maintenance menu, independently of cache reset visibility, or its direct address/bookmark when navigation is empty. Use the actual noncolliding editor path and current dashboard root without adding a configured navbar destination.

### 4. Remove configuration history; retain transition recovery

Remove History/Restore controls, schema/help text, commands, reads and automatic version creation from the new frontend. Do not copy old snapshots into the native dashboard, `localStorage`, user data or a hidden dashboard. Leave all pre-existing `.history` bytes and modes untouched, including archives in older formats.

Exact migration backups remain in an administrator-controlled private location, outside frontend-served directories. They are recovery data for the one-time operation and full package-plus-data rollback, not a continuing History feature. The new frontend neither creates new snapshots nor deletes old ones. Remove dead product-history tests while retaining/reusing the recovery assertions that protect migration.

### 5. Keep simple native Netatmo behavior without a metadata workaround

Keep HA-native live/still/fullscreen behavior and preserve saved `event_provider: netatmo` plus unknown camera options. A small frontend adapter can browse native Netatmo media, validate camera/media identifiers and decimal-digit positive safe-integer epoch-second keys, derive timestamps from the validated recording key, sort/limit records and resolve selected media on demand. The recording key is the event timestamp in the [native camera cache](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/netatmo/camera.py#L293-L307) and [media-source ID](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/netatmo/media_source.py#L89-L128).

This moves conversion to JavaScript as requested, but does not invent input. The native media response lacks authoritative event/subevent types. Remove Netatmo-specific person/vehicle/motion filters and detection headings. Show localized recording labels/timestamps. If native browsing is unavailable, denied, malformed or cannot be adapted directly, show an explicit recording-unavailable/error state and retain available native camera behavior. This does not block the architecture change.

Do not parse translated messages to guess detections, use direct Netatmo credentials, subscribe to raw administrator-only webhook events, read diagnostics/provider caches or preserve a hidden bridge. Sanitizing a private event after it reaches the browser would not restore the former server boundary. Frigate and UniFi filtering remains unchanged when their APIs provide authoritative types. Native API authorization outcomes are respected; basic Netatmo media does not claim the removed Marao metadata permission contract.

### 6. Same-repository frontend distribution and content identity

Publish the frontend Dashboard package through the existing `diogomrpr/MaraoDashboard` repository. The user selected one repository and accepts guided manual migration on every instance. Uninstall/remove the old HACS Integration registration completely, then add that same URL as Dashboard; do not mutate an existing registered category or edit HACS private files. Keep old tags/packages immutable for matching rollback. New users install the Dashboard package directly after the frontend release is available.

The installed HACS validates the latest stable release during custom-repository addition, before version/beta controls are available. The live remove/re-add probe reached Dashboard validation but rejected the still-published v0.21.1 Integration tree. Consequently, a frontend-compatible stable release is a prerequisite for the complete real HACS handoff; publishing only a prerelease or source branch is insufficient. Do not bypass validation, alter old releases or change the latest stable designation just to obtain test evidence. Complete required candidate checks and obtain stable-publication authorization before this remaining live gate. Existing unmigrated HACS Integration entries may offer the new tag; instruct users to perform the manual migration rather than Update in place.

Keep editable shipped source in `custom_components/marao_dashboard/frontend/` and editor source in `frontend_src/` until a separately reviewed repository layout change is justified. Extend existing build staging to emit the Dashboard package and offline converter, with dependency licenses and no tests, fixtures, secrets or development caches. Keep the legacy integration version frozen for rollback; the restart-free update guarantee starts after HACS re-registration as Dashboard.

Use a small resource entry plus content-addressed dependency filenames, including deferred editor modules, CSS and workers. Every module graph has one immutable release identity. Verify the actual HACS `/hacsfiles` and HA service-worker behavior; a query string alone is not proof of freshness. Remove dependence on Python's `/api/marao_dashboard/frontend...` endpoints. Preserve in-use graph consistency and old drafts during updates; after a completed deployment, safely refresh clients or show an explicit refresh-required state. Native configuration notifications replace save notifications. Update detection can use the installed resource/release identity at startup, foreground and reconnect; avoid aggressive polling and reload loops.

Existing flat/static/API resource references in preserved cards/options must be mapped to known owned frontend assets or explicitly rejected before legacy removal. A fully cached offline client cannot be remotely replaced. It must recover when it next contacts HA, without discarding a draft or dispatching an entity action.

The one-time retirement boundary is explicit: export drafts and remove only proven old extra-module/resource registrations through the documented manual procedure and verify a complete HA shell refresh for connected test clients. A legacy client returning offline-to-online after retirement may need one full refresh/reopen to stop requesting a removed Python bootstrap. A frontend package cannot keep serving a removed `/api/` route; do not promise transparent legacy recovery or mislabel this bootstrap limitation as a passing zero-error check. Later Dashboard-to-Dashboard updates use the new resource scheme and have their own restart-free acceptance proof. Keep a lightweight draft export/error surface available when an obsolete deferred editor graph cannot finish loading.

The upcoming 2026.11 Marketplace is a separate stable compatibility target when available, not evidence for current HACS behavior. Validate its Dashboard resource path with the actual stable package before claiming support.

### 7. Preserve appearance and identify intentionally retired server workflows

Reuse the bundled light/dark theme tokens as frontend-scoped styling around Marao's dashboard/editor; leave Monaco stock. Bundle the required licensed Montserrat font assets and their license for the dashboard/editor and standalone converter: the current Google Fonts link does not satisfy the target's no-runtime-CDN boundary. Preserve the current shared bottom-gap and access-popup typography/layout contracts while applying scoped styles. Preserve existing installed named-theme files and unrelated HA themes. No steady-state named-theme file synchronization or global HA theme installation is promised by a Dashboard resource. Verify a fresh install without an old copied theme as well as a migrated install; surrounding native controls must retain equivalent Marao appearance. If scoped styling cannot preserve supported theme behavior, resolve that before cutover instead of keeping an undisclosed installer backend.

Retire the Python `generate_dashboard` service, dry-run/file-path entry points and admin WebSocket endpoints after handoff. Browser import/export and preview/validate/native save replace the interactive workflow. Inventory documented tools and saved automations that reference the old service or editor URL; detect configured dependencies where possible without claiming exhaustive external discovery. Existing dependent installations cannot cut over until the administrator approves a concrete replacement or removal. An always-available file-path service cannot be implemented by a closed browser, and is not silently described as preserved.

The architectural/source-visibility/service boundaries are explicit major-version changes in release notes and migration preflight. The two user-approved feature removals are configuration History and unsupported Netatmo event metadata; other behavioral losses are not implicitly approved.

## Migration Plan

### Supported baselines and input identities

| Input lineage | Format/output | Required evidence |
| --- | --- | --- |
| v0.2.0 | Historical native storage | Existing frozen source plus exact native-envelope/ownership preservation |
| v0.3.0, v0.3.1, v0.5.0, v0.5.1 | Unversioned/format 0 generator | Existing provenance-backed fixtures and independent format-2 expectations |
| Supported predecessor | Format 1 | Direct conversion case, not mislabeled as a published package |
| v0.6.0 through v0.17.0 | Format 2, generated contract 2 | Audit relevant transitions; add real v0.17.0 package/source/output baseline |
| v0.18.0 through v0.21.1 | Format 2, generated contract 3 | Add provenance-verified v0.21.1 package/source/output baseline as the current preserved-install case; retain v0.20.0 as a representative older contract-3 data case |
| Then-current candidate | Same format unless a real source conversion is required | Preserve integrated threshold/secondary-trigger features, v0.21.1 slide/popup/spacing behavior and unknown fields; refresh the baseline again if commits change before implementation |
| Invalid, future, corrupt, ambiguous or independently owned source | Unsupported | Readable refusal before mutation; no discovery replacement |

Freeze all new historical inputs with tag/commit/file hashes and independently authored expected target/source/ownership data. Do not regenerate expectations with the candidate compiler. Expand `ha-test/upgrade/fixtures/`, `coverage.json` and the existing runner instead of constructing another migration harness. The existing seven-row plan/latest v0.5.1 package execution does not establish modern-release coverage.

### Guided manual migration and recovery

The administrator performs the following sequence separately on each installation. No intermediate Marao release or dashboard builder is required to convert JSON.

1. Export every open draft and stop editing the old dashboard. Record its exact root, view/landing paths, title/icon/sidebar/admin settings, HA/package versions and owned resources. Check retired generation-service callers and source visibility.
2. Make an exact private backup of the matching old package, source JSON, generated/custom files, `.history`, theme copies and affected HA configuration/registrations. Record hashes/modes; keep it outside public `www`/HACS assets. Keep unrelated state independently comparable. Do not put archives or credentials in the converter output.
3. Open the offline converter, paste the source JSON and supply only required missing answers. Supply protected custom fragments if present, preserving their original exact text and destination. Review assumptions/dependencies, download the native JSON and retain the original. A refusal blocks removal. Verify the same repository's frontend stable artifact and its complete files/hashes/licenses before proceeding.
4. Remove the old config entry and integration package through supported HA/HACS paths. Remove only the known owned YAML dashboard registration and obsolete bootstrap/extra-module resources; preserve generated source/custom/history/theme files and unrelated settings. Perform the required one-time HA restart, batching removals where supported. A short period with no dashboard at that root is accepted.
5. Ensure the uninstalled Integration entry is also removed from HACS's custom-repository list, then add `diogomrpr/MaraoDashboard` again as Dashboard and install/enable its resource at `/hacsfiles/MaraoDashboard/MaraoFrontend.js`. Create a native HA dashboard at the original root with the recorded settings, then paste the downloaded document through HA's native configuration editor. Inspect an existing route before creation; never replace an unrelated dashboard. Creation and import are separate native operations, not an atomic transaction. Keep the disposable instance's sole root `/marao-dashboard`, with Cases as its view.
6. Verify exact source, compiled meaning, routes/settings and unrelated state, independently inspect persisted data and restart retention. Verify operation with Marao Python absent. If interrupted, inspect whether registration and content exist, then finish that same import or restore; never create duplicate roots or silently seed a starter over an invalid/missing migration source.
7. Prove a subsequent real HACS Dashboard update with unchanged HA process/start identity and current coherent assets. The one-time migration restart is separate from ordinary frontend updates.

**Rollback:** retain both the pre-migration backup and any new native edits. Stop editing, compare current state with the recorded migration changes, remove only the newly owned native registration/resource and reinstall the exact saved legacy package with matching source/generated/custom/owned configuration. Restart HA as required. Restore only owned settings; never overwrite full stale HA/HACS registries, unrelated edits or private HACS storage. A package-only downgrade is not recovery. Verify the restored same root and source; report failed restoration and keep private copies. Recovery is guided and administrator-driven, without durable Python checkpoints, endpoint fencing or a server transaction.

Once the latest stable has only the frontend layout, initial HACS Integration validation can also refuse the repository before an older version is selectable. Restore the exact privately backed-up legacy component directory manually in that case, then recreate its HA config entry and matching owned settings. Do not rely on re-adding the old HACS category as the only rollback route or alter published release flags.

### Verification plan and completion gates

The earlier request specifies thorough migration/feature-parity verification during implementation. Implementation is authorized. Run focused checks serially on safe fixtures using only disposable `192.168.0.28`; no parallel, unrelated full-suite or automated camera-transport campaign is implied.

| Layer | Required proof | Existing foundation |
| --- | --- | --- |
| Model/compiler | Full independent expected JSON for supported formats/contracts, all public families/options, raw/unknown data, emptiness, order, templates, popup identities and current added features | `test_page_model.py`, `test_page_migration.py`, `test_page_generation.py`, frontend canonical/editor tests |
| Packaging/native API | Clean frontend/converter boundaries, native admin writes/read disclosure, unsupported versions, stable strategy/editor, fresh theme, native resource/deferred-worker graph | Package-boundary, frontend-assets, editor build and native storage tests |
| Migration/recovery | Manual creation/import interruption and exact matching rollback; original hashes/modes, unrelated edits, privacy, custom YAML and resource conflicts | `test_history.py`, `test_native_storage_migration.py`, `test_release_replay_recovery.py`, `tests/upgrade/installed_state.py` |
| Preserved installation | Provenance-verified v0.21.1 plus representative older contract/native-storage lineage migrates and rolls back under same route, restart persistence, no history import | Existing `test-ha-upgrade.js` extended with modern immutable baselines; retain v0.20.0 as older data coverage |
| Builder/runtime | Visual/JSON/Monaco/native raw-card editor, local drafts/save/discard/import/export; all retained card families, navigation/popups, availability/errors and safe exactly-once actions | Existing focused gallery, builder, control, slider/access and history checks |
| Updates/old clients | Cached flat and API bootstraps, stale editors/deferred chunks, reconnect/foreground/hidden/offline states, no mixed graph/reload loops, real second Dashboard update without restart | Existing cache reproducer, refresh tests and disposable preparation |
| Netatmo/provider data | Native ID/time validation, camera matching, bounded order/limit, denied/missing/malformed metadata, no invented filters/private calls; Frigate/UniFi unchanged | Camera event/media-shaper unit tests and safe fake providers |

Keep behavior in one reference theme and representative appearance in both; use 320px and relevant enlarged-text/zoom/portrait-landscape checks for moved builder/layout/native control surfaces, and distinct touch engines where gestures require them. Reuse shared visits rather than multiplying every family by every historical release/profile. No automatic 26-profile matrix or `test:full` command is implied.

Camera code/configuration/event-provider/security/preservation tests remain automated. Playback, HLS transport, slow links, handoff and cancellation acceptance stay manual-only, including in upgrade runs. Preserve explicitly accepted camera/native reconnect exceptions as exceptions with raw evidence and stable-fix expiry checks; unrelated failures still block completion.

Implementation is complete only when compiler/source parity, accepted privacy/service dispositions, all selected preservation/recovery checks, real preserved migration, removal of Python dependence and a later frontend update without HA restart are demonstrated. Install applicable final candidate assets on the disposable instance. Publication later uses the normal unit-only `verify:publish` plus metadata gates and reuses valid development evidence; it does not rerun the campaign by default.

## Risks / Trade-offs

- Source becomes native-readable configuration → disclose precisely, require acknowledgment, preserve unknown data and block unresolved private content; no secret-detection claim.
- Public service/editor-route changes affect external tools → inventory and document replacements; dependent installations remain blocked until an approved disposition exists.
- Native saves allow a simultaneous last-writer race → preserve detected-conflict drafts and state the limit; do not claim a nonexistent cross-device CAS guarantee.
- Manual removal/creation/import leaves an interruption window → exact backup plus downloaded target, explicit stop-editing/export steps and verified guided retry/rollback.
- HACS retains a registered category → remove the old registration and re-add the same repository as Dashboard. Validate the frontend stable layout first; no private HACS registry edits.
- Removing the API asset server changes cache behavior → content-addressed assets plus real stale-client and later-update proof; do not assume query-versioning alone suffices.
- Protected YAML may contain private/server-only references → block unresolved input rather than evaluate or silently lose it.
- No ongoing History/Netatmo typed feed → make these explicit removals, retain old archive bytes and preserve all unrelated sensor history/provider behavior.

## Open Questions

- Repository choice is settled: retain `diogomrpr/MaraoDashboard`. The user authorized stable v0.22.0 publication as breaking on 2026-10-26; it must precede the complete real HACS re-add and subsequent-update proof.
- The minimum supported stable HA/Marketplace versions and exact migration restart count are results of the specified compatibility/install proof, and must be documented before release; no optimistic values are promised here.

## Implementation order and readiness

The product decisions needed to begin are settled; implementation continues under the selected manual migration decision. Remaining technical proofs are explicit gates, not evidence already obtained. Read [tasks.md](tasks.md) for exact task ownership and [implementation-notes.md](implementation-notes.md) for historical evidence and its limits.

1. Refresh the implementation snapshot/feature inventory and review the partial foundations against v0.21.1 (tasks 1.6–1.7), then establish actual native API/version boundaries (1.2–1.5). Do not carry forward an old test/deployment receipt as current proof.
2. Complete the shared source/compiler and protected-content path, then the standalone converter (group 2). Build local artifacts independently of publication; verify the converter's copy/download output through the native envelope consumer.
3. Complete native strategy, builder adapters, removal work, packaging/theme/fonts and cache recovery (groups 3–5). The first native feasibility proof must precede a large builder port; later integration uses the final shared engine and assets.
4. Deliver the per-instance manual backup/conversion/removal/native-import/rollback guide and local artifact checks (groups 6–7). Verify original and target before any legacy removal.
5. Expand immutable inputs and run preserved-install/retained-feature proofs (groups 8–9), including v0.21.1 access/spacing acceptance. Browser overrides or fresh fixture preparation cannot substitute for installed migration evidence.
6. With the same-repository artifacts and instructions reviewable (4.7), complete the required candidate checks and obtain authorization for its first frontend stable publication. The installed HACS must see that stable layout before real re-add/second-update proof completes group 10. Keep exact private legacy backups throughout installation and rollback verification.

Per-installation source visibility and retired-service dispositions remain concrete preflight decisions before any cutover. Stable-publication approval and the remaining measured HACS/update results remain required at their named gates. Acceptance of HA's native save limits remains in effect; waiting for #188548 is not an implementation dependency.
