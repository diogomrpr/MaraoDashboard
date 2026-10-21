## MODIFIED Requirements

### Requirement: Content-versioned frontend registration
Marao SHALL register a no-store bootstrap under HA's network-only `/api/`
namespace. It SHALL select the installed content fingerprint before importing
runtime modules. Module dependencies, deferred editor modules, styles and workers
SHALL use the selected fingerprint's API path. Unload SHALL remove the registered
editor and owned module URLs. Assets SHALL ship with the integration and SHALL
NOT require a CDN or extra user installation. The previous flat entry URL SHALL
remain a compatible bootstrap when requested from the server.

#### Scenario: Cached bootstrap URL after an update
- **WHEN** cached dashboard HTML requests a bootstrap URL bearing an older fingerprint
- **THEN** the server selects the currently installed fingerprint without a manual cache clear
- **AND** all imported Marao assets use that fingerprint's path

#### Scenario: A frontend asset changes
- **WHEN** the integration reloads after deployment
- **THEN** content-versioned resource URLs change and the refreshed browser loads current workspace assets

#### Scenario: Stale or partially replaced asset
- **WHEN** an asset request names another fingerprint or its bytes changed after setup
- **THEN** the server rejects it without cacheable wrong-version content

#### Scenario: Public static boundary
- **WHEN** a caller requests an unlisted path or traversal through the asset endpoint
- **THEN** no file outside the reviewed frontend snapshot is returned

#### Scenario: JSON is first opened after an editor asset update
- **WHEN** the administrator requests the deferred editor in the refreshed panel
- **THEN** its module, styles and workers load from bundled resources with the panel's current fingerprint path
- **AND** stale prior-version assets or external editor resources are not substituted
