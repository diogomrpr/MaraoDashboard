# Spec Delta

## ADDED Requirements

### Requirement: Floor-plan image upload and replacement
The builder SHALL offer a Floor Plan card with native HA image upload for PNG/JPEG files. Replacing an image SHALL retain light bindings, button positions and strip geometry. Failed, invalid or cancelled uploads SHALL preserve the previous usable image and draft. The UI SHALL distinguish storing an image from saving its dashboard reference.

#### Scenario: Upload and replace the background
- **WHEN** the administrator uploads an image, places lights and later replaces the image
- **THEN** the new image is previewed with the same bindings and relative positions available for deliberate adjustment
- **AND** the saved dashboard changes only after an explicit dashboard save

#### Scenario: Upload fails or the card is cancelled
- **WHEN** upload fails, or its result arrives after the card dialog or document was replaced
- **THEN** the current draft and previous image remain intact and a current failure offers readable retry feedback
- **AND** obsolete results do not change another card or delete existing HA image files

### Requirement: Visual floor-plan light placement
The floor-plan editor SHALL place, rebind and remove named/icon light buttons with image-relative dragging. Placement and strip controls SHALL sit beside the preview. Tapping a light square SHALL open a settings modal; accepted edits SHALL remain local and cancellation SHALL preserve prior settings. Exact light and strip-point coordinates SHALL be editable in JSON only. Editing SHALL NOT dispatch light actions.

#### Scenario: Add and move a light
- **WHEN** the administrator chooses Add light, taps the image, accepts a light binding in its settings modal and drags its button elsewhere
- **THEN** one configured button uses that light and the accepted image-relative position
- **AND** switching to JSON and back preserves its identity, label, icon and position

#### Scenario: Arrange controls on a touch device
- **WHEN** the administrator taps a light square, uses the ordered Lights selector or drags a marker
- **THEN** all interactive controls have visible targets of at least 48 by 48 CSS pixels, localized names and reachable placement controls
- **AND** the editor identifies overlapping buttons without silently deleting, merging or moving them
- **AND** no light service is called by selection, positioning, preview or cancellation

#### Scenario: Configure without exposing coordinates
- **WHEN** the administrator taps a light square
- **THEN** its entity, name, icon and optional strip thickness appear in a modal while the preview remains behind it
- **AND** Update/Create accepts its settings while cancelling a new light creates no entry
- **AND** cancelling leaves the accepted settings intact and closing restores focus to the light square
- **AND** a completed drag changes its position without opening the settings modal
- **AND** light and strip-point coordinates remain in JSON and are absent from visual forms

### Requirement: Visual floor-plan strip tracing
A configured light SHALL optionally have a strip path drawn by tapping successive points. The editor SHALL support corners, point adjustment/removal, removing the path and changing its thickness. Completed paths SHALL contain at least two distinct in-bounds points. Path editing SHALL preserve the associated light button and other lights.

#### Scenario: Trace a strip around a corner
- **WHEN** the administrator selects a light and taps three image points before finishing
- **THEN** a connected two-segment strip follows those points and previews the chosen thickness
- **AND** the administrator can adjust its points without preparing another image or changing any entity state

#### Scenario: Cancel an incomplete trace
- **WHEN** the administrator cancels tracing or interrupts a point drag
- **THEN** the prior accepted path and unrelated draft settings remain intact
- **AND** an unfinished or invalid path cannot silently become saved geometry

### Requirement: Floor-plan configuration preservation
Floor plans SHALL share the existing local draft and explicit save/discard workflow. Image references, ordered lights, IDs, positions, paths, explicit empty lists and unknown fields SHALL survive Visual/JSON switches, card/page duplication, moves, saving and reload. Unsupported bindings and invalid geometry SHALL fail validation without replacing saved data.

#### Scenario: Duplicate and edit a floor plan
- **WHEN** the administrator duplicates the card or its page and changes one copy
- **THEN** the copies have independent card identities and editable geometry while sharing the existing image reference safely
- **AND** changes to one copy do not change the other's configuration

#### Scenario: Save, discard or clear every light
- **WHEN** the administrator saves an explicit empty light list or discards unsaved placement edits
- **THEN** the empty list stays empty or the saved arrangement is restored respectively
- **AND** no discovery defaults repopulate lights and no referenced image is automatically deleted

#### Scenario: JSON supplies unsafe geometry or bindings
- **WHEN** a light entry targets a non-light entity, duplicates a local entry ID or contains nonfinite/out-of-bounds coordinates or invalid thickness
- **THEN** validation identifies the invalid entry before dashboard writes and preserves the draft for correction
