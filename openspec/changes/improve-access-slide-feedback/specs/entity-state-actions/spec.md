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

### Requirement: Access popup state hierarchy
A lock, door, gate or garage popup containing its access actions SHALL show the
authoritative state and matching icon once in its header. Child action cards
SHALL show their action and omit the repeated normal entity state and state icon.
Existing configuration and other popup families SHALL retain their meaning.

#### Scenario: An access popup shows its opening and closing actions
- **WHEN** the popup displays open/unlock and close/lock actions
- **THEN** the header is at least 112px high, grows with wrapped text and uses scalable title and state typography (22.5px and 18px at the default theme size)
- **AND** both actions have decorative icons on the left
- **AND** open/unlock shows its label only in the strict slider and retains feedback and cancellation guards
- **AND** close/lock uses an explicit tap target with larger action text centered across the card

## MODIFIED Requirements

### Requirement: Strict slide for opening and unlocking access points
Open/unlock of locks, doors, garages and gates SHALL use only the strict slide
control, with a concise localized visible label and semantic action/target name.
The control SHALL require a start on the thumb and establish horizontal intent
before pointer capture. It SHALL update the thumb from the final horizontal
position and dispatch once when the thumb is in the completion range on release,
including releases above, below, or beyond the right edge of the track.
No keyboard, tap, hold or alternate button path SHALL execute the same risky
access action.

#### Scenario: The strict slide completes deliberately
- **WHEN** a gesture starting on the thumb establishes horizontal intent and is released with the thumb in the completion range
- **THEN** the explicit open/unlock action dispatches once with completion feedback, including when the pointer is outside the track

### Requirement: Strict slide cancellation
Strict access slides SHALL cancel without dispatch on taps, incomplete or reversed
travel below the completion boundary, vertical intent before capture, pointer loss or
cancellation, route change, page hiding, removal or disabling. Cancellation SHALL
reset visible progress and preserve authoritative state.

#### Scenario: The gesture is intended to scroll vertically
- **WHEN** vertical motion occurs before horizontal intent is established
- **THEN** the access slide cancels without capturing scrolling or dispatching an action

#### Scenario: A partial slide is interrupted
- **WHEN** the pointer is cancelled, released with the thumb below the completion boundary, or the route/page/component/availability changes
- **THEN** progress resets and no open/unlock action or completion haptic occurs

#### Scenario: The access state changes while the popup is open
- **WHEN** Home Assistant reports a new access state
- **THEN** the header label and state icon update without replacing the active slider
- **AND** action cards retain their action labels, availability guards and readable service errors
