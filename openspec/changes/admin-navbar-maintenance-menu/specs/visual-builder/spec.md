# Spec Delta

## ADDED Requirements

### Requirement: On-demand administrator editor access
Administrators SHALL access the existing dashboard editor from the navbar maintenance menu when configured editor-route metadata exists, without a permanent dashboard editor shortcut. Access SHALL retain custom dashboard roots, collision-safe paths, current draft behavior and Home Assistant authorization. An empty navbar SHALL leave the existing direct editor route intact without creating new navigation entries.

#### Scenario: An administrator selects Edit dashboard
- **WHEN** an authorized administrator chooses Edit dashboard in the maintenance menu
- **THEN** Home Assistant navigates internally to the actual editor route for that dashboard
- **AND** no configuration, route, selection or unsaved draft is changed merely by opening it

#### Scenario: Editor metadata is absent
- **WHEN** an administrator opens maintenance on a navbar without a configured editor route
- **THEN** refresh remains available and no guessed editor link is offered

#### Scenario: A regular user tries a stale editor action
- **WHEN** the current user is no longer an administrator or the owning dashboard has changed
- **THEN** retained menu controls cannot activate editor navigation
- **AND** existing Home Assistant authorization continues to protect editor writes

#### Scenario: Navigation is empty
- **WHEN** an administrator deliberately configures no navbar routes
- **THEN** the direct editor address remains valid and documented as the bookmark fallback
- **AND** no persistent editor button or replacement dashboard is created
