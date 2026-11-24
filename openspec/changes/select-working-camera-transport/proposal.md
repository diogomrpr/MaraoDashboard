# Why
HA-native playback can fail while the selected Frigate camera has a working authorized go2rtc live stream. CameraPlayback currently stops instead of trying that path.

# What Changes
Keep native HA playback first. After a reported failure or bounded lack of advancing video, release it and try a browser-compatible authenticated Frigate MSE path positively associated with the selected entity. Exhaustion retains explicit snapshot/error feedback. Apply at the shared player to inline, popup and preloaded camera consumers; preserve card type, layout, controls and event content.

# Capabilities
## Modified Capabilities
- `camera-history-content`: authorized per-camera live transport fallback and cleanup.

# Impact
Frontend-only runtime and focused camera unit checks. No dependency, backend/security-setting changes, new configuration or persisted migration. Preserve all saved camera options and distinct popup camera entities. Starting source commit fa71c7a33798b32480eab41bfad6f038e8b1ebf9 with extensive unrelated dirty work retained; snapshot /private/tmp/camera-live-fallback.json. Explicit user request authorizes both consumers and targeted fallback checks, not production access or publication.
