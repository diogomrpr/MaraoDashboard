# Spec Delta

## MODIFIED Requirements

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
