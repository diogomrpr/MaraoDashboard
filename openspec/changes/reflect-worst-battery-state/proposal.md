# Proposal

## Why

The Maintenance summary tile does not reflect the worst battery level among the entities it opens. A critical battery can therefore be present without a matching red background on the tile, making maintenance needs harder to notice.

## What Changes

- Color battery-group summary tiles from the lowest valid percentage across their complete deduplicated membership: red below 20%, yellow from 20% to below 80%, and green from 80% upward, using the existing battery-card palette.
- Recalculate from authoritative HA state whenever a member changes, independently of member order and the popup's All entities/Active only filter.
- Preserve the existing first-usable percentage, low-battery count, unavailable details, membership and popup behavior. Color aggregation is separate from the displayed percentage.
- Preserve a known critical red background when another member is unavailable, with the unavailable warning still visible, as explicitly agreed. Keep complete-unavailability/disconnection neutral and retain existing reported-error priority; otherwise retain the shared partial-problem policy.
- Apply the behavior to the shared battery-group family, including Maintenance and independently named battery groups, with focused palette/problem regression checks and safe examples.

The target is the tile that opens the popup. Changing the sheet background, member thresholds or custom colors, the displayed percentage, other group families, configuration format, service behavior or adding a new setting is outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: add worst-level battery-group summary coloring while retaining existing readings, counts, order and popup contracts.
- `entity-state-actions`: define the agreed critical-battery/partial-availability composition so a missing member cannot hide a known red battery, with readable warnings and existing complete-problem/error priorities retained.

## Impact

Planning baseline: `e300e1db04ff047fd80b3f2148bdb15e929d9755`. Planning affected-card set: empty; this request writes only the new change artifacts. Preserve the existing header implementation and other planning changes. Apply must record its actual starting commit and review current shared-file edits.

Observed path: `entityGroupState()` in `frontend/MaraoCards.js` already visits every member, validates battery percentages and returns the first usable reading and low/unavailable counts. The renderer maps `hc_entity_group_card` to navigation presentation, which has no worst-battery threshold color. `cardProblem()` and `problemStyle()` then give partial availability a general warning surface and prevent normal appearance from applying. Simply adding a red normal color would therefore miss the agreed red-plus-unavailable case.

Implementation affected-card set: every battery-type `hc_entity_group_card` summary, including reserved Maintenance, custom/converted battery groups, repeated instances and generated/native/preview hosts using the shared renderer. Individual `hc_battery_card` thresholds and unrelated light/cover/climate groups are regression consumers, not new behavior targets.

Expected work: the shared runtime's battery aggregation/appearance/problem composition, existing frontend/group browser checks, focused source/check mapping, battery-group/quality guidance, canonical Cases and a realistic Overview/Maintenance example. Use current theme and localization resources and keep actual warnings visible.

Compatibility: runtime presentation only. Preserve JSON, public options/defaults, generated card structures and ownership, stable group IDs/hashes, raw/unknown content, saved selections, history and migration behavior. No editor field, management API, new dependency, versioned migration or historical archive rewrite is proposed. Supported released/converted groups receive the color behavior without regeneration. Verification remains scoped, serial and limited to safe disposable `192.168.0.28` fixtures; implementation, deployment and publication require their later workflow requests.
