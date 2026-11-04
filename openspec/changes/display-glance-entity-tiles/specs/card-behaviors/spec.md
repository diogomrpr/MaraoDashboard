# Spec Delta

## MODIFIED Requirements

### Requirement: Glance reading presentation
Glance SHALL present each configured reading as a separate rounded tile with a centered circular icon above an emphasized value/unit and optional quieter name. Tiles SHALL have equal widths, an 8px gap and existing theme/typography tokens. The enclosing group SHALL have no visible card background, border or shadow. An optional title SHALL appear above the tiles. Unused reading positions SHALL reserve no content.

#### Scenario: Three readings are configured
- **WHEN** a glance card renders three configured readings at ordinary phone text settings with sufficient host width
- **THEN** it shows three equal-width tiles in one row in configured order with their respective names, values, units and icons
- **AND** dashboard background remains visible between their individual rounded surfaces
- **AND** the visual tiles introduce no new per-reading operating actions or independently editable HA child cards

#### Scenario: A single reading has no card title
- **WHEN** only one reading is configured and no card name is supplied
- **THEN** one tile fills the available group width without an empty heading or unused reading cells
- **AND** its configured icon or existing native icon fallback remains visible unless icons are explicitly hidden

#### Scenario: A card has a custom title or reading labels
- **WHEN** the author supplies a title, reading names or icons
- **THEN** that content is retained, and the title remains separate above the tiles
- **AND** explicitly hidden titles or icons stay hidden without empty icon slots

#### Scenario: Two nonadjacent reading slots are configured
- **WHEN** only the first and third entity slots are configured
- **THEN** two equal-width tiles fill the available group width in their configured order without a placeholder for the second slot

#### Scenario: Existing actions and Activity controls are configured
- **WHEN** a glance contains an existing Activity icon or explicit card action
- **THEN** it preserves the original action target, guards and localized semantic name
- **AND** activating an Activity icon opens that entity's Activity once without also dispatching a card action
- **AND** ordinary informational tile content invents no service or popup action

### Requirement: Glance reading reflow
Glance SHALL fit three tiles across a full-width 320px phone layout with ordinary margins and normal/bold text. Names, values and units SHALL wrap without shrinking fonts, clipping essential content or horizontal scrolling. Enlarged text/zoom or narrower hosts SHALL reduce columns when necessary, preserving order, equal tile sizing and controls of at least 48 by 48 CSS pixels. Icon space SHALL remain reserved while symbols load. Both themes SHALL use existing semantic colors.

#### Scenario: Three readings appear on a narrow phone
- **WHEN** a full-width glance group has 282px of usable width at normal or bold 18px primary text, with Temperature, Humidity and House power readings
- **THEN** its three equal-width tiles occupy one row with two 8px gaps
- **AND** values, units and wrapping names remain readable and any Activity target remains at least 48 by 48 CSS pixels

#### Scenario: A reading has long text or a long value
- **WHEN** a localized name, value or unit exceeds its tile's inline width
- **THEN** text wraps and tiles grow to the necessary common height while retaining each name/value association
- **AND** icons do not cover text, controls keep their minimum size, and no nested scroller or horizontal page overflow is introduced

#### Scenario: Enlarged text or a constrained host needs fewer columns
- **WHEN** supported 200% text, 200% zoom, bold plus 200% text, or a narrower HA column cannot contain three usable tiles
- **THEN** the group uses two or one column as necessary without changing saved configuration or entity order
- **AND** an incomplete final row retains the same column width as preceding tiles
- **AND** restoring sufficient width/text settings restores the preferred configured-reading count

#### Scenario: A symbol loads after the text
- **WHEN** the native entity icon becomes ready after its reading renders
- **THEN** its reserved circular area retains its dimensions without collapsing the tile

#### Scenario: One reading loses availability
- **WHEN** a configured reading becomes unknown, missing or unavailable at unchanged width/text settings
- **THEN** its localized status replaces the value within the tile's stable footprint while other measurements remain visible
- **AND** existing aggregate neutral warning semantics and diagnostic access remain available across the separate tile surfaces without an enclosing warning card or an overlay hiding healthy readings

## ADDED Requirements

### Requirement: Optional glance reading labels
Glance reading labels SHALL be visible by default and independently hidden through the boolean `variables.show_reading_names` option in the card editor or YAML. Hiding them SHALL retain saved names, values, units, icon/Activity accessibility and the separately configured group title, without reserving visible label space. Existing cards without the option SHALL retain their presentation.

#### Scenario: Existing cards omit the option
- **WHEN** a glance card omits the option or sets it to true
- **THEN** its reading labels remain visible using custom names or the existing entity-name fallback

#### Scenario: Labels are hidden
- **WHEN** an author sets the option to false
- **THEN** reading labels are visually hidden while their accessible names, values, units, icons, Activity controls and separate group title remain available
- **AND** enabling the option again restores the original names without editing them

#### Scenario: Edit the option without losing configuration
- **WHEN** the author changes the localized boolean field in the native card editor
- **THEN** it preserves reading order, custom names, unknown options and HA layout fields
- **AND** a nonboolean value is rejected without replacing the preceding configuration
