# Entity state and actions

## Purpose

Display authoritative Home Assistant state and dispatch deliberate, safe,
single interactions with immediate feedback and cancellation behavior.

## Requirements

### Requirement: Explicit availability and authoritative state
Entity cards SHALL distinguish loading, inactive, active, disabled, unknown, unavailable, missing and domain transitions. Unknown/unavailable SHALL be neutral and disabled; service actions SHALL disable for disconnected connections or unavailable targets. Observations SHALL remain HA-authoritative. Climate SHALL preview only explicitly requested targets/modes with pending feedback and bounded reconciliation, never measured temperature or actual activity.

#### Scenario: A player is online but its remote is unavailable
- **WHEN** a remote command control is displayed or activated
- **THEN** its actual remote target guards the action and no service is dispatched

#### Scenario: A usable climate entity has a pending requested mode
- **WHEN** the user requests heating and the device has not reported its operation
- **THEN** the control displays the requested mode as pending
- **AND** any actual heating activity and temperature remain HA-reported observations

#### Scenario: A climate action targets an unavailable entity
- **WHEN** an interaction would send a target or mode to a missing, unknown, unavailable or disconnected target
- **THEN** neither a request nor an optimistic preview is created

### Requirement: Disconnect and recovery
Marao SHALL use HA's native connection warning and disable actions immediately
on a real outage, even when HA mutates its existing connection object. Recovery
SHALL reconcile server state before actions resume. Stale status SHALL be shown
only with an integration-recognized freshness signal.

#### Scenario: Server state changes during an outage
- **WHEN** the real HA connection recovers
- **THEN** cards render that authoritative change and enable only currently usable controls
- **AND** no offline interaction has dispatched a service

### Requirement: One completed interaction and readable errors
Ordinary actions SHALL acknowledge activation immediately, dispatch exactly
once on completion, and show a readable reported service error. A successful
service response SHALL NOT be treated as proof of a physical outcome. Climate
target and mode controls SHALL provide a bounded optimistic request display;
other controls SHALL retain their existing behavior without a global optimistic
pending/timeout state machine.

#### Scenario: A fixture rejects a service call
- **WHEN** a user completes the control interaction
- **THEN** one call is sent, a readable error appears, and authoritative entity state remains the source of truth

#### Scenario: The latest climate request fails
- **WHEN** a pending target or mode request is rejected
- **THEN** the affected request preview is removed and the existing error path reports the failure once
- **AND** no silent retry is dispatched and other newer pending settings are preserved

#### Scenario: Another card family completes an action
- **WHEN** a light, cover, lock, alarm, numeric, media or other non-climate control is used
- **THEN** its existing authoritative display, availability, cancellation and safety contract is preserved

### Requirement: Existing native action vocabulary
Shared cards SHALL support explicit `navigate`, `url`, `more-info`, `toggle`,
`call-service`, `perform-action` and `none` configurations. Native service data
and the actual entity target SHALL reach the availability guard; `none` SHALL
remain noninteractive. Configured alternate holds SHALL retain cancellation and
single-dispatch behavior without bypassing stricter access/security requirements.

#### Scenario: An icon-only action names a different service target
- **WHEN** the action is activated
- **THEN** the actual target's availability and semantic name govern the service, not only the card's display entity

### Requirement: Strong haptic feedback
Buttons and slider engagement SHALL emit HA's strong/heavy haptic event with the
existing supported vibration fallback. Strict access sliders SHALL emit feedback
at each newly crossed 10% boundary at most once per gesture and on valid completion.
Cancelled gestures SHALL NOT emit completion feedback.

#### Scenario: An access slide reverses across a previously crossed boundary
- **WHEN** the same 10% boundary is crossed again during that gesture
- **THEN** its boundary haptic is not duplicated

### Requirement: Strict slide for opening and unlocking access points
Open/unlock of locks, doors, garages and gates SHALL use only the strict slide
control, with a concise localized visible label and semantic action/target name.
It SHALL establish horizontal intent before pointer capture and dispatch once
on valid completion on release. No keyboard, tap, hold or alternate button path
SHALL execute the same risky access action.

#### Scenario: The strict slide completes deliberately
- **WHEN** horizontal travel reaches the completion boundary and release is valid
- **THEN** the explicit open/unlock action dispatches once with completion feedback

### Requirement: Strict slide cancellation
Strict access slides SHALL cancel without dispatch on taps, incomplete or reversed
travel, vertical intent, release outside the completion boundary, pointer loss or
cancellation, route change, page hiding, removal or disabling. Cancellation SHALL
reset visible progress and preserve authoritative state.

#### Scenario: The gesture is intended to scroll vertically
- **WHEN** vertical motion occurs before horizontal intent is established
- **THEN** the access slide cancels without capturing scrolling or dispatching an action

#### Scenario: A partial slide is interrupted
- **WHEN** the pointer is cancelled, released outside the completion boundary,
  reversed below it, or the route/page/component/availability changes
- **THEN** progress resets and no open/unlock action or completion haptic occurs

### Requirement: Explicit safe closing and locking
Close/lock SHALL remain an explicit localized tap action with immediate feedback,
not an ambiguous toggle, and SHALL dispatch at most once per activation.

#### Scenario: A user closes an available fixture door
- **WHEN** the explicit Close control is activated
- **THEN** exactly one close action is sent

### Requirement: Other risky security holds
Risky security actions other than access open/unlock SHALL require a 1.2-second
press-and-hold with continuous visible border progress and strong haptics at
start/completion. Progress SHALL be invisible at rest and after cancellation.
Early release, leaving the control, cancellation, pointer loss, route change,
removal or target unavailability SHALL reset without dispatch.

#### Scenario: An alarm disarm hold is released early
- **WHEN** the pointer is released before 1.2 seconds
- **THEN** progress disappears and no disarm action is sent

#### Scenario: A security hold finishes while its target remains usable
- **WHEN** the full duration elapses without cancellation
- **THEN** one explicit action is sent and completion feedback is shown

### Requirement: Whole-card problem presentation
Every Marao card SHALL give recognized availability problems and reported faults
or errors a whole-card problem surface, a visible localized reason and a
non-color cue. Unknown, unavailable, missing and disconnected SHALL use neutral
treatment; faults/errors SHALL use distinct alert treatment. Problem presentation
SHALL override normal active/custom colors and decorative artwork. Hidden normal
state text SHALL NOT hide the reason. No entity problem SHALL be invented for entityless content.

#### Scenario: A binary card becomes unavailable
- **WHEN** its entity becomes unknown, unavailable or missing
- **THEN** the entire surface changes to neutral problem treatment with the correct localized reason and cue
- **AND** its unsafe or entity-dependent actions are disabled even if normal state text or icons were configured hidden

#### Scenario: An established service connection disconnects
- **WHEN** Home Assistant reports a connection outage
- **THEN** dependent cards use neutral disconnected treatment and disable physical actions while retaining the native connection warning
- **AND** initializing content is not mislabeled as a device fault

#### Scenario: The actual control target has a problem
- **WHEN** a media remote or toggle target is unavailable while its displayed player or numeric entity remains usable
- **THEN** the card shows a whole-card partial problem and identifies the affected control
- **AND** that target's action is disabled while valid readings and unrelated actions remain usable

#### Scenario: A recognized domain fault is reported
- **WHEN** a vacuum reports error or a configured domain alert reports an abnormal condition
- **THEN** the entire surface uses alert treatment with a localized problem reason and cue
- **AND** safe supported recovery controls remain available when their actual targets are usable
- **AND** arbitrary sensor strings or an unconfigured alert entity do not create an invented fault

#### Scenario: Card-owned content fails to load
- **WHEN** a graph/history request, camera event list/detail or media resource reports a failure
- **THEN** the owning card's entire surface indicates the content problem and names the failed content
- **AND** usable entity controls/readings and explicit safe retry or back actions remain available
- **AND** empty history, no events and ordinary loading remain distinct normal states

#### Scenario: Normal artwork or customization competes with an error
- **WHEN** an active or artwork-backed card encounters an availability problem or reported error
- **THEN** its problem surface and readable reason take precedence across the whole card
- **AND** text, icons, controls and boundaries retain required contrast in both themes

### Requirement: Partial problems preserve usable content
Multi-entity cards SHALL indicate partial problems across the whole surface and
identify affected members or controls without removing valid readings, counts or
navigation. Actions SHALL keep actual-target availability checks. Partial
availability SHALL NOT be presented as total unavailability; a complete
availability problem SHALL use the appropriate neutral disabled treatment.

#### Scenario: One member of a room or glance card is unavailable
- **WHEN** another configured member remains usable
- **THEN** the card shows a whole-card partial warning and readable unavailable-member detail
- **AND** usable readings/counts/navigation remain present and safe
- **AND** All off remains disabled when any configured light is unavailable, preserving its existing complete-list guard

#### Scenario: All represented entities are unavailable
- **WHEN** no represented member is usable
- **THEN** the card changes from partial-warning treatment to neutral complete-availability treatment
- **AND** entity-dependent actions remain disabled

### Requirement: Reported action errors belong to their card
A reported service failure SHALL give the initiating card whole-card error
treatment and one readable localized reason while preserving the native error
notification and authoritative entity state. A successful later explicit retry
or a new card configuration SHALL clear that action error without claiming
physical success. Availability problems SHALL take presentation priority. No
silent retries or global optimistic state machine SHALL be added.

#### Scenario: A fixture rejects a card action
- **WHEN** a completed safe interaction receives a service error
- **THEN** the initiating card shows whole-card error treatment and the readable reported reason
- **AND** one request and one native notification occur, and another unrelated card is not marked failed

#### Scenario: A safe explicit retry succeeds
- **WHEN** the target remains usable and a later user retry receives a successful service response
- **THEN** the action-error presentation clears and the card renders the current authoritative state
- **AND** a service acknowledgement is not substituted for an entity state change

#### Scenario: An old request finishes after configuration changes
- **WHEN** a removed or reconfigured card receives a late error response
- **THEN** the obsolete response does not mark the new card content failed
- **AND** existing error reporting is preserved without duplicate notifications or redispatch
