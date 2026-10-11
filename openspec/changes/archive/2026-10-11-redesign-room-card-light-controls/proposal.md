# Proposal

## Why

Room cards currently combine a visible state row, a wide All off action and a circular room icon that resembles another button. The requested composition makes room navigation clearer: lighting state through the card background, one compact lights-off control on the left and a large decorative room icon cropped on the right.

## What Changes

- Replace the full-width text All off control with one circular icon-only lights-off button at the lower left. Its visible target remains at least 48 × 48 CSS pixels; its localized accessible name identifies the action and room.
- Use every configured room light to determine the active background, including a light that is not the primary entity. Remove the redundant normal on/off/All off state row; keep semantic lighting information and readable abnormal/availability information.
- Render the configured room icon as oversized, noninteractive background decoration anchored at the lower right, with deliberate edge cropping and no circular button surface. Keep the room title full-width and foreground content unobscured.
- Preserve card navigation independently of lighting availability. Lights-off still dispatches once for the deduplicated configured list, stops navigation, uses strong haptics, and is disabled on disconnect or any missing/unknown/unavailable target. Rooms without lights retain navigation and decoration but have no lights-off button.
- Apply the layout at the shared `hc_room_card` root, including generated, manually configured and future template-created room shortcuts, using the existing Marao light/dark palette.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: room-wide lighting state, compact lights-off action and independent navigation with preserved dispatch/availability guards.
- `mobile-theme-layout`: decorative room icon, title/left-action geometry and a room-specific normal-state presentation without a separate visible status row.

## Impact

Observed source: `MaraoCards.js` renders `.room-lights-off` with a text span and full width, and uses the common 52px circular `.icon`. `stateAppearance` highlights `hc_room_card` from its supplied primary state; `_rooms_view` supplies the first light plus `light_entities`, without making the highlight inspect that whole list. Existing Cases include empty and partially unavailable rooms. The supplied image is a layout reference, not a request to replace the approved palette with gold.

**Affected-card set:** empty for planning-only edits. Implementation affects every `hc_room_card` in generated Rooms, manual Cases/custom pages and future generic page shortcuts. Neighboring card families are regression consumers of shared styles/state code; keep room-specific rules scoped so their layout/state behavior is unchanged.

Implementation reaches shared renderer/styles/state/action logic, generator light-list propagation and configuration preservation, any applicable builder preview, EN/PT semantic/status copy, room/navigation usage documentation, focused renderer/generator/geometry checks and safe gallery/product examples. No new dependency, image asset, saved setting or public template rename is needed.

The user's explicit request uses background alone for **normal room lighting** and removes its dedicated visible status display. Record this narrow exception to the baseline's general additional visual status cue, retaining accessible state and visible abnormal information; do not extend it to other cards. Coordinate with `unify-card-title-and-state-presentation` and `unify-editable-page-templates` so they do not restore room state rows, circular room-icon surfaces or special-page-only behavior. Their implementation is not claimed here.

Existing room JSON, names/icons, `light_entities`, navigation/actions, advanced options and raw/custom content remain supported; this presentation change needs no format migration. Historical fixtures must verify preservation rather than reset saved dashboards. Non-goals: changing room membership/discovery, new group behavior, turning lights on, palette/branding redesign, sub-48px actions, applying decoration to every card, implementation/deployment or publication during this proposal.
