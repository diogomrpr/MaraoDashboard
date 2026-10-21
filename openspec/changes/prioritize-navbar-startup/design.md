# Design

## Context

See [proposal.md](proposal.md) for motivation, observed behavior and preservation boundaries. This design is required because startup dependencies, native adapters, shell ownership and gesture handling cross module boundaries. The two capability deltas define acceptance; nothing in this document claims the new behavior is implemented.

The inspected working tree is based on `68a9deb96ffd5164949ac6c20f040beed57d654d` and includes unrelated work. Relevant current paths:

| Layer | Current behavior and treatment |
| --- | --- |
| Entry and registration | `__init__.py`/`const.py` register one fingerprinted `MaraoDashboard.js` entry. That entry awaits `MaraoCards.js` and `MaraoFrigateEventsCard.js` before importing native adapters. Preserve the entry URL; initialize critical navigation before the optional graph. |
| Shared runtime | `MaraoCards.js` awaits history data and refresh imports, then registers navbar and other card types together. Navbar, overflow, route dispatch, haptics, inset helpers, fullscreen ownership and popup interactions share this module. Extract the necessary navigation path once and retain compatible exports. |
| Native adapter | `frontend_src/MaraoNativeCards.js` loads the catalog/shared runtime and sends every card through `marao_dashboard/native/card`. `native.py:compile_card` simply copies navbar config to its runtime type and validates routes. A small early native navbar adapter can perform that identity conversion locally. |
| Composition | `generator.py` and `native.py:compile_starter` append the configured navbar after content. Keep saved/generated structures intact; readiness must not depend on its content siblings completing. |
| Builder and editing | Builder/native forms already own route fields; native hosts expose lazy config editing and preview guards. Preserve those hooks, metadata, admin-only native edit affordance and standalone shell behavior. |
| Theme/localization | Navbar inherits theme tokens and safe-area values; English/Portuguese strings currently come from the larger entry. Extract only critical localization/helper dependencies so progress and errors work before optional content. |
| Verification | `frontend-refresh.test.js`, `marao-navbar-card.test.js`, `marao-native.test.js`, `test-frontend-refresh-local.js`, `test-ha-navbar-overflow.js`, `test_init.py`, the controlled refresh fixture and `verification-map.js` already cover related contracts. Extend them instead of building another harness. |

The original refresh change excludes a blank page on which the navbar cannot execute. This follow-up improves independence from Marao content, while retaining that unavoidable HA/browser bootstrap boundary. The Android URL-preview symptom is reported on the user's Galaxy A35 5G; the active browser/Companion version and precise triggering sequence have not been independently recorded.

## Goals / Non-Goals

**Goals:** Establish a small dependency boundary for navigation/recovery; keep one valid configured surface through content replacement; remove link-preview behavior from the horizontal hold target without changing navigation configuration or the existing gesture/recovery policy.

**Non-Goals:** A general loader framework, persistent route cache, new dashboard schema, upstream HA private-module imports, reimplementing HA's shell, changing camera playback, disabling zoom/scroll globally, or making the navbar interactive through modal/edit protections.

## Decisions

### 1. Register the critical surface before the optional module graph

Keep the existing versioned `MaraoDashboard.js` entry. Extract navbar registration/rendering and the minimal shared navigation/shell helpers into small shipped modules; keep `MaraoFrontendRefresh.js` as the recovery/gesture owner. The critical path must not import `MaraoCards.js`, the full native catalog/model/editor, history/chart code or media/event providers. Move only dependencies actually required by navbar feedback, haptics, route handling, safe-area geometry and ownership. Re-export existing shared symbols where callers rely on them, preserving one class identity and one fullscreen owner for navbar, native and popup consumers.

Register both existing navbar custom-element names on this path. Then start the optional content graph without making critical readiness await it. Once the active HA view configuration is available, mount the navbar as the first usable Marao surface. Optional modules may fetch in the background after critical registration; their completion is never a prerequisite for navigation. This distinguishes request ordering from usable UI and avoids an artificial delay to all content.

Retain content failures and show a readable error for the affected surface; do not swallow import errors or let an unhandled optional rejection terminate critical startup. The current single `Promise.all` must no longer couple event-card failure to native navbar registration. Keep normal card registration/readiness compatible with HA's asynchronous custom-card lifecycle so deferral does not introduce transient unknown-card error cards.

Alternative: changing script priority or adding preload hints leaves the dependency graph intact and cannot isolate failure. Registering another global frontend entry adds ordering/lifecycle complexity; retain the existing entry unless implementation evidence makes a registration change necessary. Every critical/deferred import propagates the same content fingerprint; no hot-loading a second runtime or second custom-element implementation.

### 2. Specialize only native navbar startup

Register a lean native navbar adapter under `marao-native-navbar-card` before the full native catalog loads. It performs the existing runtime-type conversion from the supplied configuration, using the same route validation rules as the shared renderer and retained Python trust boundary. It does not request entity metadata, wait for `hass.states`, or call `marao_dashboard/native/card`.

Keep full configuration and unknown keys intact. Preserve native preview/edit behavior, `getConfigElement`, sizing, admin editing and theme propagation. Load the existing editor only when requested; general native-card registration must recognize the already-owned navbar name and not replace it. Other card compilation remains unchanged. Builder and backend validation remain authoritative for saves; moving rendering locally does not bypass a write boundary.

Alternative: prioritizing or caching the WebSocket request still fails on slow/disconnected startup and introduces invalidation state for an identity transformation.

### 3. Keep the active surface outside replaceable page content

Reuse the existing `hui-root`/fullscreen ownership boundary. Keep the active navbar surface in that stable root outside its replaceable `#view` content, with a single owner per active context. Read only the current view's already-loaded, explicit navbar descriptor, including resolved generated and native configurations. Normal card hosts supply/adopt that same configuration instead of mounting a second active pill. This is local presentation ownership, not a new saved navigation source or a discovery request.

Retain the last valid surface during temporary same-dashboard DOM replacement, then adopt the incoming view's explicit config. Check current route/view ownership before accepting a late host update. Clear on explicit empty navigation, explicit absence/removal in the newly available configuration, leaving the owning dashboard, root teardown or removal of a standalone navbar. Do not retain routes across dashboards, persist them to storage, merge conflicting configurations or use a timer to invent destinations. An invalid incoming config stays a readable configuration error; retention is not evidence that it loaded successfully.

Cancel in-progress holds and overflow on navigation, geometry replacement or loss of eligibility; a new hold may start after handoff. Keep edit/preview guards, dirty-state checks and modal inert ownership on the stable surface. Scope popup background handling and focus restoration to the actual active surface. Previews remain bounded local renderings and standalone native bars continue to preserve ordinary HA toolbar behavior. Release listeners, observers, timers, portaled surfaces and shell styles on exit; preserve content clearance and safe areas.

Alternative: recreating the bar in each page host leaves recovery unavailable during precisely the replacement/failure being addressed. A document-global permanent bar would leak into unrelated HA views and violate shell ownership.

### 4. Remove native link activation from horizontal hold targets

Horizontal destinations become semantic `button type="button"` controls, dispatching their configured destination through the existing navigation function on ordinary activation. Keep labels, active-page semantics, icons, order, target geometry, query/hash behavior and immediate tap handling. Store the destination in configuration, not an `href`, URL tooltip or draggable link descendant on the hold surface. More already uses a button. Keep the vertical overflow menu's current navigation and scrolling contract; it does not acquire a refresh hold.

This removes the horizontal anchor activation path that can expose a URL while preserving browser-native button/keyboard behavior. The exact Android cause is still unconfirmed, so successful prevention must be checked rather than inferred from a CSS rule. Reuse the existing shared `bindNavbarRefresh` at the pill, covering padding/gaps and composed events from nested icon graphics. Preserve its 3000ms monotonic duration, 500ms arming window, movement threshold, two strong haptic requests, single operation and release/click suppression.

Apply callout/context-menu/selection/drag prevention only to the eligible horizontal surface and its descendants, early enough to protect the whole hold. Preserve scroll, pinch zoom, keyboard activation and all existing cancellation guards. Do not use a document-wide `preventDefault`, blanket `touch-action:none`, synthetic repeated clicks or a second independent timer per icon. Update selectors and active-icon binding for both horizontal buttons and overflow links at their shared root.

Alternative: adding more `-webkit-touch-callout` CSS or a second `contextmenu` guard alone repeats existing protections without removing the link target. Hiding the reported URL or suppressing diagnostic evidence is not a fix.

### 5. Verify ordering and interaction with controlled failures

Extend the existing local refresh fixture to exercise the real entry/bootstrap and both generated/native hosts. It currently imports the card/native modules to completion before creating a navbar and mocks compilation as immediately successful, so it cannot establish early startup. Record critical registration, optional request start, navbar interaction and content readiness separately; assert ordering and successful interaction while optional responses are held unresolved. Avoid elapsed-time guesses, network-idle readiness or merely checking module size.

Hold/fail the history, event/native-content and editor dependencies in representative cases, keep a camera unready, and simulate disconnected/never-resolving native compilation. Assert no navbar compilation request, usable localized progress, one navigation/refresh, appropriate offline/dirty feedback, current asset identity, and no entity/server writes. Deliberately injected failures must be separately identified in raw evidence and produce readable failures; no blanket console/resource allowlist. Healthy checks must remain free of relevant diagnostics.

Cover nested icon targets, a selected and unselected route, More, one gap/padding target, incomplete/cancelled holds, keyboard taps, overflow scroll/dismissal and post-reload release. Use real touch input in Chromium and representative WebKit input rather than only dispatching synthetic pointer events. Android browser/Companion native menus are outside desktop emulation: retain evidence that horizontal targets have no URL-bearing activation surface; recommend a focused Galaxy A35/Android check when available and report its actual host/version and limits. A missing physical phone is not a reason to run the full mobile matrix or claim device proof.

Reuse `frontend-refresh`, `navbar`, relevant `native`, popup/scroll and registration scope, narrowing shared-helper checks by actual consumers. Update the check map for any extracted files. Run one smallest covering serial `test:affected` gate after the batch, include `test:ha:alignment` for changed icon controls, and inspect representative narrow/text/zoom/landscape and both-theme feedback on disposable `192.168.0.28`. Keep safe gallery and realistic examples under the single dashboard root, restore exact temporary changes and verify cleanup. No production connection or comprehensive suite is implied.

## Risks / Trade-offs

- A helper extraction creates circular imports or duplicate registrations -> require a one-way critical dependency graph, compatible re-exports and cold-cache/import-identity tests across direct and entry imports.
- Portaling loses HA context, modal inertness or safe-area inheritance -> retain the existing HA root boundary and test transitions, popup focus, standalone native chrome and full teardown.
- A late removed view restores stale routes -> bind updates to current context/route and test delayed old-owner results, changed/empty configs and leaving Marao.
- Changing horizontal anchors affects test selectors or keyboard behavior -> preserve configured navigation and semantic buttons, update shared selectors and assert actual dispatch/active icons as well as geometry.
- Native Android callouts differ from desktop event simulation -> remove horizontal link targets, preserve raw evidence and distinguish automated browser coverage from any actual device confirmation.
- HA cannot supply its shell/config or the browser freezes -> do not claim availability before that boundary; no reload loop or new persistent cache is introduced.

## Migration Plan

No dashboard/config-entry format migration is planned. Supported released JSON fixtures such as `v0.5.1-dashboard.json`, the frozen `v0.2.0-storage-dashboard.json`, and independent customized/overflow expectations retain their existing contracts. Test source/config identity, unknown fields, explicit emptiness, order, native editing and unchanged generated output without rewriting historical fixtures. Existing saved dashboards must load the new frontend without regeneration.

Before implementation, record the actual starting commit, dirty baseline, affected shared consumers and scoped check plan. Build edited native sources through `npm run build:editor`. Preserve the entry URL and registration API where possible; test setup/reload/unload and fingerprint propagation. If installation or owned-registration behavior changes, require scoped preserved-install upgrade/recovery evidence during explicit release preparation; do not substitute fresh fixture preparation for it.

Deploy compatible assets together only to the disposable instance after read-only planning and exact private backups of package, source, generated files and affected owned state. Restore temporary test changes and verify matching package/data cleanup. Rollback uses the coherent prior package and saved baseline together if any owned state changed; retain recovery data and report failures. Before any separately authorized publication, run scoped `verify:publish` and applicable exact-commit checks. Planning validation is not implementation or release proof.


## Implementation and verification — 2026-10-20

Implemented the critical `MaraoNavigation.js` module and lean native navbar, retaining the public `MaraoDashboard.js` entry and moving the old content implementation to `MaraoRuntime.js`. A comparison with the captured dirty baseline confirms the moved runtime is identical outside imported navigation translations. Existing shared exports, native route validation, full configuration/unknown keys, English/Portuguese stub names and lazy editor hooks remain compatible. No backend, persisted source format, generated descriptor or package version changed.

The active navbar is owned by the stable HA root. Current-view configuration changes, explicit empty/absent navigation and context exit reconcile the surface; previews remain local. Horizontal destinations are buttons and the pill-level gesture handles nested icons, padding and More. A real disposable-host check found the HA view container could intercept the portaled pill: the fix establishes its explicit stacking order, and the controlled fixture now reproduces a positioned view sibling. The test's initial authentication setup and its attempt to hash a management payload containing changing entity metadata were corrected; the final preservation assertion separately hashes saved source, generated configuration and history.

Selected evidence:

- Scoped serial offline campaign: `tests/.artifacts/verification/run-IhrfEb/report.json`, 19/19 checks passed with cleanup verified, including native/configuration, shared consumers, packaging, editor assets and local browser recovery. Follow-up focused checks covered the final stub/localization, fixture and stacking changes; the campaign is development evidence, not final-candidate publication proof.
- Final controlled startup check: `tests/.artifacts/navbar-startup-local/report.json`, Chromium and WebKit. Critical navigation works with the runtime withheld or failed; native compilation count is zero, horizontal targets hold without a URL-bearing control, view replacement retains one surface and empty navigation tears it down. The final fixture includes the real host's positioned sibling.
- Existing frontend-refresh browser check passed ten selected layouts/hosts with stale-worker recovery, preserved URL/settings and zero entity actions. Current shared navbar/native/refresh/gallery unit checks and editor reproducibility checks also passed. The focused verification map includes both controlled startup and actual-host interaction.
- Final disposable-host check: `tests/.artifacts/navbar-startup-ha/report.json`, fingerprint `9d679afa29f60e80`. Actual generated navigation, overflow, SPA transition and a touch-triggered refresh passed with one navbar, unchanged saved source/generated configuration/history, zero service calls and no page/console errors. The current Android-sized capture was visually inspected: one compact row, full-size controls, active-route cue and safe bottom placement remain visible while HA content is loading.

The disposable frontend remains on these successful current assets under the current development workflow. No safe helper or saved dashboard data was changed by the interaction check; transient browser contexts were closed. The production instance was not accessed. No physical Android/Companion device, full suite, publication gate, historical upgrade campaign or release was performed. The native-menu observation is supported by removal of link targets and browser gesture evidence, not claimed as a physical Galaxy A35 test.

The accompanying minimal-camera presentation remains implemented; its historical native playlist 404 is not claimed fixed, and the user permitted omitting additional presentation checks in this apply. The user separately chose native playback and explicitly left automatic camera-quality upgrades pending. Neither camera change is marked fully complete by the navbar result.
