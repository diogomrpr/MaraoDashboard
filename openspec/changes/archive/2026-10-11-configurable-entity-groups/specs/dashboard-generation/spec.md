# Spec Delta

## MODIFIED Requirements

### Requirement: Native summaries and generated popups
Home SHALL use configurable Entity Group summaries. Only format-0/1 sources lacking groups SHALL receive defaults from resolved room entities during conversion; format-2 missing/empty groups SHALL stay absent. Default lights SHALL list active lights; covers SHALL include room covers unless explicitly filtered. Climate, access, media and camera cards SHALL retain matching popup hashes and native controls.

#### Scenario: The primary summary entity is unavailable but another is usable
- **WHEN** the summary and popup are generated and rendered
- **THEN** secondary usable entities remain reachable and partial unavailability is represented

#### Scenario: Explicit overview groups replace defaults
- **WHEN** the saved configuration contains an explicit overview group list
- **THEN** only those groups appear in their configured order, without additional hard-coded light, cover, climate or maintenance cards
- **AND** an explicit empty list suppresses those groups while preserving weather and scenes

### Requirement: Room and custom-page card layouts
Automatic layouts SHALL group resolved cards by domain and include Entity Groups
as distinct cards. A configured fixed-column layout SHALL use one grid preserving
mixed entity/shortcut/Entity Group order with raw cards appended. Both layouts
SHALL include their required entity/group popups and navbar.

#### Scenario: A custom page specifies two columns
- **WHEN** its ordered entity, shortcut and raw-card configuration is generated
- **THEN** one two-column grid preserves that order before the popup/footer content

#### Scenario: A group appears between an entity and a shortcut
- **WHEN** the fixed-column page is generated
- **THEN** that mixed order is preserved and the group popup is available on the same page

## ADDED Requirements

### Requirement: Validated group membership and popup ownership
Generation SHALL validate group identity, type, filter and members before writes,
deduplicate members in configured order, preserve member options and reject mixed
or unsupported types and nested groups. Each group SHALL own a stable unique
popup within its dashboard; renaming or reordering SHALL NOT misroute it. Groups
SHALL NOT require a fabricated or available primary entity to generate content.

#### Scenario: A group contains an incompatible member or invalid filter
- **WHEN** configuration is previewed or saved
- **THEN** a readable validation error identifies the group and invalid input before generated output or valid saved data is replaced

#### Scenario: Two lighting groups are generated and reordered
- **WHEN** their names or positions change
- **THEN** each opener retains its own member list and popup without collisions
- **AND** conflicting group identities are rejected before writes

#### Scenario: A group includes entities absent from room cards
- **WHEN** compatible explicit members are selected from other rooms or global search
- **THEN** those members are generated with their configured options, without adding room cards or changing other page derivations

### Requirement: Legacy overview group compatibility
Legacy format-0/1 configurations lacking explicit groups SHALL retain derived light, cover,
maintenance and climate defaults through the shared group path and ordered 1→2
page conversion without rewriting source during reads or previews. Existing overview popup links, labels, order,
member options and numeric readings SHALL survive. Explicit group saves SHALL
preserve unrelated source and protected content, without recurring discovery.

#### Scenario: A supported released configuration has no group field
- **WHEN** it is loaded, previewed or generated
- **THEN** existing resolved members become compatible defaults with established overview hashes and preserved card options
- **AND** default light filtering follows Active only, correcting the observed off-light listing
- **AND** read-only operations leave exact saved source and archives untouched

#### Scenario: Legacy defaults are edited and saved explicitly
- **WHEN** the administrator saves the displayed groups after removing a member or group
- **THEN** the explicit result persists, does not reintroduce deleted groups or members through defaults, and preserves weather, scenes, raw/custom content and unrelated settings

#### Scenario: Discovery has no members of a legacy type
- **WHEN** a legacy configuration is resolved
- **THEN** no automatic group for that type is introduced, while deliberately configured empty groups remain intact

#### Scenario: A canonical page has no group cards
- **WHEN** a format-2 page is loaded, edited or generated with missing or empty groups
- **THEN** no derived group is inserted and later room or registry changes do not refill it
