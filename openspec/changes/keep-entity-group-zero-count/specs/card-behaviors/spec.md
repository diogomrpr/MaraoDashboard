## MODIFIED Requirements

### Requirement: Entity group summaries
Entity Groups SHALL summarize all deduplicated configured members independently
of popup filtering, using authoritative HA state. Lights, covers and thermostats
SHALL show a localized active count whenever at least one member is usable,
including a count of zero. Batteries SHALL retain
a numeric percentage and indicate low-battery counts. Partial member availability SHALL remain inspectable in the member sheet without an unavailable-count row on the aggregate tile.

#### Scenario: An unavailable primary member has an active secondary
- **WHEN** a light, cover or thermostat group renders
- **THEN** the secondary contributes to the usable count, member availability remains readable in the popup and the popup remains reachable

#### Scenario: No usable member is active
- **WHEN** a light, cover or thermostat group has a usable member and no active members
- **THEN** the summary uses its usual localized counter with a count of zero and remains usable

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

#### Scenario: Additional entity group summaries contracts
- **WHEN** a configured group renders its current member states
- **THEN** Groups
SHALL remain usable with any usable member; fully unknown/unavailable groups
SHALL be disabled neutral, with readable status rather than color alone.
