# Spec Delta

## ADDED Requirements

### Requirement: Authoring-free runtime popups
Runtime popup sheets SHALL omit layout creation and editing tools, including Create editable layout and Edit layout, for administrators and other viewers. Opening, loading, previewing, closing and refreshing a popup SHALL NOT create or link a persistent layout. Existing title, close, product controls, errors, internal scrolling and modal behavior SHALL remain available.

#### Scenario: An administrator opens automatic details
- **WHEN** an administrator opens an automatic popup during normal dashboard use
- **THEN** its configured product content appears without a layout-authoring toolbar
- **AND** the saved dashboard remains unchanged

#### Scenario: An administrator opens linked details
- **WHEN** an administrator opens a popup with a saved source view
- **THEN** the saved native layout appears without runtime editing tools
- **AND** source card order, dimensions, visibility and deliberate deletions remain authoritative

#### Scenario: The popup is a transient detail
- **WHEN** a light picker, history drill-in or error sheet is opened
- **THEN** it retains its existing controls without becoming a persistent editable layout

### Requirement: Popup source editor navigation
Popup authoring navigation SHALL stay within the owning dashboard and enter HA's normal source-view editor with its native shell unobstructed. Any open sheet SHALL release modal ownership before navigation. The source SHALL retain a return path to the originating view; returning and reopening the popup SHALL display its saved layout without regeneration or device actions.

#### Scenario: Editing navigation leaves an open sheet
- **WHEN** an authorized source-editor navigation occurs with a popup open
- **THEN** the sheet closes and releases its inert background, focus ownership, content and listeners before navigation
- **AND** the source editor is usable without an overlay intercepting input

#### Scenario: The saved layout is reopened
- **WHEN** the administrator saves native layout edits, returns to the originating view and opens the popup
- **THEN** the popup uses the same saved source, including resized, moved or removed cards and empty sections
- **AND** no default content is refilled and no entity service is dispatched by navigation

#### Scenario: Edit mode owns the dashboard
- **WHEN** dashboard or card previews render while native editing is active
- **THEN** physical actions remain inert and runtime popups do not open through the authoring surface
- **AND** the dedicated Edit popup authoring action remains available for supported saved owners without enabling product actions
