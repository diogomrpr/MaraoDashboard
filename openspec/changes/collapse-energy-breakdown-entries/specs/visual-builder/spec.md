# Spec Delta

## ADDED Requirements

### Requirement: Collapsed energy contributor groups
The energy card's Visual editor SHALL present each Energy breakdown contributor
as an independent group, initially collapsed for existing entries. Its heading
SHALL show the display name, Home Assistant name or sensor ID in that order of
availability, with the sensor ID as secondary information when present. Activating
the heading SHALL reveal the existing energy sensor, display name and optional
cost sensor controls inline in the current card dialog.

#### Scenario: Open a populated energy breakdown
- **WHEN** the administrator opens an energy card containing several contributors
- **THEN** each contributor appears as a compact collapsed group with an identifiable heading
- **AND** its configuration fields are hidden until that group is opened

#### Scenario: Expand one contributor
- **WHEN** the administrator activates a contributor heading by touch or keyboard
- **THEN** only that group's inline controls appear or disappear
- **AND** other contributors retain their current disclosure state
- **AND** no additional settings dialog opens

### Requirement: Energy contributor disclosure continuity
New contributors SHALL open immediately for sensor selection. Existing disclosure
choices SHALL follow the same contributor through name or sensor changes and
reordering within the current card dialog. Updating a heading SHALL retain the
active field's focus and value. Reopening the card dialog SHALL return existing
contributors to their initially collapsed presentation.

#### Scenario: Add an unbound contributor
- **WHEN** the administrator selects Add in Energy breakdown
- **THEN** exactly one new contributor appears expanded with a localized placeholder heading
- **AND** existing contributors retain their disclosure choices

#### Scenario: Rename, rebind or reorder a contributor
- **WHEN** an expanded contributor is renamed, bound to another sensor or moved
- **THEN** its heading and position reflect the current draft
- **AND** its disclosure choice follows it without switching to a neighboring contributor
- **AND** ordinary field edits retain focus and uncommitted field values

### Requirement: Independent energy contributor header actions
Energy contributor groups SHALL retain move up, move down and delete controls in
their collapsed and expanded headers. These actions SHALL target only their own
contributor and SHALL NOT also toggle disclosure. Move controls SHALL retain the
existing first/last boundary guards. Deleting a contributor SHALL preserve the
relative order, values and disclosure choices of surviving entries.

#### Scenario: Reorder a collapsed contributor
- **WHEN** the administrator activates its enabled move control
- **THEN** the contributor moves exactly once and stays collapsed
- **AND** its full configuration moves with it and unrelated entries retain their state

#### Scenario: Remove a collapsed contributor
- **WHEN** the administrator activates its delete control
- **THEN** only that contributor is removed from the card dialog's local list
- **AND** no disclosure toggle or Home Assistant entity action is dispatched

### Requirement: Presentation-only energy contributor disclosure
Opening or collapsing contributor groups SHALL NOT change the source, dirty
state or saved options. Existing validation SHALL include collapsed entries.
Applying card edits SHALL preserve order, unknown contributor fields, explicit
empty lists and unrelated card settings. Cancelling the card dialog SHALL discard
its edits through the existing private-draft behavior. Power device and background
threshold editors SHALL retain their current presentation and behavior.

#### Scenario: Inspect contributors without editing
- **WHEN** the administrator opens, closes or reopens contributor groups without changing fields
- **THEN** configuration values and dirty state remain unchanged
- **AND** no expansion-state setting is added to Visual or JSON configuration

#### Scenario: Apply edits with collapsed contributors
- **WHEN** the administrator edits the list, collapses entries and applies the card changes
- **THEN** every contributor's current complete configuration is retained, including unknown fields
- **AND** removing every contributor retains an explicit empty list
- **AND** persistence still requires the dashboard's existing Save operation

#### Scenario: Cancel edits with collapsed contributors
- **WHEN** the administrator edits the list, collapses entries and cancels the card dialog
- **THEN** the original card draft remains unchanged

#### Scenario: An invalid contributor is collapsed
- **WHEN** existing validation encounters invalid configuration in a collapsed contributor
- **THEN** its normal validation error remains available and disclosure does not bypass validation
- **AND** the contributor can be expanded to correct its fields

### Requirement: Mobile energy contributor disclosure
Contributor headings and header actions SHALL remain usable at 320 CSS pixels
with scalable text and in the existing light and dark themes. Essential names
SHALL wrap, and actions SHALL retain visible targets of at least 48 by 48 CSS
pixels. Disclosure state and actions SHALL have semantic accessible names, and
all added user-facing labels SHALL support the existing English and Portuguese
localization.

#### Scenario: A narrow dialog contains long contributor names
- **WHEN** a contributor heading and its actions cannot fit on one line
- **THEN** they reflow without horizontal overflow or reducing action targets
- **AND** expanded fields and the card dialog's existing actions remain reachable
