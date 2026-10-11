# Spec Delta

## MODIFIED Requirements

### Requirement: Climate mode and target controls
Climate SHALL separate mode, measured temperature and numeric target, with unitless values and mode-aware colors. One supported mode SHALL turn on directly; multiple modes SHALL open a sheet with the normal climate card and localized large buttons in two columns. Graph/mode/setpoint options SHALL be honored. Requested targets/modes SHALL appear by the next frame, without waiting for acknowledgement, and remain pending until reconciled. Temperature/activity SHALL remain HA-reported.

#### Scenario: A multi-mode climate card is activated
- **WHEN** the entity exposes more than one supported mode
- **THEN** its generated mode sheet exposes the shared climate card and supported mode choices

#### Scenario: A temperature or mode change has delayed confirmation
- **WHEN** a usable thermostat receives an accepted target or supported HVAC mode request
- **THEN** the requested value or mode appears immediately with localized pending feedback
- **AND** measured temperature and actual heating/cooling activity are not fabricated

#### Scenario: A single-mode thermostat is turned on
- **WHEN** its available default direct action requests its supported mode
- **THEN** the requested mode has the same immediate feedback and reconciliation as a mode-sheet button

#### Scenario: A thermostat is turned off before its report arrives
- **WHEN** an available thermostat receives an explicit supported off-mode request
- **THEN** its requested mode, label and mode-selection treatment display off immediately with pending feedback
- **AND** reported temperature and actual equipment activity remain unchanged until Home Assistant updates them

#### Scenario: A thermostat switches between supported modes
- **WHEN** an available thermostat receives a request for another supported HVAC mode
- **THEN** its requested mode, label and mode-selection treatment update immediately with pending feedback
- **AND** the control does not wait for service acknowledgement or entity confirmation

## ADDED Requirements

### Requirement: Consistent climate request display
Thermostat cards for the same entity SHALL share the latest requested settings
while pending, including cards opened in a mode sheet. Unrelated updates and
closure of one duplicate card SHALL NOT erase requests in a remaining card.
Reloading the dashboard SHALL start from current reported state.

#### Scenario: A mode sheet opens during a pending change
- **WHEN** another card for the same thermostat is rendered before confirmation
- **THEN** it displays the same pending target and requested mode

#### Scenario: An unrelated entity updates or one duplicate card closes
- **WHEN** a climate request remains outstanding in a displayed thermostat card
- **THEN** that request remains visible and the remaining controls stay usable

### Requirement: Bounded climate request reconciliation
Pending climate settings SHALL clear on matching reported values, current-request
rejection, disconnect, target loss/unavailability, or 30 seconds without
confirmation after the latest interaction for that setting. Failure SHALL restore
reported values and show a localized readable error. Older responses SHALL NOT
erase newer requests. Requests SHALL NOT retry silently.

#### Scenario: Home Assistant confirms the requested settings
- **WHEN** it reports the latest requested mode or temperature target
- **THEN** pending feedback for that setting clears and reported state supplies its display
- **AND** unrelated pending settings are not cleared prematurely

#### Scenario: A service succeeds but its state report is delayed
- **WHEN** the service response arrives before the requested target or mode is reported
- **THEN** pending feedback remains rather than claiming the equipment has reached the requested state

#### Scenario: A current request is rejected
- **WHEN** Home Assistant reports a service error for the latest request
- **THEN** that request is removed, reported settings are restored and one readable error is shown

#### Scenario: An earlier request settles after a newer one
- **WHEN** an older service response or intermediate state report arrives
- **THEN** it cannot clear or roll back a newer pending request
- **AND** a reported service error still uses the existing readable error path

#### Scenario: A target disconnects or becomes missing, unknown or unavailable
- **WHEN** a pending thermostat is no longer usable
- **THEN** its previews clear, the unavailable/connection treatment is authoritative and further actions are blocked

#### Scenario: Confirmation never arrives or reports a different setting
- **WHEN** 30 seconds elapse since the latest interaction for the setting without a matching report
- **THEN** its preview clears, the latest reported value appears and a readable not-confirmed message is shown
- **AND** no retry or claim of device disconnection is invented
