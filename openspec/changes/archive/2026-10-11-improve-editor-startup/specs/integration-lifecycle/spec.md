# Spec Delta

## MODIFIED Requirements

### Requirement: Content-versioned frontend registration
Marao SHALL serve assets under `/marao_dashboard_static` and register runtime
modules through HA frontend APIs. The fingerprint SHALL derive from actual
frontend file contents. Editor workers, deferred editor modules and styles,
and module resources SHALL use the current fingerprint; unload SHALL remove
the registered editor and owned module URLs. Deferred editor assets SHALL ship
with the integration and SHALL NOT require a CDN or extra user installation.

#### Scenario: A frontend asset changes
- **WHEN** the integration reloads after deployment
- **THEN** content-versioned resource URLs change and the refreshed browser loads current workspace assets

#### Scenario: JSON is first opened after an editor asset update
- **WHEN** the administrator requests the deferred editor in the refreshed panel
- **THEN** its module, styles and workers load from bundled resources with the panel's current fingerprint
- **AND** stale prior-version assets or external editor resources are not substituted
