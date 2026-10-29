# Spec Delta

## MODIFIED Requirements

### Requirement: Three-second navbar refresh hold
For non-administrators, the active horizontal Marao navbar SHALL accept a continuous primary-pointer hold of 3000 milliseconds on its surface, route icons or overflow toggle to request one frontend refresh. Generated and native navbar hosts SHALL share this behavior. Ordinary taps SHALL retain existing navigation and overflow semantics. A completed hold SHALL NOT also activate its underlying control.

#### Scenario: Holding an inactive destination
- **WHEN** a non-administrator holds a visible destination for three seconds on the current page
- **THEN** one frontend refresh is requested for the current page
- **AND** the held destination is not opened by the hold or its subsequent release/click

#### Scenario: Holding the overflow toggle
- **WHEN** a non-administrator completes a three-second hold on More
- **THEN** one refresh is requested without also toggling the overflow menu
- **AND** no route selection or entity service call occurs

#### Scenario: Normal navigation remains immediate
- **WHEN** the user makes an ordinary short tap on a route or the overflow toggle
- **THEN** the existing action occurs once on activation without a three-second delay
- **AND** no frontend refresh is requested

#### Scenario: Native and generated hosts
- **WHEN** a non-administrator performs the same completed hold in a generated dashboard or a native Marao navbar, including standalone native placement
- **THEN** each host requests the same local frontend refresh without changing its configured destinations or shell ownership

### Requirement: Uninterrupted refresh hold across the horizontal navbar
For non-administrators, a continuous eligible primary-pointer hold of 3000 milliseconds SHALL request one frontend refresh anywhere on the visible horizontal pill, including padding, gaps, destinations, icon descendants and More. Browser URL previews, context menus, selection and dragging SHALL NOT interrupt that hold. The vertical overflow menu SHALL retain its ordinary behavior.

#### Scenario: Android holds a route icon
- **WHEN** a non-administrator holds the selected or an unselected destination icon or its nested graphic for three seconds in an Android browser or Companion WebView
- **THEN** visible progress continues to one refresh without an intervening URL preview, link menu, selection or drag UI
- **AND** the hold and its release do not navigate to that destination

#### Scenario: Holding the background or More
- **WHEN** a non-administrator completes the same hold on pill padding, a gap, a route control's non-icon area or More
- **THEN** each area triggers the same single refresh and feedback
- **AND** More does not open or close the overflow menu as a side effect of the completed hold

#### Scenario: Ordinary navigation and overflow remain usable
- **WHEN** a user makes a short tap or ordinary keyboard activation on a destination or More, or scrolls/selects in the vertical overflow menu
- **THEN** the corresponding existing action occurs once without a three-second delay
- **AND** no refresh starts and unrelated browser/page gestures remain unaffected

#### Scenario: An interrupted hold is not completed later
- **WHEN** a hold releases after arming but before three seconds, moves beyond the existing tolerance, leaves the bar, gains another contact, scrolls, loses focus/visibility, changes route or loses its owner
- **THEN** progress and completion timers are cancelled without refreshing or activating the held control
- **AND** the next independent short tap or eligible hold works normally

#### Scenario: Narrow and enlarged feedback
- **WHEN** holding or recovery feedback appears in English or Portuguese at 320 CSS pixels, phone portrait/landscape, bold text, 200% text, 200% zoom or bold plus 200% text
- **THEN** essential copy wraps within safe bounds and controls remain visibly at least 48 by 48 CSS pixels
- **AND** the one-row navbar, active-route cues, safe-area placement and popup layering remain intact

#### Scenario: Scrolling the main page
- **WHEN** the main page scrolls down
- **THEN** the top-right cache button scrolls away as part of the page content rather than staying fixed or sticky
- **AND** no duplicate button or reserved top-button gap appears on secondary pages, while the bottom navbar retains its floating placement

### Requirement: Localized refresh feedback
An accepted hold SHALL show visible progress and localized guidance for the current hold action, requesting strong haptics at start and completion where supported. Feedback SHALL distinguish holding, refreshing and failure without relying only on color. Essential copy SHALL wrap at supported mobile text/zoom sizes without obscuring controls. The navbar SHALL retain its one-row route layout, 48px targets, safe-area bounds and popup layering.

#### Scenario: Progress and completion
- **WHEN** the user begins and completes an eligible hold
- **THEN** progress is visible during the hold, the administrator menu opens or regular-user refresh feedback appears at completion and haptics are requested at those two boundaries
- **AND** progress is absent while idle and cleared on cancellation

#### Scenario: Unsupported vibration
- **WHEN** the host does not support haptic feedback
- **THEN** visible progress and the role-appropriate action remain usable

#### Scenario: Narrow or enlarged presentation
- **WHEN** English or Portuguese feedback is displayed at 320 CSS pixels, in phone landscape, or with supported bold/text-scale/browser-zoom settings
- **THEN** essential guidance remains readable within safe bounds without horizontal page overflow or smaller route controls
- **AND** representative light and dark appearances retain readable progress and state cues

### Requirement: Navbar is the first usable Marao surface
Once HA supplies a valid nonempty navbar configuration, Marao SHALL make navigation and its frontend-refresh hold the first usable Marao surface, independently of optional dashboard content readiness. This SHALL work for generated, native-dashboard and standalone native navbar hosts without waiting for entity data or a server-side card-compilation response.

#### Scenario: Tap recovery before optional content is ready
- **WHEN** a configured dashboard opens on its main page while optional content is delayed or fails
- **THEN** a top-right refresh button is available with the early navigation surface
- **AND** its visible touch target is at least 48px square and its inline icon has no optional rendering dependency
- **WHEN** the user taps it once
- **THEN** the existing cache-clear/reload action runs once with the existing dirty/edit/preview/inert protection and refresh feedback, independent of the administrator hold menu
- **AND** the existing navbar hold remains available
- **AND** the button does not obscure page content or the native edit action

#### Scenario: Recovery button is limited to the main page
- **WHEN** navigation changes to a page other than the dashboard's first configured view
- **THEN** the top-right refresh button is hidden
- **WHEN** navigation returns to that main view or the dashboard-root URL
- **THEN** the button is visible again without waiting for optional content

#### Scenario: Cold startup with slow content
- **WHEN** a configured dashboard opens with an empty browser cache and optional card, history, camera-event or editor resources are delayed
- **THEN** navigation and its localized refresh progress are operable while those optional resources remain unresolved
- **AND** the critical navigation/recovery components were registered before optional module requests began
- **AND** native navbar initialization does not request server-side card compilation or entity metadata

#### Scenario: Optional content cannot load
- **WHEN** an optional module fails or a camera stream never becomes ready after navbar configuration is available
- **THEN** navigation and the refresh hold remain usable
- **AND** the content failure remains observable rather than being hidden or reported as successful loading

#### Scenario: Saved routes are available during a connection loss
- **WHEN** an existing page has its navbar configuration and HA disconnects
- **THEN** local navigation and hold feedback remain usable without a successful WebSocket exchange
- **AND** HA's native connection warning remains available

## ADDED Requirements

### Requirement: Administrator navbar maintenance menu
A completed eligible three-second navbar hold SHALL open a maintenance menu only for the current administrator. Opening SHALL dispatch no refresh, editor navigation or underlying route/overflow click. Regular users SHALL retain direct refresh and SHALL never receive this menu. Ordinary taps, hold cancellation, strong haptics and browser-menu suppression SHALL retain their existing behavior.

#### Scenario: An administrator completes a hold
- **WHEN** an administrator completes the hold anywhere on the eligible horizontal navbar
- **THEN** one maintenance sheet opens with Clear cache/refresh and Edit dashboard when its existing editor route is available
- **AND** no refresh or navigation happens until an action is explicitly selected
- **AND** progress describes opening the maintenance menu, in the current language

#### Scenario: A regular user completes a hold
- **WHEN** a non-administrator completes the same hold
- **THEN** the existing refresh action runs exactly once with existing localized feedback and no maintenance menu

#### Scenario: A hold is cancelled
- **WHEN** any existing hold cancellation or ownership guard interrupts the gesture
- **THEN** neither the administrator menu nor refresh nor an underlying route/overflow action is dispatched

### Requirement: Maintenance menu lifecycle and guarded actions
The maintenance sheet SHALL use modal semantics, localized names, at least 48px controls, internal scrolling, safe-area clearance and existing theme styling above the navbar. Background content SHALL be inert, focus trapped and restored on dismissal. Actions SHALL recheck current privileges and ownership, close the sheet and dispatch at most once through the existing editor-navigation or refresh path.

#### Scenario: Refresh or editing is selected
- **WHEN** a still-authorized administrator selects a menu action
- **THEN** the sheet closes and the existing guarded action runs once
- **AND** opening Edit dashboard uses the actual configured route without saving or changing source
- **AND** refresh retains unsaved/busy/error protection and does not bypass another modal

#### Scenario: Ownership or permission changes
- **WHEN** administrator status is lost, user identity or owning route changes, the host is removed, or editor/preview/modal ownership invalidates the menu
- **THEN** the menu closes, stale actions cannot execute and owned modal/gesture resources are released
- **AND** cancellation itself does not refresh or navigate

#### Scenario: Another modal is already open
- **WHEN** the navbar is ineligible because another modal or edit/preview context owns input
- **THEN** holding cannot open the maintenance sheet or refresh through that protection

### Requirement: Maintenance remains independent of main-page shortcuts
The navbar Maintenance hold SHALL remain available independently of main-page shortcut visibility. Configured navbar routes, deliberate empty navigation and editor routes SHALL remain unchanged. Main-page pencil visibility is superseded by `configurable-main-page-shortcuts`, which permits a configurable administrator shortcut enabled by default.

#### Scenario: Main-page shortcuts are hidden
- **WHEN** either or both main-page shortcuts are hidden
- **THEN** administrator hold-menu access remains available when a navbar exists
- **AND** regular users retain direct hold refresh

#### Scenario: A full-page plan is the main page
- **WHEN** an administrator completes a navbar hold on a full-page floor plan or an ordinary page, including the landing page
- **THEN** the maintenance menu offers Edit dashboard using the actual configured editor route
- **AND** nested layout wrappers and hidden main-page shortcuts do not remove that action
- **AND** regular users never receive administrator editor access

#### Scenario: No navbar routes exist
- **WHEN** navigation is explicitly empty
- **THEN** no hidden hold target or fabricated route is inserted
- **AND** the direct editor route and any enabled administrator pencil shortcut remain available
