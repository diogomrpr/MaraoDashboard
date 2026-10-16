# Spec Delta

## MODIFIED Requirements

### Requirement: Navigation composition and entity-free links
Generated navigation SHALL target the active dashboard root, use at most six
navbar entries, and include the shared bottom spacer exactly once. Custom room
cards SHALL precede the footer. Room/page shortcuts SHALL work without fabricated
entity dependencies; `action: none` headings SHALL be noninteractive.

#### Scenario: An empty room is configured
- **WHEN** its room shortcut is activated
- **THEN** navigation opens that room without requiring an unrelated entity

#### Scenario: Explicit navbar pages are ordered
- **WHEN** `navigation` contains page paths or objects with `page`
- **THEN** they replace automatic routes in their configured order, subject to the six-entry limit

#### Scenario: No navbar selection is supplied
- **WHEN** navigation is generated
- **THEN** the first five available generated pages are selected automatically, preserving the existing default rather than adding a sixth destination because capacity increased

#### Scenario: Legacy URL entries are supplied without explicit page entries
- **WHEN** navigation is generated
- **THEN** label/URL entries append to automatic routes and the combined six-entry limit is validated

#### Scenario: Explicit navigation exceeds capacity
- **WHEN** a generated configuration resolves to more than six routes
- **THEN** preflight reports the six-entry limit before replacing saved or generated output
- **AND** no configured route is silently dropped to make the source pass

### Requirement: Universal page routes and landing selection
All saved pages SHALL have unique editable paths and a valid configured landing page. Renaming a page SHALL update owned navbar, shortcut and generated-popup references. Navbar routes SHALL remain rooted at the active dashboard and limited to six entries; unpinned saved pages SHALL still be generated. Deleted pages SHALL NOT return from defaults, registry discovery or template metadata.

#### Scenario: A former built-in page path changes
- **WHEN** Home or Energy receives a new valid path
- **THEN** owned links and generated files follow it and no duplicate old generated view remains

#### Scenario: There are more than five pages
- **WHEN** configuration is generated with five selected navbar entries
- **THEN** every saved page remains reachable through its valid route or configured shortcut while only the selected five appear in the navbar

#### Scenario: There are more than six pages
- **WHEN** configuration is generated with six selected navbar entries
- **THEN** every saved page remains reachable through its valid route or configured shortcut while only the selected six appear in the navbar

#### Scenario: The landing page is missing
- **WHEN** configuration is planned
- **THEN** validation rejects the source before replacing the usable dashboard

## ADDED Requirements

### Requirement: Navigation capacity expansion preserves installations
Increasing navbar capacity SHALL NOT pin existing unpinned pages, rediscover routes or rewrite explicit route selections. Existing supported source shapes, ordering, labels, icons, unknown fields and native ownership SHALL remain compatible. Six-entry configurations SHALL survive explicit save, reload, regeneration and compatible history restoration using the existing backup/recovery contracts.

#### Scenario: An installed dashboard has five entries and an unpinned page
- **WHEN** the package is upgraded, set up or regenerated without a navigation edit
- **THEN** the same five entries remain selected in order and the extra page stays unpinned
- **AND** saved page content, protected custom YAML and archived history remain preserved

#### Scenario: A sixth entry is saved and restored
- **WHEN** the administrator explicitly saves six routes, reloads and later restores a compatible six-route history version
- **THEN** all six retain their configured order and destinations without duplication or truncation

#### Scenario: A native dashboard is already stored
- **WHEN** builder setup, generation or history restoration runs after this capacity change
- **THEN** the native ownership marker continues to exclude that dashboard from builder writes
- **AND** its saved route selection is not expanded automatically
