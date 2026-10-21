# Proposal

## Why

Marao's existing `hc_camera_card` currently renders Home Assistant's `entity_picture` as an image, despite the builder describing a live feed. Fix that card in place: show the still image while Home Assistant's native player loads, then automatically switch to live inline video for supported cameras, including UniFi Protect in Safari.

## What Changes

- Fix the existing `hc_camera_card` as standard behavior for every available runtime instance. Introduce no new card type, template, catalog entry, live-view mode or opt-in setting.
- Show the current HA still image immediately when provided while the native live player initializes concurrently. Keep the still visible until live playback is ready, then switch automatically in the same media area without a click, mode selection, blank intermediate state or player remount. A missing or failed still must not block live startup.
- Request muted inline live playback through Home Assistant's native player, delegating stream transport and authentication to Home Assistant. Apply the same automatic still-to-live path after eligible lifecycle restarts and explicit retry.
- Preserve the generated Frigate/UniFi Protect events popup and all existing event-provider settings; keep event activation separate from playback/retry interactions.
- Distinguish loading, active playback, an explicitly labelled still-only fallback, blocked/failed playback, and neutral unavailable/disconnected states. Never present a stationary image or camera recording state as proof of live playback.
- Keep one player mounted per visible card across unrelated state updates, with bounded initialization/retry and cleanup on hiding, navigation, removal, entity change or loss of availability.
- Cover Safari's muted autoplay and inline playback behavior and compatible UniFi Protect streams using the camera entity already configured in Home Assistant. Show Play only when the browser actually blocks autoplay; it is an exception to the automatic flow.
- Align builder copy/translations, camera documentation, safe gallery fixtures, a realistic Security-page example, and focused verification with the new behavior.
- Modify the existing snapshot-only specification explicitly; this is proposed behavior, not a claim that live playback already works.

## Capabilities

### New Capabilities

None; live video belongs to the existing camera capability.

### Modified Capabilities

- `camera-history-content`: Fix the existing camera's still-only behavior with a standard still-to-live handoff; add observable playback/fallback, Safari/Protect compatibility and stream-lifecycle acceptance criteria. Retain recorded-event behavior and authenticated media handling.

## Impact

- Starting commit: `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`.
- Planning-only affected-card set: empty; these edits revise the existing four artifacts without changing runtime code.
- This proposal changes planning files only. The implementation affected-card set is `hc_camera_card` in generated dashboards, manually authored/native Lovelace cards, popup/group hosts and read-only editor previews. `custom:marao-camera-events-card` and its `custom:marao-frigate-events-card` compatibility registration are regression consumers of the retained popup contract. If changes reach shared media/error/surface code, include `hc_media_card` and every additional consumer identified by the source/check map before editing; prefer a camera-specific stable mount within the shared renderer.
- Relevant source: `custom_components/marao_dashboard/frontend/MaraoCards.js`, native hosting in `custom_components/marao_dashboard/native.py` and `frontend_src/MaraoNativeCards.js`, `custom_components/marao_dashboard/editor.py`, `frontend_src/editor-labels.js`, the runtime localization catalog, camera usage docs, `tests/verification-map.js`, frontend/generation tests and `ha-test/` fixtures. The event runtime and generator should retain their public behavior.
- Compatibility: keep existing card identity, template/entity keys, variables, event overrides, generated YAML structure, popup hashes and source/history formats unchanged. Existing camera cards gain the automatic still-to-live behavior without replacement, any new setting, source rewrite, migration or format/config-entry version bump. Historical camera-provider fixtures remain immutable and must retain independently specified expected configuration. Reassess migration and release upgrade scope if implementation expands this boundary.
- Native player APIs are an upstream compatibility dependency, not a bundled library. Add no external card, streaming stack, NVR credential, direct RTSP URL or browser codec promise beyond Home Assistant and the browser's actual capabilities.
- Non-goals: changing Protect/NVR settings, transcoding or installing integrations, new live-view popups, changing recorded-event playback, two-way audio/PTZ/privacy actions, unrelated card redesign, release/publication or a comprehensive test run.
- Execution boundary: do not connect to, inspect, control, deploy to or change any Home Assistant instance for this proposal. Local static/unit/mock-browser checks may be planned; native end-to-end checks remain explicitly pending while the user's no-Home-Assistant-access restriction applies. Any later authorized integration verification is limited to the disposable `192.168.0.28` instance and safe synthetic media; never use the real camera or production dashboard as a test target.

## Automatic quality fallback follow-up — 2026-10-20

Authorized implementation starts at `68a9deb96ffd5164949ac6c20f040beed57d654d`. Affected cards: all `hc_camera_card` hosts, with retained camera-event action regressions. Preserve saved selections, all existing fields and generated ownership; no migration or settings change. Use HA registry platform/device identity and numeric main-channel metadata to choose available lower-resolution UniFi Protect siblings only. Never enable disabled entities or change provider settings. Keep the chosen lower tier for the playback session; Retry returns to the configured tier. Bound each attempt and exhaust tiers once, with readable failure rather than retries. Keep advancing-video observation independent of sparse media events. Brief buffering retains the video frame with localized buffering feedback, not the snapshot. Only startup, quality replacement and terminal failure may show the labelled snapshot. Test actual native synthetic high/low streams on disposable `192.168.0.28` with constrained media delivery, plus lifecycle, candidate safety and poster regression checks. No real-instance access, publication or comprehensive test run.
