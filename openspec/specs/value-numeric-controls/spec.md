# Value and numeric controls

## Purpose

Keep shared sliders smooth, aligned and genuinely draggable while separating
confirmed state from the user's target and using consistent numeric steppers.

## Requirements

### Requirement: Shared vector slider geometry
Light, fan and cover value sliders SHALL draw track, confirmed fill and target
thumb together as vector shapes with aligned thin 1px strokes beneath a semantic
native range. Track/thumb SHALL be visibly at least 48px tall, centered and
contained. Distinct surfaces and outlines SHALL retain 3:1 adjacent boundary
contrast. Curves SHALL be inspected at native 2x/3x device density.

#### Scenario: The slider is viewed on a high-density phone
- **WHEN** a native-density screenshot is inspected
- **THEN** aligned vector rounded ends avoid stacked, mismatched or visibly jagged CSS/native borders

### Requirement: Flush rounded fill and independent target
Confirmed fill SHALL start flush at the track's left edge, reach the right edge
at maximum and remain inside the rounded track. It SHALL represent HA's current
value; the thumb SHALL independently represent the requested target. Visible
fill SHALL not extend beyond the thumb. Geometry SHALL follow resizing and rotation.

#### Scenario: A cover is moving toward its requested destination
- **WHEN** HA reports intermediate positions during motion
- **THEN** confirmed fill reflects those positions while the target thumb can remain at the destination

### Requirement: Stable native range lifetime
The native range SHALL stay mounted for a complete drag across HA state updates.
Confirmed fill SHALL refresh in place. Unrelated updates SHALL not replace idle
controls; relevant state, graph, locale/theme or connection changes SHALL refresh
them. Native thumb shadow and radius SHALL be explicitly reset to prevent an iOS square shadow.

#### Scenario: HA sends another update while the user drags
- **WHEN** the confirmed value changes mid-gesture
- **THEN** the same input retains the gesture and the current-value fill updates independently

### Requirement: Completed value drag and cancellation
Mouse/touch dragging SHALL acknowledge movement immediately, retain native touch
defaults in popups, and send one final target on completed interaction, including
release beyond the value track. Cancellation or an unavailable/disconnected
target SHALL send no partial value. This ordinary value interaction SHALL remain
distinct from strict access-slide completion rules.

#### Scenario: The pointer ends beyond an ordinary value track
- **WHEN** the mounted range completes its drag with a bounded target
- **THEN** one final clamped value is dispatched

#### Scenario: Connection is lost before the drag completes
- **WHEN** the target becomes disconnected or unavailable
- **THEN** the drag cancels without dispatching the partial target

### Requirement: Capability-aware sliders
Light/fan sliders SHALL respect their explicit disable option and native
capabilities. On/off-only lights and single-speed fans SHALL omit unsupported
value controls; fan percentage sliders SHALL default enabled where supported.

#### Scenario: A native on/off-only light is generated
- **WHEN** the card receives its supported capabilities
- **THEN** it shows its toggle behavior without a nonfunctional brightness slider

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

### Requirement: Light color preview and final dispatch
Light color and white-temperature controls SHALL preview selection while dragging and send exactly one native update when the interaction completes. Opening, cancelling or abandoning an adjustment SHALL send nothing. A completed adjustment on an off light SHALL turn it on. Reported state SHALL resume supplying displayed values after interaction.

#### Scenario: Color is dragged through several values
- **WHEN** the user drags across the color wheel and releases
- **THEN** local feedback follows the pointer immediately and exactly one light update carries the final color
- **AND** intermediate values are not sent to Home Assistant

#### Scenario: An off light receives a completed selection
- **WHEN** the user completes a color or white-temperature adjustment while the light is off
- **THEN** one native turn-on update applies the selected value

#### Scenario: A selection is cancelled
- **WHEN** a pointer is cancelled, the sheet closes or the target becomes unavailable before release
- **THEN** the local preview is discarded without sending a partial or final value

### Requirement: Supported light temperature and shared brightness controls
The white-temperature slider SHALL use the light's reported Kelvin limits and send bounded Kelvin values. Picker brightness SHALL reuse the shared brightness interaction and presentation, including stable drag lifetime, current-value fill, target thumb, cancellation and one-call dispatch.

#### Scenario: A light supplies a restricted white range
- **WHEN** its reported temperature limits differ from another light's
- **THEN** the warm-to-cool range and final request remain within that light's limits

#### Scenario: Home Assistant updates during brightness adjustment
- **WHEN** the popup's shared brightness slider is being dragged
- **THEN** the mounted range retains the gesture while authoritative fill updates independently
- **AND** completion dispatches one final brightness request
