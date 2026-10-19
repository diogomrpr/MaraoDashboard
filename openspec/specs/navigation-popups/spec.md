# Navigation and popups

## Purpose

Provide compact safe-area-aware navigation and usable modal control sheets
within the same dashboard, including narrow and enlarged-text layouts.

## Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly, auto-scale for at most five routes, retain
circular active icons and visible 48px targets, and use iPhone safe-area insets.
It SHALL preserve the accepted lowered iPhone offset and remain below popups.
Its spacer SHALL keep the final page card reachable above navigation.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned
- **THEN** device-derived safe-area clearance is used without adding an unrelated universal bottom gap

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

### Requirement: Sheet presentation and route ownership
Popups SHALL slide upward, stay above dashboard cards/navbar, expose a close
control, and contain the title and configured content. They SHALL support
content-driven or configured fixed/max height. Wider layouts SHALL remain
centered at the first dashboard column's width. Routes and popup hashes SHALL
resolve within the active dashboard; disposable Cases stays under `/marao-dashboard`.

#### Scenario: The overview lighting sheet opens
- **WHEN** its populated task shortcut is activated
- **THEN** the localized title and available configured card content appear after the entrance animation settles

### Requirement: Modal focus lifecycle
An open popup SHALL expose modal semantics, make the background inert, keep focus
within the sheet, and restore focus to the invoking control on close. Restoration
SHALL tolerate HA rendering replacing the original invoking element.

#### Scenario: Home Assistant updates replace a popup's opener
- **WHEN** the popup is closed after that update
- **THEN** focus returns to the current matching opener and the background is usable again

### Requirement: Scroll containment and close clearance
Sheets SHALL scroll internally without background scrolling. Content clearance
SHALL keep the close control unobstructed at enlarged text/zoom and short heights.
Scroll containment SHALL recognize native Marao sheets and preserve value-slider
touch defaults instead of cancelling the slider's touch movement.
Native Marao sheets SHALL leave touch movement to the browser, including initial
zero-vertical movement and boundary reversals, and contain overscroll through CSS.
The backdrop SHALL remain guarded without cancelling touches inside the sheet.

#### Scenario: A fixed-height popup is scrolled at 200% zoom
- **WHEN** the last cards reach the visible area
- **THEN** they do not overlap the close control and can still be operated

#### Scenario: A value slider is dragged inside a scrolling sheet
- **WHEN** the gesture targets the native range
- **THEN** popup containment does not prevent horizontal value changes

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
