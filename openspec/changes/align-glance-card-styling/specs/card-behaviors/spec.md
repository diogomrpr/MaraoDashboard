# Spec Delta

## ADDED Requirements

### Requirement: Glance reading presentation
Glance SHALL present its configured readings as compact ordered rows within one Marao surface. Each row SHALL pair a start-aligned name/value block with a trailing circular icon using existing theme and typography tokens. Values SHALL have clear emphasis over reading labels. An optional card title SHALL occupy the full first row. Unused reading positions SHALL reserve no content.

#### Scenario: Three readings are configured
- **WHEN** a glance card renders three configured readings
- **THEN** it shows three rows in configured order with their respective names, values, units and icons
- **AND** the card uses Marao's rounded surface, compact padding/gaps and circular icon treatment rather than bare centered columns
- **AND** it creates no nested interactive cards or new per-reading actions

#### Scenario: A single reading has no card title
- **WHEN** only one reading is configured and no card name is supplied
- **THEN** one compact row is shown without an empty heading or unused reading cells
- **AND** its configured icon or existing native icon fallback remains visible

#### Scenario: A card has a custom title or reading labels
- **WHEN** the author supplies a title, reading names or icons
- **THEN** that content is retained, and the title remains separate above the reading rows
- **AND** an explicitly hidden title stays hidden

### Requirement: Glance reading reflow
Glance SHALL keep reading names, meaningful values and units readable at 320 CSS pixels and supported enlarged text/zoom sizes. Rows SHALL grow or reflow before text or icons overlap, without horizontal page scrolling, essential-value clipping or a nested scroller. Icon dimensions SHALL remain reserved while symbols load. Light and dark appearances SHALL use the existing semantic palette.

#### Scenario: A reading has long text or a long value
- **WHEN** a localized name, value or unit exceeds the available row width
- **THEN** its text wraps and the row grows or reflows while preserving the association between name and value
- **AND** the icon stays contained without covering text or reducing any configured interactive target below 48 by 48 CSS pixels

#### Scenario: A symbol loads after the text
- **WHEN** the native entity icon becomes ready after the reading renders
- **THEN** its reserved circular area retains its dimensions without collapsing the row

### Requirement: Glance availability remains local to each reading
An unknown, missing or unavailable glance reading SHALL show explicit localized neutral feedback in its own row while healthy readings stay visibly readable. Complete loss or disconnection SHALL retain existing neutral/problem treatment and action guards. A warning SHALL NOT cover usable reading content, and reported errors SHALL remain accessible.

#### Scenario: One of three readings is unavailable
- **WHEN** two readings have usable reported values and the third is missing, unknown or unavailable
- **THEN** the two healthy names, values, units and icons remain visible
- **AND** the affected row shows its own neutral reason without a whole-list warning overlay
- **AND** existing whole-card partial-warning treatment and readable diagnostic access remain available without covering the healthy rows

#### Scenario: A reading recovers
- **WHEN** an unavailable reading reports a usable state again
- **THEN** only its row's status changes back to the authoritative value while configured order and labels remain intact
- **AND** rendering sends no service action or navigation

#### Scenario: The connection or all reading states are lost
- **WHEN** HA disconnects or no configured reading remains usable
- **THEN** the card retains readable neutral status and existing disabled-action behavior without fabricating values
- **AND** recovery restores the same configured readings without modifying saved configuration
