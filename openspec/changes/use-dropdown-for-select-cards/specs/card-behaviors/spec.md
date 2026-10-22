## MODIFIED Requirements

### Requirement: Scene and current option counts
Scene cards SHALL derive all choices from `input_select`/`select` options, display them in a compact dropdown, mark the authoritative current option and dispatch one native select action per completed choice. Overview scene entities SHALL instead dispatch `scene.turn_on`; configured toggle entities SHALL use their explicit toggle behavior. Wallbox current SHALL retain its shared numeric control and up to three configured shortcuts. Select dropdowns SHALL tolerate many options without expanding the card to show them all, and SHALL remain disabled when unknown, unavailable or disconnected.

#### Scenario: A selector has one or five options
- **WHEN** its scene card renders
- **THEN** all options appear inside one Marao themed dropdown with the current option selected
- **AND** the card height does not grow with the option count

#### Scenario: An overview scene entity is activated
- **WHEN** the available configured `scene.*` button is pressed
- **THEN** one `scene.turn_on` action targets that scene rather than a select-option action

#### Scenario: A selector has many options
- **WHEN** a selector has 200 options
- **THEN** every option remains available through the dropdown without showing 200 option buttons in the collapsed card

#### Scenario: The themed dropdown is opened
- **WHEN** the user opens a selector
- **THEN** a themed scrollable menu appears above card clipping boundaries with the reported option marked
- **AND** Escape or outside input closes it, with keyboard navigation available
- **AND** ordinary state updates preserve the attached menu and its scroll position
