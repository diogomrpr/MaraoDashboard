# Spec Delta

The added requirement names preserve the completed, not yet synchronized
`standardize-control-grid` generation contract, extending its eligibility to
logical sections while retaining source and ownership preservation.

## MODIFIED Requirements

### Requirement: Room and custom-page card layouts
Every page SHALL support automatic domain grouping or a fixed grid preserving mixed card/shortcut order and appended raw cards. Ordered sections SHALL support independent one-through-six-column layouts and section-wide equal owned-card heights. Section/card order, automatic composition and legacy full-width layouts SHALL survive conversion. Popups and the shared navbar/footer SHALL be generated once after section content.

#### Scenario: A custom page specifies two columns
- **WHEN** its ordered entity, shortcut and raw-card configuration is generated
- **THEN** one preferred two-column section preserves that order before popup/footer content
- **AND** owned content-card surfaces share its common height with responsive reflow when needed

#### Scenario: A page uses several layout sections
- **WHEN** a full-width metric, two-column controls and another full-width card are saved as separate sections in that order
- **THEN** generation preserves their composition and order, with popups/footer after all sections
- **AND** each section calculates its common owned-card height independently

#### Scenario: A group appears between an entity and a shortcut
- **WHEN** the fixed-column page is generated
- **THEN** mixed order is preserved, each owned surface participates in that section's sizing and the group popup remains available on the same page

## ADDED Requirements

### Requirement: Uniform eligible control-grid generation
Each Marao-owned logical section SHALL retain one shared height boundary for all supported owned content-card families. Eligibility SHALL follow card role and ownership, not state or slider presence. A flat page SHALL retain its implicit section boundary. Fixed and automatic composition SHALL preserve saved order, group widths and columns. Raw siblings SHALL NOT disable equality for owned cards or have their internals rewritten.

#### Scenario: A fixed section mixes standard controls
- **WHEN** it contains lights with/without sliders, a cover and lock/open/close actions
- **THEN** one section retains their exact saved order and shares their required height across all rows
- **AND** no device subgroup or missing control creates an artificial height boundary

#### Scenario: A section has raw or large-panel content
- **WHEN** a section contains a chart, camera, detailed climate panel or raw card
- **THEN** it retains the original card configurations, order and configured composition
- **AND** owned content cards share the necessary section height without relocating detailed panels or restyling third-party surfaces

#### Scenario: Automatic grouping is explicitly selected
- **WHEN** one saved section omits fixed columns
- **THEN** its existing domain ordering, assigned group widths and group starts remain within one logical height boundary
- **AND** the resulting domain groups do not calculate unrelated card heights

#### Scenario: An access popup contains open and close actions
- **WHEN** a generated access popup contains opening/unlocking and closing/locking controls
- **THEN** its owned content grid has one common height independent of the page section that opened it
- **AND** action targets, safety gestures, popup focus, scrolling and navbar clearance remain correct

#### Scenario: A native or manual dashboard contains the same controls
- **WHEN** cards render independently or inside an explicitly authored Marao section grid
- **THEN** the compact intrinsic renderer is shared and that owned grid provides equal rows
- **AND** unrelated user-authored Home Assistant containers retain their native ownership and composition

#### Scenario: An old grid configuration is loaded
- **WHEN** an existing supported Marao control-grid configuration contains its original columns and cards
- **THEN** it remains valid and renders its original children/order with compact sizing and grid-wide equality
- **AND** no persisted setting or format conversion is needed to retain it

#### Scenario: Structural cards accompany content
- **WHEN** a page contains title headings, popup definitions and the shared navbar
- **THEN** those structures retain their existing roles and references outside equal-height content sizing
- **AND** zero-height popup/navbar hosts cannot determine section height

### Requirement: Control-grid source and output preservation
Section presentation changes SHALL preserve source format, columns, selections, deletions, explicit emptiness, order, names/options, unknown fields, raw cards, references, protected YAML and unrelated HA settings. Previews/dry runs SHALL remain read-only. Writes SHALL use existing preflight, exact backups, atomic replacement and recovery. Rollback SHALL restore matching package, source and owned output together.

#### Scenario: A released configuration is regenerated
- **WHEN** a supported released source is planned and generated with the new package
- **THEN** independently specified expected source, children, options, references, raw/protected content and ownership paths remain preserved
- **AND** only the expected owned section wrappers/layout metadata and presentation differ, without discovery, starter reset or archive rewriting

#### Scenario: An empty or incompatible source is encountered
- **WHEN** a section is explicitly empty or source is invalid, ambiguous or from an unsupported newer format
- **THEN** emptiness remains empty or planning fails before writes
- **AND** no placeholder, default population or replacement dashboard is created

#### Scenario: A write fails or another editor changes the source
- **WHEN** generation is interrupted, recovery encounters a failure or unrelated concurrent edits appear
- **THEN** exact recovery data remains available, unrelated changes are protected and rollback failures are reported
- **AND** preview and dry-run paths do not alter the prepared installation

#### Scenario: Publication replaces an installed package
- **WHEN** a version containing changed section wrappers/metadata is explicitly prepared for publication
- **THEN** scoped preserved-install proof covers every affected supported source format, expected owned output, failure recovery and disposable cleanup
- **AND** a downgrade restores matching package and exact saved source/output together
