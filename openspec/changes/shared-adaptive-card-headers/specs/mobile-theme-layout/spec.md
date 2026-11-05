> Withdrawn on 2026-11-05 at the user’s request: retain the previous top alignment and name size; the later 36px enlargement was also reverted. Retained as proposal history; do not apply the centered-header, adaptive-size or icon-consolidation tasks below.

## MODIFIED Requirements

### Requirement: Scalable Montserrat typography
Typography SHALL use shared Montserrat size/weight tokens and existing fallbacks,
supporting normal, bold, 200% text, 200% browser zoom, and bold plus 200% text.
Essential titles, states, readings, errors and actions SHALL wrap; secondary
metadata MAY use ellipsis. Automatic shrinking or transforms SHALL NOT mask overflow; compact name/icon headers SHALL permit only the explicitly defined single-line/two-line size choice, never below the user-scaled primary text size. The JSON editor SHALL retain stock Monaco typography, sizing, themes and native widgets; surrounding Marao controls SHALL retain these shared UI rules.

#### Scenario: Text size is doubled
- **WHEN** the 200% text or bold-plus-200% profile is applied
- **THEN** cards grow or reflow without shrinking touch targets or hiding essential readings

### Requirement: Compact summary title width
Visible titles SHALL use the full padded content width except light, fan, cover and standard access controls SHALL place their name beside their icon and useful secondary content below that row. Titles SHALL wrap without clipping; eligible compact names SHALL use the shared bounded adaptive sizing and align vertically with their right-hand icon. Other families SHALL retain their full-width title composition. Hidden-title/icon and icon-only roles SHALL remain intact. Redundant normal binary-state text SHALL remain omitted.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered at normal text size
- **THEN** the summary icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** a Marao card outside the light, fan, cover and standard access-control families renders a title
- **THEN** its title extends across the usable content width, with icons, steppers, refresh buttons and secondary content below
- **AND** generated, builder-created, native and popup instances follow the same family rule

#### Scenario: Essential text requires more than one line
- **WHEN** a long title, translated label or supported enlarged-text profile exceeds its available width
- **THEN** the title uses the permitted compact variant where applicable, then wraps and the card or its section grows without clipping, ellipsis, further shrinking or overlap
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
- **THEN** that content appears below the centered name/icon row and before the supported slider, except ordinary cover state remains inside its position bar without a duplicate subtitle
- **AND** information requiring extra space wraps and grows the card

#### Scenario: A normal binary card changes state
- **WHEN** an available light, fan, switch or other semantically binary card reports a normal state
- **THEN** no redundant localized On/Off row appears
- **AND** its background, existing icon/shape cue, accessible state, useful readings and substantive custom labels remain correct

#### Scenario: A compact card has a problem or transition
- **WHEN** it is loading, moving, unknown, unavailable, disconnected or reports an error
- **THEN** meaningful transition/problem content remains localized and readable with the applicable whole-card treatment and disabled actions
- **AND** omission of normal state text or a configured hidden field does not hide mandatory problem information

## ADDED Requirements

### Requirement: Shared centered compact control names
Light, fan, cover and standard access-control cards SHALL share one name/icon header policy. The name SHALL remain left-aligned and vertically centered against the right-hand icon; secondary readings SHALL NOT offset its center. Equivalent cards across generated, manual, native, group and popup hosts SHALL behave identically wherever that header is visible.

#### Scenario: A name fits one prominent line
- **WHEN** the complete name fits one line at the shared large size in the available header width and icon-height budget
- **THEN** that large line is vertically centered beside the icon
- **AND** its entire text remains visible without an artificial second line

#### Scenario: A name needs two compact lines
- **WHEN** the large name cannot fit one line but its shared compact variant fits within two lines and the icon-height budget
- **THEN** both compact lines are vertically centered as one name block beside the icon
- **AND** their font is at least the user-scaled primary text size

#### Scenario: More than two lines are necessary
- **WHEN** the compact name needs more than two lines, or enlarged text cannot fit within the icon height
- **THEN** the entire name wraps at the compact size and the header/card grows or reflows
- **AND** no clamp, ellipsis, scaling transform or further font reduction forces it into the icon height

#### Scenario: Useful content accompanies the name
- **WHEN** an eligible card has a useful state, custom label, percentage or other reading
- **THEN** secondary content remains readable below the name/icon row without altering their vertical alignment
- **AND** ordinary cover state retains its in-bar position and state-hiding options

#### Scenario: An access role shares the header
- **WHEN** a standard access-summary, opening, closing, locking, unlocking or compatible hold card has a visible compact name/icon header
- **THEN** it uses the same name sizing and centering policy as light, fan and cover cards
- **AND** its original tap, strict-slide, hold, navigation and Activity behavior remains intact

#### Scenario: A specialized popup omits a normal header
- **WHEN** a dedicated access-popup action row intentionally hides its card name or places Activity beside an operating control
- **THEN** no duplicate name or replacement header is introduced
- **AND** the shared policy applies to any actual visible compact name/icon header without moving its existing action controls

#### Scenario: Available space or font metrics change
- **WHEN** width, name, language, font load, theme typography, bold setting or text scale changes
- **THEN** the shared name variant is recomputed using actual text metrics and available width
- **AND** ordinary unrelated state reports do not replace controls, reset gestures or repeatedly change the variant

#### Scenario: Either header field is hidden
- **WHEN** configuration hides the name or icon
- **THEN** that field stays absent and its space is reclaimed
- **AND** a lone name can wrap naturally, while icon-only intent keeps its existing centered role

### Requirement: Shared generic circular card icon dimensions
Generic circular entity, Activity, history and color icon surfaces SHALL share a 48 by 48 CSS-pixel size and 28px primary glyph across Marao cards and narrow layouts. Their visible and interactive bounds SHALL remain aligned. Purposeful artwork, brand tiles, badges, navbar controls, numeric steppers and slider thumbs SHALL retain their distinct geometry.

#### Scenario: Compact and full-width title families appear together
- **WHEN** eligible compact controls and other cards render generic circular primary icons in the same section
- **THEN** those icons use the shared surface and glyph size
- **AND** the other families retain their full-width title composition

#### Scenario: A card is narrow or disabled
- **WHEN** a generic icon appears in a narrow card or loading, disabled, unknown, unavailable or disconnected state
- **THEN** it remains visibly 48px square with a centered primary glyph
- **AND** content grows or reflows instead of shrinking the icon to 40px

#### Scenario: Specialized visual elements appear
- **WHEN** a room artwork, Glance tile, media-app logo, navbar, safety slider or numeric stepper is rendered
- **THEN** its established composition remains intact
- **AND** only equivalent generic circular entity or Activity icons consume the shared dimensions
