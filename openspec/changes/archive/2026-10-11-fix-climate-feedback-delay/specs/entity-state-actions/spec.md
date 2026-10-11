# Spec Delta

## MODIFIED Requirements

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
