# Proposal

## Why

The blinds position indicator jumps whenever Home Assistant reports a new percentage. Smooth the presentation of those confirmed updates so the visible position glides between readings while the user's target and the device's actual reported state remain distinct.

## What Changes

- Animate valid cover position updates from the currently drawn position toward the latest confirmed reading, using a short adaptive duration bounded to 200–500 ms. Retarget an active glide from its current displayed position when another report arrives; do not queue obsolete steps or overshoot.
- Preserve the ordinary range input, vector drawing and animation owner across compatible position updates, updating surrounding state/controls normally.
- Smooth the confirmed fill and, when no independent user target exists, the thumb following current position. Keep direct pointer/keyboard target changes immediate and preserve an independently requested destination.
- Apply the behavior through the shared slider to ordinary blinds/cover cards and equivalent cover-backed ventilation controls, including native, popup/group and supported generated hosts. Keep the existing track/fill/thumb containment and target cap.
- Show initial readings directly, honor reduced motion, and cancel obsolete animation on target/configuration changes, invalid or unavailable state, disconnection, hiding or removal. Resume from current confirmed data without replaying old motion.
- Document that smoothing changes presentation only. Reuse existing safe examples and add small targeted animation/lifetime assertions to the existing tests.

**Affected cards:** `md_cover_card` / `custom:marao-cover-card`, generic equivalents and their popup/group instances; `md_fan_card` / `custom:marao-fan-card` when controlling an ordinary `cover.*` ventilation device. The shared light, fan-speed and picker-brightness slider consumers require preservation review, without enabling this new state animation for them.

**Non-goals:** Faster device polling/reporting, predicted physical position or travel-time calibration, continuous motion past the last reported endpoint, new settings or persisted fields, a slider redesign, and changes to access/security slides or command dispatch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `value-numeric-controls`: Bounded smoothing of confirmed cover positions, stable slider lifetime during position updates, immediate independent target interaction and animation cleanup.

## Impact

**Observed at starting commit `0d5267902da0b2ab595db77af149a7a4b2f64da6`:** `MaraoSlider.js` writes SVG geometry variables immediately. `MaraoCards.js` retains a range during active dragging, but compatible idle position updates can replace its vector/input branch and destroy/rebind the control. Existing specifications require confirmed fill, an independent target, stable dragging and single final dispatch. The exploration identified both instantaneous updates and lost element lifetime as the relevant shared causes; no duplicate smoothing proposal exists.

**Proposed defaults:** Use automatic cover-only presentation smoothing with a 200–500 ms adaptive glide and no new editor option. Actual household update cadence has not been measured; widely spaced reports can still leave pauses after each short glide. This proposal does not claim continuous physical tracking.

Implementation reaches the shared slider, card rendering/lifecycle, focused slider/card tests, existing Cover/Fan documentation and safe examples, plus regenerated frontend assets. Reuse existing theme geometry, localized state/action labels and native range semantics. No Home Assistant service/API, backend generator contract or runtime dependency changes are needed.

**Compatibility:** Preserve card types, saved options, names, raw/unknown fields, explicit emptiness, capability checks, percentage meaning, source values and service payloads. Animation state stays in memory and never enters Home Assistant state or saved configuration. No source-format, config-entry, defaults or migration changes are required; historical fixtures remain immutable.

**Acceptance:** Successive reports glide to their latest endpoint without snapping/restarting from old values; the same live slider survives compatible updates; dragging and requested targets stay immediate; initial/recovered state and reduced-motion behavior are truthful; obsolete frames stop; and rendering/animation never creates service calls or haptics.
