# Spec Delta

## MODIFIED Requirements

### Requirement: JSON source and generated output
The native dashboard SHALL retain Marao's versioned editable JSON source. Shared frontend compilation SHALL validate and normalize that source into Lovelace configuration without ongoing server-file generation. Existing configuration-facing template keys, component types and supported raw/unknown content SHALL remain compatible except for explicitly documented versioned changes.

#### Scenario: A supported entity is added to a room
- **WHEN** the dashboard is generated
- **THEN** entity resolution chooses the appropriate project-owned card and preserves its overrides
- **AND** saving stores the complete source in HA native storage without writing a generated YAML directory

#### Scenario: Current source is migrated without semantic conversion
- **WHEN** a valid current-format source moves into the native envelope
- **THEN** its original source text is retained and compilation preserves its configured behavior
- **AND** source format, envelope version, compiler contract and package version remain independent

### Requirement: Refreshing committed dashboard output
Native saves SHALL use HA's configuration lifecycle and accepted save/notification semantics without claiming independent disk-durability proof. Read-only rendering, previews and unconfirmed imports SHALL NOT persist source or request a successful-save refresh. Reported save errors SHALL retain drafts without an additional Marao success signal. Retired generation services and configuration-history restoration SHALL NOT be required.

#### Scenario: An included group changes without changing the main YAML
- **WHEN** a migrated group loses members and the administrator completes Save & Generate
- **THEN** dashboard clients receive the new saved membership, including an explicitly empty list, without YAML regeneration or an HA restart
- **AND** no removed service/history endpoint is invoked

#### Scenario: An operation reports a failure
- **WHEN** source validation or compilation fails, or HA reports a native save error
- **THEN** the failure remains visible and the unsaved draft is retained
- **AND** Marao emits no additional successful-save signal; HA-originated updates retain their native semantics

### Requirement: Protected custom-card regions
Migration SHALL validate old protected custom-card regions and retain their ordered content as supported editable raw cards, with exact original YAML in private recovery data. Damaged markers or unresolved server-only references SHALL block conversion. Subsequent frontend saves SHALL preserve the imported raw/unknown content without rewriting legacy files.

#### Scenario: A user adds a manual card inside the protected region
- **WHEN** migration imports that generated container
- **THEN** its manual cards remain intact in their intended position before the footer
- **AND** the exact original container is retained in the migration backup

#### Scenario: The protection markers are damaged
- **WHEN** migration preflights the existing output
- **THEN** it refuses unsafe conversion with a readable error and leaves the active installation unchanged

#### Scenario: A pre-manifest dashboard has unmarked legacy card containers
- **WHEN** migration encounters parseable containers at expected generated paths without an ownership manifest
- **THEN** it uses the documented historical ownership/adoption rules and an explicit conversion preview
- **AND** ambiguous or non-owned content is not overwritten or silently discarded

#### Scenario: Custom content references a secret or external include
- **WHEN** imported YAML contains secret/include tags, unknown tags or non-owned file references that cannot be preserved safely
- **THEN** migration reports the affected paths without exposing their values and blocks activation
- **AND** it neither expands private server content into dashboard-readable data nor silently removes the reference

### Requirement: Universal page routes and landing selection
All saved pages SHALL have unique editable paths and a valid configured landing page. Renaming a page SHALL update owned navbar, shortcut and generated-popup references. Navbar routes SHALL remain rooted at the active dashboard with no product-level entry-count cap; unpinned saved pages SHALL still be generated. Deleted pages SHALL NOT return from defaults, registry discovery or template metadata.

#### Scenario: A former built-in page path changes
- **WHEN** Home or Energy receives a new valid path
- **THEN** owned links and generated views follow it and no duplicate old view remains

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

### Requirement: Template creation independent of runtime generation
Templates SHALL create ordinary editable page data once. Runtime generation SHALL consume that saved data without requiring a template identifier or refilling removed cards. Room associations and template origin SHALL NOT authorize ongoing entity discovery. Empty pages SHALL remain valid when another or the same empty page provides a valid landing route.

#### Scenario: A saved page has no template identifier
- **WHEN** its supported cards and layouts are generated
- **THEN** it works exactly as an equivalent template-created page

#### Scenario: Every card is removed from a page
- **WHEN** it is saved and the dashboard reloads
- **THEN** the empty page remains empty and no default cards are restored

### Requirement: Overflow navigation preserves saved installations
Removing route-count limits SHALL preserve existing source shapes, selections, order, labels, icons, destinations, empty lists, unknown fields and ownership. Native loading, registry changes and upgrades SHALL NOT pin existing unpinned pages or rewrite automatic defaults. Explicit longer lists SHALL survive native save, reload, generation and source import; manual migration retains exact backup/recovery.

#### Scenario: An existing dashboard is upgraded
- **WHEN** migration or compilation processes its saved zero-through-five-entry selection
- **THEN** its selection and page contents remain unchanged, including unpinned pages and protected custom YAML
- **AND** history archives remain immutable

#### Scenario: A long list is saved and restored
- **WHEN** a list longer than six entries is explicitly saved, reloaded, compiled and explicitly imported from compatible source
- **THEN** every entry and its configured order/options remain intact without truncation or device-dependent persistence

#### Scenario: A native dashboard is already stored
- **WHEN** migration, strategy compilation or native save runs
- **THEN** independently owned native dashboards remain excluded from Marao writes
- **AND** the overflow feature does not copy or synchronize their saved selections with the builder

### Requirement: Control-grid source and output preservation
Section presentation changes SHALL preserve source format, columns, selections, deletions, explicit emptiness, order, names/options, unknown fields, raw cards, references, protected YAML and unrelated HA settings. Previews/dry runs SHALL remain read-only. Manual cutover SHALL retain exact inventory/backup/recovery; ordinary frontend saves SHALL use validated native persistence with its disclosed concurrency limits. Migration rollback SHALL restore matching package, source and owned state together.

#### Scenario: A released configuration is regenerated
- **WHEN** a supported released source is planned and generated with the new package
- **THEN** independently specified expected source, children, options, references, raw/protected content and ownership paths remain preserved
- **AND** only the expected owned section wrappers/layout metadata and presentation differ, without discovery, starter reset or archive rewriting

#### Scenario: An empty or incompatible source is encountered
- **WHEN** a section is explicitly empty or source is invalid, ambiguous or from an unsupported newer format
- **THEN** emptiness remains empty or planning fails before writes
- **AND** no placeholder, default population or replacement dashboard is created

#### Scenario: Publication replaces an installed package
- **WHEN** a version containing changed section wrappers or metadata is prepared for publication
- **THEN** affected unit tests and applicable metadata validation run, reusing development preservation and recovery results without a new integration report
- **AND** the final candidate is installed on disposable 192.168.0.28 before publication; a downgrade restores matching package and exact saved source/output together

#### Scenario: A write fails or another editor changes the source
- **WHEN** transitional migration is interrupted, recovery encounters a failure or unrelated concurrent edits appear
- **THEN** exact recovery data remains available, unrelated changes are protected and rollback failures are reported
- **AND** preview and dry-run paths do not alter the prepared installation

## ADDED Requirements

### Requirement: Shared frontend compilation
Rendering, builder preview/save, source import/export and legacy conversion SHALL share the same source rules and compiler. Compilation SHALL preserve ordered sections/cards, raw/unknown settings, explicit emptiness, numeric/native action values, popup identity and all retained families. Missing required conversion metadata SHALL be an error rather than a discovery/reset instruction.

#### Scenario: Equivalent sources reach different entry points
- **WHEN** the same supported source and metadata are compiled in the strategy and the builder
- **THEN** their normalized Lovelace output agrees with independently specified expectations
- **AND** preview and runtime compilation do not change the source

#### Scenario: Current access actions are compiled into a native popup
- **WHEN** supported lock, door, garage or gate source produces an access popup and its child action controls
- **THEN** matching popup/action entity bindings retain the v0.21.1 shared runtime's single authoritative header state/icon, slider-only opening label and decorative action icons with centered safe close/lock text
- **AND** state updates leave the active strict slide intact and retain request/error/availability feedback without changing saved configuration

#### Scenario: A numeric value cannot be preserved by conversion
- **WHEN** parsing or required source conversion would silently change a supported numeric value
- **THEN** the original remains untouched and conversion refuses with readable guidance rather than offering a rounded successful result
- **AND** exact supported current-source text remains preserved when no conversion is needed

#### Scenario: Legacy conversion lacks required area metadata
- **WHEN** an area-only historical source cannot be converted unambiguously
- **THEN** compilation reports the missing input without replacing selections with an empty or newly discovered default

### Requirement: Read-only runtime generation
Opening a dashboard SHALL compile its saved source without writing configuration, creating version snapshots, calling entity services or modifying another dashboard. Unsupported source/envelope/compiler versions SHALL produce a readable compatibility error without a starter reset or version-marker rewrite.

#### Scenario: A regular user opens a customized dashboard
- **WHEN** the strategy generates its views
- **THEN** saved source, explicit deletions, order and unrelated dashboards stay unchanged
- **AND** no write or entity action occurs

#### Scenario: A newer source is opened by an older frontend
- **WHEN** the required source or compiler contract is unsupported
- **THEN** the client reports incompatibility and offers supported recovery without saving a downgraded document

### Requirement: Legacy generated files remain recovery data
After verified native handoff, existing source/generated files, ownership manifests, protected YAML and old archives SHALL remain unchanged as retained recovery data. Ongoing frontend saves SHALL NOT append, clean, regenerate or delete them. Only the documented manual procedure SHALL change owned registrations required for handoff.

#### Scenario: A page is deleted after migration
- **WHEN** the administrator saves its removal through the new builder
- **THEN** the active native source and compiled view change together through the native save
- **AND** no old generated container, custom fragment or archive is deleted from the retained baseline

## REMOVED Requirements

### Requirement: Manifest-owned cleanup and per-file writes
**Reason**: Ongoing generation moves to one native dashboard document, so frontend saves no longer own a generated file tree or perform per-file cleanup.
**Migration**: The manual procedure records legacy ownership and protects files through exact private backups and matching package-plus-data rollback. Retain original generated files/manifests/custom content instead of treating backend removal as permission to delete them; subsequent saves affect native storage only.
