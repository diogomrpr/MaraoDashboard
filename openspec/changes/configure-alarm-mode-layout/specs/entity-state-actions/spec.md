# Spec Delta

## MODIFIED Requirements

### Requirement: Other risky security holds
Risky security actions other than access open/unlock SHALL require a 1.2-second press-and-hold with continuous visible border progress and strong haptics at start/completion, except configured alarm dropdown selections and grid disarm slides. Progress SHALL be invisible at rest and after cancellation. Early release, leaving the control, cancellation, pointer loss, route change, removal or target unavailability SHALL reset without dispatch.

#### Scenario: An alarm disarm hold is released early
- **WHEN** a legacy alarm row's disarm hold is released before 1.2 seconds
- **THEN** progress disappears and no disarm action is sent

#### Scenario: A security hold finishes while its target remains usable
- **WHEN** the full duration elapses without cancellation
- **THEN** one explicit action is sent and completion feedback is shown

#### Scenario: An alarm explicitly uses dropdown layout
- **WHEN** the user commits a supported action from that dropdown
- **THEN** no hold is required, including for Disarm and custom bypass
- **AND** capability, code, availability, busy and current-state guards still apply

## ADDED Requirements

### Requirement: Strict grid alarm disarm gesture
Grid alarm Disarm SHALL require horizontal intent before capture and valid completion on release from the full round handle. Taps, incomplete/reversed travel, vertical intent, outside release, pointer loss, cancellation, route/page changes, removal and loss of availability SHALL cancel without dispatch. The gesture SHALL provide the shared slide haptics and dispatch at most once to that alarm after validating any required code.

#### Scenario: Valid disarm slide completes
- **WHEN** an armed usable alarm receives a complete deliberate slide and valid release with any required code
- **THEN** exactly one alarm_disarm request targets that alarm and completion feedback occurs
- **AND** the displayed state continues following Home Assistant's report

#### Scenario: User scrolls or interrupts a slide
- **WHEN** vertical motion precedes horizontal intent, travel is incomplete, the pointer is cancelled or the popup closes
- **THEN** the slide resets without a service request or completion feedback

#### Scenario: Target changes before release
- **WHEN** the alarm becomes disarmed, missing, unknown, unavailable or disconnected before slide completion
- **THEN** no disarm request is sent and the gesture resets

#### Scenario: Code validation fails
- **WHEN** a completed slide lacks the required valid numeric or text code
- **THEN** no service request is sent and the existing concise validation error is shown
- **AND** transient input clears without exposing it in saved data, logs or notifications

### Requirement: Alarm layout actions preserve dispatch isolation
Configured alarm layout controls SHALL dispatch only from explicit committed selection or completed gesture, never from mounting, rendering, browsing or authoritative updates. They SHALL preserve exactly-once dispatch, transient-code cleanup, readable sanitized service errors and inert previews. Alarm slide confirmation SHALL NOT authorize generic access services or weaken door/lock slide guards.

#### Scenario: Dropdown opens or closes without selection
- **WHEN** the user opens the menu, navigates its options or dismisses it
- **THEN** no alarm request is sent

#### Scenario: Service rejects an action
- **WHEN** a completed dropdown selection or slide is rejected
- **THEN** a readable sanitized error appears, the code clears and no silent retry or false state confirmation occurs

#### Scenario: Configuration is previewed
- **WHEN** either layout is used inside an editor preview
- **THEN** no alarm or access service can dispatch
