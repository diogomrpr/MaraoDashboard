# Spec Delta

## MODIFIED Requirements

### Requirement: Shared numeric up/down input
Numeric entities, climate targets and Wallbox current SHALL use the shared up/down
control with supported min/max/step and current target. Arrows/value SHALL remain
large, readable and useful within the card. Climate targets SHALL remain unitless.
Configured current shortcuts SHALL dispatch one bounded explicit value. While a
climate target is pending, its next step SHALL use the latest requested target
rather than the older reported target; other numeric controls retain their
existing behavior.

#### Scenario: A numeric control reaches its maximum
- **WHEN** Increase would exceed the supported bound
- **THEN** it cannot dispatch an out-of-range target

#### Scenario: A dual-setpoint climate card is displayed
- **WHEN** a heat/cool entity exposes low/high targets and a step is requested
- **THEN** both targets move together, preserving their gap and stopping at the supported lower/upper bounds

#### Scenario: Three rapid increases precede any state report
- **WHEN** the reported target is 21 with a 0.5 step and three accepted increases occur without confirmation
- **THEN** the visible requested target progresses through 21.5, 22 and 22.5
- **AND** exactly one native temperature request per accepted tap carries the corresponding target

#### Scenario: A dual-target request is followed by another step
- **WHEN** a pending 18.5–24.5 range receives another increase with a 0.5 step
- **THEN** the requested range becomes 19–25, subject to supported bounds
- **AND** its gap, unitless presentation and supported target field names are preserved

#### Scenario: A delayed request is followed by a decrease
- **WHEN** a pending requested target receives a valid decrease
- **THEN** the decrease uses that requested target and appears immediately without losing the tap or focus
