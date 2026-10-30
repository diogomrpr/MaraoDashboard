# Spec Delta

## MODIFIED Requirements

### Requirement: JSON source and generated output
After explicit conversion, ordinary HA views, sections and card objects SHALL be the sole active configuration. Historical source compilation SHALL remain read-only until an administrator explicitly imports its output. Existing card identities and supported overrides SHALL retain their meaning. Retained original source SHALL be recovery/provenance data, never a second active source.

#### Scenario: A supported entity is added to a room
- **WHEN** an administrator adds its Marao card using HA's native editor
- **THEN** the saved native card and its overrides render directly without builder regeneration

#### Scenario: Native content is edited after conversion
- **WHEN** a card is removed, a view is reordered or an unknown native option is added and saved
- **THEN** rendering, restarts and package updates preserve that ordinary configuration
- **AND** no old source snapshot or discovery result replaces it

### Requirement: Refreshing committed dashboard output
Native configuration changes SHALL use HA's normal dashboard save/update lifecycle. Conversion previews SHALL NOT write or refresh dashboards. Marao SHALL NOT regenerate server YAML, reload the integration or force full-client cache cleanup after each native edit. Existing package-update recovery SHALL continue independently.

#### Scenario: An included group changes without changing the main YAML
- **WHEN** a historically included group is converted to a native group and its membership is saved through HA
- **THEN** open clients receive the native saved membership, including an explicitly empty list
- **AND** no legacy include, service-generation or history-restore operation is required

### Requirement: Configuration shapes and validation
Historical conversion SHALL accept supported shorthand, page/section structures, raw cards and legacy selection overrides, validating paths, bindings, references and original layout limits before import. Native card validation SHALL preserve HA's own layout and visibility options without imposing retired builder page/grid restrictions on the ordinary dashboard.

#### Scenario: A custom page uses an existing room path
- **WHEN** historical configuration is converted
- **THEN** conversion rejects the collision before replacing native configuration

#### Scenario: A raw card or column count has an invalid shape
- **WHEN** historical configuration is converted
- **THEN** validation reports the invalid source rather than emitting malformed output

#### Scenario: A template-created card has an invalid binding
- **WHEN** historical configuration is converted
- **THEN** the error identifies the page and card and leaves the existing saved dashboard unchanged

#### Scenario: Legacy explicit options are converted
- **WHEN** a room supplies explicit entities with include/exclude/overrides
- **THEN** conversion produces the effective explicit selection with its options preserved
- **AND** later registry changes do not add members to that selection

#### Scenario: A native layout exceeds former builder choices
- **WHEN** HA saves a valid native card/section layout or visibility configuration
- **THEN** Marao preserves it without requiring the former one-through-six-column source model

### Requirement: Native summaries and generated popups
Converted summaries SHALL retain explicit membership, summary options and popup filters. Climate, access, media, camera, groups, scenes, energy and floor-plan cards SHALL retain their detail behavior through card-owned composition. Automatic details SHALL remain independent across occurrences, while compatible explicit popup references and custom content retain their intended targets.

#### Scenario: The primary summary entity is unavailable but another is usable
- **WHEN** a converted summary and popup render
- **THEN** secondary usable entities remain reachable and the current partial-availability presentation is retained

#### Scenario: A light summary is created from Home
- **WHEN** its configured active-only popup is opened
- **THEN** only active selected lights appear while the summary considers its configured membership

#### Scenario: Two Energy or Media starters use the same entity
- **WHEN** their differently named converted cards open their respective details
- **THEN** each opens the correct occurrence's content without shared options or popup collisions

#### Scenario: Explicit overview groups replace defaults
- **WHEN** historical source contains an explicit overview group list
- **THEN** conversion retains only those groups in their configured order
- **AND** an explicit empty list suppresses those groups while preserving weather and scenes

## ADDED Requirements

### Requirement: Historical composition scope
Legacy composition requirements SHALL apply to supported historical conversion and read-only source rendering. They SHALL NOT require discovery, file generation or regeneration over an ordinary native dashboard. Existing native content SHALL remain authoritative after explicit conversion.

#### Scenario: A package update loads a converted dashboard
- **WHEN** legacy source/composition support is present in the installed package
- **THEN** ordinary native configuration remains untouched
- **AND** historical source is used only for explicit conversion or read-only rendering of an unconverted source document

### Requirement: Conversion-only dashboard assembly
The complete converted dashboard SHALL preserve the source's landing page, paths, mixed order, fixed/automatic resolved layout, empty sections, raw cards and custom popup content. Individually editable cards SHALL be materialized without nested strategies or a generated whole-dashboard wrapper. Conversion SHALL NOT alter unrelated registrations, themes, files or dashboards.

#### Scenario: A mixed dashboard is converted
- **WHEN** source contains a full-page floor plan, raw HA card, explicit empty section and independently configured duplicate cards
- **THEN** the native output retains those occurrences and intended layout/order
- **AND** each ordinary card is editable through HA without regenerating its containing page

## REMOVED Requirements

### Requirement: Expanded native starter generation
**Reason**: This change establishes native editing and explicit existing-dashboard conversion without introducing another automatic discovery strategy or a new guided starter product.

**Migration**: Convert a saved Marao dashboard explicitly, or create an ordinary empty HA dashboard and add Marao cards. Existing starter/composition helpers remain available only where needed for supported historical imports; saved or empty native content is never refilled.
