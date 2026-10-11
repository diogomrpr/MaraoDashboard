# Spec Delta

## ADDED Requirements

### Requirement: Entity group summaries
Entity Groups SHALL summarize all deduplicated configured members independently
of popup filtering, using authoritative HA state. Lights, covers and thermostats
SHALL retain active counts and localized inactive labels. Batteries SHALL retain
a numeric percentage and indicate low-battery and unavailable counts. Groups
SHALL remain usable with any usable member; fully unknown/unavailable groups
SHALL be disabled neutral, with readable status rather than color alone.

#### Scenario: An unavailable primary member has an active secondary
- **WHEN** a light, cover or thermostat group renders
- **THEN** the secondary contributes to the count, partial availability is readable and the popup remains reachable

#### Scenario: Numeric battery readings and secondary warnings coexist
- **WHEN** the first configured usable battery reads 75% and a secondary reads 10%
- **THEN** the summary retains the 75% reading and indicates one low battery
- **AND** reversing popup filtering does not change the summary or hide the secondary warning

#### Scenario: Every member is unknown, unavailable or missing
- **WHEN** the group renders with loaded HA state
- **THEN** the group is neutral and disabled with localized unknown/unavailable status and member actions cannot dispatch

#### Scenario: State has not loaded or connection is lost
- **WHEN** HA state is loading or the connection is disconnected
- **THEN** loading is distinguished from inactive state, physical actions are disabled and the native connection warning remains authoritative

### Requirement: Entity group live popup filtering
All entities mode SHALL list every deduplicated member in configured order,
including disabled unknown/unavailable entries. Active only SHALL list only
known active members using type-specific state rules. Filtering SHALL update
from HA state while the sheet is open, preserve unchanged child controls and
handle focus safely when a member disappears. Empty results SHALL show a
localized explanation without altering saved membership.

#### Scenario: A lighting group lists active members
- **WHEN** lights are on, off and unavailable and the filter is Active only
- **THEN** only on lights appear and the summary still reports the unavailable count
- **AND** switching to All entities reveals off lights and disabled unavailable entries

#### Scenario: Covers and thermostats use domain-aware activity
- **WHEN** Active only is configured
- **THEN** open/opening covers appear while closed/closing covers do not, matching the established summary treatment
- **AND** thermostats with an enabled HVAC mode appear even if their HVAC action is idle, while off/unknown/unavailable thermostats do not

#### Scenario: Battery groups filter maintenance attention
- **WHEN** Active only is configured for battery sensors
- **THEN** valid numeric percentages below 20 appear while readings of 20 or higher do not
- **AND** missing, unknown, unavailable and invalid readings are excluded from active rows and identified through summary availability status

#### Scenario: The last active member becomes inactive
- **WHEN** its authoritative HA state changes while the popup is open
- **THEN** the member disappears and the sheet shows a localized No active entities result with its title and close control intact
- **AND** focus stays inside the sheet, unrelated controls retain their state, and no action is dispatched by filtering

#### Scenario: A member's state updates during a slider gesture
- **WHEN** the member remains eligible for the open popup
- **THEN** its native control remains mounted through the gesture and completed input dispatches once
- **AND** becoming ineligible or unavailable cancels the gesture safely without a late action

#### Scenario: A deliberately empty group opens
- **WHEN** a group with an explicit empty member list is activated
- **THEN** the existing popup shows a localized No entities configured result and no discovered or fabricated member appears

### Requirement: Entity group member control parity
Entity Group popups SHALL reuse Marao's shared sheet and compatible member
controls, preserving configured names, icons, options and relevant room context.
Lights SHALL retain supported brightness controls, blinds position controls,
batteries numeric thresholds, and thermostats unitless targets and mode options.
Access covers SHALL retain strict opening and safe closing semantics. Group
activation SHALL open its popup without toggling or actuating members.

#### Scenario: Configured controls are shown in a group
- **WHEN** members include a dimmable light, an on/off-only light, an ordinary blind, battery sensors or single/dual-target thermostats in separate typed groups
- **THEN** each group shows the existing applicable capabilities and configured options rather than simplified replacement controls

#### Scenario: A cover group includes an access cover
- **WHEN** a garage door, gate or door is shown
- **THEN** opening uses the existing strict slide control and cancellation rules, closing uses the safe explicit action, and open-only capability omits unsupported closing
- **AND** an ordinary position slider cannot bypass access safeguards

#### Scenario: A thermostat group opens alongside a mode sheet
- **WHEN** the group popup is activated
- **THEN** its configured title remains visible and existing mode-selection behavior remains available without popup-hash collisions

#### Scenario: The group sheet closes after state updates
- **WHEN** the sheet is closed
- **THEN** it restores focus to the current opener, releases background inertness and retains the established internal scrolling, navbar clearance and safe-area behavior
