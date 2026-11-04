# Spec Delta

## MODIFIED Requirements

### Requirement: Room-wide lighting presentation
Room lighting SHALL derive from every configured light, not an unrelated or first entity. In normal available states, any on light SHALL contribute the active lighting color; all off or no lights SHALL contribute no lighting color. Without active configured climate, this preserves the existing active/inactive room surface. Normal lighting SHALL omit a status/count row, retain localized accessible state, and yield to visible neutral availability/problem treatment without claiming unknown lights are off.

#### Scenario: Only a secondary light is on
- **WHEN** the first configured light is off and another available light is on
- **THEN** the room includes the active lighting color without a redundant visible lighting-status row
- **AND** without an active climate contribution the room retains its flat active lighting background

#### Scenario: Every configured light is off
- **WHEN** all light states are known and off
- **THEN** lighting contributes no tint and the semantic lighting summary reflects all lights off
- **AND** the room uses its inactive background unless configured climate contributes its own color

#### Scenario: A room has no lights
- **WHEN** the configured light list is empty or absent
- **THEN** there is no lights-off action or fabricated lighting state, and an unrelated primary entity does not imply lights are on
- **AND** explicitly configured climate can still supply its independent state, action and background color

#### Scenario: Some light states are unavailable
- **WHEN** one configured light is unknown, missing or unavailable while another is on
- **THEN** readable partial-availability information and neutral problem presentation take precedence, the semantic summary retains the known active light, and All off is disabled
- **AND** a usable climate child action remains independently guarded against its own configured target

### Requirement: Room navigation independent of lighting actions
The room navigation surface SHALL remain separate from its lights-off and climate-off buttons. Navigation SHALL remain usable for empty rooms, unavailable entities and disconnected HA when its destination is configured. Decorative icons SHALL NOT intercept input or expose a second action. Child-off activation SHALL never navigate, and room navigation SHALL never dispatch a lighting or climate command.

#### Scenario: An unavailable room light does not prevent navigation
- **WHEN** the user activates the room's navigation surface
- **THEN** the configured room opens without a service call, while its lights-off action remains disabled

#### Scenario: A cropped room icon is tapped
- **WHEN** the user taps its decorative area on a navigable card
- **THEN** the underlying room navigation behaves like the rest of the card without a separate icon control

#### Scenario: The lights-off button is pressed
- **WHEN** it is activated as a child control
- **THEN** propagation is stopped and the destination route does not change

#### Scenario: The climate-off button is pressed
- **WHEN** it is activated as a child control
- **THEN** propagation is stopped, the destination route does not change and no lighting command occurs

## ADDED Requirements

### Requirement: Optional explicit room climate association
Room cards SHALL accept one optional explicit `variables.climate_entity` and expose it through the native editor. A nonempty value SHALL identify a climate entity. Omission or clearing SHALL remove the climate contribution and control without discovery. Supported configuration paths SHALL preserve the selection, existing lighting membership, unknown fields and unrelated native content.

#### Scenario: Configure or clear a room climate entity
- **WHEN** an administrator selects or clears the optional room climate entity and saves
- **THEN** the same explicit choice survives editor/configuration/generation round trips
- **AND** existing lights, page, name, icon and opaque variables are retained without selecting another entity automatically

#### Scenario: A configured reference is temporarily unavailable
- **WHEN** the selected climate entity is missing or unavailable in current HA state
- **THEN** its authored reference is retained for repair and its runtime control is disabled with neutral availability feedback
- **AND** opening or saving an unrelated edit does not silently clear or replace it

#### Scenario: An invalid climate reference is authored
- **WHEN** a nonempty room climate value has an invalid type or identifies a non-climate domain
- **THEN** configuration validation reports a localized error without dispatching or silently retargeting an action

### Requirement: Reported room climate state
The climate child button SHALL indicate the configured entity's HA-reported activity with a matching icon and localized state name. Missing activity SHALL fall back to the reported HVAC mode without claiming actual activity. Enabled-but-idle equipment SHALL retain its mode tint with a distinct idle indication. A reported off mode SHALL contribute no climate color regardless of stale activity attributes.

#### Scenario: The equipment heats or cools
- **WHEN** the available selected climate entity reports heating or cooling
- **THEN** its child icon indicates that activity and its room contribution uses the corresponding existing climate hue
- **AND** supported drying, fan, preheating and defrosting reports retain appropriate activity labels and icons

#### Scenario: Enabled equipment is idle
- **WHEN** the selected entity reports a non-off mode with idle activity
- **THEN** the button identifies idle rather than claiming heating/cooling, while the room retains the selected-mode climate tint
- **AND** the direct off action remains available when supported

#### Scenario: Activity is not reported
- **WHEN** an available selected entity exposes a non-off mode without usable activity metadata
- **THEN** its mode icon/name and mode color are used without inventing actual equipment activity

#### Scenario: The climate entity reports off
- **WHEN** its authoritative mode is off
- **THEN** the button remains present with an off indication, cannot issue another off request, and contributes no climate tint
- **AND** an older heating/cooling activity attribute cannot keep the room climate color active

### Requirement: Direct room climate off action
An enabled room climate button SHALL send exactly one supported native off command to its configured climate entity, with immediate press acknowledgement and strong haptics. It SHALL NOT open a popup, toggle, turn on, change setpoints or affect other entities. Availability, connection, off capability and current target SHALL be rechecked at activation; reported errors SHALL remain readable.

#### Scenario: An active unit is switched off
- **WHEN** the user taps the available enabled climate button
- **THEN** exactly one native off command targets only the explicitly selected climate entity
- **AND** no popup, room navigation, lights action or on request occurs

#### Scenario: Off is unsupported or the entity is unusable
- **WHEN** the selected entity lacks a supported off operation, is already off, is missing/unknown/unavailable, or HA is disconnected
- **THEN** the child button is visibly and semantically disabled and dispatches nothing
- **AND** unavailable climate data is not rendered as a confirmed off state

#### Scenario: State or configuration changes before activation
- **WHEN** the selected target changes, becomes unavailable, loses off support or HA disconnects before activation completes
- **THEN** the current guards prevent stale dispatch to the preceding target
- **AND** an independently usable light action and configured room navigation retain their own behavior

#### Scenario: HA rejects or delays the off request
- **WHEN** the off command fails or the resulting state report is delayed
- **THEN** existing action feedback exposes any reported error and the room keeps rendering authoritative climate activity/mode
- **AND** acknowledgement alone does not fabricate an off report or prematurely remove the climate contribution

### Requirement: Combined room-state background
Healthy room backgrounds SHALL combine explicit lighting and climate state along a bottom-left to top-right diagonal. Off or unconfigured sources SHALL contribute no color: neither active uses the neutral room surface; one active fills the surface with its color; both active blend their lighting and climate hues. Foregrounds SHALL remain readable, and availability/error presentation SHALL take precedence over normal blending.

#### Scenario: Lighting and climate are both active
- **WHEN** at least one selected light is on and selected climate reports an enabled mode
- **THEN** the background blends the lighting hue at bottom-left into the current climate hue at top-right
- **AND** climate icons distinguish activity without adding a normal lighting count/status row

#### Scenario: Only lighting is active
- **WHEN** selected lighting is on while climate is off or unconfigured
- **THEN** the whole room card uses the existing active lighting color without a neutral or lingering climate corner

#### Scenario: Only climate is active
- **WHEN** selected climate is enabled while lighting is all off or unconfigured
- **THEN** the whole room card uses the climate color without a neutral or lingering lighting corner

#### Scenario: Both sources are inactive
- **WHEN** every selected light is off or absent and climate is off or absent
- **THEN** the whole room card uses its existing neutral inactive surface without a fabricated active contribution

#### Scenario: A configured source becomes unknown or unavailable
- **WHEN** any configured light or the climate entity becomes missing/unknown/unavailable, or HA disconnects
- **THEN** concise neutral problem presentation supersedes normal room-state coloring and identifies the availability problem
- **AND** each child action checks its own target while room navigation remains independent
