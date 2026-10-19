# Spec Delta

## ADDED Requirements

### Requirement: Three-second navbar refresh hold
The active horizontal Marao navbar SHALL accept a continuous primary-pointer hold of 3000 milliseconds on its surface, route icons or overflow toggle to request one frontend refresh. Generated and native navbar hosts SHALL share this behavior. Ordinary taps SHALL retain existing navigation and overflow semantics. A completed hold SHALL NOT also activate its underlying control.

#### Scenario: Holding an inactive destination
- **WHEN** the user holds a visible destination for three seconds on the current page
- **THEN** one frontend refresh is requested for the current page
- **AND** the held destination is not opened by the hold or its subsequent release/click

#### Scenario: Holding the overflow toggle
- **WHEN** the user completes a three-second hold on More
- **THEN** one refresh is requested without also toggling the overflow menu
- **AND** no route selection or entity service call occurs

#### Scenario: Normal navigation remains immediate
- **WHEN** the user makes an ordinary short tap on a route or the overflow toggle
- **THEN** the existing action occurs once on activation without a three-second delay
- **AND** no frontend refresh is requested

#### Scenario: Native and generated hosts
- **WHEN** the same completed hold is performed in a generated dashboard or a native Marao navbar, including standalone native placement
- **THEN** each host requests the same local frontend refresh without changing its configured destinations or shell ownership

### Requirement: Refresh hold cancellation and ownership
A refresh hold SHALL cancel on early release, movement exceeding a 10 CSS pixel tolerance from its start, leaving the navbar, pointer cancellation, another contact, scrolling, loss of visibility/focus, route change, editing/preview, modal ownership or host removal. Cancelled holds SHALL NOT refresh. Gesture handlers SHALL preserve scrolling, pinch zoom and later unrelated taps, and SHALL release timers/listeners/capture on cancellation or removal.

#### Scenario: Early release
- **WHEN** the pointer is released before 3000 milliseconds
- **THEN** progress ends and no refresh occurs
- **AND** an ordinary short tap retains its existing action

#### Scenario: Releasing an armed incomplete hold
- **WHEN** hold progress has started and the user releases before three seconds
- **THEN** the incomplete hold neither refreshes nor activates its underlying destination or overflow toggle
- **AND** the next independent short tap works normally

#### Scenario: Movement or interruption
- **WHEN** a pending hold moves beyond tolerance, leaves the navbar, becomes a scroll, receives another contact or is cancelled
- **THEN** no refresh occurs, progress clears and the gesture does not activate a route or overflow control
- **AND** a subsequent independent tap works normally

#### Scenario: Lifecycle interruption
- **WHEN** the app backgrounds, the window loses focus, the route changes, a modal takes ownership, the host is removed or editing/preview becomes active during a hold
- **THEN** the pending hold is cancelled and cannot complete later
- **AND** no gesture listeners, capture or progress remain active

#### Scenario: Noninteractive hosts
- **WHEN** the navbar is in an editor preview, native edit mode or an inert modal background
- **THEN** holding it cannot navigate or request refresh

#### Scenario: Overflow menu remains scrollable
- **WHEN** the user scrolls or selects a destination in the vertical overflow menu
- **THEN** the existing menu interaction works without starting a navbar refresh hold
- **AND** hold-specific context-menu/click suppression remains limited to the horizontal navbar gesture

### Requirement: Localized refresh feedback
An accepted hold SHALL show visible progress and localized refresh guidance, requesting strong haptics at start and completion where supported. Feedback SHALL distinguish holding, refreshing and failure without relying only on color. Essential copy SHALL wrap at supported mobile text/zoom sizes without obscuring controls. The navbar SHALL retain its one-row route layout, 48px targets, safe-area bounds and popup layering.

#### Scenario: Progress and completion
- **WHEN** the user begins and completes an eligible hold
- **THEN** progress is visible during the hold, refresh feedback appears at completion and haptics are requested at those two boundaries
- **AND** progress is absent while idle and cleared on cancellation

#### Scenario: Unsupported vibration
- **WHEN** the host does not support haptic feedback
- **THEN** visible progress and the refresh operation remain usable

#### Scenario: Narrow or enlarged presentation
- **WHEN** English or Portuguese feedback is displayed at 320 CSS pixels, in phone landscape, or with supported bold/text-scale/browser-zoom settings
- **THEN** essential guidance remains readable within safe bounds without horizontal page overflow or smaller route controls
- **AND** representative light and dark appearances retain readable progress and state cues
