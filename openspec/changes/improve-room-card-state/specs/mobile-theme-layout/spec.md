# Spec Delta

## MODIFIED Requirements

### Requirement: Decorative room icon composition
Room cards SHALL give titles the full useful width and place configured lights-off and climate-off controls at the lower left. The room icon SHALL remain noninteractive lower-right background decoration, raised enough to remain recognizable with restrained right/bottom cropping. Decoration SHALL NOT obscure titles, errors or actions, consume their width, intercept input or create page overflow.

#### Scenario: A room card uses a door or bed icon
- **WHEN** it renders in a normal mobile layout
- **THEN** the enlarged icon's recognizable door/bed shape remains visible above the bottom edge with only restrained cropping
- **AND** no circular badge makes it resemble a control, and the distinct configured child actions remain visible on the left

#### Scenario: The title wraps at larger text sizes
- **WHEN** normal/bold/200% text/200% zoom/bold plus 200% text reduces available space
- **THEN** the card grows or reflows, the title/error content remains readable and configured child controls stay contained without overlapping decoration

#### Scenario: No room lights are configured
- **WHEN** the card renders without a lighting association
- **THEN** its title and decorative room icon remain without an empty lighting-action placeholder
- **AND** a configured climate control remains usable independently; with neither association no empty action placeholder is added

## ADDED Requirements

### Requirement: Room climate-off touch geometry
A configured climate entity SHALL have a visibly circular child control of at least 48 by 48 CSS pixels beside the lights-off control, with matching geometry and a centered state icon. Its localized accessible name SHALL identify the off action, room/target and reported state. Both controls SHALL stay distinct from room navigation and decoration, without hover dependence or focus-only styling.

#### Scenario: Both actions appear on a narrow phone
- **WHEN** a two-column room card at the supported 320 CSS pixel viewport has lighting and climate configured
- **THEN** the two circular controls remain adjacent with separate visible targets of at least 48 by 48 CSS pixels
- **AND** title wrapping and artwork placement do not shrink, clip or overlap either target

#### Scenario: Climate is the only configured child action
- **WHEN** the room has a climate entity and no selected lights
- **THEN** the climate button occupies the first action position without an empty lighting slot
- **AND** tapping room decoration still performs only the configured room navigation

#### Scenario: Climate state loads or becomes unavailable
- **WHEN** the configured climate entity is loading, off, unsupported or unavailable
- **THEN** its control retains its allocated geometry with the appropriate distinct state/disabled indication
- **AND** ordinary state changes do not add/remove the configured control, shift the neighbouring light action or change card height

### Requirement: Smooth room-state color transitions
Normal room-state background changes SHALL transition smoothly over a short duration of approximately 300 milliseconds without moving content, flashing an intermediate neutral surface or restarting on unrelated HA updates. The final frame SHALL reflect the latest reported light/climate state. Reduced-motion settings SHALL apply the correct final colors immediately, and problem presentation SHALL take precedence.

#### Scenario: A source changes while the room page is open
- **WHEN** reported lighting or climate state changes the healthy card's color contributions
- **THEN** the old colors blend smoothly to the new diagonal or flat surface while the same card/control layout remains in place
- **AND** losing one active contribution smoothly leaves the remaining source's full single color

#### Scenario: Another report arrives during a transition
- **WHEN** a newer relevant state arrives before the short transition finishes
- **THEN** the transition continues toward the newest correct colors rather than replaying a stale state
- **AND** an unrelated HA update neither restarts the animation nor replaces a focused/pressed control

#### Scenario: Reduced motion or an availability problem applies
- **WHEN** the user requests reduced motion or a configured source enters a problem state
- **THEN** reduced motion skips interpolation and availability/error presentation replaces normal coloring without a lingering actionable active state
- **AND** action guards take effect immediately, independently of any visual transition
