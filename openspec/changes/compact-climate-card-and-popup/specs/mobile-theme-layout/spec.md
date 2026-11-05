# Spec Delta

## MODIFIED Requirements

### Requirement: Compact summary title width
Visible titles SHALL use the full padded content width except light, fan, cover and standard access controls SHALL group title and useful secondary content beside their icon, and compact climate cards SHALL group title/readings beside their right-hand target selector. Titles SHALL wrap without shrinking or clipping. Other families SHALL retain their full-width title composition. Hidden-title/icon and icon-only roles SHALL remain intact. Redundant normal binary-state text SHALL remain omitted.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered at normal text size
- **THEN** the summary icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** a Marao card outside the light, fan, cover, standard access-control and compact climate families renders a title
- **THEN** its title extends across the usable content width, with icons, steppers, refresh buttons and secondary content below
- **AND** generated, builder-created, native and popup instances follow the same family rule

#### Scenario: Essential text requires more than one line
- **WHEN** a long title, translated label or supported enlarged-text profile exceeds its available width
- **THEN** the title wraps and the card or its section grows without clipping, ellipsis, automatic shrinking or overlap
- **AND** every interactive control retains its minimum visible dimensions

#### Scenario: An intentionally icon-only or title-hidden card renders
- **WHEN** configuration omits the visible title or icon
- **THEN** no empty title/icon region or restored hidden field appears
- **AND** the existing semantic name, centered icon-only role and required state cue remain

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
- **WHEN** an opening/unlocking card or supported legacy configuration normalized to an opener renders
- **THEN** its title/icon composition is compact and the strict slide remains below with its action label visible
- **AND** no tap, alternate control or changed gesture can bypass strict completion

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

#### Scenario: An ordinary slider card has useful secondary content
- **WHEN** a light, fan or cover card has a percentage, position, substantive custom label or other useful short reading
- **THEN** that content shares the compact text block beside the icon and the supported slider follows immediately below
- **AND** information requiring extra space wraps and grows the card

#### Scenario: A normal binary card changes state
- **WHEN** an available light, fan, switch or other semantically binary card reports a normal state
- **THEN** no redundant localized On/Off row appears
- **AND** its background, existing icon/shape cue, accessible state, useful readings and substantive custom labels remain correct

#### Scenario: A compact card has a problem or transition
- **WHEN** it is loading, moving, unknown, unavailable, disconnected or reports an error
- **THEN** meaningful transition/problem content remains localized and readable with the applicable whole-card treatment and disabled actions
- **AND** omission of normal state text or a configured hidden field does not hide mandatory problem information

#### Scenario: A compact climate card renders
- **WHEN** its normal typography and available width accommodate the climate reading and target selector
- **THEN** its visible name and readings occupy the area beside the selector instead of adding a separate full-width header row
- **AND** the selector keeps equal 8px top and bottom spacing

### Requirement: Stable card geometry across state changes
Marao-owned dashboard and popup cards SHALL keep their configured layout footprint
across loading, ordinary state updates, availability problems, reported errors and
recovery at a constant width and text size. Secondary feedback SHALL replace
existing content instead of appending rows. Loading SHALL reserve useful content
with placeholders. Cards SHALL remain compact and reflow for viewport, typography
and explicit configuration changes without shrinking touch controls.

#### Scenario: An entity becomes unavailable
- **WHEN** a previously rendered entity loses availability
- **THEN** a concise unavailable label replaces unnecessary details
- **AND** its card keeps its dimensions and actions remain guarded

#### Scenario: Asynchronous data arrives
- **WHEN** loading finishes or fails
- **THEN** the content replaces a matching placeholder without shifting later cards

#### Scenario: A message is longer than the compact slot
- **WHEN** an error exceeds its normal space
- **THEN** the compact card provides full details on tap without growing

#### Scenario: The user explicitly reveals more content
- **WHEN** the user loads more camera events or changes card configuration
- **THEN** the relevant content may reflow; background state updates do not grow it

#### Scenario: Compact choice and event controls
- **WHEN** a climate, weather or camera-events card renders
- **THEN** climate modes use compact full-size icon buttons, in one row where possible and a reflowing grid otherwise, and forecasts use one scrolling row
- **AND** the event viewer retains a bounded scrolling viewport while individual previews load

## ADDED Requirements

### Requirement: Intrinsic compact climate sizing
Climate cards without authored height overrides SHALL derive their preferred height from their selector and useful content. The normal scalar-target reference SHALL be approximately 150px including 8px above and below the selector, rather than an unconditional four-row allocation. Explicit saved grid sizing and necessary shared section heights SHALL remain respected. Long text, optional content and supported typography SHALL grow or reflow the card.

#### Scenario: Full-width native climate sizing is automatic
- **WHEN** an ordinary native climate card has no authored grid row override
- **THEN** its preferred sizing permits the compact intrinsic layout rather than imposing four rows
- **AND** its large current reading, humidity when configured, actual activity and target control remain legible

#### Scenario: An author has selected a larger size
- **WHEN** a saved climate card has explicit grid dimensions or shares a section requiring taller equal-height cards
- **THEN** those choices remain preserved without source rewriting or clipping controls
- **AND** compact defaults do not override the containing layout's required height

#### Scenario: Narrow or enlarged text needs additional space
- **WHEN** a 320 CSS pixel phone, long localized text, a range target or supported enlarged-text/zoom setting cannot contain the normal composition
- **THEN** the affected content grows or reflows without horizontal page overflow or shrinking controls below 48 by 48 CSS pixels
- **AND** all configured supported modes remain available without a hidden swipe action
