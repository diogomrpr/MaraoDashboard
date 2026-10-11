# Proposal

## Why

The user reports dashboard content overlapping the notch in the Home Assistant iPhone app on another installation, while the disposable installation does not show the problem. Marao needs to respect the app's dynamically supplied safe area as well as browser safe areas, without fixed spacing for a particular phone model.

## What Changes

- Resolve iPhone safe-area clearance through Home Assistant's app-aware values, with browser-provided insets as a fallback. Keep the existing development override available for emulation, but test the production path without that override.
- Apply top clearance once at the active dashboard container, and side clearance when rotation moves the cutout to the left or right. Preserve ordinary spacing and avoid adding duplicate clearance when the host already provides it.
- Keep tall/expanded popup titles and close controls within safe bounds, retaining internal scrolling and the existing popup focus lifecycle.
- Preserve the accepted compact navbar bottom offset, using the same resolved inset source where necessary. Restore Marao-owned layout changes when leaving the dashboard.
- Add regression cases with differing app/browser inset values, more than one synthetic notch size, zero-inset devices, orientation changes and route transitions. Use the existing free browser/test stack.

Observed source already applies `env(safe-area-inset-top)` to `#view` on iPhone. Read-only inspection of disposable `192.168.0.28` shows Home Assistant defining its safe-area values from app overrides with an `env()` fallback, which Marao currently bypasses. This is a likely compatibility cause, not a confirmed reproduction on the other installation. The current disposable browser has zero insets and a native connection warning; it cannot establish real-phone correctness. No other Home Assistant instance was accessed.

## Capabilities

### New Capabilities

None; this extends existing mobile layout and navigation contracts.

### Modified Capabilities

- `mobile-theme-layout`: Dynamic, single-owner top/side safe-area clearance across iPhone app/browser layouts and orientation changes.
- `navigation-popups`: Active-dashboard-only shell changes with complete cleanup, and safe-area bounds for popup content and controls.

## Impact

- Shared runtime: fullscreen/navbar/popup behavior in `custom_components/marao_dashboard/frontend/MaraoCards.js`, including any relevant lifecycle or sizing assumptions.
- Checks/fixtures: existing navbar tests, accessibility profile/browser checks, canonical Cases popup examples and realistic generated counterparts. No new test framework or dependency.
- Documentation: clarify app-aware inset resolution and the distinction between automated phone profiles and real-device evidence in the existing quality/development guides.
- **Affected-card set for this planning change: empty.** Intended implementation changes a shared page/sheet layout, so its set includes every card on generated Marao views and the complete Cases gallery, plus navbar and popup hosts/content. Implementation must inventory the current set and perform final visual inspection of all affected cards.
- Builder/schema/generator configuration, theme palette, translations, custom YAML, entity actions and branding remain unchanged except for safe fixture examples necessary to exercise the layout. No per-model padding table, user notch-height setting, viewport zoom restriction, third-party card, Home Assistant app patch, live-instance access or publishing is included. Test/deploy only on disposable `192.168.0.28`, using safe fixtures.
