# Spec Delta

## ADDED Requirements

### Requirement: Independent visual editor startup
The default Visual editor SHALL become usable without downloading, evaluating or
initializing JSON-only editor code, styles or workers. While saved configuration
is loading, it SHALL show localized progress and block actions requiring that
document. Once available, the document SHALL populate the normal visual controls
without waiting for optional JSON assets.

#### Scenario: An administrator opens the editor on Visual
- **WHEN** configuration and required visual resources are available
- **THEN** the visual controls become usable without any JSON-only asset request
- **AND** the initial empty content area is replaced by explicit loading feedback until ready

#### Scenario: The administrator selects JSON before configuration is ready
- **WHEN** the saved document is still loading
- **THEN** the tab cannot initialize with missing configuration or replace it with an empty draft
- **AND** Save, History and Open dashboard do not act on incomplete data

### Requirement: Deferred JSON editing preserves the draft
The existing bundled JSON editor SHALL load only when requested, show localized
progress, and reuse successful initialization during the current panel lifetime.
Visual edits and unknown fields SHALL survive asynchronous initialization and tab
switching. Formatting, schema assistance, entity suggestions and invalid-JSON
protection SHALL remain available. A superseded tab request SHALL NOT steal focus.

#### Scenario: JSON is opened after unsaved Visual edits
- **WHEN** its resources finish loading
- **THEN** the editor displays the current draft with existing JSON assistance
- **AND** saved configuration and generated dashboard remain unchanged

#### Scenario: The requested tab changes while JSON loads
- **WHEN** the administrator returns to Visual before JSON is ready
- **THEN** completion does not switch back to JSON, lose edits or move focus unexpectedly

#### Scenario: An initialized JSON tab is reopened
- **WHEN** the administrator returns to JSON in the same connected panel lifetime
- **THEN** it reuses its editor without duplicate instances, listeners or workers

### Requirement: Recoverable editor loading
Initial configuration and JSON initialization SHALL each have at most one
concurrent attempt. Failure SHALL show a localized readable error and explicit
retry, preserve usable controls and drafts, and avoid automatic repeated requests
on unrelated HA updates. Removal or replacement of the panel SHALL prevent late
completion from overwriting its current document or accessing disposed controls.

#### Scenario: Configuration loading fails
- **WHEN** the management response reports an error
- **THEN** the error and retry are visible and unrelated HA updates do not repeat the request
- **AND** a deliberate retry can load the saved document once

#### Scenario: A JSON resource fails
- **WHEN** the administrator requests JSON and a required asset cannot load
- **THEN** the existing Visual draft remains usable and unchanged
- **AND** explicit retry recovers JSON without dispatching Save or resetting the draft

#### Scenario: Repeated events occur during initialization
- **WHEN** HA updates, duplicate tab activations or panel removal occur before an attempt settles
- **THEN** concurrent duplicate work is not started and obsolete completion is not applied
