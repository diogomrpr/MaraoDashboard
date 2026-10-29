# Proposal

## Why

Tapping Marao cards and actions should give clear visual acknowledgement alongside vibration. Existing press effects vary between controls and can be difficult to perceive on a quick tap; the agreed direction follows Apple's guidance for brief, precise feedback that responds to the gesture without delaying interaction.

## What Changes

- Give enabled dashboard tap targets a shared press treatment: an immediate soft surface highlight with a small inward movement of noninteractive icon/content, followed by a smooth release without bounce or ripple.
- Keep fast taps perceptible while dispatching the existing action immediately on valid activation; animation completion never gates an action.
- Animate only the intended target. A button inside a card must not also animate or activate the card.
- Cancel feedback on scrolling, pointer cancellation/departure, target disabling and lifecycle interruption; preserve exactly-once action dispatch and existing strong haptics.
- Keep the visible control surface, hit area, layout and minimum 48px dimensions stable. With Reduced Motion enabled, retain the highlight and remove press/release movement.
- Preserve strict access slides, security-hold progress, authoritative device state and existing error handling. Touch acknowledgement does not indicate physical success.

Observed in source: ordinary cards use `scale(.985)`, ordinary buttons `.96`, navbar controls `.92`, and dropdowns `.98`; most transitions are 120ms. Card press state is removed on pointer release, and current reduced-motion rules remove transitions without removing the scale itself. These are source observations, not measured phone results. Exact revised timing and movement are Marao tuning choices, not values prescribed by Apple.

## Capabilities

### New Capabilities

None; extend the existing shared interaction and presentation capabilities.

### Modified Capabilities

- `entity-state-actions`: consistent immediate press acknowledgement, quick-tap release, nested-target isolation and cancellation without changing action semantics.
- `mobile-theme-layout`: restrained shared press presentation, fixed visible touch geometry, theme-aware highlights and motion-free Reduced Motion feedback.

## Impact

- **Affected controls:** actionable cards rendered by `MaraoCards.js` (including navigation/room/group summaries, light/fan/switch/service actions, numeric/media/vacuum controls and safe access actions), their nested buttons, popup close/retry actions, shared dropdown triggers/options, navbar/overflow/maintenance buttons, and separately rendered Marao camera-event and floor-plan buttons. Noninteractive cards gain no press affordance. Existing slide/hold controls remain owners of their specialized feedback.
- **Implementation:** shared vanilla-JavaScript presentation and lifecycle handling reused across these consumers; no third-party UI or animation dependency. Builder previews and generated/native/popup hosts inherit the runtime behavior.
- **Compatibility:** no new saved settings, template keys, public card APIs, generator structures, backend changes or data migrations. Supported released configurations, raw cards, ordering, explicit emptiness and unknown fields remain untouched; no dashboard regeneration is required for this feature.
- **Non-goals:** changing builder/editor toolbar styling or Monaco, restyling embedded native/third-party internals, changing popup transitions, adding sounds, changing haptic strength, adding optimistic device state or success effects, and redesigning slider/hold gestures.
- **Verification and delivery:** focused offline assertions for new press lifecycle logic plus a short manual watch list; install the final frontend on disposable `192.168.0.28` during implementation. This proposal itself changes no runtime assets and needs no installation.

Design references: [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Apple Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), researched during exploration. Their principles guide the treatment; Marao retains its own theme and interaction contract.
