# Proposal

## Why

The camera card currently combines its image/video with a generic icon, entity
state and persistent playback feedback. The user wants the camera itself to
dominate, with only an optional title in a slim row above the video.

## What Changes

- Make healthy camera playback show only the video and optional title above it,
  using the existing `hc_camera_card` and native camera adapter.
- Reuse `name` and `show_name`: titles remain visible by default, existing
  `show_name: false` hides the complete title row, and a localized **Show title**
  control makes this discoverable in the shared editor.
- **BREAKING (presentation only):** camera icons, entity recording/idle rows,
  extra labels and persistent Live/Reduced quality rows no longer appear.
  Existing icon/state/label configuration stays stored without affecting this
  camera presentation; other card families keep their current behavior.
- Keep concise loading, buffering, snapshot, unavailable and failure feedback
  inside the media area when needed. Retry and blocked-autoplay recovery remain
  explicit and usable; healthy playback leaves no feedback footer or empty space.
- Preserve event activation, custom actions, low-first startup, buffering-frame
  retention, native transport and lifecycle cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: minimal camera presentation, optional top title and
  conditional media feedback without restarting playback.
- `visual-builder`: discoverable title visibility using the existing fields,
  with camera-specific removal of obsolete presentation controls.
- `card-behaviors`: a camera-specific exception to the generic requirement to
  display operational state and metadata continuously.

## Impact

Affected-card set: `hc_camera_card`, its native wrapper, generated/manual/raw
occurrences, and inert editor previews. Shared renderer and editor changes must
remain scoped to this family. Camera event sheets retain their current layout,
names and controls; their opening action is regression coverage.

The observed implementation is in `MaraoCards.js` and `MaraoCamera.js`; editor
controls are in `frontend_src/MaraoNativeCardEditor.js`, backed by the shared
catalog. Existing generation already carries `name` and `show_name`. Tests,
camera documentation, the safe Cases gallery and a realistic page example must
follow the new presentation.

No new configuration key, dashboard-format change, config-entry migration,
dependency or source rewrite is planned. Existing names, explicit false values,
provider options, popup hashes, actions, unknown fields and archived history
remain intact. Keeping the current visible-title default is a compatibility
decision; the user explicitly selected a row above the video rather than an
overlay title.

Non-goals: redesigning event sheets, implementing pending adaptive quality
upgrades, changing stream startup or camera/provider settings, adding fullscreen
controls, publishing a release, or changing any live Home Assistant instance.
This is a planning-only change, independent of the unpublished resource-cleanup
fix and `adapt-camera-quality-to-bandwidth`.
