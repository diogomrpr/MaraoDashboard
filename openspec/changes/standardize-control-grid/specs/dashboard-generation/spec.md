# Spec Delta

## MODIFIED Requirements

### Requirement: Room and custom-page card layouts
Every page SHALL support automatic domain grouping or a fixed grid preserving mixed card/shortcut order and appending raw cards. Ordered sections SHALL support independent one-through-six-column layouts, preserving section/card order. Eligible control grids SHALL use uniform sizing and responsive columns. Popups and the shared navbar/footer SHALL be generated once per page. Legacy full-width and multi-column composition SHALL survive conversion.

#### Scenario: A custom page specifies two columns
- **WHEN** its ordered entity, shortcut and raw-card configuration is generated
- **THEN** one two-column grid preserves that order before the popup/footer content
- **AND** an eligible all-control grid treats two columns as its preferred maximum for safe responsive rendering

#### Scenario: A page uses several layout sections
- **WHEN** a full-width metric, two-column controls and another full-width card are saved in that order
- **THEN** generation preserves their widths and order and places popups/footer after all sections
- **AND** a panel's height does not inflate the separate control grid

#### Scenario: A group appears between an entity and a shortcut
- **WHEN** the fixed-column page is generated
- **THEN** that mixed order is preserved and the group popup is available on the same page
- **AND** the non-control composition is not automatically split or reclassified to obtain uniform control rows

## ADDED Requirements

### Requirement: Uniform eligible control-grid generation
Generation SHALL use uniform control grids when every child of an owned grid is a standard control card. Eligibility SHALL include mixed eligible families, not depend on slider presence or current HA state, and preserve child configurations and the existing column setting. Unknown, raw or non-control children SHALL retain the existing grid path without splitting or dropping content.

#### Scenario: A fixed section mixes standard controls
- **WHEN** a two-column section contains lights with and without sliders, a cover and lock/unlock controls
- **THEN** generation emits one uniform control grid in the exact saved order
- **AND** no device-type subgroup creates a gap between these cards

#### Scenario: A section has raw or large-panel content
- **WHEN** a fixed-column section contains a chart, camera, detailed climate panel, unknown card or raw card
- **THEN** the existing mixed-grid composition and explicit widths remain intact
- **AND** the generator does not relocate cards or invent sections to make it eligible

#### Scenario: Automatic grouping is explicitly selected
- **WHEN** the saved section omits fixed columns
- **THEN** its existing automatic domain grouping and assigned column counts remain
- **AND** each wholly eligible generated group can use uniform rows without merging independently configured groups

#### Scenario: An access popup contains open and close actions
- **WHEN** a generated access popup contains only standard opening/unlocking and closing/locking cards
- **THEN** its owned one-column grid uses uniform rows and retains each action's original target and safety gesture
- **AND** the popup, focus behavior and navbar clearance remain intact

#### Scenario: A native or manual dashboard contains the same controls
- **WHEN** controls are rendered independently or placed in an explicitly authored uniform control grid
- **THEN** they use the same shared renderer and baseline size
- **AND** explicitly authored uniform grids provide equal rows while unrelated Home Assistant containers retain their own layout

### Requirement: Control-grid source and output preservation
Uniform grid generation SHALL preserve source format, saved columns, selections, explicit emptiness, order, names, options, unknown fields, raw cards, popup references and protected custom YAML. Only eligible owned grid presentation SHALL change. Previews SHALL remain read-only, and deployment or restoration SHALL retain matching package, source and generated-output recovery data.

#### Scenario: A released configuration is regenerated
- **WHEN** a supported released source is planned and generated with the new package
- **THEN** independently expected source, membership, order, options and references are preserved while eligible owned grids receive uniform presentation
- **AND** no discovery, starter reset or archive rewrite occurs

#### Scenario: An empty or incompatible source is encountered
- **WHEN** a section is explicitly empty or the input is invalid or from an unsupported newer format
- **THEN** empty selections remain empty, or the invalid/newer input is rejected before writes
- **AND** no placeholder card, automatic population or fallback dashboard replaces the source

#### Scenario: Publication replaces an installed package
- **WHEN** a version including changed generated grid containers is prepared for publication
- **THEN** preserved-install verification covers affected source formats, owned output, failure recovery and disposable cleanup
- **AND** rollback restores the matching package and exact saved source/output together
