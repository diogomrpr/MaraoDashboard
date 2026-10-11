# Spec Delta

## MODIFIED Requirements

### Requirement: Shared light and dark palette
Cards SHALL use Marao semantic surface, state, icon, spacing, radius and typography tokens and remain readable in both themes. The approved palette SHALL preserve soft blue, pale tracks/fills and white controls with navy boundaries where used. Status SHALL also use text, icon or shape, except normal room lighting uses background plus accessible state without a visible status row. Normal text SHALL meet 4.5:1 contrast; large text and meaningful boundaries SHALL meet 3:1.

#### Scenario: A pale active slider card is displayed
- **WHEN** the card uses the blue domain highlight
- **THEN** card, track, confirmed fill and target thumb remain visually distinguishable with persistent contrasting boundaries

#### Scenario: A room uses the requested reduced state presentation
- **WHEN** its light states are normal and known
- **THEN** the active/inactive background indicates lighting without a separate visible on/off row and localized semantic state remains available
- **AND** other card families retain their additional visual state cues

## ADDED Requirements

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
