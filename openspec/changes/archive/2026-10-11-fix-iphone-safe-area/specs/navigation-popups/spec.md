# Navigation and popups spec delta

## MODIFIED Requirements

### Requirement: Scoped fullscreen shell
Home Assistant's native top bar SHALL be hidden only while a Marao dashboard is
active. Leaving Marao SHALL restore the normal Home Assistant shell, including
any padding or other safe-area layout properties modified by Marao. Dashboard
safe-area changes SHALL affect only the active Marao content container and SHALL
NOT alter unrelated native views or the editor's host-managed safe-area layout.

#### Scenario: The user navigates from Marao to native settings
- **WHEN** the active route stops being a Marao dashboard
- **THEN** the native header is restored
- **AND** the layout properties changed by Marao regain their previous values

#### Scenario: Home Assistant replaces the active view
- **WHEN** navigation or rendering replaces the Marao view container
- **THEN** the new active container receives the current safe-area layout once
- **AND** unrelated or retained native containers do not inherit Marao layout overrides

## ADDED Requirements

### Requirement: Safe-area bounds for popup controls
Marao sheets SHALL keep their title, close control and content within the current iPhone top and side safe boundaries, including tall sheets and landscape layouts. The overlay backdrop SHALL still cover the viewport. Existing internal scrolling, modal focus behavior, centered/column-width presentation and navbar clearance SHALL be preserved.

#### Scenario: A tall sheet approaches the notch
- **WHEN** a configured tall sheet or enlarged-text sheet reaches the top unsafe region
- **THEN** its title and close control remain fully visible and operable below the safe boundary
- **AND** its content scrolls within the available height without moving the background

#### Scenario: A sheet remains open during rotation
- **WHEN** orientation changes while the popup is open
- **THEN** the sheet stays inside the new top and side safe boundaries without reopening
- **AND** closing it retains the established focus restoration behavior

#### Scenario: A short bottom sheet fits below the unsafe region
- **WHEN** a short sheet already fits entirely inside the safe content area
- **THEN** it retains its compact bottom placement without unnecessary notch padding inside its header
