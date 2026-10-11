# Spec Delta

## ADDED Requirements

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
