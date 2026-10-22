# Tasks

- [x] Add permission-scoped Netatmo metadata normalization and API with legacy/current cache checks.
- [x] Add provider detection, typed filters, lazy thumbnails and native HLS detail playback without changing existing provider behavior.
- [x] Align editor choices, translations, documentation and safe gallery/realistic examples.
- [x] Run targeted checks; install current changes on disposable HA preserving source/helper state; verify requested functionality and record limitations.

## Implementation record

- Starting commit: `036190cd3e7227c73a7608180036484bad87449b`; dirty-state snapshot: `/private/tmp/marao-netatmo-camera-start.json`. Earlier unrelated work was preserved.
- Acceptance: existing live/still/fullscreen path; automatic/explicit Netatmo provider; bounded newest-first metadata with camera read permission; multi-type filters; lazy optional thumbnails; native HLS recordings; Back/Refresh and cancellation; editor/generator compatibility. No saved format or source replacement.
- Shared consumers: current and legacy events-card tags, generated room/page camera popups, native/visual editors and existing Frigate/Protect branches.
- Checks: six focused backend normalization/cache/permission/WebSocket tests; six generator camera-stream/provider cases; 25 shared event-card tests; selected native/editor/gallery/preparation tests (38 selected cases in the combined run). Editor assets rebuilt; OpenSpec strict validation and diff whitespace checks passed. Unrelated mappings and full/mobile suites were not run.
- Installed frontend `0881e4dcd747d034` plus backend/config/fixtures on disposable `192.168.0.28`, with the existing source preserved and safe helper states restored. Readiness/served assets, native Netatmo metadata and native thumbnail browsing passed. Security and Cases contain a safe Netatmo example.
- Manual Chromium mobile preview: native live frames visible; Animal filter selected a combined Vehicle/Animal event; native HLS event playback advanced from 8 to 31 seconds; description displayed; Back restored the Animal filter and focused event. The recording-shaped fixture uses synthetic live HLS, so this establishes transport playback, not real-camera VOD retention/seeking.
- Preview runner exited nonzero because it records native HLS `net::ERR_ABORTED` requests during initial/native teardown and closing; raw diagnostics retained at `tests/.artifacts/frontend-preview/1792626339118/diagnostics.json`. No JavaScript exceptions or HTTP failures were reported. This is not a clean automated browser pass.
- Real Netatmo hardware, Safari/Android native app playback and provider retention were not exercised. Home Assistant does not expose live streams for Netatmo doorbells; manufacturer-only actions remain outside the existing camera card.
