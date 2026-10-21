# Spec Delta

## MODIFIED Requirements

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

#### Scenario: A strict access opener renders
- **WHEN** an opening/unlocking card or supported legacy configuration normalized to an opener renders
- **THEN** its title/icon composition is compact and the strict slide remains below with its action label visible
- **AND** no tap, alternate control or changed gesture can bypass strict completion

## ADDED Requirements

### Requirement: Shared standard control-card size
Light, fan, cover and standard access controls SHALL use compact content-driven intrinsic sizing without an unconditional 174px floor. Absent fields/controls SHALL reserve no empty region. Ordinary short-content value-slider fixtures SHALL fit within 140 CSS pixels before section equalization. Necessary content and strict access geometry SHALL increase intrinsic height rather than clip or shrink controls.

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

#### Scenario: A visibility or availability option changes
- **WHEN** an affected card hides a field or gains an availability reason or reported error
- **THEN** hidden fields stay absent and necessary visible content determines its intrinsic height
- **AND** enlarged text, long titles and problems are never constrained by the compact reference height

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

#### Scenario: Separate sections contain different content
- **WHEN** one section contains ordinary controls and another contains a tall camera, climate panel or long title
- **THEN** each section uses its own necessary common height without a dashboard-wide maximum

#### Scenario: A problem message grows and clears
- **WHEN** a card gains or loses readable problem content
- **THEN** all participating surfaces in its section grow or shrink to their current necessary common height
- **AND** other sections remain independent, no service is dispatched and an active mounted control retains its interaction

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

#### Scenario: A narrow section contains an access opener
- **WHEN** the strict slide needs more usable width than its column provides
- **THEN** responsive layout contains its label and thumb without an isolated wider opener creating an unintended hole
- **AND** horizontal intent, cancellation, haptics and single dispatch retain their existing behavior

#### Scenario: The layout becomes wider again
- **WHEN** rotation or text settings permit the preferred columns
- **THEN** the section restores that composition while retaining its current necessary common height
- **AND** source configuration and authoritative entity state do not change

## ADDED Requirements

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
