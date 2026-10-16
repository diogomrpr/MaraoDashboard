# Spec Delta

## MODIFIED Requirements

### Requirement: Compact summary title width
Visible Marao titles SHALL use the full content width inside normal padding, with
icons, controls and secondary content below, except slider-capable families SHALL
place title and icon in one header row, independently of slider presence. These
families are light, fan, cover and strict access opener. Titles SHALL wrap without
unnecessary word splitting. Shared baseline sizing and intentionally hidden
titles, hidden icons and icon-only roles SHALL be preserved.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered as a compact navigation summary at normal text size
- **THEN** the icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** a Marao card outside the light, fan, cover and strict access-opener families renders a title
- **THEN** its title extends across the usable content width, with icons, steppers, refresh buttons and secondary state/readings below
- **AND** generated, builder-created and popup instances follow the same rule

#### Scenario: Essential text requires more than one line
- **WHEN** a long title, translated label or supported enlarged-text profile exceeds its available title width
- **THEN** the title wraps and the card grows without clipping, ellipsis, automatic shrinking or overlap
- **AND** all controls retain their 48px minimum visible dimensions
- **AND** slider-capable cards retain the title and icon in the same header row, including at 320 CSS pixels and narrow card widths

#### Scenario: An intentionally icon-only or title-hidden card renders
- **WHEN** its configuration omits the visible title
- **THEN** no title or empty title row is added and its existing semantic name and centered control remain intact

#### Scenario: A card renders an ordinary value slider
- **WHEN** a light, fan or cover card renders its title, icon and supported value slider
- **THEN** the title appears at the start and the icon at the end of the same header row
- **AND** the slider, useful state/readings, labels and any problem message remain below that header without overlap

#### Scenario: An optional slider is absent
- **WHEN** a light or fan card has its slider explicitly disabled, or its entity is an on/off-only light or single-speed fan
- **THEN** its visible title and icon share the same header row as slider-enabled members of that family
- **AND** no slider or empty slider placeholder is introduced

#### Scenario: An affected card has a disabled or unavailable control
- **WHEN** a slider-capable card is loading, disabled, unknown, unavailable or disconnected
- **THEN** its visible title and icon retain their shared header row
- **AND** applicable localized state/problem cues and disabled actions retain their existing meaning

#### Scenario: A strict access opener renders
- **WHEN** an access-opener card renders an opening or unlocking slider, including a supported legacy access-action configuration normalized to a strict opener
- **THEN** its visible icon shares the header row with its title and the strict slide control remains below
- **AND** moving the icon introduces no tap or alternate execution path for opening or unlocking

#### Scenario: An icon is intentionally hidden
- **WHEN** an affected card has a visible title and explicitly hides its icon
- **THEN** the title uses the space released by the hidden icon without a vacant icon column or restored icon
- **AND** the existing non-color state marker and accessible state remain available where required

#### Scenario: The same card family appears in different hosts
- **WHEN** an affected card appears on a generated page, in a popup or Entity Group, in a native dashboard or preview, or in manually authored Marao configuration
- **THEN** it uses the same icon/title header rule in light and dark themes
- **AND** existing names, configured icons, slider options and action semantics are preserved
