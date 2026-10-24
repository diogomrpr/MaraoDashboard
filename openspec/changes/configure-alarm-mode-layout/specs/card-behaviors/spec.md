# Spec Delta

## MODIFIED Requirements

### Requirement: Capability-aware alarm controls
Alarm controls SHALL display authoritative state and only advertised arming modes plus Disarm. Dropdown mode SHALL execute an explicitly selected action without a hold. Grid mode SHALL use taps for ordinary arming, a 1.2-second hold for custom bypass and a strict slide for Disarm. With no layout configured, existing row/hold behavior SHALL remain. Unsupported, unknown, unavailable and disconnected targets SHALL not dispatch actions.

#### Scenario: A panel supports Away and Night
- **WHEN** its alarm sheet opens
- **THEN** Away, Night and Disarm are offered without unsupported modes

#### Scenario: A disarm hold is cancelled
- **WHEN** the user releases an existing legacy disarm hold early, moves outside, closes the sheet or loses availability
- **THEN** no disarm service is called

#### Scenario: Dropdown selection disarms
- **WHEN** a usable armed alarm has dropdown layout and the user explicitly selects Disarm with any required valid code
- **THEN** one disarm request is sent without a hold or additional confirmation
- **AND** opening, browsing, focusing an option or dismissing the dropdown sends no request

#### Scenario: Grid bypass retains a hold
- **WHEN** custom bypass is advertised and grid layout is configured
- **THEN** bypass appears among the arming options and requires its existing completed 1.2-second hold

## ADDED Requirements

### Requirement: Configurable alarm mode layout
Alarm card settings SHALL offer Dropdown and Grid through the visual builder. The same setting SHALL govern generated and directly authored alarm controls. Explicit external popup references and unrelated saved fields SHALL remain intact. New alarm cards SHALL default to Dropdown; omission in existing cards SHALL preserve their current layout and confirmation behavior.

#### Scenario: Layout round trip
- **WHEN** an administrator selects Grid, saves and reopens the card
- **THEN** Grid remains selected and its detail controls use that layout without changing names, entity bindings, authored actions or other options

#### Scenario: Existing source has no layout
- **WHEN** an older supported alarm card is loaded or edited without changing its layout
- **THEN** its current horizontal row and guarded actions remain, with no automatic source rewrite
- **AND** deliberately choosing Dropdown or Grid replaces that presentation

#### Scenario: Invalid layout is supplied
- **WHEN** configuration supplies an alarm layout outside the supported choices
- **THEN** validation reports a readable configuration error before generation or runtime dispatch

### Requirement: Themed alarm dropdown
Dropdown layout SHALL use Marao's themed menu with all supported arming actions and Disarm. The control SHALL show authoritative mode or transitional state, distinguish the current mode and prevent redundant actions. Required code entry and readable errors SHALL remain available without persisting the code. Controls SHALL remain mounted through unrelated state updates.

#### Scenario: Alarm has a transitional state
- **WHEN** the alarm reports arming, pending or triggered
- **THEN** the visible reported state remains accurate without inventing a selected arming mode

#### Scenario: User selects custom bypass from dropdown
- **WHEN** a usable alarm advertises custom bypass and the user explicitly selects it with any required valid code
- **THEN** one bypass request is sent without a hold, under the dropdown-specific exception

### Requirement: Two-column alarm grid with separate disarm slide
Grid layout SHALL place supported arming actions in two equal columns flowing into rows, with Disarm beneath the grid spanning its full width. Disarm SHALL use the existing classic strict-slide appearance and whole round handle, without progress fill. An odd final arming option SHALL remain one column wide. Labels SHALL wrap, controls SHALL meet 48px touch sizing and the summary card SHALL not grow.

#### Scenario: Five arming options are supported
- **WHEN** Grid is selected
- **THEN** the options occupy three rows with two columns and the final option occupies one cell
- **AND** a full-width disarm slide follows those rows

#### Scenario: No arming mode is supported
- **WHEN** a configured alarm advertises no arming modes
- **THEN** no empty grid gap is inserted and the full-width disarm slide remains

#### Scenario: State or availability changes
- **WHEN** an already rendered grid alarm changes state, loads or becomes unavailable
- **THEN** existing capability slots, code slot and disarm row retain their footprint using placeholders where needed
- **AND** invalid actions disable without adding error rows that resize the card
