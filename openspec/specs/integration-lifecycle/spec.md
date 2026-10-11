# Integration lifecycle

## Purpose

Install and manage Marao through Home Assistant while retaining owned resources,
administrator boundaries, user configuration and restorable generated versions.

## Requirements

### Requirement: Native integration setup
Marao SHALL be a single-entry HACS custom Integration with a Home Assistant config
flow. Setup SHALL register its static assets, runtime modules, admin editor,
generation service, theme and authenticated management commands. HACS users
SHALL NOT need Node, test dependencies or manual third-party card resources.

#### Scenario: First configuration
- **WHEN** the user adds the integration
- **THEN** Marao creates its initial configuration from enabled visible
  supported entities, generates the base dashboard and patches owned configuration
- **AND** later restarts preserve the saved dashboard rather than replacing user edits

### Requirement: Starter discovery and limited repair
Initial discovery SHALL exclude disabled, hidden and stateless registry entries,
group supported entities by entity/device area, and use a Home fallback room when
only supported unassigned entities exist. No supported entities SHALL produce a
valid empty starter. Discovery SHALL persist explicit membership once. Later
setup SHALL preserve saved membership, including empty dashboards; generated-asset
repair SHALL NOT repopulate contents from the registry.

#### Scenario: Entities become available after an empty first setup
- **WHEN** setup encounters a saved empty starter and newly discovered supported entities
- **THEN** it preserves that empty configuration rather than adding rooms or entities automatically
- **AND** the administrator can add supported entities through the editor

#### Scenario: An existing user configuration is not a recognized starter
- **WHEN** setup encounters that configuration
- **THEN** it preserves the user's source instead of resetting it from the registry

#### Scenario: First setup creates populated rooms
- **WHEN** no saved configuration exists and supported entities are assigned to HA areas
- **THEN** discovery creates useful explicit room contents with optional suggestion-area associations
- **AND** subsequent registry changes do not alter that membership

#### Scenario: A saved dashboard is intentionally emptied
- **WHEN** the administrator saves an empty room or removes all rooms and restarts
- **THEN** setup preserves the saved empty contents even under the default dashboard name and slug

### Requirement: Administrator management API
The editor at `/marao-dashboard-editor` and WebSocket commands
`marao_dashboard/config/get`, `marao_dashboard/config/generate`, and
`marao_dashboard/history/restore` SHALL require administrator access. Validation
failures SHALL return readable structured errors without accepting invalid data.

#### Scenario: A non-administrator attempts management
- **WHEN** a non-administrator calls a builder management command
- **THEN** Home Assistant denies the request rather than exposing or modifying dashboard configuration

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

### Requirement: Generation service and dry run
`marao_dashboard.generate_dashboard` SHALL accept the configured JSON path,
optional dashboard key, and `dry_run`. A dry run SHALL validate and plan without
writing generated output or patching Home Assistant configuration.

#### Scenario: A configuration is checked before generation
- **WHEN** the service is called with `dry_run: true`
- **THEN** it returns the planned dashboard key/files without modifying the existing dashboard

### Requirement: Local version history and restoration
Successful generations SHALL retain local snapshots of JSON and the exact
generated dashboard directory, including custom cards, under
`dashboard/MaraoDashboard/.history`. History SHALL retain the latest 20 distinct
versions, avoid duplicate identical snapshots, and validate restore identifiers.
The current version SHALL be saved before a restore.

#### Scenario: An administrator restores an earlier version
- **WHEN** a valid stored version is selected and confirmed
- **THEN** its JSON and exact generated directory are restored together
- **AND** the previous current version remains available to undo the restoration

#### Scenario: A restore identifier is malformed or missing
- **WHEN** the requested version does not identify a valid snapshot
- **THEN** restoration reports an error rather than reading arbitrary paths or claiming success

### Requirement: Validated save and recoverable generation
Save & Generate SHALL preflight configuration before replacing saved JSON and
snapshot a valid current dashboard before regeneration. If generation fails and
that baseline exists, JSON and generated files SHALL be restored together. Failures
SHALL remain errors; an absent/invalid baseline SHALL NOT imply guaranteed rollback.

#### Scenario: Generation fails after a valid baseline was saved
- **WHEN** Save & Generate encounters a generation exception
- **THEN** it reports failure and restores the prior JSON and generated directory

### Requirement: Owned configuration and legacy migration
Theme/dashboard configuration patches and legacy resource migration SHALL preserve
unrelated settings and cards. Only exact owned legacy entries SHALL be migrated
or removed; ambiguous/manual leftovers SHALL be surfaced through the existing
Repair flow. A changed dashboard key SHALL replace only the previous owned
registration, leaving unrelated dashboards intact.

#### Scenario: A legacy resource resembles an unrelated resource
- **WHEN** migration cannot identify it as an exact owned legacy entry
- **THEN** it leaves the unrelated resource intact and reports any required manual repair

### Requirement: Bundled theme synchronization
Setup/reload SHALL synchronize bundled Marao theme files into
`themes/MaraoDashboard`; local edits to those owned copies can be replaced.
Unrelated themes SHALL be preserved.

#### Scenario: An installed Marao theme differs from the bundled theme
- **WHEN** the integration sets up or reloads
- **THEN** the owned theme copy is updated from the bundle while unrelated theme files remain intact

### Requirement: Recoverable conversion to explicit room membership
Legacy room configuration SHALL convert to explicit membership once. Existing
entity lists, including empty lists, SHALL take precedence over area expansion;
area-only legacy rooms SHALL receive one snapshot. Explicit include/exclude and
overrides SHALL retain their effective selections/options. Conversion SHALL
preserve unknown fields, raw cards, layout and navigation, retain a recoverable
baseline, be idempotent and keep dry runs and read-only previews free of writes.

#### Scenario: A legacy explicit list was edited in JSON
- **WHEN** a legacy room contains an area association and a shortened or empty entity list
- **THEN** conversion uses that list and explicit legacy adjustments without discovering omitted area entities
- **AND** the converted room retains the area as suggestion metadata only

#### Scenario: A legacy room has only an area source
- **WHEN** conversion encounters an unconverted room without an explicit list
- **THEN** it snapshots its effective supported area entities once, including applicable legacy adjustments
- **AND** subsequent conversions and registry updates do not expand it again

#### Scenario: A current-format entity property is removed
- **WHEN** the administrator deletes that property after conversion
- **THEN** it represents an empty room rather than restarting legacy discovery

#### Scenario: Conversion fails or is previewed
- **WHEN** validation fails, conversion cannot safely complete, or the request is a dry run/read-only preview
- **THEN** no saved JSON or generated output is replaced by that attempt
- **AND** failures remain readable errors with the original baseline retained

#### Scenario: Historical configuration is restored
- **WHEN** an old version containing an area-linked configuration is restored
- **THEN** the historical JSON and generated directory retain the existing exact-restore behavior
- **AND** its next edit/save follows explicit-membership conversion without rewriting the stored historical version

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
