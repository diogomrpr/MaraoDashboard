# Proposal

## Why

The user reports a square background appearing when pressing navbar items, which conflicts with Marao's rounded navigation. Remove that unwanted press highlight while retaining the circular active-route indicator and existing touch behavior.

## What Changes

- Suppress rectangular browser tap highlights or default button appearance within the shared navbar controls and their icon content.
- Keep the selected route's circular fill, compact pill, existing short press animation and haptics.
- Apply the fix to horizontal destinations, the overflow toggle and overflow destinations through the shared navbar renderer, including generated/native/standalone use and previews.
- Preserve navigation, accessible names, 48px resting targets, overflow scrolling and long-press refresh; do not introduce focus-only decoration.

The reported artifact is not yet reproduced on a device. Source inspection shows circular control styling but no explicit browser tap-highlight or button-appearance reset; these are candidates, not a confirmed root cause.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: navbar presses must not draw an extra rectangular background behind rounded controls or icons.

## Impact

- **Affected-card set:** `marao-navbar-card` and its generated, standalone, persistent-root, preview and `marao-native-navbar-card` consumers; horizontal/overflow controls share the renderer.
- **Implementation boundary:** `custom_components/marao_dashboard/frontend/MaraoNavigation.js`; native wrappers delegate to it. Inspect `ha-icon` rendering only if the square is reproduced inside icon content. Avoid duplicate per-wrapper CSS or a dashboard-wide reset.
- **Documentation/fixtures:** existing navbar gallery coverage and the realistic page example, with press-state guidance if needed. Existing local/HA navbar runners can support a targeted held-press inspection.
- **Compatibility:** presentation only; route order, paths, labels, icons, unknown keys, empty configurations, generated structures and saved data remain unchanged. No migration, new option, dependency or backend API.
- **Planning baseline:** HEAD `68a9deb96ffd5164949ac6c20f040beed57d654d`; current unrelated dirty work is preserved. This proposal changes documentation only; the affected application set above is for later implementation.

Non-goals: removing the intended circular selected state, redesigning the navbar, changing navigation/hold timing, changing other controls or operating production HA.
