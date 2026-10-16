# Spec Delta

## MODIFIED Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly in a single horizontal row, retaining circular active icons, visible 48px targets and iPhone safe-area insets. It SHALL preserve the accepted lowered iPhone offset and remain below popups. Its spacer SHALL keep the final page card reachable above navigation. Configured route lists SHALL have no product-level count cap; destinations exceeding the available width SHALL remain reachable through the rightmost overflow toggle.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned
- **THEN** device-derived safe-area clearance is used without adding an unrelated universal bottom gap

#### Scenario: All configured destinations fit
- **WHEN** available safe width accommodates every configured route at its full control size
- **THEN** the bar shows those routes in one row in configured order without an overflow toggle

#### Scenario: Destinations exceed the available width
- **WHEN** the configured routes exceed the number of full-size slots the bar can display
- **THEN** the rightmost slot becomes More and preceding slots show the initial configured routes
- **AND** every remaining route is in the overflow menu exactly once, without wrapping the horizontal bar, shrinking targets or truncating the saved list

#### Scenario: Only one control fits
- **WHEN** the available safe width fits one control and there are multiple routes
- **THEN** the bar contains the overflow toggle and all routes remain reachable in its menu

## ADDED Requirements

### Requirement: Anchored vertical navbar overflow
The overflow toggle SHALL open an icon-only vertical menu above it, with the icon column centered on the toggle. The menu SHALL match the navbar's themed surface, rounded shape, shadow, icon sizes, active circles, spacing and haptics. It SHALL stay inside the visible safe viewport and scroll internally when its contents exceed the available height. Every route control SHALL remain visibly at least 48 by 48 CSS pixels.

#### Scenario: Opening the additional destinations
- **WHEN** the administrator or viewer activates More
- **THEN** the remaining routes appear vertically in configured order above the toggle with the same visual treatment as the bar
- **AND** the menu does not shift the page, increase the horizontal bar height or require horizontal scrolling

#### Scenario: A long menu is opened
- **WHEN** its destinations exceed the safe height above the toggle
- **THEN** the menu scrolls internally and its last destination is reachable without moving the dashboard background
- **AND** the menu and its controls remain inside current top/side safe boundaries

### Requirement: Overflow interaction and focus lifecycle
More SHALL be a named semantic button exposing expanded state and its controlled navigation region. Overflow destinations SHALL retain named link semantics. Second toggle activation, outside interaction or Escape SHALL dismiss the menu without navigating; selecting a route SHALL close it and navigate once. Keyboard/touch operation SHALL be available without hover. Dismissal SHALL restore focus to the toggle unless navigation or an explicit outside focus target supersedes it.

#### Scenario: Dismissing without selecting
- **WHEN** More is activated again, Escape is pressed or an outside interaction dismisses the open menu
- **THEN** it closes without configuration changes, entity dispatch or accidental activation of a covered dashboard action
- **AND** focus returns appropriately without stealing focus from an explicitly selected outside control

#### Scenario: Selecting a hidden destination
- **WHEN** an overflow route is activated by tap or keyboard
- **THEN** one navigation and the existing strong haptic feedback occur and the menu closes
- **AND** the destination retains its configured URL/path behavior

### Requirement: Stable overflow active state
Screen partitioning SHALL preserve configured order without promoting an active overflow route into the horizontal bar. When the current destination belongs to overflow, More SHALL show the active circular treatment and expose the active destination in its accessible name; the corresponding overflow link SHALL retain its current-page indication. Opening or closing the menu SHALL NOT itself change the active route.

#### Scenario: A menu destination becomes current
- **WHEN** navigation activates a route that is outside the horizontal visible prefix
- **THEN** More and that overflow link indicate the current destination
- **AND** other route positions remain unchanged

### Requirement: Responsive overflow ownership and layering
Available width changes SHALL repartition presentation without editing route data and close an open menu safely. Route changes, host removal, editing/preview transitions and modal sheets SHALL dismiss overflow and release its listeners/focus state. The menu SHALL stay above dashboard content and below modal sheets. Ordinary native dashboards SHALL retain their shell, preview SHALL not navigate or alter fullscreen state and administrator Edit SHALL stay outside route slots.

#### Scenario: The screen rotates while overflow is open
- **WHEN** viewport/container dimensions or safe insets change
- **THEN** the menu closes, the bar recomputes its single-row partition and no route is lost or duplicated
- **AND** page clearance and safe-area placement remain correct

#### Scenario: A popup or editor takes ownership
- **WHEN** a modal sheet opens, the dashboard enters editing, or the navbar is removed
- **THEN** overflow closes and cannot intercept modal/editor input or leave active outside-dismiss listeners behind
- **AND** existing popup focus/inert behavior and HA shell restoration remain intact
