# Spec Delta

## ADDED Requirements

### Requirement: Configurable entity group cards
The builder SHALL offer Entity Group on Overview, room and custom pages with
editable title, icon, entity type, ordered members and All entities/Active only
popup selection. Initial types SHALL be lights, covers, battery sensors and
thermostats. Selection SHALL enforce one type per group, allow compatible
entities from any room, and preserve each member's existing options.

#### Scenario: An administrator creates a lighting group
- **WHEN** the administrator chooses Lights as the group type
- **THEN** the member selector offers compatible light entities searchable by name or entity ID across rooms
- **AND** Active only is the default, with All entities available explicitly

#### Scenario: An administrator creates a battery, cover or thermostat group
- **WHEN** that type is selected
- **THEN** only compatible entities are selectable and All entities is the default
- **AND** arbitrary non-battery sensors cannot be selected for a battery group

#### Scenario: The configured type changes
- **WHEN** the administrator changes the type of a populated group
- **THEN** incompatible members are identified and saving is blocked until the administrator explicitly resolves them
- **AND** no member selection or attached configuration is silently discarded

### Requirement: Independent group membership and draft editing
Groups SHALL support add, edit, reorder and removal through the shared draft
workflow. Explicit membership, including empty lists, SHALL remain authoritative
across Visual/JSON switches, saves, generation and registry changes. Editing a
group SHALL NOT mutate room membership or independent entity occurrences.
Changes SHALL remain local until Save & Generate and be recoverable through
Discard changes.

#### Scenario: Two groups contain the same light
- **WHEN** the administrator removes that light from one group and saves
- **THEN** the other group and any room card retain their independent references and options
- **AND** later registry updates do not restore it to the edited group

#### Scenario: A group has no members
- **WHEN** the administrator saves an explicit empty member list
- **THEN** the list remains empty and is not replaced with discovered entities

#### Scenario: Groups are edited in JSON and reordered visually
- **WHEN** the administrator switches between views and moves an Entity Group among other cards
- **THEN** group identity, member order, filtering, names, icons, unknown fields and unrelated raw/custom content survive
- **AND** Discard restores the saved document and unsaved changes do not alter the generated dashboard
