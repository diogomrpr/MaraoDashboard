# Mobile theme and layout

## Purpose

Keep Marao clear, readable and touch-friendly on the supported mobile layouts
while preserving the selected soft-blue visual language in both themes.

## Requirements

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
- **WHEN** a preferred two-column section has less usable width than the shared normal-typography capacity rule permits, or less than the required usable width under 200% text or bold plus 200% text
- **THEN** the whole two-column group reflows to one column with readable content and full-size controls
- **AND** 200% browser zoom also reduces columns when its effective available width cannot contain them, without horizontal page scrolling
- **AND** saved columns, card order, group boundaries and section-wide equal heights remain intact

#### Scenario: Space returns after rotation or a text-size change
- **WHEN** an existing section regains enough usable width at a supported text size
- **THEN** its preferred columns return without replacing mounted controls, losing focus or dispatching an action
- **AND** the section retains its 8px gaps, configured order and necessary equal surface heights

### Requirement: Scalable Montserrat typography
Typography SHALL use shared Montserrat size/weight tokens and existing fallbacks,
supporting normal, bold, 200% text, 200% browser zoom, and bold plus 200% text.
Essential titles, states, readings, errors and actions SHALL wrap; secondary
metadata MAY use ellipsis. Automatic shrinking or transforms SHALL NOT mask overflow. The JSON editor SHALL retain stock Monaco typography, sizing, themes and native widgets; surrounding Marao controls SHALL retain these shared UI rules.

#### Scenario: Text size is doubled
- **WHEN** the 200% text or bold-plus-200% profile is applied
- **THEN** cards grow or reflow without shrinking touch targets or hiding essential readings

### Requirement: Compact summary title width
Visible titles SHALL use the full padded content width except light, fan, cover and standard access controls SHALL group title and useful secondary content beside their icon. Titles SHALL wrap without shrinking or clipping. Other families SHALL retain their full-width title composition. Hidden-title/icon and icon-only roles SHALL remain intact. Redundant normal binary-state text SHALL remain omitted.

#### Scenario: Portuguese overview titles appear on iPhone
- **WHEN** Iluminação, Climatização or Manutenção is rendered at normal text size
- **THEN** the summary icon does not occupy the title's available width or force an avoidable split

#### Scenario: Any card has a visible title and adjacent controls
- **WHEN** a Marao card outside the light, fan, cover and standard access-control families renders a title
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

### Requirement: Shared light and dark palette
Cards SHALL use Marao semantic surface, state, icon, spacing, radius and typography tokens and remain readable in both themes. The approved Marão landscape palette SHALL use mist and schist surfaces, slate-blue primary controls and seasonal forest green, heather, yellow, orange, earth red, winter blue, gold and peach domain accents.

#### Scenario: A pale active slider card is displayed
- **WHEN** the card uses the blue domain highlight
- **THEN** card, track, confirmed fill and target thumb remain visually distinguishable with persistent contrasting boundaries

#### Scenario: A room uses the requested reduced state presentation
- **WHEN** its light states are normal and known
- **THEN** the active/inactive background indicates lighting without a separate visible on/off row and localized semantic state remains available
- **AND** other card families retain their additional visual state cues

#### Scenario: A theme mode changes
- **WHEN** light or dark mode is selected
- **THEN** the landscape surfaces and primary foreground pair remain readable
- **AND** power chart lines, their legends and energy donut shares consume the same shared series palette

#### Scenario: A chart displays more than six configured series
- **WHEN** a power or energy chart displays seven to ten series without explicit color overrides
- **THEN** every series resolves a shared mode-aware landscape color rather than using an unthemed fallback for the extra series
- **AND** existing legend labels and configured color overrides remain intact

#### Scenario: Seasonal palette evidence is documented
- **WHEN** the refined palette is documented
- **THEN** the evidence includes 15 real Marão photo references spanning spring, summer, autumn and winter with sources, credits and capture-date confidence
- **AND** raw extracted swatches remain distinct from UI colors adjusted for contrast and the desired visual identity
- **AND** reference photographs are not bundled into the dashboard runtime

#### Scenario: Additional shared light and dark palette contracts
- **WHEN** a themed control, state or chart is rendered
- **THEN** Yellow and orange SHALL remain distinct, and forest green SHALL retain the cleaner green direction rather than the rejected olive treatment.
- **AND** Primary controls SHALL use paired mode-aware foregrounds.
- **AND** Sliders SHALL retain pale mineral tracks, near-white fills, white thumbs and contrasting slate boundaries.
- **AND** Charts SHALL use ten shared mode-aware series colors, including river teal, winter blue, rose and lilac, while preserving explicit overrides.
- **AND** Series colors SHALL meet at least 3:1 against their chart surface in each mode.
- **AND** Status SHALL also use text, icon or shape, except normal room lighting uses background plus accessible state without a visible status row.
- **AND** Normal text SHALL meet 4.5:1 contrast; large text and meaningful boundaries SHALL meet 3:1.

### Requirement: Visible touch targets and native semantics
Every Marao interactive control SHALL be visibly at least 48 by 48 CSS pixels and use
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

### Requirement: Access slider label and thumb share a row
Strict access sliders SHALL place their visible label to the right of the resting drag thumb, with both vertically centered in the same horizontal row. This composition SHALL apply at every supported mobile size and in page, group, popup and native hosts. A narrow track SHALL NOT place its label above the thumb or anchor the thumb in a separate bottom row.

#### Scenario: A narrow Security card shows an opener
- **WHEN** a strict access slider appears in a narrow card, including a track at or below 240 CSS pixels
- **THEN** its resting thumb and label share a vertical center and occupy separate horizontal space inside the track
- **AND** the label is not presented as a heading above a lower drag button

#### Scenario: The same opener appears in another host
- **WHEN** an equivalent opener is displayed in a full-width popup, group or native-host card
- **THEN** the same label/thumb composition applies without a host-specific layout override
- **AND** the existing semantic action/target name and localized visible text remain available

#### Scenario: The entity state or availability changes
- **WHEN** an access slider displays another supported action/state label or becomes unknown, unavailable or disconnected
- **THEN** its resting label and thumb retain the same row composition
- **AND** existing authoritative state feedback, neutral disabled presentation and action guards remain intact

### Requirement: Access slider text reflows beside the thumb
Access labels SHALL retain scalable typography and wrap in the space beside the resting thumb without clipping, ellipsis, overlap or automatic shrinking. The track SHALL grow vertically for wrapped text while keeping the thumb centered beside the label block. Track and thumb SHALL retain visible dimensions of at least 48 by 48 CSS pixels and remain contained.

#### Scenario: Localized or enlarged text needs several lines
- **WHEN** a supported localized label wraps at 320px, a narrow column, landscape, 200% text, 200% browser zoom or bold plus 200% text
- **THEN** the complete label wraps beside the thumb and the track grows enough to contain both
- **AND** neither text nor thumb overlaps the other at rest, extends outside the track or creates horizontal page overflow

#### Scenario: A user begins and cancels a slide
- **WHEN** a supported touch gesture starts from the visibly centered thumb and then cancels or completes
- **THEN** the layout does not switch to stacked rows or jump during the gesture
- **AND** the existing strict horizontal-intent, completion, cancellation, single-dispatch and haptic contracts remain unchanged

### Requirement: Shared standard control-card size
Light, fan, cover and standard access controls SHALL use compact content-driven intrinsic sizing without an unconditional 174px floor. Absent fields/controls SHALL reserve no empty region. Ordinary short-content value-slider fixtures SHALL fit within 140 CSS pixels before section equalization. Necessary content and strict access geometry SHALL increase intrinsic height rather than clip or shrink controls.

#### Scenario: Lights with and without sliders share the grid
- **WHEN** ordinary on/off-only, brightness-enabled and slider-disabled light cards share a section
- **THEN** their surfaces share that section's content-driven common height without an unconditional 174px floor
- **AND** omitted controls remain absent without placeholder rows

#### Scenario: Standard access and cover variants render
- **WHEN** normal cover, access-summary, strict opener, close and lock cards render
- **THEN** their intrinsic size accommodates necessary content and strict gesture geometry, and their section equalizes owned surfaces
- **AND** control type does not impose a fixed 174px minimum

#### Scenario: A visibility or availability option changes
- **WHEN** an affected card hides a field or gains an availability reason or reported error
- **THEN** hidden fields stay absent and necessary visible content determines its intrinsic height
- **AND** enlarged text, long titles and problems are never constrained by the compact reference height

#### Scenario: A different card family renders
- **WHEN** an alarm/service hold, navigation summary, chart, camera or detailed climate card is outside the standard control family
- **THEN** this change does not force it into the standard control-card size
- **AND** an existing fan's shared icon/title header remains intact

#### Scenario: Normal ordinary value controls render independently
- **WHEN** independently specified Lamp/Fan/Blind fixtures in English and Luz/Ventoinha/Estore fixtures in Portuguese render at normal typography in 172px-wide cells of a 352px two-column section on a 390 by 844 CSS pixel phone
- **THEN** each outer surface is at most 140 CSS pixels high before section equalization
- **AND** the slider track/thumb remain visibly at least 48px high and other controls remain at least 48 by 48px
- **AND** each fixture has one supported value slider, the existing default icon, a confirmed 50% value and ordinary available state, without extra custom labels or problems
- **AND** narrow/reflowed cells, longer titles, enlarged text and additional meaningful content are allowed to grow beyond this reference bound

#### Scenario: A supported slider is absent
- **WHEN** a light/fan disables its slider or its native capability does not support one
- **THEN** no placeholder slider row or flexible control-sized empty region is retained
- **AND** section equality alone can deliberately add space to match taller neighbours

#### Scenario: A strict opener needs additional height
- **WHEN** its existing strict track, thumb or localized action label needs more space than an ordinary value slider
- **THEN** its intrinsic height accommodates that geometry and a containing section adopts the necessary common height
- **AND** compact sizing does not reduce the existing strict track/thumb dimensions or change dispatch/cancellation rules

#### Scenario: A detailed card shares a section
- **WHEN** a supported climate, media, camera, graph, appliance, numeric, room, summary or other Marao content card appears
- **THEN** its complete family-specific content remains usable at its necessary height
- **AND** the ordinary-slider reference budget does not cap that card

### Requirement: Equal rows throughout a control grid
All Marao-owned content-card surfaces in one logical section SHALL have the same height across every row, sufficient for the tallest required content within 0.5 CSS pixels. Fixed and automatic layouts SHALL retain that section boundary. Independent sections SHALL size independently. Structural headings, navbar and popup definitions SHALL NOT participate. Raw third-party internal surfaces SHALL NOT be restyled.

#### Scenario: The tallest card is in a later row
- **WHEN** one card in a section with at least three rows requires more height
- **THEN** every participating card surface across that section uses the necessary common height
- **AND** equality only between neighbours in one row is insufficient

#### Scenario: A problem message grows and clears
- **WHEN** a card gains or loses readable problem content at unchanged width and text size
- **THEN** feedback replaces existing content within its stable footprint and all participating section surfaces remain equal
- **AND** full details remain reachable without dispatching an entity action; explicit configuration or viewport changes may recompute section height

#### Scenario: A separate full-width panel is present
- **WHEN** a camera, chart or detailed climate panel appears in another section
- **THEN** its intrinsic height does not determine the control grid's height

#### Scenario: Separate sections contain different content
- **WHEN** one section contains ordinary controls and another contains a tall camera, climate panel or long title
- **THEN** each section uses its own necessary common height without a dashboard-wide maximum

#### Scenario: One automatic section contains several domain groups
- **WHEN** its preserved automatic composition renders different device families at different widths
- **THEN** its participating surfaces still share one section-wide height
- **AND** generated domain groups do not silently become independent height boundaries

#### Scenario: A raw card appears beside owned cards
- **WHEN** a section contains raw content in addition to Marao-owned content
- **THEN** raw configuration/order remain intact and owned siblings retain their shared section height
- **AND** no private third-party card internals are changed or claimed to satisfy Marao surface equality

### Requirement: Regular control-grid spacing and placement
Owned section grids SHALL preserve configured order, the existing fixed/automatic composition and an 8px horizontal/vertical gap. Equal-width cells within each configured group SHALL remain aligned. An incomplete final row SHALL retain its normal card width. Layout SHALL NOT use dense reordering, invent sections or move detailed cards to make a section shorter.

#### Scenario: Five controls use two columns
- **WHEN** their fixed section supports two columns
- **THEN** two cards fill each of the first two rows and one normal-width card begins the third
- **AND** all five surfaces share the section height with consistent 8px gaps

#### Scenario: Card families alternate
- **WHEN** a fixed-column section alternates lights, covers, fans, switches or other owned families
- **THEN** saved order remains continuous without new device-type boundaries or internal holes

#### Scenario: Automatic composition has mixed widths
- **WHEN** a saved automatic section uses full-width groups and two-column groups
- **THEN** their existing group order, widths and group starts are preserved within one section sizing boundary

### Requirement: Whole-grid responsive control reflow
Saved columns SHALL remain the preferred maximum. Each owned section SHALL reflow responsively when usable width or supported text settings require it, preserving order, group composition, contained content and section-wide equal heights. Controls SHALL retain their minimum dimensions. Layout SHALL restore preferred columns when space permits without changing saved configuration or remounting active controls.

#### Scenario: Narrow or enlarged text makes two columns unusable
- **WHEN** 320px width or supported text/zoom settings cannot contain the preferred columns
- **THEN** the section uses fewer effective columns without horizontal overflow or clipped essential content
- **AND** the saved column setting and section boundary remain unchanged

#### Scenario: A narrow grid contains an access opener
- **WHEN** the strict slider needs more usable width than its current column provides
- **THEN** the grid's column count adapts consistently, keeping its label beside the thumb
- **AND** horizontal intent, cancellation, haptics and exactly-once completion remain intact

#### Scenario: The layout becomes wider again
- **WHEN** rotation or text settings permit the preferred columns
- **THEN** the section restores that composition while retaining its current necessary common height
- **AND** source configuration and authoritative entity state do not change

#### Scenario: Compact Android content still accommodates two columns
- **WHEN** a section prefers two columns and provides 248px of usable width at 18px or 20px primary text, or 272px at 22px text
- **THEN** it retains two columns with wrapped labels and content-driven height
- **AND** controls remain at least 48px square and configured icon sizes stay unchanged
- **AND** smaller widths or substantially enlarged text still reflow without changing saved preferences or replacing mounted controls

#### Scenario: A narrow section contains an access opener
- **WHEN** the strict slide needs more usable width than its column provides
- **THEN** responsive layout contains its label and thumb without an isolated wider opener creating an unintended hole
- **AND** horizontal intent, cancellation, haptics and single dispatch retain their existing behavior

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

### Requirement: Compact logo-only media app groups
A group consisting only of media app shortcuts SHALL use an 80px minimum cell
capacity, preserve its configured preferred columns, and reflow below that
capacity. Both generated and native media-app roles SHALL participate. Each app
control SHALL remain at least 48px square; warnings SHALL wrap and may grow.

#### Scenario: Three app columns on a phone
- **WHEN** a three-column app group has at least 256px of available width
- **THEN** three shortcuts fit on each row without reserving space for hidden titles
- **AND** a narrower group reflows the same mounted controls
- **AND** ordinary or mixed control groups retain their normal width and text-size rules

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
- **THEN** climate modes use the themed dropdown and forecasts use one scrolling row
- **AND** the event viewer retains a bounded scrolling viewport while individual previews load
