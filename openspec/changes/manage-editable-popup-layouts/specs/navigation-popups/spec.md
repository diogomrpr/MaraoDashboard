# Spec Delta

## ADDED Requirements

### Requirement: Managed popup behavior matches saved card settings
A managed popup SHALL present controls consistent with its owner's confirmed settings. While a required source update is unresolved, obsolete managed targets or actions SHALL NOT remain operable. Active synchronization SHALL show loading feedback; blocked or failed synchronization SHALL show readable guidance without hiding the failure.

#### Scenario: Popup settings are saved while its source exists
- **WHEN** a user saves a supported change of popup type or behavior
- **THEN** reopening the popup presents the updated managed controls after verified synchronization
- **AND** custom layout content remains preserved

#### Scenario: Synchronization is in progress
- **WHEN** the old source still contains a superseded target or action during an active update
- **THEN** the obsolete managed controls are disabled or withheld with localized loading feedback
- **AND** no service is dispatched to the obsolete target

#### Scenario: Synchronization is blocked
- **WHEN** the source update cannot proceed because of an unsaved draft, unavailable connection or ownership conflict
- **THEN** the popup shows the blocking condition and an explicit authoring path to reconcile it
- **AND** it does not silently show the old behavior as current or retry writes continuously

### Requirement: Popup viewing remains free of authoring writes
Opening, rendering, previewing, closing and refreshing popups SHALL NOT create views, synchronize persisted layouts, download files or operate devices. Confirmed authoring changes and explicit popup editing SHALL be the only triggers for managed-source persistence. Registry and HA entity-state changes SHALL update live controls without changing saved membership or layout.

#### Scenario: A popup is opened repeatedly
- **WHEN** a viewer opens a managed or automatic popup repeatedly
- **THEN** no dashboard save, layout conversion, download or default refill occurs
- **AND** live readings and availability remain authoritative

#### Scenario: An old mismatch is discovered on load
- **WHEN** loading a dashboard discovers that a managed source predates its owner's settings
- **THEN** viewing alone does not persist a repair
- **AND** affected managed actions remain protected with guidance to reconcile through authoring

#### Scenario: A preview receives state updates
- **WHEN** the card or source view is previewed in native editing
- **THEN** service actions and runtime popup activation remain inert
- **AND** preview rendering cannot adopt, synchronize or recreate a source

### Requirement: Managed source navigation preserves popup lifecycle
Edit popup SHALL synchronize or validate its source before handing off a clean saved context to HA's native editor. Navigation SHALL remain in the owning dashboard, release modal ownership and retain a return path. Ordinary source edits SHALL retain native sizes, sections and visibility without exposing editing tools inside the runtime sheet.

#### Scenario: A source is edited after a settings change
- **WHEN** an administrator activates Edit popup after saving new popup settings
- **THEN** the current managed source opens in HA's editor with the new controls and preserved layout edits
- **AND** the action does not download a file or create a second source unnecessarily

#### Scenario: The user returns to the dashboard
- **WHEN** the administrator saves layout edits and returns to the origin
- **THEN** reopening the popup uses that same managed source
- **AND** focus, inert background, internal scrolling, title, close control and navbar layering retain their existing behavior

### Requirement: Managed group actions follow active source membership
Managed group summaries and section actions SHALL use the compatible configured members in the active popup layout, including hidden cards and excluding deleted controls. Updating parent options SHALL NOT broaden action scope through discovery, reintroduce suppressed members or weaken availability and strict-access protections.

#### Scenario: A member is hidden or deleted
- **WHEN** a member card is conditionally hidden
- **THEN** it remains a configured member of its section and group
- **WHEN** that card is deleted from the active source
- **THEN** it leaves summary and section-action scope, including after later settings synchronization

#### Scenario: The group is changed to covers
- **WHEN** a managed cover group contains ordinary covers and access covers
- **THEN** its managed actions use the explicit compatible source membership
- **AND** bulk opening still excludes access points requiring an individual deliberate slide
- **AND** unavailable or disconnected members remain protected and navigation dispatches no device action
