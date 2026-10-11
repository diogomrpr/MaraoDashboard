# Spec Delta

## ADDED Requirements

### Requirement: Versioned page-model conversion
Historical sources SHALL convert through ordered versions into editable pages, preserving routes/names/icons, navigation, selected cards/entities, options, layouts, explicit emptiness/deletions, unknown/raw/protected content. Derived selections SHALL resolve once under accepted room-membership rules. Ambiguous or unsupported input SHALL fail before mutation instead of resetting the dashboard.

#### Scenario: An installed dashboard uses every former guided page
- **WHEN** its configuration is upgraded
- **THEN** independent editable pages retain its alarm/access/actions, energy periods/history/loads, charging controls/presets and player/remote/app settings
- **AND** its existing routes, navbar choices and custom content remain usable

#### Scenario: Historical selections are explicitly empty
- **WHEN** conversion processes empty access/player/card selections or removed optional pages
- **THEN** those selections remain empty or absent instead of being replaced by template or registry defaults

#### Scenario: A source mixes conflicting old and new page models
- **WHEN** compatibility preflight cannot determine one unambiguous saved configuration
- **THEN** it reports a readable error without overwriting source, generated files or unrelated HA settings

#### Scenario: An already-converted source is processed again
- **WHEN** setup, preview or generation loads it
- **THEN** no page/cards are added and no discovery or format conversion repeats

### Requirement: Recoverable page migration across entry points
Setup, Save & Generate, service generation and compatible history restoration SHALL share page compatibility preflight and the existing upgrade recovery path. Writable conversion SHALL retain an exact private baseline before replacing source/output/affected owned state; failure SHALL report and recover that baseline. Previews and dry runs SHALL write nothing. Archives SHALL remain immutable; rollback SHALL restore a matching package and data baseline.

#### Scenario: Page conversion is previewed
- **WHEN** the editor reads an old source or a service performs a dry run
- **THEN** it returns compatible editable data or a readable error without modifying source, history, generated output or HA configuration
- **AND** an unsaved editor draft is not overwritten

#### Scenario: Generation fails after migration preflight
- **WHEN** a writable page conversion fails after capturing the exact baseline
- **THEN** the operation reports failure and restores the affected source, output and owned state together
- **AND** incomplete recovery remains a reported error with retained private recovery data

#### Scenario: An archived older dashboard is restored
- **WHEN** its source and generated component contracts pass compatibility preflight
- **THEN** its exact snapshot is restored without rewriting the archive and its active copy can subsequently migrate through normal writable generation
- **AND** incompatible restoration is rejected before replacing current data

### Requirement: Current-format starter creation without rediscovery
First configuration with no saved source SHALL create ordinary editable Home, Rooms and room-detail pages through the same starter/card contracts. Supported entities SHALL populate those initial snapshots once. Subsequent setup SHALL preserve saved pages, landing choice and deletions, including empty pages, rather than recreating named template pages or synchronizing their membership. Invalid saved data SHALL NOT be treated as missing first-run data.

#### Scenario: A fresh integration has no supported entities
- **WHEN** its initial source is created
- **THEN** it has a valid editable landing page without fabricated entity dependencies or warning cards

#### Scenario: An edited starter contains no cards
- **WHEN** Home Assistant restarts
- **THEN** that saved page remains empty and starter repair does not replace the user's deliberate configuration
