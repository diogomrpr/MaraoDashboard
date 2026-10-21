# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile reflow
Cards SHALL support 320 CSS pixels and representative iPhone/Android portrait
and landscape without horizontal page scrolling, clipped essential content,
overlap or unusable controls. Heights SHALL grow with content and columns SHALL
reflow before becoming cramped. Pages SHALL scroll vertically with navbar
clearance. Reflow SHALL use available section width and text size while retaining
saved column preferences and the supported narrow-phone two-column layout.

#### Scenario: A narrow or rotated phone displays a long title
- **WHEN** the available width decreases
- **THEN** essential content wraps, controls remain contained, and the page retains vertical scrolling

#### Scenario: Space or text settings require a single column
- **WHEN** a preferred two-column section has less than 280 CSS pixels of usable width at normal typography, or 282/322/346 CSS pixels at 200% text or bold plus 200% text
- **THEN** the whole two-column group reflows to one column with readable content and full-size controls
- **AND** 200% browser zoom also reduces columns when its effective available width cannot contain them, without horizontal page scrolling
- **AND** saved columns, card order, group boundaries and section-wide equal heights remain intact

#### Scenario: Space returns after rotation or a text-size change
- **WHEN** an existing section regains enough usable width at a supported text size
- **THEN** its preferred columns return without replacing mounted controls, losing focus or dispatching an action
- **AND** the section retains its 8px gaps, configured order and necessary equal surface heights

## ADDED Requirements

### Requirement: Two-column layouts on narrow phones
Marao-owned groups configured for two columns SHALL display two equal-width
columns at 320px, 360px and 384px phone viewport widths with ordinary dashboard margins
and normal or bold typography. Equivalent embedded sections at 282px, 322px and 346px
usable width SHALL also fit two columns. The layout SHALL preserve 8px gaps,
complete information and existing control dimensions without reducing font sizes
or identifying a device by its model or pixel density.

#### Scenario: A phone displays the Rooms page
- **WHEN** the generated Rooms page contains a two-column room-card section at a 320px, 360px or 384px viewport with the normal 18px primary text size or its bold variant
- **THEN** room cards appear two per row using the dashboard's existing page spacing
- **AND** the actual section width is measured rather than widened to the viewport for the check
- **AND** room names wrap, lights-off controls remain at least 48 by 48 CSS pixels, decoration does not obscure content and room navigation remains usable

#### Scenario: A narrow section contains mixed controls
- **WHEN** a two-column section at 282px, 322px or 346px usable width contains ordinary controls, numeric readings or access controls at normal or bold typography
- **THEN** it uses two equal-width columns with an 8px gap, including in generated, native-wrapper and manually authored Marao-grid hosts
- **AND** long English/Portuguese names and availability/error messages wrap without clipping, shrinking or overlapping controls
- **AND** cards grow vertically as needed, retain section-wide equal heights and leave an odd final card at its normal column width

#### Scenario: A narrow access control is operated
- **WHEN** a strict opening/unlocking slide or guarded security action appears in a supported two-column phone section
- **THEN** its existing visible label, track/thumb dimensions and required gesture remain intact
- **AND** incomplete, vertical or cancelled gestures dispatch nothing and a valid completion dispatches exactly once
- **AND** tighter columns do not create an alternate tap path or a wider isolated card

#### Scenario: Configuration requests different group widths
- **WHEN** a section explicitly requests one column or an automatic layout includes both full-width and two-column groups
- **THEN** explicit one-column choices and automatic full-width groups remain full width
- **AND** eligible two-column groups use two columns at the supported phone widths without changing group starts, saved order or source configuration
- **AND** preferred counts above two remain maximums rather than forcing cramped additional columns

#### Scenario: Different hosts provide the same usable space
- **WHEN** a browser, app, native wrapper or existing popup grid provides the same section width, text settings and preferred count
- **THEN** Marao applies the same effective column policy without a phone-specific override
- **AND** existing one-column popup/group configurations stay one column and independently authored Home Assistant containers retain their own layout rules
