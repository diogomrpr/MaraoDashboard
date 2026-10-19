# Integration lifecycle delta

## MODIFIED Requirements

### Requirement: Content-versioned frontend registration
Marao SHALL serve assets under `/marao_dashboard_static` and register runtime modules through HA frontend APIs. The fingerprint SHALL derive from actual frontend contents. Background and foreground editor modules, styles, fonts and workers SHALL use the current fingerprint; unload SHALL remove registered editor and owned module URLs. Deferred assets SHALL ship with the integration without a CDN or extra installation. Optional editor assets SHALL remain outside the eager Visual dependency graph.

#### Scenario: A frontend asset changes
- **WHEN** the integration reloads after deployment
- **THEN** content-versioned resource URLs change and the refreshed browser loads current workspace assets

#### Scenario: JSON is first opened after an editor asset update
- **WHEN** the administrator requests the deferred editor in the refreshed panel
- **THEN** its module, styles and workers load from bundled resources with the panel's current fingerprint
- **AND** stale prior-version assets or external editor resources are not substituted

#### Scenario: JSON resources are prepared in the background
- **WHEN** a refreshed panel prepares JSON resources before the first tab selection
- **THEN** preparation and foreground use resolve the same versioned resource and applicable locale identities
- **AND** foreground opening reuses successful preparation without duplicate module initialization or worker instances
- **AND** a failed or obsolete preparation cannot substitute unversioned or prior-version resources

#### Scenario: The editor is built for Visual startup
- **WHEN** the integration's editor assets are generated and checked
- **THEN** optional JSON resources remain separate from the Visual startup module and stylesheet
- **AND** enabling background preparation does not increase the approved eager asset budgets

## ADDED Requirements

### Requirement: Scoped management reads
The administrator management API SHALL support an initial visible-editor read, deferred editing-context read and History-only read while preserving the existing full response by default and existing source-preview behavior. Each scope SHALL compute and return only its required products. Scope selection SHALL retain administrator checks, recovery guards, structured errors and read-only source/history preservation.

#### Scenario: A current-format initial read is requested
- **WHEN** the editor requests only its initial visible-control data
- **THEN** the backend returns the complete authoritative source and required display context without generating creation templates, enumerating History or building a full entity/area metadata payload
- **AND** metadata collection uses the required visible entity IDs rather than a full registry collection followed by filtering

#### Scenario: Deferred context or History is requested
- **WHEN** the editor requests broader editing context or History
- **THEN** each response contains the related requested data without returning the dashboard source again
- **AND** History-only reads do not collect registry data or create templates, and context-only reads do not enumerate History

#### Scenario: An existing caller reads or previews configuration
- **WHEN** a caller omits the new scope selector or previews an explicit supported source using the existing request shape
- **THEN** it receives the existing full response and compatible conversion behavior
- **AND** unknown fields, raw content, explicit emptiness, order and saved state remain preserved

#### Scenario: Historical conversion requires metadata
- **WHEN** an initial read encounters a supported historical configuration needing entity or area context for conversion
- **THEN** the backend obtains that required context through the shared ordered conversion path before returning the complete compatible document
- **AND** conversion does not infer empty selections from deferred metadata, write saved state or rewrite archived history

#### Scenario: Scope selection is invalid or access is unauthorized
- **WHEN** a caller supplies an unsupported scope, combines a scoped read with an incompatible explicit-source preview, or lacks administrator access
- **THEN** the request fails with the appropriate structured validation or authorization error without exposing or modifying editor data

#### Scenario: Recovery data requires attention
- **WHEN** an existing operation checkpoint prevents consistent editor access
- **THEN** scoped reads retain the existing readable recovery failure instead of returning inconsistent partial data or bypassing recovery
