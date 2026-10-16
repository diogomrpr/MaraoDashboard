# Spec Delta

## ADDED Requirements

### Requirement: Worst-level battery group colors
Battery-group summary tiles SHALL derive their normal background from the lowest valid percentage across all deduplicated configured members. They SHALL use the existing battery palette: red below 20, yellow from 20 to below 80, and green from 80 through 100. Aggregation SHALL be independent of member order, popup filtering, group name and the displayed first-usable percentage. Existing problem priorities apply with the critical-battery partial-availability composition.

#### Scenario: A secondary battery is critical
- **WHEN** a battery group contains a first usable reading of 75% and another reading of 10%
- **THEN** its summary tile uses the same threshold-red background as an ordinary 10% battery card
- **AND** its existing 75% summary reading and one-low-battery indication remain unchanged

#### Scenario: The worst level crosses a threshold
- **WHEN** authoritative member updates move the minimum valid reading through 0, just below 20, 20, just below 80, 80 and 100
- **THEN** the tile updates red, red, yellow, yellow, green and green respectively
- **AND** an equally low secondary member keeps the lower-severity transition from occurring prematurely

#### Scenario: Order or popup filtering changes
- **WHEN** the same battery members are reordered or the popup changes between All entities and Active only
- **THEN** the tile's severity color remains based on every configured member
- **AND** an inactive yellow or green member is not treated as absent from aggregation

#### Scenario: Separate battery groups are displayed
- **WHEN** Maintenance and another named battery group have different selections, or the same group appears in another host
- **THEN** each tile uses its own members' worst valid level through the shared behavior
- **AND** opening a tile still opens its configured popup without actuating any member

### Requirement: Battery severity preserves valid data semantics
Worst-level coloring SHALL use the existing valid numeric percentage range of 0 through 100. Missing, unknown, unavailable, empty, nonnumeric and out-of-range states SHALL NOT become zero or contribute a fabricated severity. Color calculation SHALL preserve existing numeric summary readings, deduplicated counts, member options, selection, generated references and live popup behavior.

#### Scenario: A valid zero and an invalid reading coexist
- **WHEN** one member reports 0 and another reports an invalid battery state
- **THEN** zero contributes a real critical level and the invalid member contributes to availability reporting only
- **AND** neither reading is discarded or converted into the other

#### Scenario: No valid reading exists
- **WHEN** every configured member is missing, unknown, unavailable or invalid
- **THEN** the existing neutral disabled status is shown without a fabricated battery percentage or red threshold color
- **AND** a deliberately empty group retains its existing localized empty presentation

#### Scenario: A configured member is removed
- **WHEN** a critical battery is explicitly removed from a group's saved selection
- **THEN** subsequent summary color reflects the remaining configured members
- **AND** rendering, popup filtering and later registry changes do not add the removed member again
