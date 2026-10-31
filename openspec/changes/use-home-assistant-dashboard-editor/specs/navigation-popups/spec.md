# Spec Delta

## MODIFIED Requirements

### Requirement: Scoped fullscreen shell
Home Assistant's native top bar SHALL be hidden only while viewing an opted-in Marao dashboard. Native editing SHALL restore its toolbar and host-managed safe areas. Leaving Marao SHALL restore the normal HA shell and every layout property changed by Marao. Adding an individual Marao card to an ordinary dashboard SHALL NOT enable dashboard-wide shell changes.

#### Scenario: The user navigates from Marao to native settings
- **WHEN** the active route stops being a Marao dashboard
- **THEN** the native header is restored
- **AND** the layout properties changed by Marao regain their previous values

#### Scenario: Home Assistant replaces the active view
- **WHEN** navigation or rendering replaces the active opted-in view container
- **THEN** its current viewing safe-area layout is applied once
- **AND** unrelated or retained native containers do not inherit Marao layout overrides

#### Scenario: Native editing owns the page
- **WHEN** an administrator enters dashboard or card editing
- **THEN** HA's editing controls and layout are unobstructed and Marao's navbar cannot activate through the editor
- **AND** viewing overrides return only after editing ends in the same opted-in dashboard

#### Scenario: All Marao editing entry points are hidden
- **WHEN** navigation is explicitly empty and both main-page shortcuts are disabled
- **THEN** administrators retain HA's visible native header/edit controls
- **AND** the removed internal editor route is not required to recover editing access

### Requirement: Native editing with Marao navigation
Ordinary opted-in dashboards SHALL retain Marao styling and shared single-row overflow navigation without a route-count cap. Administrator edit access SHALL open HA's native editor outside route entries. Native editing SHALL restore its toolbar; leaving Marao SHALL restore the normal shell.

#### Scenario: Native editing starts
- **WHEN** an administrator uses Edit dashboard
- **THEN** HA's existing native editor opens with its native controls unobstructed

#### Scenario: A Marao card is added to an ordinary dashboard
- **WHEN** that dashboard has no explicit Marao dashboard opt-in
- **THEN** the card retains its Marao controls while the normal HA shell and navigation remain owned by HA

## ADDED Requirements

### Requirement: Dashboard-wide navbar configuration
An opted-in dashboard SHALL have one persisted navbar definition shared across all its views and devices. Settings SHALL preserve route order, labels/icons, external URLs, unknown options, explicit emptiness and main-page shortcut preferences. Saving navbar settings SHALL preserve unrelated native dashboard content. Native view changes SHALL NOT silently repopulate an explicitly configured route list.

#### Scenario: Reordering destinations with grab handles
- **WHEN** an administrator drags a destination by its visible grab handle in Marao settings
- **THEN** Home Assistant's native sortable control updates the draft order while preserving each destination's complete configuration
- **AND** move up/down actions remain available, Save applies the order and closing without saving leaves the stored navbar unchanged

#### Scenario: Navigation is edited once
- **WHEN** an administrator changes the shared destination order or label
- **THEN** every view uses the saved settings after the native update
- **AND** no per-view route copy, navbar placement or second settings definition is required

#### Scenario: Navigation is deliberately empty
- **WHEN** the administrator saves an empty route list
- **THEN** no stale navbar, fabricated destinations or hidden hold target remains
- **AND** HA's native administrative editing remains reachable

#### Scenario: A configured page is deleted or renamed
- **WHEN** an explicit navbar destination no longer resolves to a current view
- **THEN** shared settings identify the unresolved destination for correction
- **AND** no native page is recreated or unrelated route removed automatically

### Requirement: Automatic navbar on every view
Marao SHALL initialize one floating navbar automatically on every view of an opted-in dashboard, including empty, newly created, Sections, Masonry and Panel views. Direct links SHALL initialize it without visiting a landing page or mounting a Marao content card. Optional content readiness SHALL NOT block navigation; exit, opt-out and unsupported configuration SHALL release owned resources safely.

#### Scenario: A new native page is opened
- **WHEN** an administrator creates a new empty view and exits edit mode
- **THEN** the shared navbar appears with its existing configuration without adding any navbar card or reference
- **AND** if the new view is absent from the explicit route list, no destination is inserted and no unrelated route is shown as selected

#### Scenario: A secondary floor-plan page is opened directly
- **WHEN** a fresh client loads that Panel view URL
- **THEN** exactly one shared navbar initializes with the correct active destination and safe-area clearance
- **AND** it does not depend on another page, marker card or optional camera/history module

#### Scenario: Only global settings change
- **WHEN** the shared configuration changes while the current page's card tree stays unchanged
- **THEN** the displayed navbar updates without a page reload or duplicate listeners

#### Scenario: The dashboard is left or opted out
- **WHEN** navigation leaves the dashboard or saved settings remove its opt-in
- **THEN** the navbar, holds, observers, shell and theme overrides are released
- **AND** unrelated dashboards retain their normal appearance and controls

### Requirement: Native-authoring maintenance actions
Every eligible two-second navbar hold SHALL retain the existing role-based maintenance behavior on every view. Administrators SHALL receive Edit dashboard and cache-refresh actions; ordinary users SHALL retain direct cache refresh. Edit dashboard SHALL target HA's editor. Main-page shortcut flags SHALL remain independent, and current modal, preview, gesture and unsaved-edit guards SHALL apply.

#### Scenario: An administrator holds a selected main-page destination
- **WHEN** the administrator completes an eligible hold anywhere on the horizontal navbar
- **THEN** the maintenance menu offers native Edit dashboard and Clear cache and refresh
- **AND** the hold does not also navigate, refresh or actuate an entity

#### Scenario: A regular user holds a secondary-page destination
- **WHEN** that user completes an eligible hold
- **THEN** only the existing cache-refresh behavior is available
- **AND** editing/settings writes remain denied by HA authorization

#### Scenario: Main-page shortcuts are hidden
- **WHEN** either or both main-page shortcut flags are false
- **THEN** the corresponding buttons and reserved space are absent
- **AND** eligible navbar maintenance remains available independently
