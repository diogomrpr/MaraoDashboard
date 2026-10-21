# Proposal

## Why

Camera streams currently start when their card becomes visible, leaving a startup wait after navigating to the camera page. Selected cameras should be able to start earlier, while the user is on another page of the same dashboard.

## What Changes

- Add a per-camera **Preload stream in background** toggle to the dashboard builder, disabled by default. Expose the same option in the existing native editor.
- When enabled, start the configured **Dashboard stream** after opening any page of that Marao dashboard, without first visiting or mounting the camera's page. Keep it warm while navigating within that dashboard and reuse it when the card appears.
- Keep **Popup stream** and events on demand. Do not preload additional resolutions or add automatic quality switching.
- Keep audio muted. Suspend background work when the browser document is hidden, HA disconnects, the camera becomes unavailable, the option is disabled or the user leaves that dashboard. Resume eligible work when appropriate, without retry loops.
- Explain alongside the toggle that enabling it consumes bandwidth and device resources while browsing other dashboard pages. Do not promise instantaneous playback when the stream is still starting or browser autoplay is blocked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: optional dashboard-scoped camera preloading, warm-session reuse, default-off compatibility and lifecycle cleanup.

## Impact

- Affected cards: generated `hc_camera_card` and existing native camera wrappers; shared consumers include dashboard startup/navigation, popup camera playback and fullscreen ownership.
- Likely code paths: camera catalog/validation, builder/native option fields and EN/PT labels, generated card variables, `MaraoNavigation.js` dashboard lifecycle, `MaraoRuntime.js`, `MaraoCards.js` and `MaraoCamera.js`. Reuse native Home Assistant playback; no external card or dependency.
- Add optional boolean `variables.preload_stream`; missing means false without writing defaults into saved dashboards. Preserve entity selections, popup settings, titles/actions, unknown fields, raw cards and unrelated saved data. No dashboard-format or HA config-entry migration is proposed.
- Existing camera lifecycle guidance stops hidden/off-page players. This proposal makes a narrow exception for opted-in dashboard streams; normal cards and closed popup streams retain on-demand behavior.
- Planning only: no implementation, deployment, live-instance access or release is included. Later verification is minimal: targeted logic checks and one disposable warm-stream navigation check, leaving routine device testing to the user.
