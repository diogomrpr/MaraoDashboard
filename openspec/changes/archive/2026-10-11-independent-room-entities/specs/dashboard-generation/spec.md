# Spec Delta

## MODIFIED Requirements

### Requirement: Configuration shapes and validation
Generation SHALL accept supported entity strings, entity objects and grouped
lists/maps, legacy include/exclude/overrides through explicit-membership
conversion, and object-valued raw cards. It SHALL normalize dashboard slugs and
custom-page paths and deduplicate resolved entities. Columns SHALL be integers
from one through six, excluding booleans. Custom-page paths SHALL NOT collide
with built-in, room or other custom-page paths.

#### Scenario: A custom page uses an existing room path
- **WHEN** configuration is planned
- **THEN** validation rejects the collision before writing generated output

#### Scenario: A raw card or column count has an invalid shape
- **WHEN** configuration is planned
- **THEN** validation reports an error rather than emitting malformed Lovelace YAML

#### Scenario: Legacy explicit options are converted
- **WHEN** a room supplies explicit entities with include/exclude/overrides
- **THEN** conversion produces the effective explicit selection with its options preserved
- **AND** generation does not add entities through the area's registry membership

### Requirement: Resolved rooms and optional pages
Generation SHALL produce Overview, Rooms and room details, plus configured
Security, Energy, Wallbox, Media and `pages.custom` views. Rooms SHALL resolve
from their explicit entity lists and raw cards, with legacy configuration
converted to explicit membership. Area associations SHALL NOT expand those
lists. Security access and media players SHALL derive from explicit room
membership unless explicit replacement lists are supplied.

#### Scenario: An optional page is not configured
- **WHEN** its object is absent from `pages`
- **THEN** the optional view and its navigation are absent without disabling the normal home/room views

#### Scenario: An entity is deleted and generation repeats
- **WHEN** the administrator removes its room entry, saves and regenerates again
- **THEN** it remains absent from that room, its derived summaries and popups and default Security/Media lists
- **AND** current or future HA area membership does not reinsert it

#### Scenario: Other explicit references remain
- **WHEN** an entity is removed from one room but explicitly configured in another room, a guided page or a raw/protected card
- **THEN** those independent references remain rather than being silently deleted

## ADDED Requirements

### Requirement: Empty explicit rooms remain empty
An explicit empty room list SHALL remain empty through planning, generation,
save, tab switches and setup. A current-format room with an omitted entity list
SHALL be treated as empty, never as an instruction to discover its area.
Room shortcuts SHALL remain usable for empty rooms. Suggestions SHALL NOT affect
generated content until explicitly added to the saved document.

#### Scenario: All cards are removed
- **WHEN** a room has an area association and an empty explicit list
- **THEN** generation keeps the room empty and its navigation usable

#### Scenario: Current-format JSON omits the entity list
- **WHEN** the administrator removes the entire entity-list property and saves
- **THEN** the room remains empty rather than being treated as an old area-only import

#### Scenario: A suggested entity is not selected
- **WHEN** the generator sees an eligible new HA entity in the associated area
- **THEN** it produces no additional card or popup for that entity
