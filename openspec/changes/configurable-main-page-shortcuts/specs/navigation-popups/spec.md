## ADDED Requirements

### Requirement: Configurable main-page shortcuts
The main page SHALL show independently configurable Clear cache and administrator editor shortcuts, enabled when their respective flags are omitted. The editor shortcut SHALL use a pencil icon, the existing 48px round design and the actual configured editor route. It SHALL require current administrator privileges. Both shortcuts SHALL retain edit, preview, modal and ownership protection without depending on nonempty navbar routes.

#### Scenario: Administrator opens the main page
- **WHEN** an administrator opens the main page with editor-route metadata and default shortcut settings
- **THEN** a pencil button appears beside Clear cache and opens the actual editor route internally
- **AND** no source is saved by opening the editor

#### Scenario: Settings are independent
- **WHEN** either shortcut flag is false or both are false
- **THEN** only the corresponding buttons are hidden and an empty row leaves no spacing
- **AND** the existing navbar hold keeps administrator Maintenance and regular-user direct refresh behavior

#### Scenario: Permission or context changes
- **WHEN** the user loses administrator status, the current main view changes, editing/preview/modal ownership changes or editor metadata is absent
- **THEN** stale pencil controls cannot navigate and regular users receive no editor shortcut

#### Scenario: Navigation is empty
- **WHEN** configured navbar routes are deliberately empty
- **THEN** enabled main-page shortcuts remain usable without inserting any route or hidden hold target
