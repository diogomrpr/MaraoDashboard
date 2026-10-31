# Navigation and popups

## Purpose

Provide compact safe-area-aware navigation and usable modal control sheets
within the same dashboard, including narrow and enlarged-text layouts.

## Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly in a single horizontal row, retaining circular active icons, visible 48px targets and iPhone safe-area insets. It SHALL use one shared bottom-gap calculation for navbar positioning, fallback page clearance and popup internal padding: at least twice the previous gap, with a 24px minimum and twice the lowered safe-area offset on iPhone. It SHALL remain below popups. Its spacer SHALL keep the final page card reachable above navigation. Configured route lists SHALL have no product-level count cap; destinations exceeding the available width SHALL remain reachable through the rightmost overflow toggle.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned
- **THEN** the shared bottom gap is at least 24px and at least twice the lowered device-derived offset; popup cards receive the same internal bottom spacing

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
Sheets SHALL scroll their content below a stationary title and close control, with the scrollbar confined to that content area, without background scrolling. All four corners SHALL be rounded, with a device-safe inset at the sides and bottom. The close control SHALL remain unobstructed at enlarged text/zoom and short heights. Containment SHALL recognize native Marao sheets, preserve value-slider touch defaults and leave native sheet movement to the browser, including initial zero-vertical movement and boundary reversals. CSS SHALL contain native-sheet overscroll. The backdrop SHALL remain guarded without cancelling touches inside the sheet.

#### Scenario: A fixed-height popup is scrolled at 200% zoom
- **WHEN** the last cards reach the visible area
- **THEN** they do not overlap the close control and can still be operated

#### Scenario: A value slider is dragged inside a scrolling sheet
- **WHEN** the gesture targets the native range
- **THEN** popup containment does not prevent horizontal value changes
- **AND** the browser retains native touch handling for initial zero-vertical movement and boundary reversals

#### Scenario: A user scrolls over the chart
- **WHEN** a vertical touch gesture starts on the numeric plot
- **THEN** the sheet scrolls normally while the background stays still
- **AND** the gesture does not dispatch a card action or become a hidden chart pan

#### Scenario: A user inspects a reading
- **WHEN** the user taps the plot without scrolling
- **THEN** the selected reading appears outside the plot
- **AND** sheet scrolling, close clearance and page zoom remain usable

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

### Requirement: Native editing with Marao navigation
Native starters SHALL retain the Marao theme and shared single-row overflow navigation without a product-level route-count cap, with administrator edit access outside route entries. Native editing SHALL restore its toolbar; leaving Marao SHALL restore the normal shell.

#### Scenario: Native editing starts
- **WHEN** the administrator uses Edit dashboard
- **THEN** HA's existing editor or Take control flow opens with its native controls unobstructed

#### Scenario: A Marao card is added to an ordinary dashboard
- **WHEN** that dashboard has no Marao navbar
- **THEN** its native shell remains unchanged

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

### Requirement: History detail drill-in navigation
Numeric history opened from an existing Marao sheet SHALL replace its visible content within one modal layer and expose Back to restore the parent content, scroll and invoking control. Opening from a dashboard SHALL use the same sheet presentation. Close, browser Back and route changes SHALL preserve focus/inert cleanup and the active dashboard root without rewriting configured popup hashes.

#### Scenario: A graph is inside a climate or group sheet
- **WHEN** its History control opens detail
- **THEN** one modal remains active and the original content is retained for return
- **AND** Back restores the parent sheet at its previous scroll position with focus on the matching History control

#### Scenario: The user closes drill-in history
- **WHEN** the sheet's Close control is activated
- **THEN** the modal closes, retained parent content is released and background usability is restored
- **AND** focus returns to the original dashboard opener where available

#### Scenario: Browser Back leaves chart detail
- **WHEN** a chart-detail navigation entry is current
- **THEN** Back returns to its prior sheet or dashboard context
- **AND** Forward restores only still-valid context within the same dashboard view without persisting chart settings

#### Scenario: The active view changes during history loading
- **WHEN** navigation replaces the owning view
- **THEN** history detail and retained parent content close and their pending work is invalidated
- **AND** focus/inert state and the normal shell remain correct after leaving Marao

### Requirement: Two-second navbar refresh hold
The active horizontal Marao navbar SHALL accept a continuous primary-pointer hold of 2000 milliseconds on its surface, route icons or overflow toggle to request one frontend refresh. Generated and native navbar hosts SHALL share this behavior. Ordinary taps SHALL retain existing navigation and overflow semantics. A completed hold SHALL NOT also activate its underlying control.

#### Scenario: Holding an inactive destination
- **WHEN** the user holds a visible destination for two seconds on the current page
- **THEN** one frontend refresh is requested for the current page
- **AND** the held destination is not opened by the hold or its subsequent release/click

#### Scenario: Holding the overflow toggle
- **WHEN** the user completes a two-second hold on More
- **THEN** one refresh is requested without also toggling the overflow menu
- **AND** no route selection or entity service call occurs

#### Scenario: Normal navigation remains immediate
- **WHEN** the user makes an ordinary short tap on a route or the overflow toggle
- **THEN** the existing action occurs once on activation without a two-second delay
- **AND** no frontend refresh is requested

#### Scenario: Native and generated hosts
- **WHEN** the same completed hold is performed in a generated dashboard or a native Marao navbar, including standalone native placement
- **THEN** each host requests the same local frontend refresh without changing its configured destinations or shell ownership

### Requirement: Refresh hold cancellation and ownership
A refresh hold SHALL cancel on early release, movement exceeding a 10 CSS pixel tolerance from its start, leaving the navbar, pointer cancellation, another contact, scrolling, loss of visibility/focus, route change, editing/preview, modal ownership or host removal. Cancelled holds SHALL NOT refresh. Gesture handlers SHALL preserve scrolling, pinch zoom and later unrelated taps, and SHALL release timers/listeners/capture on cancellation or removal.

#### Scenario: Early release
- **WHEN** the pointer is released before 2000 milliseconds
- **THEN** progress ends and no refresh occurs
- **AND** an ordinary short tap retains its existing action

#### Scenario: Releasing an armed incomplete hold
- **WHEN** hold progress has started and the user releases before two seconds
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

### Requirement: Content-driven popup height with top clearance
All shared popups SHALL default to content-driven height up to the viewport's
available safe area, leaving at least 50 CSS pixels above the sheet or the top
safe inset when larger. Generated popup families SHALL share this behavior.
Explicit fixed/max height settings SHALL remain supported within these bounds.

#### Scenario: Short and long sheets
- **WHEN** popup content fits in a short sheet
- **THEN** the sheet retains compact bottom placement
- **WHEN** more content requires a taller sheet
- **THEN** the sheet grows up to the top clearance and scrolls internally
- **AND** the title and close button remain visible above the navbar

### Requirement: Navbar is the first usable Marao surface
Once HA supplies a valid nonempty navbar configuration, Marao SHALL make navigation and its frontend-refresh hold the first usable Marao surface, independently of optional dashboard content readiness. This SHALL work for generated, native-dashboard and standalone native navbar hosts without waiting for entity data or a server-side card-compilation response.

#### Scenario: Tap recovery before optional content is ready
- **WHEN** a configured dashboard opens on its main page while optional content is delayed or fails
- **THEN** a top-right refresh button is available with the early navigation surface
- **AND** its visible touch target is at least 48px square and its inline icon has no optional rendering dependency
- **WHEN** the user taps it once
- **THEN** the existing cache-clear/reload action runs once with the same dirty/edit/preview/inert protection and feedback as navbar hold
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

### Requirement: Continuous navbar ownership within its dashboard
Marao SHALL retain one active navigation/recovery surface through same-dashboard view replacement and content failure until the next navbar configuration is ready. It SHALL use only the owning context's configured routes, preserve deliberate emptiness, and remove retained controls and shell overrides on exit. Edit, preview and modal protections SHALL remain effective.

#### Scenario: The next page takes time to mount
- **WHEN** a user navigates within the owning dashboard while the incoming view is delayed or fails
- **THEN** one configured navbar remains available for another navigation or refresh
- **AND** replacement does not duplicate controls, event handlers, reloads or entity dispatches
- **AND** a hold interrupted by route change is cancelled while a later fresh hold can complete

#### Scenario: Navbar configuration changes
- **WHEN** an incoming navbar supplies a different valid route list or explicitly empty navigation
- **THEN** the new configuration replaces the retained configuration without merging, rediscovery or fabricated destinations
- **AND** an empty list leaves no retained navbar or hidden refresh target

#### Scenario: The user leaves the owning context
- **WHEN** navigation leaves the owning dashboard, or removes a standalone navbar from an ordinary native view
- **THEN** retained navbar controls, gesture resources and owned layout changes are released
- **AND** Home Assistant's normal shell is restored without a navbar leaking into another dashboard or settings view

#### Scenario: A dialog or editor owns input
- **WHEN** editing, preview or an open modal makes the navbar ineligible
- **THEN** the retained navbar cannot navigate or refresh through that protection
- **AND** normal eligible use resumes after the owning protection ends

### Requirement: Uninterrupted refresh hold across the horizontal navbar
A continuous eligible primary-pointer hold of 2000 milliseconds SHALL request one frontend refresh anywhere on the visible horizontal pill, including padding, gaps, destinations, icon descendants and More. Browser URL previews, context menus, selection and dragging SHALL NOT interrupt that hold. The vertical overflow menu SHALL retain its ordinary behavior.

#### Scenario: Android holds a route icon
- **WHEN** a user holds the selected or an unselected destination icon or its nested graphic for two seconds in an Android browser or Companion WebView
- **THEN** visible progress continues to one refresh without an intervening URL preview, link menu, selection or drag UI
- **AND** the hold and its release do not navigate to that destination

#### Scenario: Holding the background or More
- **WHEN** a user completes the same hold on pill padding, a gap, a route control's non-icon area or More
- **THEN** each area triggers the same single refresh and feedback
- **AND** More does not open or close the overflow menu as a side effect of the completed hold

#### Scenario: Ordinary navigation and overflow remain usable
- **WHEN** a user makes a short tap or ordinary keyboard activation on a destination or More, or scrolls/selects in the vertical overflow menu
- **THEN** the corresponding existing action occurs once without a two-second delay
- **AND** no refresh starts and unrelated browser/page gestures remain unaffected

#### Scenario: An interrupted hold is not completed later
- **WHEN** a hold releases after arming but before two seconds, moves beyond the existing tolerance, leaves the bar, gains another contact, scrolls, loses focus/visibility, changes route or loses its owner
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

### Requirement: Configurable main-page cache reset visibility
The shared navbar SHALL render the main-page cache reset row only when `show_cache_reset` is not false. Disabling it SHALL remove both the button and its reserved row. Automatic refresh and navbar-hold recovery SHALL remain available.

#### Scenario: The shortcut is disabled
- **WHEN** the main page is displayed with `show_cache_reset: false`
- **THEN** neither the button nor its top spacing is rendered

#### Scenario: The shortcut is enabled
- **WHEN** the option is true or omitted
- **THEN** the existing button is available only on the main page and scrolls with its content

### Requirement: Marao light color detail sheet
The light picker SHALL use Marao's existing slide-up sheet presentation, with the light name, close control, themed content and existing modal focus, inert-background and scroll behavior. Its code SHALL load only when first opened; loading or load failure SHALL remain visible without sending a light action.

#### Scenario: A dashboard light picker opens for the first time
- **WHEN** a supported light's picker entry point is activated
- **THEN** the Marao sheet opens with its name and close control while picker code loads on demand
- **AND** opening or closing the sheet sends no light update

#### Scenario: Picker loading fails
- **WHEN** the picker cannot load
- **THEN** a readable failure and explicit retry are offered in the sheet without acting on the light

### Requirement: Light detail returns to its group list
Opening a light picker from an existing group popup SHALL show a detail view with Back. Returning SHALL restore the group list's scroll position and invoking control without reopening or resetting the parent popup. Closing SHALL preserve the shared modal cleanup and focus restoration behavior.

#### Scenario: A scrolled group list opens a light detail
- **WHEN** a user opens a member's picker and then activates Back
- **THEN** the same group list returns at its previous scroll position with focus restored to that member's invoking control
- **AND** no light service is called by navigation
