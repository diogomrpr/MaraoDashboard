# Spec Delta

## MODIFIED Requirements

### Requirement: Capability-aware sliders
Light/fan sliders SHALL respect their explicit disable option and native
capabilities. On/off-only lights and single-speed fans SHALL omit unsupported
value controls; fan percentage sliders SHALL default enabled where supported.
Cover-backed fan/exhaust cards SHALL apply `enable_slider` to opening control,
require SET_POSITION and a valid reported position, and omit unsupported sliders.

#### Scenario: A native on/off-only light is generated
- **WHEN** the card receives its supported capabilities
- **THEN** it shows its toggle behavior without a nonfunctional brightness slider

#### Scenario: An exhaust cover supports only open and close
- **WHEN** `hc_fan_card` receives a cover without SET_POSITION
- **THEN** it shows supported Open/Close actions without an opening-percentage slider

#### Scenario: The exhaust slider is disabled explicitly
- **WHEN** a position-capable exhaust cover has `enable_slider: false`
- **THEN** its percentage slider is omitted while supported Open/Close actions remain usable

## ADDED Requirements

### Requirement: Native ventilation percentage binding
Ventilation percentage controls SHALL use the target's actual domain. Covers SHALL read `current_position` and dispatch `cover.set_cover_position` with numeric `position`; fans SHALL read `percentage` and dispatch `fan.set_percentage` with numeric `percentage`. Commands SHALL require the corresponding capability and use bounded 0–100 targets. Changing presentation SHALL NOT change service domain or percentage meaning.

#### Scenario: A cover-backed fan card completes a drag
- **WHEN** an available exhaust cover supports position and a drag completes at 60%
- **THEN** exactly one `cover.set_cover_position` call targets that cover with `position: 60`
- **AND** its localized semantic range label describes opening rather than fan speed

#### Scenario: A fan completes a drag
- **WHEN** an available speed-capable fan completes a drag at 60%
- **THEN** exactly one `fan.set_percentage` call targets that fan with `percentage: 60`
- **AND** the range label describes fan speed

#### Scenario: An interaction cancels or loses capabilities
- **WHEN** a percentage gesture is cancelled or the target loses the required capability or availability before completion
- **THEN** it sends no command and retains HA's confirmed state

### Requirement: Reported ventilation values are not fabricated
Ventilation controls SHALL distinguish valid zero from absent, null, invalid or out-of-range percentage attributes. An exhaust card without a valid reported position SHALL omit its numeric reading and position slider while retaining supported Open/Close actions. A fan without a valid reported percentage SHALL omit its numeric speed control while retaining supported on/off actions. Reported values SHALL remain separate from requested targets across HA updates.

#### Scenario: A cover is open but position is absent
- **WHEN** a cover advertises SET_POSITION but `current_position` is missing or null
- **THEN** its exhaust card shows the reported open state without claiming 0% or offering a range initialized to a fabricated value

#### Scenario: Zero is a valid reported value
- **WHEN** a position-capable cover reports numeric `current_position: 0`
- **THEN** the opening slider shows confirmed 0% and remains usable when the target is available

#### Scenario: HA updates during a cover-backed fan drag
- **WHEN** reported cover position changes while the user drags the exhaust range
- **THEN** the same mounted native input retains the gesture and updates confirmed fill independently of the target thumb

#### Scenario: Invalid percentages are reported
- **WHEN** a cover position or fan percentage is nonnumeric or outside 0–100
- **THEN** no fabricated confirmed value or percentage control is rendered
