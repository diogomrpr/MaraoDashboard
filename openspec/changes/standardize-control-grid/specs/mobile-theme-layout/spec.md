# Spec Delta

## MODIFIED Requirements

### Requirement: Compact summary title width
Visible Marao titles SHALL use the full content width inside normal padding, with icons, controls and secondary content below, except light, fan, cover and standard access-control cards SHALL place title and icon in one header row. This SHALL be independent of slider presence and availability. Shared baseline title sizing SHALL avoid unnecessary word splitting; titles SHALL wrap without shrinking or clipping. Hidden-title/icon and icon-only roles SHALL remain intact.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered as a compact navigation summary at normal text size
- **THEN** the icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** a Marao card outside the light, fan, cover and standard access-control families renders a title
- **THEN** its title extends across the usable content width, with icons, steppers, refresh buttons and secondary state/readings below
- **AND** generated, builder-created and popup instances follow the same rule

#### Scenario: Essential text requires more than one line
- **WHEN** a long title, translated label or supported enlarged-text profile exceeds its available title width
- **THEN** the title wraps and its card or uniform control grid grows without clipping, ellipsis, automatic shrinking or overlap
- **AND** controls retain their 48px minimum visible dimensions and affected header icons remain beside their titles

#### Scenario: An intentionally icon-only or title-hidden card renders
- **WHEN** its configuration omits the visible title
- **THEN** no title or empty title row is added and its existing semantic name and centered control remain intact
- **AND** standard control-card sizing still applies to an eligible family without revealing hidden fields

#### Scenario: A card renders an ordinary value slider
- **WHEN** a light, fan or cover card renders its title, icon and supported value slider
- **THEN** the title appears at the start and the icon at the end of the same header row
- **AND** useful state, controls and problem content remain below that header

#### Scenario: An optional slider is absent
- **WHEN** a light or fan disables its slider or lacks the corresponding native capability
- **THEN** its title and icon retain their shared header and no visible or interactive slider placeholder is added
- **AND** a standard light card retains the shared minimum card size through layout spacing

#### Scenario: An affected card has a disabled or unavailable control
- **WHEN** an affected card is loading, disabled, unknown, unavailable or disconnected
- **THEN** its title and icon retain their header layout and applicable localized state/problem cues remain readable
- **AND** its actions retain their disabled semantics

#### Scenario: A strict access opener renders
- **WHEN** an opening/unlocking card or legacy configuration normalized to a strict opener renders
- **THEN** its icon shares the header with its title and the strict slide remains below
- **AND** no tap or alternative opening/unlocking execution path is introduced

#### Scenario: An icon is intentionally hidden
- **WHEN** an affected card hides its icon
- **THEN** the title reclaims the icon's space while required non-color state cues and accessible state remain

#### Scenario: The same card family appears in different hosts
- **WHEN** a card appears on a generated page, in a popup/group, in a native dashboard/preview or in manual Marao configuration
- **THEN** the same family header rule applies in both themes with names, options and action semantics preserved

#### Scenario: A door action closes or locks instead of opening
- **WHEN** a standard close/lock action or access summary has a visible title and icon
- **THEN** they share the same header composition as an opening/unlocking control
- **AND** safe tap, configured hold and popup-navigation behavior retain their meanings

## ADDED Requirements

### Requirement: Shared standard control-card size
Standard controls SHALL include lights, covers, access summaries, strict openers, close/lock actions and lock/cover-targeted guarded access actions. They SHALL share a 174 CSS pixel minimum outer height in generated, popup, native, preview and manual hosts. Slider, capability, availability and visibility differences SHALL NOT reduce that size. Essential content SHALL remain unclipped; 174px SHALL NOT be a maximum.

#### Scenario: Lights with and without sliders share the grid
- **WHEN** ordinary on/off-only, brightness-enabled and slider-disabled light cards render with content fitting the baseline
- **THEN** each outer surface is 174 CSS pixels tall, including in different rows
- **AND** omitted controls remain absent while the card retains its size

#### Scenario: Standard access and cover variants render
- **WHEN** normal cover, access-summary, strict opener, close and lock cards render with content fitting the baseline
- **THEN** they use the same 174px outer size as standard light cards
- **AND** active/inactive state and control type do not change the minimum size

#### Scenario: A visibility or availability option changes
- **WHEN** an eligible card hides its name/icon or becomes unknown, unavailable or disconnected
- **THEN** it retains the shared minimum size, its existing semantics and readable problem content
- **AND** content requiring more space increases the necessary height instead of being hidden

#### Scenario: A different card family renders
- **WHEN** a fan, alarm/service hold, navigation summary, chart, camera or detailed climate card is outside the standard control family
- **THEN** this change does not force it into the standard control-card size
- **AND** an existing fan's shared icon/title header remains intact

### Requirement: Equal rows throughout a control grid
Every occupied cell and card surface in one standard control grid SHALL have the same height across all rows, at least the shared baseline and sufficient for the tallest required content. Equality SHALL cover the entire grid, not only siblings in one row. Independent grids SHALL share the baseline without a dashboard-wide tallest-card dependency.

#### Scenario: The tallest card is in a later row
- **WHEN** a mixed control grid has at least three rows and one later card needs extra height
- **THEN** all rows and occupied card surfaces use that necessary height within 0.5 CSS pixels
- **AND** shorter surfaces do not leave unused space below themselves inside their cells

#### Scenario: A problem message grows and clears
- **WHEN** authoritative state adds or removes readable problem content
- **THEN** the grid can grow or shrink to its current necessary uniform height, never below the baseline
- **AND** this layout update dispatches no service and preserves a mounted active control's interaction

#### Scenario: A separate full-width panel is present
- **WHEN** a camera, chart or detailed climate panel appears in another section
- **THEN** its intrinsic height does not determine the control grid's height

### Requirement: Regular control-grid spacing and placement
A standard control grid SHALL preserve configured order, use equal-width columns and one shared horizontal/vertical gap, defaulting to 8 CSS pixels. Placement SHALL fill rows in source order without interior vacant cells or dense reordering. An incomplete final row SHALL retain the same card widths and height as preceding rows.

#### Scenario: Five controls use two columns
- **WHEN** a control grid renders five configured cards at a width supporting two columns
- **THEN** it places two cards in each of the first two rows and one standard-width card at the start of the third
- **AND** the only unused cell is the final cell; the last card is not stretched across the row

#### Scenario: Card families alternate
- **WHEN** lights, covers and door actions alternate in saved fixed-column order
- **THEN** they occupy consecutive cells without a new grid boundary for each device type
- **AND** padding, header alignment and lower-control placement remain consistent

### Requirement: Whole-grid responsive control reflow
The saved column count SHALL remain the preferred maximum. When usable width or supported text settings require fewer columns, the entire control grid SHALL reflow together and retain uniform rows, order, contained labels and 48px controls. One card SHALL NOT independently span a wider row and create a hole beside its predecessor.

#### Scenario: Narrow or enlarged text makes two columns unusable
- **WHEN** a 320px viewport or supported text/zoom setting cannot contain the controls in the configured columns
- **THEN** the whole grid uses fewer columns and grows vertically without horizontal overflow or clipped essential text
- **AND** the saved column setting remains unchanged

#### Scenario: A narrow grid contains an access opener
- **WHEN** the strict slider needs more usable width than its current column provides
- **THEN** the grid's column count adapts consistently, keeping its label beside the thumb
- **AND** horizontal intent, cancellation, haptics and exactly-once completion remain intact

#### Scenario: The layout becomes wider again
- **WHEN** rotation or text settings permit the configured column count again
- **THEN** the grid restores that count without changing card order, source configuration or authoritative state
