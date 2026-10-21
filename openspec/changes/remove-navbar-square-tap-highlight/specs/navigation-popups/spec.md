# Spec Delta

## ADDED Requirements

### Requirement: Navbar press feedback follows the control shape
Navbar destinations, overflow controls and their icon content SHALL NOT show an additional rectangular background during or after touch, pointer or keyboard activation. The intended circular selected-route fill and existing brief press feedback SHALL remain. Styling SHALL preserve semantic activation, accessible names, visible 48px resting targets, overflow scrolling and navbar long-press refresh without focus-only decoration.

#### Scenario: A navbar icon is pressed
- **WHEN** a selected or unselected horizontal destination is pressed on its icon or surrounding control area
- **THEN** no square or rectangular highlight appears behind the icon/control while pressed or after release
- **AND** the intended selected-route circle remains, and a completed tap navigates once

#### Scenario: An overflow control or destination is pressed
- **WHEN** the user presses the overflow toggle or a destination in the open overflow menu
- **THEN** no extra rectangular press background appears
- **AND** toggle activation, destination navigation and vertical overflow scrolling retain their existing behavior

#### Scenario: A navbar item is held or cancelled
- **WHEN** a horizontal navbar item or its icon is held, released early or cancelled
- **THEN** the square highlight remains absent and existing refresh progress, completion and cancellation behavior are preserved
- **AND** a completed refresh hold does not also navigate

#### Scenario: The user changes presentation or input method
- **WHEN** the shared navbar is rendered in light/dark mode, generated/native use or an inert preview, or receives keyboard focus/activation
- **THEN** rounded presentation and the absence of rectangular press artifacts remain consistent without adding visible focus-only decoration
- **AND** runtime keyboard activation works while preview actions remain inert
