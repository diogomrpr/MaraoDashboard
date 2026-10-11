# Mobile theme and layout

## Purpose

Keep Marao clear, readable and touch-friendly on the supported mobile layouts
while preserving the selected soft-blue visual language in both themes.

## Requirements

### Requirement: Mobile reflow
Cards SHALL support 320 CSS pixels and representative iPhone/Android portrait
and landscape without horizontal page scrolling, clipped essential content,
overlap or unusable controls. Heights SHALL grow with content and columns SHALL
reflow before becoming cramped. Pages SHALL scroll vertically with navbar clearance.

#### Scenario: A narrow or rotated phone displays a long title
- **WHEN** the available width decreases
- **THEN** essential content wraps, controls remain contained, and the page retains vertical scrolling

### Requirement: Scalable Montserrat typography
Typography SHALL use shared Montserrat size/weight tokens and existing fallbacks,
supporting normal, bold, 200% text, 200% browser zoom, and bold plus 200% text.
Essential titles, states, readings, errors and actions SHALL wrap; secondary
metadata MAY use ellipsis. Automatic shrinking or transforms SHALL NOT mask overflow.

#### Scenario: Text size is doubled
- **WHEN** the 200% text or bold-plus-200% profile is applied
- **THEN** cards grow or reflow without shrinking touch targets or hiding essential readings

### Requirement: Compact summary title width
Every visible Marao card title SHALL use the card's full content width inside its
normal padding. Icons, controls and secondary content SHALL occupy rows below the
title, including compact two-column navigation cards. Shared baseline title sizing
SHALL reduce unnecessary word splitting while permitting essential wrapping.
Intentionally hidden titles and icon-only variants SHALL retain their roles.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered at normal text size
- **THEN** the icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** an entity, weather, climate, Wallbox, media, camera-event, timeline, energy-period or other Marao card renders a title
- **THEN** its title extends across the usable content width, with icons, steppers, refresh buttons and secondary state/readings below
- **AND** generated, builder-created and popup instances follow the same rule

#### Scenario: Essential text requires more than one line
- **WHEN** a long title, translated label or supported enlarged-text profile exceeds the full usable width
- **THEN** the title wraps and the card grows without clipping, ellipsis, automatic shrinking or overlap
- **AND** all controls retain their 48px minimum visible dimensions

#### Scenario: An intentionally icon-only or title-hidden card renders
- **WHEN** its configuration omits the visible title
- **THEN** no title or empty title row is added and its existing semantic name and centered control remain intact

### Requirement: Shared light and dark palette
Cards SHALL use Marao semantic surface, state, icon, spacing, radius and typography tokens and remain readable in both themes. The approved palette SHALL preserve soft blue, pale tracks/fills and white controls with navy boundaries where used. Status SHALL also use text, icon or shape, except normal room lighting uses background plus accessible state without a visible status row. Normal text SHALL meet 4.5:1 contrast; large text and meaningful boundaries SHALL meet 3:1.

#### Scenario: A pale active slider card is displayed
- **WHEN** the card uses the blue domain highlight
- **THEN** card, track, confirmed fill and target thumb remain visually distinguishable with persistent contrasting boundaries

#### Scenario: A room uses the requested reduced state presentation
- **WHEN** its light states are normal and known
- **THEN** the active/inactive background indicates lighting without a separate visible on/off row and localized semantic state remains available
- **AND** other card families retain their additional visual state cues

### Requirement: Visible touch targets and native semantics
Every interactive control SHALL be visibly at least 48 by 48 CSS pixels and use
native semantic controls where practical, with an internal accessible name.
Meaning SHALL NOT depend on hover, hidden swipes or tooltips. No visible focus-only
rings or decoration SHALL be added. Circular icon surfaces SHALL remain circular.

#### Scenario: An icon-only media action is rendered
- **WHEN** it is inspected on a mobile layout
- **THEN** it has a centered visible icon, a 48px minimum target and an accessible action/target name

### Requirement: Localized content and information hierarchy
All user-facing runtime actions, states, errors and labels SHALL be localized.
Configured abnormal alerts SHALL take priority when actionable, followed by home
summary and normal controls organized by task or room. Climate temperature values
SHALL omit units and degree symbols visually and in accessible text.

#### Scenario: An ordinary dashboard has no configured abnormal alert
- **WHEN** the overview is rendered
- **THEN** task and room controls remain prominent without a forced security-first layout

#### Scenario: A climate target is read or adjusted
- **WHEN** its value or accessible label is presented
- **THEN** the temperature number contains no temperature unit or degree symbol

### Requirement: Decorative room icon composition
Room cards SHALL give titles the full useful width and place a compact circular lights-off icon button at the lower left when configured lights exist. The room icon SHALL be large background decoration at the lower right with deliberate right/bottom cropping, no button surface and no interaction semantics. Decoration SHALL NOT obscure titles, errors or actions, consume their width, intercept input or create page overflow.

#### Scenario: A room card uses a door or bed icon
- **WHEN** it renders in a normal mobile layout
- **THEN** the configured icon is enlarged and partly cropped against the right/bottom edge, without a circular badge that resembles a control
- **AND** the distinct lights-off action is visible on the left

#### Scenario: The title wraps at larger text sizes
- **WHEN** normal/bold/200% text/200% zoom/bold plus 200% text reduces available space
- **THEN** the card grows or reflows, the title/error content remains readable and the lights button stays contained without overlapping decoration

#### Scenario: No room lights are configured
- **WHEN** the card renders
- **THEN** its title and decorative room icon remain without an empty action placeholder

### Requirement: Room lights-off touch geometry
The icon-only room lights-off button SHALL have a visibly circular target of at least 48 by 48 CSS pixels with a centered recognizable lights-off glyph and contrasting control surface/boundary. It SHALL retain an internal localized action/room name, require no hover or tooltip for operation, and add no focus-only styling. Decorative room imagery SHALL be excluded from interactive-control semantics and geometry classification.

#### Scenario: The smallest supported viewport displays room cards
- **WHEN** the button is measured at 320px and representative iPhone/Android portrait/landscape layouts
- **THEN** its visible target remains at least 48px in both dimensions, its glyph is centered and navigation has no overlapping child hit area

#### Scenario: The control is unavailable
- **WHEN** a configured target or connection is unavailable
- **THEN** its disabled state remains visibly distinct and semantically disabled without turning the large room decoration into an alternative control

### Requirement: Dynamic iPhone safe-area clearance
Marao dashboard content SHALL remain clear of the iPhone notch and status area using the current host/app or browser safe-area information. Top and side clearance SHALL adapt to device and orientation changes without a model-specific constant or user setting. Existing content spacing SHALL be preserved, and safe-area clearance already supplied by the host SHALL NOT be applied a second time.

#### Scenario: App inset differs from the browser inset
- **WHEN** the Home Assistant iPhone app provides a positive top safe-area inset while the browser environment reports zero
- **THEN** the first dashboard content stays below the app-reported unsafe region
- **AND** the behavior works without a development-only inset override

#### Scenario: Different iPhone cutout sizes
- **WHEN** the current top safe-area value changes between two different positive sizes
- **THEN** the dashboard clearance follows the reported value without selecting a hardcoded phone model

#### Scenario: Rotation moves the unsafe region
- **WHEN** an iPhone rotates from portrait to landscape and reports nonzero left or right insets
- **THEN** dashboard content stays within the updated side boundaries and obsolete portrait clearance is removed
- **AND** usable width and essential text reflow are retained

#### Scenario: Browser supplies the safe area
- **WHEN** no host/app inset is available and the browser reports a nonzero safe area
- **THEN** the dashboard uses that browser value for clearance

#### Scenario: Host already reserves the unsafe region
- **WHEN** the host positions the dashboard within the safe area before Marao applies its layout
- **THEN** Marao retains the existing safe content position without adding a second notch-height gap

#### Scenario: No unsafe region
- **WHEN** an iPhone or supported Android layout has zero effective top and side insets
- **THEN** Marao adds no notch-specific top or side gap
- **AND** ordinary page spacing, touch targets and scrolling remain usable
