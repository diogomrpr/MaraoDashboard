# Proposal

## Why

The user replaced automatic quality adaptation with two explicit streams on 2026-10-21. They want quick, low-quality dashboard video and a detailed live view on demand, without the measured added HLS latency or a new relay service.

## What Changes

- Use the configured camera entity exactly for dashboard playback. Label it **Dashboard stream** in the dashboard builder's visual form and preserve it through Visual/JSON editing.
- Add an optional camera-only **Popup stream** selector (`variables.popup_stream_entity`). Missing, null or empty selects the dashboard entity, preserving old configurations without migration.
- Put muted live video above existing provider events in the generated camera popup. Keep the dashboard entity as event identity and preserve provider overrides and custom card actions.
- Tapping popup video opens the same native video in browser fullscreen, with a full-window modal fallback and native controls and landscape viewing by device rotation. Exit returns to the popup without another media session.
- Reuse Home Assistant's native player, including native WebRTC priority and native fallback. Remove the experimental adaptive HLS media endpoints, engine and dependency. Keep the released native cleanup and brief-buffer frame retention fixes.

## Capabilities

Modified: camera-history-content, visual-builder, dashboard-generation.

## Impact

Camera runtime, dashboard builder, validation, native frontend compiler, safe gallery, documentation and scoped checks. Standalone native card authoring was retired by the native-frontend change; manually authored camera YAML remains supported. No camera/NVR settings, production access, third-party cards, new services, transcoding, speed probes or automatic upgrades. No publication is requested.
