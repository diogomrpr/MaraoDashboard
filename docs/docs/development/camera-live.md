# Explicit native camera streams

The 2026-10-21 design replaces unfinished adaptive HLS with explicit dashboard and popup entities. `entity`/`entity_id` is the dashboard stream and event identity; optional `variables.popup_stream_entity` chooses popup video and otherwise defaults at generation to the dashboard entity. No migration/default write is needed. Generator adds an untitled camera before the existing events card with `tap_action: {action: fullscreen}`. Both editors expose camera-only selectors and retain unknown options and title visibility.

Playback uses exactly the selected entity through `ha-camera-stream`, preserving native WebRTC and its fallback; there is no quality-registry discovery, speed probe, custom HLS engine or media endpoint. Native signaling retains per-offer authenticated connection ownership and cancellation. Brief buffering keeps the video frame. Existing visibility/inert/removal guards release playback, observers and timers. Fullscreen reuses the current native video with native controls and supports standard/Safari fullscreen APIs with a full-window native-dialog fallback, restores controls/listeners on exit and does not force device orientation. Manual dashboards author the same popup video/action explicitly.

Synchronized safe fixture profiles remain useful for independent native scene/resolution checks; their media-clock details and prior failed adaptive experiments are historical investigation, not proof of seamless automatic quality switching.

## Native ownership

HA loads `ha-camera-stream` through camera more-info registration (or a detached picture-entity registration fallback without hass). Playback uses authenticated HA signaling/media APIs, muted inline autoplay and native transport negotiation. Each WebRTC offer owns an authenticated native connection; teardown closes that connection and cancels retired ICE work without affecting other occurrences or the main HA connection. Async native HLS results cannot wake a retired host. No private HA engine field is read or patched.

Marao owns the visible poster. The per-instance public native poster input prevents duplicate thumbnails; compatibility failures remain explicit. Advancing decoded video, rather than a recording entity state or a playing event alone, confirms live playback. Brief buffering retains that video. Autoplay rejection exposes Start live view; terminal failure exposes Retry. Metadata/theme updates retain active media.

## Safe verification

The disposable fixture offers distinct 320×180, 480×270 and 640×360 synthetic moving profiles with a common monotonic source epoch and independently decoded binary scene counter. The RTSP source has one-second random-access boundaries and no B frames; fixtures require no real camera data or physical action. Both native WebRTC-capable and HLS-only sources remain to cover HA fallback.

`tests/test-ha-camera-streams.js` checks exact low/high decoded resolution, event identity/order, reuse of video/session in fullscreen, return to the popup, brief-buffer retention, 320px/landscape containment, inert-background suspension and cleanup without camera services. Chromium/WebKit engine runs are emulation, not physical Android/iPhone verification. Native fullscreen/orientation support is controlled by the browser/device.
