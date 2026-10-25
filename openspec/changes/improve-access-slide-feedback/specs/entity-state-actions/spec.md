# Spec Delta

## ADDED Requirements

### Requirement: Multimodal access-slide dispatch feedback
A valid dispatched access opening/unlocking slide SHALL immediately produce a brief blue surface pulse and one strong completion haptic through the existing supported path. While its service request is unresolved, the slider SHALL show a gentle blue shimmer and reject repeat activation. Color and motion SHALL make the feedback perceptible without relying on labels. Existing travel haptics and strict-slide safety SHALL remain intact.

#### Scenario: A valid access slide dispatches
- **WHEN** a deliberate completed release passes current target and connection guards and sends its opening/unlocking request
- **THEN** the initiating slider pulses blue and requests one strong completion haptic
- **AND** its unresolved request has a blue shimmer, a supporting localized Sending label and no second dispatch from repeat input

#### Scenario: A gesture is cancelled or a request is skipped
- **WHEN** travel is incomplete, vertical, reversed or cancelled, release is invalid, or current guards prevent dispatch
- **THEN** no dispatch pulse, completion haptic, pending shimmer or accepted-request checkmark is shown
- **AND** existing safe reset and availability behavior remain intact

### Requirement: Accepted access request confirmation
Successful access-service acknowledgement SHALL replace pending feedback with a blue slider surface and handle checkmark for approximately one second, followed by a short fade to current appearance. Supporting text SHALL describe request acceptance only. The confirmation SHALL NOT claim physical opening/unlocking or replace Home Assistant's authoritative entity state. Failed or skipped requests SHALL NOT receive accepted-request confirmation.

#### Scenario: The command is accepted before a physical state update
- **WHEN** the access service succeeds while the device still reports closed or locked
- **THEN** the slider shows the brief blue checkmark confirmation and supporting Request sent text
- **AND** the actual device state remains closed or locked until Home Assistant reports otherwise
- **AND** the checkmark hold prevents accidental immediate repetition before the slider returns to its normal usable state

#### Scenario: A physical transition is reported
- **WHEN** Home Assistant reports opening, open, unlocking or unlocked during or after command feedback
- **THEN** the card retains that authoritative state and returns to its normal state-driven appearance after the brief confirmation
- **AND** the command feedback never invents or delays the reported device state

#### Scenario: A service rejects the command
- **WHEN** the access service reports an error
- **THEN** pending feedback ends and existing readable error treatment takes precedence immediately
- **AND** no accepted-request checkmark, automatic retry or physical-success state is produced

### Requirement: Access feedback lifecycle and presentation
Access feedback SHALL survive ordinary unrelated state renders for its current request and stop on removal, reconfiguration, navigation or page hiding. Obsolete completions SHALL NOT affect a new control or request. Availability and error presentation SHALL take precedence. Feedback SHALL retain contrasting text/icons in both themes and static color/icon equivalents under reduced motion. It SHALL introduce no persisted setting.

#### Scenario: An unrelated state update arrives during confirmation
- **WHEN** a current slider rerenders because Home Assistant updates an unrelated entity
- **THEN** its pending or timed confirmation remains consistent without restarting the timer, animation or haptic

#### Scenario: A response arrives after the control is obsolete
- **WHEN** a request completes after its slider was removed, reconfigured, hidden or left by navigation
- **THEN** no late animation, checkmark or stale timer changes the replacement control
- **AND** already-dispatched service/error handling remains truthful without resending the action

#### Scenario: The target becomes unavailable
- **WHEN** a pending or confirming target becomes missing, unknown, unavailable or disconnected
- **THEN** existing neutral availability presentation and disabled action guards override blue feedback
- **AND** later acknowledgement cannot hide the availability problem

#### Scenario: Motion or haptics are unavailable
- **WHEN** reduced motion is requested or the client cannot deliver physical vibration
- **THEN** static blue pending/confirmation treatment and distinct pending/checkmark icons still communicate the interaction
- **AND** no browser vibration capability is required to use the slider
