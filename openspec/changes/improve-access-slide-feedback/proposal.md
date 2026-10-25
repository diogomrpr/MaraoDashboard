# Proposal

## Why

A completed access slide currently resets its handle and gives a short border pulse, which is easy to miss. Users need clear color, motion and vibration feedback that the command was sent, without relying on reading a label or mistaking command acceptance for physical opening.

## What Changes

- On a valid dispatched opening/unlocking action, retain one strong completion haptic and briefly pulse the shared slider surface blue.
- While the request is unresolved, show a gentle blue shimmer and prevent repeat activation.
- On service acceptance, briefly replace the handle arrow with a checkmark and hold the blue confirmation surface for about one second, then fade back to the current authoritative appearance.
- Keep short localized Sending/Request sent text as supporting feedback. Device-reported opening/open/unlocking/unlocked state remains authoritative and never follows merely from service acceptance.
- Retain readable service errors and neutral availability precedence; cancelled, skipped and rejected actions never receive accepted-request confirmation.
- Use static color and icon equivalents when reduced motion is requested.

Observed: `MaraoSlideToOpen` already emits heavy haptics during travel and at completion, uses `_sending` to guard outstanding requests and runs a 280 ms inset-border animation. The shared haptic helper emits HA's event plus a supported browser vibration fallback. Missing physical vibration on the user's phone is not diagnosed; this proposal preserves that path rather than claiming a platform fix.

Affected-card set: shared opening/unlocking slides for doors, gates, garages and locks, including button/switch/script access openers, generated popups and supported direct configurations. The shared component's alarm-grid disarm consumer is a compatibility consumer; its PIN/confirmation behavior is unchanged. Non-goals: closing/locking redesign, changes to slide thresholds or cancellation, fake physical success, automatic retries, a global pending-state system, new user settings or the separate sensor-threshold proposal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `entity-state-actions`: Distinct multimodal feedback for dispatched and accepted access-slide commands, with safe lifecycle and truthful device-state handling.

## Impact

Shared slider rendering/lifecycle in `MaraoRuntime.js`, service-outcome integration in `MaraoCards.js`, existing haptic/theme tokens, English/Portuguese runtime labels, access-card usage guidance and focused safe-fixture tests/examples. Inspect existing builder/generator access consumers for compatibility; no new option or generated structure is required.

Saved v0.20.0 descriptors, aliases, service targets, protected raw YAML and historical data keep their meaning. Feedback is transient component state, with no persisted field, dashboard-format change, migration, backend API or dependency.
