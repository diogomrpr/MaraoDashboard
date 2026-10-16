# Spec Delta

## MODIFIED Requirements

### Requirement: Navigation composition and entity-free links
Generated navigation SHALL target the active dashboard root, preserve the complete configured route list without a product-level count cap, and include the shared bottom spacer exactly once. Custom room cards SHALL precede the footer. Room/page shortcuts SHALL work without fabricated entity dependencies; `action: none` headings SHALL be noninteractive. Screen overflow SHALL NOT truncate or rewrite generated route data.

#### Scenario: An empty room is configured
- **WHEN** its room shortcut is activated
- **THEN** navigation opens that room without requiring an unrelated entity

#### Scenario: Explicit navbar pages are ordered
- **WHEN** `navigation` contains page paths or objects with `page`
- **THEN** they replace automatic routes in their configured order without a product-level entry-count limit

#### Scenario: No navbar selection is supplied
- **WHEN** navigation is generated
- **THEN** the first five available generated pages are selected automatically, preserving the established legacy default rather than expanding existing menus on upgrade

#### Scenario: Legacy URL entries are supplied without explicit page entries
- **WHEN** navigation is generated
- **THEN** label/URL entries append to automatic routes and the full combined valid list is preserved without count-based rejection

### Requirement: Universal page routes and landing selection
All saved pages SHALL have unique editable paths and a valid configured landing page. Renaming a page SHALL update owned navbar, shortcut and generated-popup references. Navbar routes SHALL remain rooted at the active dashboard with no product-level entry-count cap; unpinned saved pages SHALL still be generated. Deleted pages SHALL NOT return from defaults, registry discovery or template metadata.

#### Scenario: A former built-in page path changes
- **WHEN** Home or Energy receives a new valid path
- **THEN** owned links and generated files follow it and no duplicate old generated view remains

#### Scenario: There are more than five pages
- **WHEN** configuration is generated with five selected navbar entries
- **THEN** every saved page remains reachable through its valid route or configured shortcut while only the selected five are included in navbar route data

#### Scenario: The landing page is missing
- **WHEN** configuration is planned
- **THEN** validation rejects the source before replacing the usable dashboard

#### Scenario: A long explicit navigation list is generated
- **WHEN** the administrator selects more routes than fit the screen
- **THEN** every selected entry reaches the navbar once in configured order and the shared renderer provides overflow
- **AND** generated output does not persist the current device's visible partition

## ADDED Requirements

### Requirement: Overflow navigation preserves saved installations
Removing route-count limits SHALL preserve existing source shapes, selections, order, labels, icons, destinations, empty lists, unknown fields and ownership. Setup, registry changes and upgrades SHALL NOT pin existing unpinned pages or rewrite automatic defaults. Explicit longer lists SHALL survive save, reload, generation and compatible history restoration through existing backup/recovery paths.

#### Scenario: An existing dashboard is upgraded
- **WHEN** setup or generation processes its saved zero-through-five-entry selection
- **THEN** its selection and page contents remain unchanged, including unpinned pages and protected custom YAML
- **AND** history archives remain immutable

#### Scenario: A long list is saved and restored
- **WHEN** a list longer than six entries is explicitly saved, reloaded, regenerated and restored from compatible history
- **THEN** every entry and its configured order/options remain intact without truncation or device-dependent persistence

#### Scenario: A native dashboard is already stored
- **WHEN** builder setup, generation or history restoration runs
- **THEN** native-owned dashboards remain excluded from builder writes
- **AND** the overflow feature does not copy or synchronize their saved selections with the builder
