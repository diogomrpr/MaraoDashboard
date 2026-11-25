## Why

A dashboard camera should show its existing snapshot immediately and reach live playback without waiting through an avoidable native stream timeout.

## What Changes

- Select eligible tile transports using recent decoded-frame startup times and a short sequential fallback window. Frigate tiles can start with authenticated go2rtc.
- Add optional dashboard quality and low-source settings. Existing camera entities remain the event identity, and popup/fullscreen video retains its independently selected entity.

## Capabilities

- Modified capability: camera-history-content.

## Impact

Camera card runtime, preload ownership, editor and saved configuration validation, and camera documentation. Existing YAML remains compatible without migration. No NVR configuration, new backend stream endpoint, or publication is required.
