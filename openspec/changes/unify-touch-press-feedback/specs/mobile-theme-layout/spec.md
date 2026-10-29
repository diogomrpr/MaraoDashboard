# Spec Delta

## ADDED Requirements

### Requirement: Restrained shared press presentation
Marao dashboard tap targets SHALL share a brief, gesture-driven surface highlight and small inward movement of noninteractive icon or content, with a smooth release. The treatment SHALL remain within the target's shape, use Marao's theme, and avoid bounce, spreading ripples, ornamental loops or success-state colors. Text and state cues SHALL remain readable.

#### Scenario: A normal dashboard card is pressed
- **WHEN** a user presses an enabled whole-card action
- **THEN** its rounded surface receives a subtle highlight and its noninteractive icon or content moves inward slightly
- **AND** release smoothly restores its resting presentation without delaying navigation or services
- **AND** independently interactive children and adjacent cards do not move

#### Scenario: A circular navigation button is pressed
- **WHEN** a user presses a navbar or overflow icon button
- **THEN** feedback remains within its circular surface and shares the same timing language as card actions
- **AND** no rectangular browser highlight appears and the current-route indication remains distinct

#### Scenario: Theme or background differs
- **WHEN** feedback appears on a light, dark, state-colored or artwork-backed control
- **THEN** the highlight remains perceptible while labels, icons, availability and errors retain their required contrast
- **AND** the press does not replace authoritative state colors with an apparent success state

### Requirement: Press feedback preserves visible touch geometry
Press animation SHALL keep the visible interactive surface and hit area fixed at their resting size and position, at least 48 by 48 CSS pixels. Only noninteractive visual content SHALL move; card footprint, text layout, slider geometry, popup positioning and control placement SHALL remain stable.

#### Scenario: A minimum-size action is pressed
- **WHEN** an action with a 48px surface receives press feedback
- **THEN** its visible surface and hit area remain at least 48px throughout the interaction
- **AND** moving the icon does not shrink the button or move its activation boundary

#### Scenario: Content wraps or the control is spatially positioned
- **WHEN** a card has enlarged or wrapped text, or a floor-plan control is anchored to a location
- **THEN** pressing it does not reflow text, alter section height or displace the control from its location
- **AND** independent controls retain their dimensions and positions

### Requirement: Reduced Motion retains stationary press feedback
When the device or browser requests Reduced Motion, Marao tap targets SHALL acknowledge press and release with a stationary surface highlight and no press-related scale or translation, including instantaneous transforms. Changes to the preference SHALL apply without reloading or changing saved configuration.

#### Scenario: Reduced Motion is enabled before interaction
- **WHEN** an enabled dashboard action is pressed with Reduced Motion active
- **THEN** its highlight acknowledges the press without moving or scaling the surface, icon or text
- **AND** existing haptics, actions, availability guards and specialized gesture progress remain intact

#### Scenario: The motion preference changes while the dashboard is open
- **WHEN** Reduced Motion becomes enabled during a press or release effect
- **THEN** press-related movement is removed and subsequent feedback uses the stationary treatment
- **AND** no action is dispatched or cancelled solely because the motion preference changed
