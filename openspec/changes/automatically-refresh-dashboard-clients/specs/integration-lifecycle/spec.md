## ADDED Requirements

### Requirement: Refresh after every successful editor generation
Every successful Save & Generate SHALL request frontend cache cleanup and dashboard reload on connected clients viewing the affected generated dashboard, regardless of version or content equality. Failed operations, previews and dry runs SHALL NOT emit this request. Receiving a refresh SHALL NOT invoke generation or entity actions.

#### Scenario: Repeated unchanged saves
- **WHEN** an administrator successfully saves and generates twice with identical content and frontend version
- **THEN** each operation delivers a distinct refresh request to connected administrator and regular-user dashboard sessions
- **AND** each eligible session refreshes once per request without a version condition

#### Scenario: Generation does not succeed
- **WHEN** validation, generation or required post-generation processing fails, or a preview or dry run is performed
- **THEN** no automatic refresh request is emitted for that operation

### Requirement: Automatic recovery after frontend updates
Clients with the update handler SHALL compare their loaded frontend identity with the active server identity on initial connection, reconnection, return to the foreground and server update notification. A mismatch SHALL request frontend cache cleanup and reload without Save & Generate. Matching identities SHALL NOT trigger refresh merely because the dashboard opens or reconnects.

#### Scenario: Update while an app session is open
- **WHEN** a newer frontend becomes active and the client receives its identity
- **THEN** the client requests a refresh without an editor save
- **AND** a client already running that identity does not refresh for the update notification

#### Scenario: Return after an update
- **WHEN** a handler-equipped client returns from suspension or reconnects after an update
- **THEN** it checks the active server identity and refreshes if outdated

### Requirement: Safe bounded automatic frontend refresh
Automatic refresh SHALL preserve the current route including query and fragment, authentication, preferences and saved dashboard data. It SHALL defer while hidden, unreachable, editing or interacting, then resume when safe. Duplicate delivery and overlapping triggers SHALL NOT create concurrent reloads or automatic retry loops. Failures SHALL remain visible with manual recovery available.

#### Scenario: Save arrives during editing or interaction
- **WHEN** a refresh request reaches a client with unsaved edits, edit mode, an open control popup or an active gesture
- **THEN** cleanup and reload wait until those conditions are resolved
- **AND** no edits or partial gestures are discarded and no entity action is dispatched by recovery

#### Scenario: Hidden or temporarily offline client
- **WHEN** a connected client receives a request but cannot safely refresh before becoming hidden or losing connectivity
- **THEN** it retains pending work and attempts it after foreground connectivity is restored
- **AND** it does not erase useful caches while unreachable

#### Scenario: Duplicate or overlapping refresh requests
- **WHEN** a request is delivered more than once or save and version triggers overlap before completion
- **THEN** one refresh can satisfy the pending requests
- **AND** the reloaded document does not repeat already attempted work automatically

#### Scenario: Reload fails to obtain current assets
- **WHEN** one automatic recovery attempt leaves the client stale or reports failure
- **THEN** it exposes a readable recovery failure and allows manual navbar refresh
- **AND** it does not repeatedly clear caches and reload for the same request or target version

### Requirement: Authenticated refresh coordination
Refresh identity and subscription access SHALL be available to authenticated dashboard users without exposing configuration or granting generation permissions. Only successful authorized generation and integration lifecycle updates SHALL originate automatic refresh signals. Coordination SHALL NOT force reloads of unrelated dashboards or administrative pages.

#### Scenario: Regular dashboard user receives refresh
- **WHEN** a non-administrator subscribes to refresh coordination
- **THEN** the user can receive applicable signals and frontend identity
- **AND** cannot use that access to generate dashboards, read administrative configuration or broadcast refresh requests

#### Scenario: User is on another page
- **WHEN** a signal arrives while the user is outside the affected generated dashboard
- **THEN** the current page is not forcibly reloaded
- **AND** pending applicable recovery is considered when the generated dashboard is entered

### Requirement: First deployment and compatibility boundary
The feature SHALL preserve existing generator formats, protected content, historical migrations and independent dashboards. Documentation SHALL state that clients running code without the new handler need to load it before automatic recovery is available; refresh success SHALL be distinguished from successful generation.

#### Scenario: Older session has no handler
- **WHEN** the first release containing automatic recovery is installed
- **THEN** already-loaded older clients are not claimed to respond automatically
- **AND** the manual navbar refresh remains the bootstrap recovery path

#### Scenario: Client cannot recover after a committed save
- **WHEN** generation succeeds but a client's cache cleanup or reload fails
- **THEN** generation remains committed and the client recovery failure is reported separately
- **AND** no saved source, generated output or history is rolled back because of that client failure
