# Interactive documentation

## Purpose

Help users understand, configure and try released Marao cards through accurate guides and safe interactive examples.

## ADDED Requirements

### Requirement: Complete released reference
The website SHALL document every public card and dashboard feature with settings and materially distinct behavior examples. Published prose and previews SHALL match a stable release. Existing public documentation URLs SHALL reach their replacement content.

#### Scenario: A user opens a card reference
- **WHEN** a public card is selected
- **THEN** its purpose, compatible entities, options, scenarios and copyable configuration are available

#### Scenario: Unreleased source changes
- **WHEN** the main branch changes before release
- **THEN** checks can build it but the public site remains on its matching released version

### Requirement: Editable real card preview
The playground SHALL render actual Marao components with synchronized settings and YAML. It SHALL retain unknown fields and explicit empty values, distinguish invalid drafts, and export public configuration without simulation data.

#### Scenario: Preview before editing
- **WHEN** a card reference first loads
- **THEN** its live preview is visible and editing controls are hidden until Open playground is selected
- **AND** Exit playground hides those controls without losing the current draft or recreating the preview

#### Scenario: Configuration editing
- **WHEN** a user changes a valid setting or YAML field
- **THEN** the preview updates and copied YAML represents that configuration

#### Scenario: Themed settings
- **WHEN** the documentation uses its light or dark appearance
- **THEN** the site and parameter controls use the shipped Marao palette and Montserrat typography
- **AND** settings remain hidden until playground mode is opened

#### Scenario: Light color popup
- **WHEN** a user opens the preview light's color popup
- **THEN** the popup remains interactive while the background is inert, with its color, temperature and brightness controls reachable
- **AND** changing the color or white temperature updates the fictional light's reported color and mode coherently

#### Scenario: Invalid YAML
- **WHEN** the draft is invalid
- **THEN** an error is visible, the last valid preview remains and valid-configuration export is disabled

### Requirement: Desktop playground layout
On sufficiently wide documentation layouts, the playground SHALL show equal-height settings and preview panels side by side. Their shared height SHALL be based on 80% of the viewport, capped at 900px and reduced where necessary to accommodate surrounding controls. The settings body SHALL scroll independently while its tabs and export/reset actions remain visible. Cards SHALL retain their natural mobile presentation inside the preview.

#### Scenario: Long settings list on desktop
- **WHEN** the user scrolls through settings in an open desktop playground
- **THEN** the preview remains visible in its matching panel and the page does not scroll with the settings list
- **AND** Settings/YAML, Copy YAML and Reset remain reachable without scrolling the settings back to the top

#### Scenario: Available desktop width
- **WHEN** playground mode opens on desktop
- **THEN** the page outline gives its space to the playground and the playground is brought below the site header
- **AND** exiting restores the outline without losing the draft or recreating the preview

#### Scenario: Narrow layouts and tall preview content
- **WHEN** the available content width cannot fit both panels
- **THEN** the playground uses its stacked, naturally scrolling layout
- **AND** long preview content and popups remain scrollable and operable within their available viewport

### Requirement: Searchable setting choices
Settings with catalog choices or meaningful suggestions SHALL use a themed dropdown containing a search box. Icons SHALL have visual previews. Suggestions SHALL come from shipped catalogs or fictional example context; installation-specific fields SHALL retain custom values. Known entity domains and compatible energy units SHALL constrain suggestions. Changing choices SHALL preserve native value types, unknown fields and ordered member metadata.

#### Scenario: Search icons or entities
- **WHEN** a user searches a suggested setting
- **THEN** matching names and values appear, with icon previews or entity names and IDs where applicable
- **AND** open suggestion fields accept a custom value without contacting Home Assistant

#### Scenario: Choose a typed value or edit membership
- **WHEN** a user chooses numeric precision, a column count, or a list member
- **THEN** copied YAML retains the numeric or array type and preserves unedited member descriptors and order
- **AND** choosing the default clears the optional override instead of exporting a display label

#### Scenario: Search inside a bounded editor
- **WHEN** a dropdown opens near the edge of the settings panel
- **THEN** its search and choices remain visible outside the panel's clipping boundary
- **AND** keyboard selection, Escape dismissal and closing playground mode remain operable

### Requirement: Isolated interactive scenarios
Playground actions SHALL operate only on fictional in-memory devices. The preview SHALL isolate navigation, service calls and assets from real accounts and devices. Unsupported HA-owned surfaces SHALL be identified honestly.

#### Scenario: Device action
- **WHEN** a supported demo control is activated
- **THEN** its fictional state responds without connecting to Home Assistant
- **AND** the card shows its state change directly without explanatory action labels

#### Scenario: Unsupported operation
- **WHEN** an operation is not supported by the website preview
- **THEN** the user receives a clear limitation instead of a false success

### Requirement: Checked documentation maintenance
Documentation checks SHALL detect missing public-card references, invalid example configuration, broken internal links and stale example references. Project rules, historical records and essential migration/recovery instructions SHALL remain available.

#### Scenario: New public card
- **WHEN** a public card is added without a reference and behavior examples
- **THEN** the documentation coverage check fails
