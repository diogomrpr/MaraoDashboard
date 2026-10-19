# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. Design is required because gesture ownership, native-app handoff, web caching and preservation cross the shared runtime boundary.

At planning commit `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`, the working tree already contains unrelated implementation work. The inspected runtime is that working tree, not an assertion that HEAD ships it. The planning-only affected-card set is empty; future implementation affects the shared generated and native navbar hosts and overflow presentation.

The relevant path is:

| Layer | Observed responsibility / planned treatment |
| --- | --- |
| Builder/catalog | `editor.py`, `frontend_src/MaraoDashboardPanel.js` and native editors already describe ordered routes. Add no saved option; previews stay inert. |
| Validation/generator | `generator.py` emits `custom:marao-navbar-card`; current routes and YAML remain unchanged. |
| Shared runtime | `frontend/MaraoCards.js` owns `MaraoNavbarCard`, route click handlers, overflow dismissal, resize/route listeners and cleanup. Add the gesture at this shared root. |
| Native wrapper | `frontend_src/MaraoNativeCards.js` imports the shared class and propagates preview/native ownership. Keep the wrapper contract; do not duplicate hold logic. |
| Runtime startup/localization | `frontend/MaraoDashboard.js` owns English/Portuguese strings and propagates its version query to child modules. Reuse those catalogs and haptic helpers. |
| Asset registration | `__init__.py` computes frontend content fingerprints during setup/reload and registers versioned URLs. Keep this server responsibility; client recovery cannot make an incomplete deployment current. |
| Theme | Use inherited Marao surface, text and state tokens; feedback wraps independently of the fixed route row and remains below modal content. |
| Fixtures/checks | `ha-test/cases.js`, `cases.json`, `dashboard/views/00-card-test.yaml`, realistic dashboard JSON, navbar unit/browser checks, alignment and `tests/verification-map.js`. Add distinct cases without introducing another dashboard root. |
| Documentation | Native-dashboard usage, update/local-development guidance and `openspec/feature-coverage.md` should describe the gesture, local scope and cache limits. |

The baseline `navigation-popups` spec still describes five routes. The completed `support-navbar-overflow` change and current implementation preserve unlimited configured routes through overflow. This change adds requirements without rewriting that separate pending baseline delta or restoring the old count cap.

## Goals / Non-Goals

**Goals:** Keep the operation small and client-only, with one gesture implementation and one recovery operation shared by all navbar instances. Satisfy the two capability deltas without changing persisted inputs.

**Non-Goals:** A general cache manager, private HA module imports, a new backend management command, global storage deletion, server-side repair, or guaranteed recovery when the navbar itself cannot execute.

## Decisions

### 1. Keep gesture recognition separate from frontend recovery

The shared navbar owns pointer recognition, feedback and suppression of the originating click. A small runtime recovery function owns reachability, native handoff, cache cleanup and navigation. Keep it in the existing runtime or a small shipped module only if extraction improves meaningful testing; do not add a service framework. Use one document-scoped in-flight operation so duplicate navbar instances cannot race.

An alternative implementation per generated/native host would duplicate the difficult lifecycle and click rules. Directly importing HA's private hashed recovery modules would couple Marao to frontend build internals; use documented bridge messages and browser APIs instead.

### 2. Measure a continuous 3000ms hold without delaying ordinary taps

Start elapsed-time measurement on one primary pointer down within `.nav`, including links and More, excluding vertical overflow links and controls outside the horizontal bar. Use a monotonic clock. Proposed interaction defaults: a short-tap window of 500ms, a 10 CSS pixel movement tolerance, and completion at 3000ms from pointer down. After the short-tap window, show localized hold progress and request the start haptic; elapsed progress includes the initial window. Short taps retain existing click handling and haptics. Releasing an armed but incomplete hold consumes that gesture's click without refresh or navigation. Completion requests the completion haptic, shows refreshing feedback and consumes the release/click even if recovery is blocked or fails.

Recognize movement, second contact and scroll without globally cancelling browser touch defaults. Cancel on route/geometry replacement, loss of focus/visibility, modal ownership, edit/preview, removal or pointer cancellation. A background timer must not satisfy a hold on resume. Suppress link callouts/context menus only on eligible horizontal-navbar interactions so iOS native link previews do not steal the hold. Do not globally disable zoom, scrolling or context menus. Preserve ordinary keyboard link/button activation. Existing pointer-scoped overflow dismissal is the model for preventing a held control's click without swallowing later taps.

Use a compact progress treatment plus localized guidance beside/above the pill without adding a route slot or changing route geometry. Essential text wraps; feedback is noninteractive and does not intercept controls. Cancel pending holds before replacing navbar DOM and release all resources on disconnect. An empty/nonvisible navbar provides no hold target.

### 3. Use platform-aware recovery with a bounded fallback

The [documented external bus](https://contributors.home-assistant.io/frontend/reference/external-bus/) exposes `frontend/reload_and_clear_cache` for iOS/macOS, without an acknowledgement. HA's [current recovery source](https://github.com/home-assistant/frontend/blob/dev/src/util/recover-stale-build.ts), inspected during exploration on 2026-10-19, selects the WebKit bridge and otherwise clears web caches before cache-busting navigation. These are reference observations, not a claim about every installed Companion version. Recheck supported-version behavior during implementation.

Recovery order:

1. Check active-host ownership and unsaved state before mutation. If HA or Marao reports dirty work, block with localized save/discard guidance; do not queue an automatic refresh for later.
2. Check same-origin server reachability with a bounded HEAD request on the owned static refresh module and `cache: no-store`; HA dashboard views reject HEAD with 405, while its static routes support it and service workers ordinarily intercept GET. Do not use `navigator.onLine` alone as proof. If reachability cannot be established, preserve usable cached content and offer a readable retry error.
3. Where the documented WebKit bridge exists, send the supported native reset command once. Since it has no reply, observe actual document navigation/pagehide; if the same visible document is still active after a proposed two-second handoff deadline, take the web path once. A missing/throwing bridge takes the web path immediately. Backgrounding alone is not evidence of a successful refresh and must not trigger a delayed reload on resume.
4. On the web path, feature-detect same-origin HA frontend service-worker registration and Cache Storage. Remove identified frontend caching that would otherwise serve stale files, with bounded cleanup and explicit diagnostics on rejection. Never unregister unrelated-origin/scope workers or erase unidentified application data. Missing or denied APIs, including local HTTP on `192.168.0.28`, still proceed to navigation. Do not rely on `reload(true)`, whose cache-bypass argument is [Firefox-only](https://developer.mozilla.org/en-US/docs/Web/API/Location/reload).
5. Construct a fresh-navigation URL from the current document URL, preserving origin/path/query/fragment, and add/update only the owned transient `marao_cache_bust` parameter. Remove it when the refreshed module loads, preserving history state and the fragment. HA's `ha_cache_bust` startup cleanup drops the fragment, so it cannot satisfy this preservation contract. Use replacement navigation (on Android, update the current history entry and reload it to avoid external-link interception), preserve app-auth parameters, and do not intentionally open a new tab or external browser. A query parameter alone is insufficient when an active service worker ignores the search string, hence cleanup precedes navigation. Reload the document so the old ES module graph is discarded; do not hot-import a second custom-element runtime.

Bound reachability and cache work with explicit timers (proposed five-second reachability and two-second cleanup limits), cancel native/fallback timers on actual unload, and expose terminal failure if the page remains usable. Do not claim native handoff success merely because `postMessage` returned. After a terminal failure, release the in-flight guard for a new deliberate hold. The newly loaded document never resumes or automatically retries the previous refresh, so repeated failures cannot create a reload loop. A native attempt and its one permitted fallback are phases of a single operation.

Native reset can clear the HA WebView's broader frontend cache. The web path may clear HA frontend caches shared by views at the current origin; the scope is the current device, not only one Marao asset. Cookies, local/session preference/auth storage and IndexedDB are not cache-reset targets. Do not use `Clear-Site-Data` with storage/cookies or blanket origin-storage deletion.

### 4. Preserve current configuration and resource versioning

No builder field, default, route shape, generated type, config-entry version or dashboard-format version changes. Supported released configurations in `ha-test/upgrade/fixtures/` retain the identity transformation: the exact existing source and output remain unchanged. Unknown fields, explicit emptiness/deletions, order, raw/custom YAML and history remain intact. Verify this with independent before/after bytes/digests in private test evidence; do not rewrite historical fixtures to create proof.

Recovery never calls generation, discovery, integration reload or entity services. Existing server setup/reload must already register the current content fingerprint. Fresh document/module requests must carry that fingerprint into runtime, deferred editor/history/native resources as applicable. Browser tests must assert current asset identities and actual reloading, not only a toast or a mocked cache API call.

### 5. Verify the distinct paths together after implementation

Add a narrowly mapped `frontend-refresh` scope for the recovery helper/gesture, with reviewed `navbar` and affected native/popup contracts for shared changes. Extend meaningful tests with controlled clocks and environment adapters for 2999/3000ms, cancellation, duplicate controls, dirty-state preservation, native success/no-op/rejection, web cleanup failure/deadline, missing APIs, offline preflight, exact URL preservation and absence of auth/settings writes.

Browser evidence must exercise the real shared component, retain normal/overflow navigation, and prove one refresh plus no entity dispatch. Use a controlled stale-resource/service-worker fixture for cache invalidation and compare a deliberately old marker with the fresh marker. On the disposable HA installation, verify return to the same page, current installed fingerprint and deferred asset versions, unchanged settings/source and clean diagnostics. Use only safe fixtures; fixture HTTP/HTTPS tests stay local and do not connect to another HA installation.

Select relevant 320px, iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold-plus-text profiles; share theme-independent behavior in one theme and inspect representative light/dark feedback. Include navbar icon alignment. Run the smallest covering `test:affected` check serially after the batch, then final representative inspection. No full suite or exhaustive gallery matrix is implicit. Chromium/WebKit engine tests and bridge mocks must be labeled accurately; they do not prove a physical Companion app or haptic strength. App versions/native inspection, when available, are recorded separately; absent device access is an explicit evidence limit, not a claim of native verification.

## Risks / Trade-offs

- Native reset has no acknowledgement and older bridges can ignore it -> one visible-document deadline and web fallback, with actual navigation evidence and no unbounded retries.
- Android can treat some recovery URLs as external navigation -> preserve the existing app-auth query/context, inspect current supported navigation handling, and assert the in-app destination where app access is available. Do not infer in-app proof from desktop emulation.
- Web cache APIs differ by origin/platform -> feature detection, bounded cleanup and fresh-document fallback; promise current frontend loading under a healthy deployment, not universal OS cache erasure.
- Cache removal while offline loses useful content -> bounded server preflight before eviction, keep native connection warning, and show a retry error without inventing stale-state indicators.
- Hold conflicts with route taps, browser callouts or overflow -> short-tap/armed-hold distinction, scoped suppression, real pointer/touch coverage and lifecycle cleanup.
- Refresh discards unsaved UI state -> block on recognized dirty state and disable in edit/preview/modal backgrounds; retain authentication/settings storage and never auto-refresh after the dirty flag clears.
- Client reload cannot repair stale server registration or faulty application code -> keep source fingerprint diagnostics and resource errors visible; do not relabel deployment defects as cache success.

## Migration Plan

No data migration is required. Deploy compatible runtime assets together through the existing disposable sync flow after a dry run; normal deployment handles server resource registration. Before any fixture/dashboard writes, retain exact private source/generated/owned-state backups and preflight the intended scope. Preserve the user's current disposable dashboard layout and apply only necessary reversible example changes; do not replace it with starter defaults. Keep all examples under `/marao-dashboard`.

Rollback restores the previous coherent frontend package; this feature introduces no saved-data transformation. If verification temporarily changes source/generated fixtures or owned state, restore their exact matched backups with the matching package, verify cleanup and report restoration failures. Preserve concurrent/unrelated changes and immutable history. Planning and dry-run paths remain read-only outside this change's artifacts. Live preserved-install upgrade proof is not required unless implementation expands into persistence, ownership or installation behavior; such expansion requires revisiting the compatibility assessment first.
