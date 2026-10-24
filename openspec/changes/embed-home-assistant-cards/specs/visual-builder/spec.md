## ADDED Requirements
### Requirement: Native Home Assistant card editing
The builder SHALL offer a Home Assistant tab in Add card with the installed native searchable picker, including registered custom cards. It SHALL reuse native visual and YAML editors, provide a non-interactive preview and retain manual YAML fallback when native components cannot load.

#### Scenario: Add and edit a native or installed custom card
- **WHEN** the administrator picks a card and edits its visual settings or YAML
- **THEN** Add/Update changes only the local draft and Cancel discards dialog edits
- **AND** only Save & Generate persists the dashboard

#### Scenario: Unavailable editor or failed native loading
- **WHEN** a card lacks a visual editor or native loading fails
- **THEN** YAML editing remains available with an explanation or Retry
- **AND** retries preserve edits and late results cannot alter a closed or obsolete dialog

### Requirement: Preserve and validate embedded YAML
Embedded cards SHALL be ordered `template: ha_card` descriptors with complete YAML in a `yaml` string. Unknown descriptor fields and exact unedited YAML SHALL survive normalization, moves, duplication, saves and history restoration. Actual visual configuration edits MAY reformat YAML but SHALL retain configuration values.

#### Scenario: Round-trip a card without changing its settings
- **WHEN** an administrator opens, reorders, duplicates or saves an unchanged YAML card
- **THEN** its YAML, comments, explicit empty values and unknown descriptor fields remain intact
- **AND** merely opening Visual does not serialize the configuration again

#### Scenario: Invalid or unsupported YAML
- **WHEN** YAML is malformed, has duplicate explicit keys, recursive aliases, unsafe tags or non-JSON values, or is not one mapping with a nonempty string type
- **THEN** the browser and backend reject it before writes without replacing saved source, generated output or history
- **AND** file directives require inline configuration instead

### Requirement: Native rendering in mixed sections
Generation SHALL parse descriptors into ordinary Lovelace configurations without a type or option whitelist. Mixed grids SHALL use HA's native host for embedded children, preserving native appearance, interactions, intrinsic sizing, visibility and error isolation. Native configuration SHALL bypass retired-card rewriting, including nested cards.

#### Scenario: Generate and render a mixed section
- **WHEN** a section contains Marao and embedded cards
- **THEN** fixed-column sections retain exact mixed order and automatic sections give embedded groups full width
- **AND** an unavailable custom card shows its own native error while neighboring cards keep working
- **AND** existing raw cards and legacy source conversion retain their existing behavior
