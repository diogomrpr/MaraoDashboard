# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
