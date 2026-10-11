# Spec Delta

## MODIFIED Requirements

### Requirement: Accurate multi-entity summaries and room controls
Summaries SHALL deduplicate and inspect every configured member, include active secondary entities, represent partial availability, remain usable while a member is usable, and preserve numeric readings. Rooms with configured lights SHALL expose one compact icon-only All off child action for the complete light list, stop propagation, and disable that child on disconnect or any missing/unknown/unavailable configured light.

#### Scenario: An unavailable primary summary entity has an active secondary
- **WHEN** the overview summary renders
- **THEN** the active secondary affects the reading and the usable group stays reachable

#### Scenario: All off is pressed in a room
- **WHEN** every configured fixture light is available
- **THEN** one `light.turn_off` call targets the list without triggering room navigation

#### Scenario: Availability changes before activation
- **WHEN** a configured light becomes unavailable or HA disconnects before the icon button is activated
- **THEN** the current target/connection guards prevent dispatch and the action is disabled

#### Scenario: The lights-off icon is activated
- **WHEN** the configured list is available and the user completes activation
- **THEN** its localized accessible name identifies the action and room, strong haptics accompany the press, and exactly one call uses the deduplicated list
- **AND** no visible All off text or full-width action surface is required

## ADDED Requirements

### Requirement: Room-wide lighting presentation
Room lighting SHALL derive from every configured light, not an unrelated or first entity. In normal available states, any on light SHALL select the active background; all off or no lights SHALL use the inactive surface. A separate normal on/off/All off row SHALL be omitted, while localized accessible lighting state and explicit abnormal/availability information remain. Problem presentation SHALL take precedence over normal highlighting without claiming unknown lights are off.

#### Scenario: Only a secondary light is on
- **WHEN** the first configured light is off and another available light is on
- **THEN** the room has the active background without a redundant visible lighting-status row

#### Scenario: Every configured light is off
- **WHEN** all light states are known and off
- **THEN** the room uses its inactive background and the semantic lighting summary reflects all lights off

#### Scenario: A room has no lights
- **WHEN** the configured light list is empty or absent
- **THEN** there is no lights-off action or fabricated lighting state, and an unrelated primary entity does not imply lights are on

#### Scenario: Some light states are unavailable
- **WHEN** one configured light is unknown, missing or unavailable while another is on
- **THEN** readable partial-availability information and neutral problem presentation take precedence, the semantic summary retains the known active light, and All off is disabled

### Requirement: Room navigation independent of lighting actions
The room navigation surface SHALL remain separate from its lights-off button. Navigation SHALL remain usable for empty rooms, unavailable lights and disconnected HA when its destination is configured. Decorative icons SHALL NOT intercept input or expose a second action. Lights-off activation SHALL never navigate, and navigation SHALL never dispatch a lighting command.

#### Scenario: An unavailable room light does not prevent navigation
- **WHEN** the user activates the room's navigation surface
- **THEN** the configured room opens without a service call, while its lights-off action remains disabled

#### Scenario: A cropped room icon is tapped
- **WHEN** the user taps its decorative area on a navigable card
- **THEN** the underlying room navigation behaves like the rest of the card without a separate icon control

#### Scenario: The lights-off button is pressed
- **WHEN** it is activated as a child control
- **THEN** propagation is stopped and the destination route does not change
