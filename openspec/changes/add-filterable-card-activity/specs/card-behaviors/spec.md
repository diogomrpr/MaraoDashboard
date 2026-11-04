# Spec Delta

## MODIFIED Requirements

### Requirement: Light, fan, cover, sensor, switch and battery options
Entity cards SHALL show state/domain treatment and honor documented custom labels,
icons, colors, slider settings and graph settings. Sensors SHALL preserve configured
on/off icons and offer icon-opened activity instead of automatic last-updated metadata;
switches SHALL honor power entity and power unit; batteries SHALL show threshold-aware
state and configured presentation. Unknown/unavailable cards SHALL remain neutral
regardless of custom active colors.

#### Scenario: A switch has a configured power sensor and unit
- **WHEN** the card renders an available measurement
- **THEN** the configured unit and readable value appear alongside the switch's own state/control

#### Scenario: A sensor previously displayed Updated metadata
- **WHEN** its normal card renders after the update
- **THEN** the automatic update timestamp and its reserved metadata row are absent
- **AND** its visible icon opens Activity while the primary measurement/state and configured presentation remain intact

## ADDED Requirements

### Requirement: Semantic activity timestamp replacement across cards
Every compatible Marao card or composed reading that displays automatic update metadata or a last-press/last-activation state timestamp SHALL replace that metadata with icon-opened Activity. Classification SHALL use the source's domain and declared semantics rather than date-like text or entity names. Operational state, authored labels and substantive date/time readings SHALL remain visible.

#### Scenario: A gate uses a button entity
- **WHEN** an access card displays a button's last-press timestamp as its normal state
- **THEN** that timestamp is omitted from the collapsed card and its icon opens recorded activity
- **AND** no Open, Closed, Locked or Unlocked state is fabricated for the stateless opener

#### Scenario: A scene is rendered as a card or collection child
- **WHEN** a supported scene presentation would display its last-activation timestamp
- **THEN** the same replacement applies to the composed child, native wrapper and supported historical alias
- **AND** its configured scene action remains independent of opening Activity

#### Scenario: A glance reading contains activation metadata
- **WHEN** a configured glance reading represents a supported button or scene last-activation state
- **THEN** its own icon opens Activity for that reading without repeating the timestamp as a value
- **AND** unrelated numeric, textual and substantive timestamp readings keep their values

#### Scenario: Dates and times are the content
- **WHEN** a card shows a header date, forecast date, schedule time, media position, chart sample time, event time or substantive timestamp-sensor value
- **THEN** that information is preserved rather than classified as automatic last-activity metadata
- **AND** arbitrary user-authored text or raw HA card content is not rewritten

### Requirement: Activity activation is independent of operating controls
Activity SHALL open through the existing visible icon as a named semantic control of at least 48 by 48 CSS pixels, with strong haptic feedback. All access variants SHALL support this independent detail action. It SHALL NOT dispatch services, activate the card beneath it or weaken slides/holds. Hidden-icon intent, explicit actions and existing detail capabilities SHALL be preserved.

#### Scenario: The access icon is tapped
- **WHEN** the user activates Activity on a lock, gate or access action card
- **THEN** one read-only Activity popup opens without a service, navigation to an operating popup or a security gesture completing
- **AND** normal operating controls retain strict opening/unlocking slides, safe closing taps and required security holds

#### Scenario: An affected card also has numeric history
- **WHEN** its icon opens Activity and the card already has a supported numeric-history detail
- **THEN** that chart remains explicitly reachable in the same detail shell with its existing source/options
- **AND** the feature does not remove the graph or replace a color-picker action on an unaffected light card

#### Scenario: Icons are explicitly hidden or the card is a preview
- **WHEN** the configuration hides the icon or HA is rendering an editor preview
- **THEN** no hidden icon is forcibly restored and the preview cannot open operational details or query activity
- **AND** stored action and visibility options remain unchanged

### Requirement: Explicit related activity sources
Eligible cards SHALL expose optional `variables.activity_entities` through native editing and shared authoring metadata. It SHALL contain explicit additional entity IDs for the same activity view. Omission or an empty list SHALL add no related sources. Validation and saves SHALL preserve ordering, unrelated options and unresolved references without discovering replacements or changing HA entities.

#### Scenario: An opener has a contact and obstruction sensor
- **WHEN** the author explicitly associates those entities with the access card
- **THEN** its Activity view can combine the opener and both sensors with each record's source identified
- **AND** a requested opening remains distinguishable from a contact reporting open or an obstruction being reported

#### Scenario: Sources are cleared or become unavailable
- **WHEN** an author saves an empty related-source list or a saved reference is missing/unavailable
- **THEN** empty stays empty and unresolved references remain identifiable without automatic substitution
- **AND** healthy-source history remains available with truthful partial-source feedback

#### Scenario: A configured card round-trips through authoring
- **WHEN** native editing, supported conversion/generation or composed popup creation carries the card configuration
- **THEN** explicit related entities, unknown fields, raw content, actions and layout options are preserved
- **AND** invalid new source-list values are rejected without writing over the saved dashboard
