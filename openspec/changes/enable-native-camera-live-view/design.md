# Design

## Context

See [proposal.md](proposal.md) for the motivation and [the camera delta](specs/camera-history-content/spec.md) for acceptance criteria. A design is needed because native player loading, Safari gesture recovery, persistent DOM identity and stream disposal cross the current camera rendering lifecycle.

At starting commit `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`:

- `custom_components/marao_dashboard/frontend/MaraoCards.js` renders `hc_camera_card` as `img.camera`. The `hass` setter skips unrelated updates using that selector. `_setMarkup` preserves the outer `ha-card` but replaces its descendants; merely replacing the image markup with a stream would restart it on ordinary renders.
- The same class owns media errors/retry, lifecycle cleanup and the transparent card-action button. A camera change must preserve the outer surface/scroll and avoid letting that button intercept playback actions.
- `editor.py` and `frontend_src/editor-labels.js` already advertise a live feed. `generator.py` creates the camera card and events popup. `native.py`, `frontend_src/MaraoNativeCards.js` and `frontend_src/native-model.js` route native cards and inert previews to the shared runtime. No new saved option is needed.
- `docs/docs/usage/cards/hc_camera_card.md` and the existing **Native camera previews and event sheets** requirement currently describe still previews. The delta deliberately changes that requirement; event browsing/detail behavior is retained.
- `ha-test/custom_components/marao_test_camera/camera.py` serves a static SVG without a stream source. Its recorded `event.mp4` and current event-sheet tests cannot prove live playback. `tests/verification-map.js` currently maps `camera` to event units and Chromium `--camera-only`, leaving a live-player/WebKit coverage gap.

No Home Assistant endpoint, credentials, real camera, Safari dashboard or device control is accessed during this planning change. Findings concern local source and public upstream documentation, not the installed frontend's verified version.

## Goals / Non-Goals

**Goals:** Fix the existing `hc_camera_card` so its still image automatically gives way to native live playback as standard behavior; keep the player connected while its camera remains visible and available; inherit native transport/authentication behavior; retain honest media state, exceptional Safari gesture recovery, configuration and events.

**Non-Goals:** Own a WebRTC/HLS stack, provide transcoding, change NVR or HA settings, add PTZ/two-way audio, use the real installation as a test target, redesign other cards, or treat offline mocks as native integration evidence.

## Decisions

### 1. Embed the native camera stream inside the existing Marao surface

Fix the existing `hc_camera_card` branch of `MaraoCard`; do not register a new Marao card/template, add a catalog entry or introduce a live-view mode/setting. Use HA's existing `ha-camera-stream` element internally, with the configured camera `stateObj`, `muted=true`, fitted media geometry and current HA data. Let HA select its advertised HLS/WebRTC/MJPEG paths. A single native player can legitimately negotiate more than one transport; the wrapper must not add duplicate players or independent stream requests.

Load the HA-owned module only when a runtime camera becomes eligible. Memoize the registration work: use `window.loadCardHelpers()`, feature-check `importMoreInfoControl`, request the camera module, then bound the wait for `customElements.whenDefined('ha-camera-stream')`. The import helper returns void; readiness comes from element registration. If the helper is absent on an otherwise supported frontend, use the existing HA card-helper pattern to create a detached native picture-entity bootstrap solely for registration; never supply it `hass` or mount it. Surface a registration failure rather than waiting indefinitely or repeatedly importing.

Current upstream elements consume HA ancestor contexts, whereas the inspected older element accepts `hass`. Keep the native element under the real HA dashboard/provider ancestry; forward current HA data for the older path and `stateObj` for both. The signaling ownership repair below scopes only connection/API contexts to the owned subtree; other contexts retain their normal providers. Do not import private asset paths, sniff versions or fetch another frontend. Test both binding contracts and recheck source compatibility before implementation.

Alternative: embed a whole native picture-entity card. It gives native loading behavior but introduces another `ha-card`, title/action semantics and styling conflicts. Direct native media retains Marao's surface and events. Alternative: external camera cards or direct Protect URLs would add dependencies, authentication and transport ownership and are excluded.

### 2. Preserve a camera-specific player mount instead of changing every card render

Give the camera branch a stable media slot keyed by entity and connection lifecycle. Keep both the existing outer `ha-card` and the native player continuously connected during camera metadata, theme/locale and ordinary state changes. Do not detach and reinsert the player as a way to preserve it: disconnection itself tears down playback.

Use the current camera's `entity_picture` as the loading poster immediately when provided, while native registration and live initialization proceed independently. Keep the poster visible in the same reserved media area until the active native video actually starts advancing, then remove the poster automatically. Keep the native player connected and in the viewport beneath the poster; do not use `display:none`, a hidden attribute or an offscreen staging area that could prevent Safari autoplay. The handoff changes media visibility only, without a blank intermediate state, card-height change, native-player replacement or user action.

Do not wait for poster loading before initializing live video. If no still is available, retain the media geometry with localized loading feedback; if the still fails, preserve appropriate error reporting without cancelling live startup. A late poster completion cannot cover already-playing video. Bind poster and player completions to the same camera generation so media from a replaced/unavailable camera never appears. Every eligible lifecycle restart and explicit Retry follows this same automatic poster-to-live path.

Use a camera-specific reconciliation path around the existing `_setMarkup` machinery, updating surrounding labels/problem state without replacing the media subtree. Keep the general surface replacement contract unchanged for other templates. Forward current HA data even when the unrelated-state render shortcut returns. On entity identity change, deliberately dispose the previous player before starting the new one.

Eligibility requires a connected runtime card, an available target, a visible document and visible card/containing sheet. Reuse existing route/visibility hooks and one intersection observer per card as needed; release resources on offscreen/hide, preview mode, disconnection, removal and availability loss. Invalidate pending module/media work with a per-card generation token. Reappearance/reconnection permits one current initialization, while an existing playback error remains latched until explicit recovery or a meaningful identity/availability transition. There is no periodic wrapper retry loop or stream pool.

Alternative: rebuilding on each HA update creates stream churn and Safari scroll/playback resets. A dashboard-wide session broker is unnecessary; duplicate visible cards have independent native hosts and independently tested disposal.

### 3. Use a small media-element bridge for playback feedback and Safari recovery

Set native `controls=false` and retain HA-owned transport and rendering. Normal startup and the still-to-live handoff require no Start/Play control, click or mode selection. Show Start live view only after a recognized browser autoplay rejection, retaining the still until playback succeeds; show Retry only for applicable failures. These exceptional controls use at least 48 by 48 CSS pixels, semantic names, strong press haptics and localized English/Portuguese text. Keep them above/excluded from the card's event-action hit area; normal card activation outside these controls retains configured popup/custom actions. Do not enable native audio controls or autoplay audio.

The native host does not expose a public play/retry interface or reliable forwarded playing/error state. Its `load` can mean an image fallback, and `streams.hasVideo` can precede playback. Therefore isolate one compatibility bridge that locates the active `HTMLVideoElement` through the native elements' open shadow roots, observes ordinary media events, and calls its standard `play()` synchronously from an explicit user gesture. Do not call HA private methods, patch prototypes, copy player code or inspect media pixels. Prefer this bridge over remounting on Play, which can lose Safari's user activation before video is created.

Use MutationObserver/media events, scoped to the mounted native host, to follow native transport replacement and find its video. All listeners/observers are generation-bound and removed on disposal. `playing` plus advancing media time/frame callbacks establishes playback and triggers the automatic poster removal; `load`, playlist metadata, a resolved service call or the entity's recording/streaming state does not. A waiting/stalled video does not retain an unqualified Live indicator. If the bridge cannot bind, show an explicit compatibility/recovery problem instead of silently claiming success.

Native controls were considered, but their browser-dependent small buttons do not establish Marao's visible 48px touch contract. The isolated media bridge is a deliberate upstream DOM dependency and needs focused compatibility tests. It must preserve native error presentation and propagate rejected playback promises into the existing card problem surface.

### 4. Make failures and still fallback explicit without reimplementing native negotiation

Reuse the existing `cardProblem` priorities and `_mediaError`/Retry path for camera failures, keeping `hc_media_card` behavior unchanged. Add distinct localized stream-loading, playback-required and snapshot-fallback copy through the runtime catalog in `frontend/MaraoDashboard.js`; do not derive playback success from entity state. Reserve stable media space and let long errors/actions wrap under supported text/zoom sizes.

Bound module registration and the initial playback attempt, using named finite limits tested with a fake clock rather than endless loading. Prefer a 30-second initial playback limit, reset only by explicit retry or a meaningful lifecycle restart; keep native transport negotiation within that attempt. Native fallback from one failed transport to another is not a terminal card failure. Preserve native reported errors; do not remove native warnings, swallow exceptions or replace a failure with a cosmetic success state.

The still serves as a temporary loading poster during normal startup, not a selectable image mode or successful endpoint for a supported live stream. If live video is unsupported or fails, retain the current HA `entity_picture` where available, explicitly labelled Snapshot with its reason, while keeping events usable. Native image/MJPEG fallback is treated as camera preview rather than proof of video playback; a single image load cannot establish advancing live video. A camera without supported live video must not be shown as Live. Unknown/unavailable/disconnected state takes neutral priority and clears both poster and video. An unavailable camera is never turned on or moved out of privacy mode by the card.

Retry resets the camera's own failed attempt and creates at most one fresh native host behind the available still; it switches automatically when playback is ready. Exceptional Start calls the existing native media element within the gesture and uses the same automatic handoff. Neither action bubbles to the events popup. No retry loop, camera control service or provider-specific fallback URL is introduced.

### 5. Retain one configuration contract across every host

Keep saved JSON/YAML, the existing `hc_camera_card` identity, entity selection, names, explicit empty/options, unknown fields, raw cards, action configuration, popup hashes, event-provider/media-source overrides and ordering unchanged. Automatic still-to-live behavior is standard for existing cards; do not add any new required or optional live setting or replace configured cards. Event-provider settings still govern recorded media only. No generated-output ownership, source-format, HA config-entry or package-version change is required by this proposal.

Align catalog copy/translation, camera docs and the feature coverage map with this distinction. Exercise generated and manually authored/native hosts using the same renderer; read-only editor previews must start no camera work. Keep event list/detail regressions and existing independently expected historical camera-provider JSON. Treat any newly discovered persisted/generated change as scope expansion requiring renewed migration assessment before editing.

### 6. Plan focused evidence in two clearly separated stages

During later implementation, with the current no-HA-access instruction still in force, preview and run only the covering offline selection (`npm run test:affected -- --offline --component camera --plan`, then the corresponding run after the final batch edit). Extend `tests/verification-map.js` first so camera scope includes player lifecycle, related media/visibility regression, native/preview and configuration preservation, gallery checks and local synthetic browser coverage. Keep checks serial. Use `--base <implementation-start>` for committed batch work, not this proposal's baseline if HEAD has changed.

Add safe advancing video and failure/blocked-autoplay fixtures under `ha-test/`, never the shipped integration. Reuse static/event fixtures for their original purpose; do not repurpose recorded clips or SVGs as live proof. Add a canonical `card-test` case and a realistic Entrance/Security example within the single `/marao-dashboard` dashboard. Local browser harnesses must not read `ha-test/local.json`, prepare/sync HA or invoke HA test runners.

Local tests cover native loading/binding contracts, still display during delayed startup, automatic handoff only after advancing video, missing/failed/late posters, no normal Play action, rejected autoplay and exceptional Play, stable host identity, duplicate cards, stale completion, availability/error/retry and hidden/removal cleanup. Assert the same existing card works with unchanged saved configuration and no new registration/setting, including after retry and lifecycle recovery. Use WebKit for Safari-relevant coverage and Chromium for Android/reference behavior; mocks alone establish wrapper behavior, not native HA transport interoperability. A local media file proves browser decoding/gesture handling, not camera streaming.

Select 320px, representative iPhone/Android portrait and landscape, normal/bold/200% text/200% browser zoom/bold plus 200% text where the new status/actions change layout. Run reviewed geometry/behavior in one theme, with representative appearance/error state in both; select `test:ha:alignment` only if a new icon-only action or shared action geometry requires it, and leave that live check pending under the access restriction.

Native end-to-end evidence is a separate incomplete gate: the actual HA player, its contexts, advancing safe stream, native fallback, request/session release and generated events must eventually be checked against an explicitly authorized disposable `192.168.0.28` installation, with WebKit/Safari limits honestly reported. Do not run current `--camera-only` commands now: they prepare/write fixtures or invoke helpers. Actual Safari/UniFi Protect interoperability remains unverified; a synthetic Protect-shaped entity proves configuration/provider independence, not real NVR behavior. An actual Safari check can use only a separately authorized safe test feed, never the user's production camera. Final integrated inspection follows the last implementation edit and focused checks; it cannot be declared done while HA access is prohibited.

## Risks / Trade-offs

### Signaling ownership repair (2026-10-19)

The user requested repair of the reproduced late-WebRTC-event release blocker.
Keep HA's native player, transport selection and authentication. Bind only its
connection/API contexts (including legacy `hass`) to camera-local signaling.
Each native offer opens the installed native connection class using its public
socket factory; its returned unsubscribe closes that entire connection. Close
owned connections on every existing disposal path, including authentication that
finishes after disposal. Route ICE candidates on their offer's connection and
retain errors except explicit connection-lost cancellation of retired work.
Unexpected loss must fail visibly without reconnecting a retired offer.

This changes runtime connection ownership only. Saved source, generated output,
card identity and native playback behavior remain compatible. HLS-only cameras
open no additional signaling connection; a live WebRTC offer uses one additional
authenticated socket. Preserve all historical failing diagnostics. No native
prototype patch, endpoint replacement, warning suppression, transport forcing or
delayed visibility cleanup is permitted. Prove native socket closure and shared
connection survival, early cancellation, metadata/context updates, independent
duplicates and selected phone/WebKit profiles before integrated acceptance.

- [HA custom element, lazy-loader and shadow-DOM contracts evolve] -> Keep the bridge camera-local, feature-check loading/binding, test current and legacy HA-shaped contracts, record tested frontend versions and report unsupported paths clearly.
- [Safari policy, codec/profile or native stream setup prevents playback] -> Keep automatic muted inline startup, expose synchronous user-gesture Play only after autoplay is blocked, let HA retain HLS/WebRTC choice and document upstream prerequisites without promising transcoding.
- [Protect can fall back to repeated snapshots if no active stream exists] -> Use the selected entity as-is, distinguish preview from confirmed playback, document that the user's native HA stream must work, and never change NVR/HA settings automatically.
- [Offscreen/removal cleanup misses a native image stream] -> Test image/MJPEG request release separately from video-track/peer/HLS disposal; detach the native host and remove bridge resources on every ineligible path.
- [A broad shared-renderer edit affects unrelated controls] -> Keep a camera-specific stable subtree; expand affected consumers and covering checks if general `_setMarkup`, media errors or action geometry changes.
- [Offline tests are mistaken for verified Safari/Protect support] -> Report evidence by layer; retain unchecked native integration tasks and do not publish/archive the behavior as verified until required evidence is authorized and passes.

## Migration Plan

There is no source transformation: the independent expected mapping for every supported historical camera configuration is identity. Reuse provenance-backed camera-provider fixtures under `ha-test/upgrade/fixtures/`, including existing v0.5.0 expected format-1/format-2 JSON, without rewriting archived data. Add preservation assertions only where missing.

No HA writes, deployment or backup operation occurs as part of this proposal. A later authorized implementation/deployment uses the normal fingerprinted frontend package and scoped prepare preflight, exact source/generated/owned-state backups and atomic writes. Retain recovery data through failure and restore the matching prior package plus saved state together if anything persisted changes; preserve concurrent/unrelated edits and report rollback failures. A UI-only implementation does not require historical live upgrades; if persisted data, generated ownership or install behavior changes, recompute affected baselines and require scoped preserved-install proof during explicit release preparation.

Before any eventual push/tag/release, use scoped `verify:publish` and applicable exact-commit validation; reuse unchanged valid evidence. This request does not authorize publication. Do not sync this delta into baseline specs or archive it until implementation and selected verification are complete.

## Upstream references

Public sources inspected during planning on 2026-10-18; recheck against the frontend actually supported during implementation:

- [Native camera host, inspected released reference 20260930.2](https://raw.githubusercontent.com/home-assistant/frontend/20260930.2/src/components/ha-camera-stream.ts) and [older hass-based host 20250903.3](https://raw.githubusercontent.com/home-assistant/frontend/20250903.3/src/components/ha-camera-stream.ts): host properties, contexts/binding and native transport delegation.
- [HA custom-card helper documentation](https://contributors.home-assistant.io/frontend/custom-ui/card/), [helper exports](https://raw.githubusercontent.com/home-assistant/frontend/dev/src/panels/lovelace/custom-card-helpers.ts), [more-info loader](https://raw.githubusercontent.com/home-assistant/frontend/dev/src/dialogs/more-info/state_more_info_control.ts) and [camera module](https://github.com/home-assistant/frontend/blob/dev/src/dialogs/more-info/controls/more-info-camera.ts): HA-owned lazy registration without opening a dialog.
- [Native HLS player](https://raw.githubusercontent.com/home-assistant/frontend/dev/src/components/ha-hls-player.ts), [WebRTC player](https://raw.githubusercontent.com/home-assistant/frontend/dev/src/components/ha-web-rtc-player.ts) and [context provider](https://raw.githubusercontent.com/home-assistant/frontend/dev/src/state/context-mixin.ts): media events, lifetime and provider ancestry. Host-level load/capability events alone do not verify advancing video.
- [WebKit inline video policy](https://webkit.org/blog/6784/new-video-policies-for-ios/) and [autoplay policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/): muted/inline defaults and handling rejected autoplay with explicit playback.
- [UniFi Protect integration](https://www.home-assistant.io/integrations/unifiprotect/) and [HA Stream integration](https://www.home-assistant.io/integrations/stream/): active-stream and browser/codec prerequisites. H.264 is a useful test baseline; Safari HEVC support is browser-dependent, so no blanket H.265 prohibition or compatibility guarantee is assumed.

## Automatic quality fallback follow-up — 2026-10-20

Authorized implementation starts at `68a9deb96ffd5164949ac6c20f040beed57d654d`. Affected cards: all `hc_camera_card` hosts, with retained camera-event action regressions. Preserve saved selections, all existing fields and generated ownership; no migration or settings change. Use HA registry platform/device identity and numeric main-channel metadata to choose available lower-resolution UniFi Protect siblings only. Never enable disabled entities or change provider settings. Keep the chosen lower tier for the playback session; Retry returns to the configured tier. Bound each attempt and exhaust tiers once, with readable failure rather than retries. Keep advancing-video observation independent of sparse media events. Brief buffering retains the video frame with localized buffering feedback, not the snapshot. Only startup, quality replacement and terminal failure may show the labelled snapshot. Test actual native synthetic high/low streams on disposable `192.168.0.28` with constrained media delivery, plus lifecycle, candidate safety and poster regression checks. No real-instance access, publication or comprehensive test run.
