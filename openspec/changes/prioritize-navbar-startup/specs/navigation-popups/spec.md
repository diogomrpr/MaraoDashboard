# Spec Delta

## ADDED Requirements

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
A continuous eligible primary-pointer hold of 3000 milliseconds SHALL request one frontend refresh anywhere on the visible horizontal pill, including padding, gaps, destinations, icon descendants and More. Browser URL previews, context menus, selection and dragging SHALL NOT interrupt that hold. The vertical overflow menu SHALL retain its ordinary behavior.

#### Scenario: Android holds a route icon
- **WHEN** a user holds the selected or an unselected destination icon or its nested graphic for three seconds in an Android browser or Companion WebView
- **THEN** visible progress continues to one refresh without an intervening URL preview, link menu, selection or drag UI
- **AND** the hold and its release do not navigate to that destination

#### Scenario: Holding the background or More
- **WHEN** a user completes the same hold on pill padding, a gap, a route control's non-icon area or More
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
