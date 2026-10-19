# Spec Delta

## ADDED Requirements

### Requirement: Stable Visual card pickup
The Visual editor SHALL retain its scroll position during handle press, movement below drag activation and initial drag activation. Holding still, horizontal movement or movement away from an edge SHALL NOT initiate automatic scrolling. The source row SHALL remain mounted with stable geometry during pickup. These guarantees SHALL apply to every visually editable card occurrence with touch and mouse.

#### Scenario: A handle is picked up near either edge
- **WHEN** an administrator presses a visible card handle near the sticky header, in the middle or near the bottom of a scrolled editor and activates dragging
- **THEN** press and initial activation leave the editor scroll position and source-row position unchanged
- **AND** holding the activated pointer still does not begin scrolling or change the source document or dirty state

#### Scenario: Pickup movement is sideways or away from the nearby edge
- **WHEN** a handle near either edge is activated by horizontal or diagonal movement, followed only by horizontal movement or movement away from that edge
- **THEN** no automatic scrolling begins, including when the pointer remains inside an edge scrolling area
- **AND** insertion feedback and valid local card placement remain available

#### Scenario: A short or enlarged mobile editor is used
- **WHEN** a card is picked up in a narrow, portrait, landscape, bold, enlarged-text or enlarged-browser-zoom editor layout
- **THEN** pickup retains the same stable-scroll behavior using the currently visible area below the header
- **AND** native scrolling outside the handle and keyboard focus reveal remain available

### Requirement: Deliberate Visual drag edge scrolling
Automatic scrolling during a Visual card drag SHALL begin only after additional deliberate vertical movement toward the current usable top or bottom edge after pickup. An armed edge SHALL continue bounded scrolling while held still there and keep insertion feedback aligned. Leaving its edge area, deliberately reversing away, ending or interrupting the drag SHALL stop scrolling. Layout changes alone SHALL NOT arm scrolling.

#### Scenario: The administrator deliberately approaches an edge
- **WHEN** an active drag subsequently moves far enough toward the top or bottom edge to meet the deliberate-movement threshold while in its scrolling area
- **THEN** the actual editor scroll container scrolls in that direction within its bounds
- **AND** holding the pointer there continues scrolling so an initially offscreen same-page destination becomes reachable
- **AND** insertion feedback follows the current destination geometry and a valid release moves the selected occurrence exactly once without activating another control or saving

#### Scenario: The administrator moves away and approaches again
- **WHEN** the pointer leaves an armed edge area or deliberately reverses away from it
- **THEN** automatic scrolling stops and remains stopped during a stationary hold
- **AND** a tiny outward movement after stopping does not reuse the earlier approach to restart scrolling
- **AND** scrolling resumes only after a new deliberate approach toward an edge, including an inward move followed by a renewed approach when pickup started extremely near the viewport boundary

#### Scenario: The usable viewport changes during an unarmed pickup
- **WHEN** orientation, viewport dimensions or header geometry change before deliberate edge movement has occurred
- **THEN** the new usable bounds are respected without the layout change itself arming automatic scrolling
- **AND** the next deliberate approach uses the current bounds rather than stale coordinates

#### Scenario: Scrolling is interrupted or reaches its bound
- **WHEN** the drag ends, is cancelled, loses capture, is interrupted by editor lifecycle changes or reaches a scroll limit
- **THEN** no scrolling task continues after termination or spins at the limit
- **AND** cancellation preserves the source document and dirty state and clears gesture feedback and capture
- **AND** a subsequent drag starts without inherited edge intent
