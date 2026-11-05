# Spec Delta

## MODIFIED Requirements

### Requirement: Header, glance and forecast detail
Headers SHALL retain localized date in HA's time zone plus optional person and
air-quality readings. Glance SHALL support one through three independently named
and icon-configured readings, preserving usable readings when another is unavailable.
Weather SHALL display available temperature/unit and up to five valid forecast
entries from entity attributes, with localized dates/conditions and `show_forecast`.
These cards SHALL NOT imply a new forecast subscription or polling service.

Glance SHALL use the selected Compact presentation: separate equal-width rounded tiles, centered name above circular icon above emphasized value/unit, tight internal spacing, 8px tile gaps and a transparent enclosing group. Names SHALL default to visible; `variables.show_reading_names: false` SHALL remove their visible row and space while retaining semantic names, saved configuration and the independent group title. Responsive reflow, icon hiding, availability and existing Activity/action semantics SHALL be preserved.

#### Scenario: A glance contains an unavailable secondary reading
- **WHEN** the card renders its configured readings
- **THEN** the unavailable reading is explicit and other readings remain visible

#### Scenario: Three readings use the selected compact design
- **WHEN** a full-width glance group has 282px usable width at ordinary normal or bold 18px primary text and contains Temperature, Humidity and House power
- **THEN** three equal-width tiles appear in configured order with two 8px gaps
- **AND** each tile shows its wrapping name first, a 48px circular icon area second and its emphasized value/unit last
- **AND** the group background remains transparent, with its optional title separately above the tiles

#### Scenario: Names are hidden and restored
- **WHEN** the author sets `variables.show_reading_names` to false in the editor or YAML
- **THEN** each tile shows only its configured visible icon and value/unit without an empty name row
- **AND** the group title, semantic entity names and Activity button names remain available
- **AND** restoring true shows the original custom names or entity-name fallbacks without editing them

#### Scenario: Names use the existing default
- **WHEN** a supported saved card omits `variables.show_reading_names`
- **THEN** the compact layout shows its names above the icons without a save, migration or regenerated dashboard
- **AND** explicit false, hidden titles/icons, reading selections, ordering and unrelated fields remain preserved

#### Scenario: Only some reading positions are configured
- **WHEN** one reading or only the first and third readings are configured
- **THEN** the existing readings fill the available columns in configured order without placeholders for omitted slots

#### Scenario: Icon visibility is disabled
- **WHEN** the configured icon-visibility option is false
- **THEN** visible names appear directly above values without an empty icon row
- **AND** if names are also hidden, only values and required availability feedback remain visually present

#### Scenario: Long names or enlarged text need more room
- **WHEN** a long localized name, value, unit, enlarged text or narrower host exceeds the available tile width
- **THEN** essential text wraps, tiles grow or the group reduces its column count without clipping, shrinking fonts or horizontal scrolling
- **AND** icons and values within the same tile row stay aligned despite differing name lengths, and Activity targets remain at least 48 by 48 CSS pixels

#### Scenario: An Activity icon is activated
- **WHEN** an available reading's existing Activity icon is activated
- **THEN** its entity-specific Activity opens once with its localized semantic name
- **AND** the activation does not also trigger a card action or introduce an operating action

#### Scenario: Availability changes after layout
- **WHEN** one reading becomes missing, unknown, unavailable or disconnected
- **THEN** its existing localized neutral feedback remains readable in its tile while usable readings stay visible
- **AND** existing disabled-action guards and diagnostic access remain intact with names shown or hidden
