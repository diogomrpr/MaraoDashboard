# Proposal

## Why

Summary detail pages currently list individual entities, so controlling a whole category or floor requires repeated actions. Users need controls for the complete summary and named sections such as house floors, with explicit Open all and Close all controls for covers.

## What Changes

- Add a top action area to summary detail pages/sheets and an action area above each named section. Actions apply to the complete configured scope, independently of Active only filtering.
- Allow optional ordered named sections with explicit entity assignments inside an Entity Group. Keep unassigned members visible and included in whole-summary actions; do not infer floors or discover new entities.
- Offer explicit Turn on all / Turn off all for lights, Open all / Close all for ordinary covers, and capability-aware climate power actions. Battery summaries remain read-only but support sections.
- Preserve access safeguards: tap-based Open all excludes doors, gates and garage doors and explains that exclusion; their individual strict slides remain available. Unsupported/unavailable members are identified and skipped, with the actual target scope readable before activation.
- Expose section editing through HA's current native card editor and YAML. Preserve flat configurations, member options, explicit emptiness and independent duplicate-card ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: summary-wide and section-wide controls, ordered member sections, filter-independent targets, capability-aware domain actions and readable results.
- `native-dashboard-editing`: lossless section authoring and validation in the current HA card editor.

## Impact

Planning baseline: `cf4662333dd6223c761e698f4131a197d67e19a7`, 2026-11-01. Existing unrelated untracked distribution copies and the people/automation proposals are outside this change. No matching existing proposal was found; completed native-editor and layout changes establish boundaries rather than proposing this feature.

Observed: `md_entity_group_card` supports light/cover/climate/battery membership, All entities/Active only filtering, native member editing and card-owned detail sheets. The runtime reconciles one flat member list and has no section action toolbar. Interpretation: “summary pages” means these existing category detail surfaces, including their shared popup renderer; no separate dashboard or route is required.

Affected consumers: Entity Group cards, shared group sheets and member controls, native editor/schema/validation, shared JavaScript composition/compiler, EN/PT labels, documentation, targeted tests and disposable examples. Current native HA authoring supersedes historical builder/Python generation text; do not revive those retired workflows.

Compatibility: add optional section metadata referencing existing members; retain `entities` as the authoritative membership list. Omitted sections preserve flat presentation, with new whole-summary controls on controllable types. No source/envelope/config-entry version bump or destructive migration is intended. Validate supported released native and converted configurations, preserve unknown fields and provenance, and keep preview/conversion read-only. If implementation reveals an incompatible stored representation, specify a versioned conversion before writes rather than resetting data.

Non-goals: implementation in this request, nested sections/groups, automatic floor discovery, arbitrary bulk service scripting, new entity families, climate-wide setpoint/mode selection, bulk access opening/unlocking, changing room-card All off behavior, camera work, publication or comprehensive testing.
