# Spec Delta

## MODIFIED Requirements

### Requirement: Flush rounded fill and independent target
Confirmed fill SHALL start flush at the track's left edge, reach the right edge
at maximum and remain inside the rounded track. It SHALL represent HA's current
confirmed value, with bounded presentation interpolation for cover updates; the
thumb SHALL independently represent the requested target. Visible fill SHALL not
extend beyond the thumb. Geometry SHALL follow resizing and rotation.

#### Scenario: A cover is moving toward its requested destination
- **WHEN** HA reports intermediate positions during motion
- **THEN** confirmed fill reflects those positions while the target thumb can remain at the destination

#### Scenario: A position glide has an independent target
- **WHEN** the confirmed cover position changes from 20 to 30 with a requested target of 80
- **THEN** the visible current fill glides toward 30 while the thumb remains at 80
- **AND** interpolation never extends the fill beyond the thumb or outside the rounded track

### Requirement: Stable native range lifetime
The native range SHALL stay mounted for a complete drag across HA state updates.
Confirmed fill SHALL refresh in place. Compatible cover position updates SHALL
also preserve the mounted idle range and vector drawing. Unrelated updates SHALL
not replace idle controls; relevant state, graph, locale/theme or connection changes
SHALL refresh them. Native thumb shadow and radius SHALL be explicitly reset to
prevent an iOS square shadow.

#### Scenario: HA sends another update while the user drags
- **WHEN** the confirmed value changes mid-gesture
- **THEN** the same input retains the gesture and the current-value fill updates independently

#### Scenario: Position changes while the cover slider is idle
- **WHEN** successive cover position reports leave its entity, configuration and slider capabilities compatible
- **THEN** the same connected native range and vector elements remain mounted and retain their current animation
- **AND** state labels, button availability and other relevant card content still reflect current HA state

## ADDED Requirements

### Requirement: Smooth confirmed cover position updates
Ordinary cover sliders, including cover-backed ventilation controls, SHALL glide from the currently drawn position toward each new confirmed reading with an adaptive 200–500 ms duration. New readings SHALL retarget that glide continuously, without overshoot or queued obsolete positions. Interpolation SHALL be presentation-only, stay within valid bounds and stop at the latest reported endpoint; existing light and fan-speed state presentation SHALL remain unchanged.

#### Scenario: Consecutive readings arrive during a glide
- **WHEN** a cover reports 20, then 30, and then 40 before the glide toward 30 finishes
- **THEN** the visible position continues from its current drawn value toward 40 without snapping back to 20 or 30
- **AND** once reports stop changing, it reaches the latest endpoint within 500 ms and stops

#### Scenario: Reported movement reverses direction
- **WHEN** a newer confirmed reading reverses the previous movement while a glide is running
- **THEN** the display retargets smoothly from its current drawn value toward the newer reading
- **AND** old frames cannot continue the former direction or overwrite the newer endpoint

#### Scenario: Reports are sparse or unchanged
- **WHEN** a cover reports a position and no different position arrives for several seconds
- **THEN** the display completes its bounded glide and holds the reported endpoint
- **AND** unchanged state broadcasts do not restart the glide, predict further motion or trigger extra polling

#### Scenario: Equivalent hosts render a moving cover
- **WHEN** an ordinary cover appears as a standalone, native, popup/group or supported generated control, or through the cover-backed ventilation presentation
- **THEN** each uses the shared cover-position smoothing behavior with its own current target and lifecycle
- **AND** ordinary light brightness, fan speed and strict access slides retain their existing interaction/presentation behavior

### Requirement: Immediate targets during cover smoothing
Direct pointer and keyboard target changes SHALL remain immediate during cover smoothing. The requested destination SHALL stay independent of the visual current-position glide. Reported values, semantic state and dispatch calculations SHALL use actual HA/input data, never interpolated display values. Animation and rendering SHALL dispatch no service calls or haptics; completed interactions SHALL retain existing single-dispatch and cancellation rules.

#### Scenario: A user adjusts a moving cover
- **WHEN** the user starts dragging or presses a supported range key during a position glide
- **THEN** the target thumb immediately follows native input without animation lag
- **AND** later confirmed reports may update the fill without pulling the requested thumb away or interrupting the gesture

#### Scenario: Input is completed or cancelled
- **WHEN** the user completes a range adjustment while smoothing is active
- **THEN** exactly one existing cover-position action carries the user's bounded final input, without an interpolated percentage
- **WHEN** that interaction is cancelled or becomes unavailable before completion
- **THEN** no partial target is dispatched

#### Scenario: Only animation frames run
- **WHEN** the control interpolates between confirmed readings without user interaction
- **THEN** HA state, saved configuration, accessible reported values and requested targets are not replaced by intermediate display values
- **AND** no device call, haptic or additional state request occurs

### Requirement: Bounded cover animation lifecycle
Initial valid readings, restored visibility and recovery from invalid/unavailable state SHALL render current confirmed data directly. Reduced-motion preference SHALL disable interpolation. Target/configuration replacement, capability loss, invalid position, disconnection, hiding or removal SHALL cancel obsolete animation. Later recovery SHALL not replay old frames or continue motion for a previous entity.

#### Scenario: A card first receives position data
- **WHEN** a new cover slider first receives a valid position of 75
- **THEN** it displays that value directly without sweeping from zero or a previous entity's value

#### Scenario: Availability or lifecycle invalidates the animation
- **WHEN** an animating cover becomes missing, unknown, unavailable, disconnected, loses valid position/capability, changes entity/configuration, is hidden or is removed
- **THEN** old animation work stops and cannot write into the former control or mutate current target state
- **AND** normal neutral disabled/problem behavior takes precedence where applicable

#### Scenario: The control is shown or recovers
- **WHEN** a hidden or unavailable cover control becomes usable again
- **THEN** it starts from the latest confirmed value and subsequent changed readings can glide normally
- **AND** it does not replay intermediate reports received while hidden or unavailable

#### Scenario: Reduced motion is requested
- **WHEN** reduced motion is active or becomes active during a glide
- **THEN** the control settles directly on its latest confirmed presentation without positional interpolation
- **AND** direct native input, availability handling and service-dispatch semantics remain intact
