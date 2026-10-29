# Design

## Decision and history

On 2026-10-21 the user superseded automatic adaptation with explicit dashboard/popup streams. Earlier low-first S1/S2 were released; subsequent adaptive HLS experiments were not accepted because native WebRTC showed the same scene roughly three seconds sooner. Experimental artifacts and failed evidence are retained privately under `/private/tmp/marao-camera-explicit-streams-20261021/superseded-adaptive-experiment.tar.gz`; they are not completion proof for this design. A WebRTC relay is outside scope.

## Configuration and compatibility

Keep existing `entity_id` (native `entity`) as dashboard video and event identity. No new defaults are written to saved sources. Add `variables.popup_stream_entity` as an optional camera-domain selector in the basic form. Absent/null/empty means the dashboard entity; malformed or non-camera values are validation errors. Preserve unknown fields, titles including explicit hidden/empty titles, provider overrides, custom actions, order and raw cards. Format/config-entry/package versions do not change.

The native frontend compiler builds the usual popup hash and header, then an untitled `md_camera_card` for the selected popup entity with `tap_action: {action: fullscreen}`, followed by the unchanged events card. Manual dashboards can use the same card and action in an authored popup. A popup does not infer or switch qualities. The dashboard builder owns Visual/JSON authoring; standalone native card editors were retired by the native-frontend change.

## Playback and lifecycle

Use the native HA camera host immediately after registration, without registry-quality discovery or speed tests before startup. HA chooses its supported WebRTC transport and native fallback. Each view uses exactly its selected entity on startup and Retry; no automatic down/up switch replaces it. Brief buffering keeps the last decoded frame and original native host.

Reuse `CameraPlayback` for both locations. Existing popup inert/visibility handling suspends background dashboard playback and closes popup media when hidden. Fullscreen requests the currently playing native video synchronously from the activation gesture, exposes native video controls, and restores controls/listeners on fullscreen exit or owner cleanup. Use standard Fullscreen API and Safari native video fullscreen when available. If rejected or unsupported, promote the existing stage dialog to a full-window modal, without moving its native player. Native dialog focus/inert handling and an explicit 48px Close button preserve popup focus; Escape closes only the fullscreen stage. Restore its nonmodal inline state on exit. Failure of both fullscreen paths and media not ready remain readable errors. Native fullscreen supports device rotation; do not force orientation or claim OS rotation-lock control. No second video, media URL or camera setting change is needed.

## Verification

Focused configuration preservation/validation, generated popup order and target, native startup and cleanup, fullscreen controls/exit/error paths. Actual disposable HA interactions prove dashboard low and popup high decoded resolutions, events retained, fullscreen reuse, landscape containment, no camera services and popup teardown. Inspect relevant 320px/mobile landscape paths. Keep current successful assets installed and restore temporary safe state. No production connection or full regression campaign.
