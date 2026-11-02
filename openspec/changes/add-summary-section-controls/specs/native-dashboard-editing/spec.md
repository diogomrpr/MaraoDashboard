# Spec Delta

## ADDED Requirements

### Requirement: Native summary section authoring
The Entity Group native editor SHALL support adding, renaming, reordering and deleting named sections and assigning existing members to them without YAML. Assignments SHALL allow at most one section per member. Section edits SHALL retain member options, configured membership and explicit empty sections. Removing a section SHALL leave its members unassigned rather than delete them.

#### Scenario: An administrator creates floor sections
- **WHEN** Ground floor and First floor are added and selected existing members are assigned
- **THEN** the saved card retains that section order, names and assignments after reopen and Visual/YAML switching
- **AND** member controls retain their custom names, icons and options

#### Scenario: A section is deleted
- **WHEN** a populated floor section is removed
- **THEN** its members remain configured and appear unassigned, while unrelated sections remain unchanged

#### Scenario: A member is removed deliberately
- **WHEN** a configured member is deleted using the member control
- **THEN** its section reference is removed in the same draft and later registry changes do not refill it

### Requirement: Validated additive summary section settings
Optional section metadata SHALL reference only configured members and contain stable unique section identities and nonempty names. Duplicate assignments, dangling references and invalid structures SHALL produce readable validation errors before save/conversion. Missing HA state SHALL NOT invalidate a saved member reference. Omitted or empty section metadata SHALL retain a flat list without rewriting saved data on load.

#### Scenario: An existing flat summary is edited
- **WHEN** a supported released group without section metadata is opened and only its title changes
- **THEN** its membership, ordering, unknown fields, member options and absent section metadata remain intact

#### Scenario: YAML assigns one member twice
- **WHEN** the same configured entity appears in two section assignments or a section references a nonmember
- **THEN** the invalid draft is identified and cannot replace the last valid saved card

#### Scenario: A draft is cancelled
- **WHEN** section names or assignments are edited and native Cancel is chosen
- **THEN** saved membership and sections remain unchanged and no service is dispatched
