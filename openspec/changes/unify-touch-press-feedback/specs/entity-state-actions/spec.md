# Spec Delta

## ADDED Requirements

### Requirement: Immediate shared tap acknowledgement
Enabled Marao dashboard tap targets SHALL show visual press feedback on touch down and release feedback on valid activation, including quick taps. Existing actions SHALL execute without waiting for animation completion. Feedback SHALL supplement existing haptics and SHALL NOT imply a confirmed device outcome.

#### Scenario: A quick tap activates a card
- **WHEN** a user touches and promptly releases an enabled actionable card
- **THEN** its press acknowledgement remains perceptible even when release precedes the press animation's completion
- **AND** its existing action executes once without waiting for the visual release
- **AND** authoritative entity state and reported errors retain their existing meaning

#### Scenario: Equivalent actions use different dashboard hosts
- **WHEN** an enabled card, nested action, popup button, dropdown option, navbar entry, event-card button or floor-plan button is tapped
- **THEN** it uses the same shared press-and-release behavior appropriate to its surface
- **AND** generated, native-host and popup instances retain equivalent feedback

#### Scenario: A semantic button activates through a keyboard
- **WHEN** an ordinary tap action is activated through its supported keyboard interaction
- **THEN** it receives equivalent visible acknowledgement and dispatches once
- **AND** the feedback does not introduce keyboard activation for strict access slides

### Requirement: Press feedback belongs to the intended target
A nested interactive control SHALL own its press acknowledgement without activating or animating an ancestor card. Disabled controls and noninteractive card areas SHALL NOT display enabled-action press feedback. Usable actions within partially unavailable cards SHALL retain their own feedback.

#### Scenario: A room lights-off button is pressed
- **WHEN** a user presses the lights-off action inside a navigable room card
- **THEN** only the lights-off button receives the press treatment
- **AND** the card does not animate as if navigation were requested or dispatch its navigation action

#### Scenario: A control is unavailable
- **WHEN** a target is disabled, unknown, unavailable or disconnected
- **THEN** pressing its disabled action produces neither enabled-action feedback nor a service call
- **AND** a separately usable navigation or recovery action remains independently usable

### Requirement: Press feedback clears on cancellation and interruption
Ordinary press feedback SHALL clear when the gesture becomes scrolling, leaves the control or is cancelled, or when its target disables or its view is hidden, removed, navigated away from or reconfigured. Cancellation SHALL NOT produce a completion effect or action. Pending visual cleanup SHALL NOT affect a newer press or replacement target.

#### Scenario: A touch becomes a vertical scroll
- **WHEN** a user touches an actionable card and scrolls the page instead of completing a tap
- **THEN** the pressed treatment clears without obstructing native scrolling
- **AND** no card action or completion feedback occurs

#### Scenario: A view changes during a press
- **WHEN** a pressed control is disabled, removed, hidden by page lifecycle, reconfigured or left through navigation
- **THEN** its press feedback and pending release work are cleared
- **AND** no deferred action runs and no replacement control inherits a pressed appearance

#### Scenario: The user taps again during the release effect
- **WHEN** another valid press starts before the previous visual release finishes
- **THEN** feedback responds immediately to the new press
- **AND** old cleanup does not erase that feedback or create extra actions or haptics

### Requirement: Tap acknowledgement preserves specialized gesture ownership
Shared tap feedback SHALL preserve strict access-slide and security-hold activation, cancellation, progress and haptic rules. Continuous controls SHALL retain their existing direct manipulation. Touch acknowledgement SHALL NOT create a new tap path or add completion feedback before a specialized gesture succeeds.

#### Scenario: An access slide or security hold is interrupted
- **WHEN** an access slide is incomplete or a security hold ends before its required duration
- **THEN** the existing gesture cancels without dispatch or completion acknowledgement
- **AND** generic tap feedback does not run an alternative action

#### Scenario: A slider is dragged inside an actionable card
- **WHEN** the user adjusts a value slider or color control
- **THEN** its existing manipulation and haptics remain active
- **AND** the parent card does not animate or activate as a tap target
