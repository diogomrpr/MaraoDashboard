## ADDED Requirements

### Requirement: Light color preview and final dispatch
Light color and white-temperature controls SHALL preview selection while dragging and send exactly one native update when the interaction completes. Opening, cancelling or abandoning an adjustment SHALL send nothing. A completed adjustment on an off light SHALL turn it on. Reported state SHALL resume supplying displayed values after interaction.

#### Scenario: Color is dragged through several values
- **WHEN** the user drags across the color wheel and releases
- **THEN** local feedback follows the pointer immediately and exactly one light update carries the final color
- **AND** intermediate values are not sent to Home Assistant

#### Scenario: An off light receives a completed selection
- **WHEN** the user completes a color or white-temperature adjustment while the light is off
- **THEN** one native turn-on update applies the selected value

#### Scenario: A selection is cancelled
- **WHEN** a pointer is cancelled, the sheet closes or the target becomes unavailable before release
- **THEN** the local preview is discarded without sending a partial or final value

### Requirement: Supported light temperature and shared brightness controls
The white-temperature slider SHALL use the light's reported Kelvin limits and send bounded Kelvin values. Picker brightness SHALL reuse the shared brightness interaction and presentation, including stable drag lifetime, current-value fill, target thumb, cancellation and one-call dispatch.

#### Scenario: A light supplies a restricted white range
- **WHEN** its reported temperature limits differ from another light's
- **THEN** the warm-to-cool range and final request remain within that light's limits

#### Scenario: Home Assistant updates during brightness adjustment
- **WHEN** the popup's shared brightness slider is being dragged
- **THEN** the mounted range retains the gesture while authoritative fill updates independently
- **AND** completion dispatches one final brightness request
