# Spec Delta

## ADDED Requirements

### Requirement: Fan and exhaust-valve presentation
`hc_fan_card` SHALL accept fan entities and non-access cover entities without replacing their HA identity. Fan entities SHALL retain on/off and supported speed control. Cover-backed exhaust valves SHALL offer explicit Open/Close actions only when supported, dispatching `cover.open_cover` or `cover.close_cover` exactly once. Cover opening SHALL NOT be labeled as fan speed.

#### Scenario: A shutter is explicitly used as an exhaust valve
- **WHEN** an available non-access shutter uses `hc_fan_card` and supports opening and closing
- **THEN** the card shows ventilation presentation and supported localized Open/Close actions targeting the original cover entity
- **AND** pressing either action sends its corresponding cover command once without a second card-level toggle or fan command

#### Scenario: A damper exposes opening without closing
- **WHEN** the cover advertises OPEN but not CLOSE or SET_POSITION
- **THEN** the exhaust card offers Open without Close or an opening slider

#### Scenario: An existing fan card is loaded
- **WHEN** a saved `hc_fan_card` targets a fan entity
- **THEN** its configured name, icon, labels, active color and slider option are preserved with native fan on/off and optional speed behavior

### Requirement: Truthful ventilation state and availability
Ventilation cards SHALL use the entity's reported state and values. Cover-backed cards SHALL distinguish closed, open, opening and closing, preserving meaningful reported opening percentages. Unknown, unavailable, missing or disconnected targets SHALL disable all actions with neutral availability treatment and a localized reason. Reported service errors SHALL remain readable; user input SHALL NOT fabricate confirmed state.

#### Scenario: A valve is moving toward a target
- **WHEN** HA reports opening at 35% after the user requests 70%
- **THEN** the card retains the reported motion and 35% confirmed position separately from the requested target

#### Scenario: Availability changes during an interaction
- **WHEN** the target becomes unknown, unavailable, missing or disconnected before activation or slider completion
- **THEN** no action dispatches and the card presents the disabled neutral reason

#### Scenario: Home Assistant rejects a cover command
- **WHEN** a requested Open/Close or position command returns an error
- **THEN** the existing readable localized error treatment appears without claiming the valve reached the requested state

### Requirement: Ventilation presentation cannot bypass access safety
Selecting fan/exhaust presentation SHALL NOT convert a recognized door, garage or gate into an ordinary tap-to-open or percentage control. Builder and generation SHALL reject incompatible ventilation selection with a readable message; directly configured runtime cards SHALL block unsafe opening controls. Existing strict access-slide behavior SHALL remain available through access presentation.

#### Scenario: An access cover is selected as a fan
- **WHEN** an administrator selects `hc_fan_card` for a recognized door, garage or gate
- **THEN** the configuration is rejected with an explanation directing them to the access card

#### Scenario: Raw configuration bypasses the builder
- **WHEN** a directly configured fan card targets a recognized access cover
- **THEN** it cannot dispatch tap opening, cover toggle or ordinary position-slider actions
- **AND** the incompatible selection is explained rather than silently exposing unsafe controls

#### Scenario: Existing access behavior is exercised
- **WHEN** a safe door/gate fixture completes or cancels its strict access slide
- **THEN** it retains its existing exactly-once completion and no-action cancellation semantics
