# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard and ordered content editing
The builder SHALL edit name, slug, theme and icon and manage every page in the top navbar/page section. Home, Rooms, room details and former guided/custom pages SHALL use the same page/card editor. Pages SHALL support add/edit/duplicate/delete and ordering; cards SHALL support add/edit/duplicate/delete and drag or explicit reordering. Page path edits SHALL update navbar/page-shortcut references.

#### Scenario: A custom page is renamed and reordered
- **WHEN** the administrator edits its path and moves it
- **THEN** its content is retained and existing page references follow the new path

#### Scenario: Home or Rooms is edited
- **WHEN** the administrator selects that page in the top page manager
- **THEN** its individual cards can be named, configured, added, removed and reordered through the same controls used for other pages
- **AND** no separate Home, Rooms or guided-page composition form overrides those edits

#### Scenario: More than six routes are configured
- **WHEN** the administrator pins or edits an ordered navigation list longer than six entries
- **THEN** builder controls, JSON schema and save validation accept the complete valid list
- **AND** Visual/JSON switching preserves each entry's label, icons, destination and unknown options

#### Scenario: Additional dashboard and ordered content editing contracts
- **WHEN** an administrator edits ordered dashboard content
- **THEN** Navbar selection SHALL have no product-level entry-count limit; screen overflow SHALL be a presentation concern.


## ADDED Requirements

### Requirement: Duplicate a visual card occurrence
The builder SHALL offer a localized, named Duplicate card action for every visually editable card occurrence. One activation SHALL insert exactly one copy immediately after the source in the same local container, preserving the source and all other ordering. Existing automatic grouping and fixed-column layout behavior SHALL remain unchanged.

#### Scenario: Duplicate a card in a section or flat page
- **WHEN** the administrator activates Duplicate card on a Marao card, group, heading, shortcut or embedded Home Assistant card
- **THEN** exactly one copy appears next to the source in the editor's ordered list within the same section or flat-page container
- **AND** other sections and their layouts remain unchanged

#### Scenario: Duplicate through mobile controls
- **WHEN** the administrator uses Duplicate card on a narrow mobile editor
- **THEN** the semantic action is available without hover, has a localized accessible name and a visible target of at least 48 by 48 CSS pixels
- **AND** existing edit, move and delete actions remain reachable

### Requirement: Independent configuration-preserving card copies
A duplicate SHALL retain the source name, bindings, nested settings, member order, explicit empty values and unknown fields, with a fresh occurrence identity and independent Marao-generated popup identities. Embedded YAML SHALL remain byte-for-byte unchanged. Authored external links SHALL retain their destinations. Editing or deleting either occurrence SHALL NOT change the other.

#### Scenario: Copy a configured group or popup-backed card
- **WHEN** the administrator duplicates a group, climate, media or other popup-backed Marao card and edits the copy
- **THEN** the source retains its own settings, membership and identity
- **AND** generated popup and mode-selector references belonging to the copy target its own content without conflicting with the original

#### Scenario: Copy an embedded Home Assistant card
- **WHEN** the administrator duplicates a descriptor containing YAML comments, nested settings, unknown descriptor fields and explicit empty values
- **THEN** both occurrences retain the exact YAML string and unknown fields with independent descriptor identities
- **AND** no YAML parsing or serialization changes its authored content during duplication

#### Scenario: Copy a shortcut or custom label
- **WHEN** a card with a configured name, page destination or external navigation link is duplicated
- **THEN** its name and intended destination remain the same until explicitly edited

### Requirement: Card duplication follows the draft lifecycle
Duplication SHALL mark the local draft changed without saving, generating or dispatching entity actions. Visual/JSON switches SHALL retain both independent occurrences. Explicit save and reload SHALL retain the accepted copy. Updates SHALL refresh the affected container without rebuilding unrelated page controls.

#### Scenario: Inspect an unsaved duplicate
- **WHEN** the administrator duplicates a card and switches to JSON before saving
- **THEN** the current draft contains both occurrences while the saved dashboard remains unchanged

#### Scenario: Save a duplicated card
- **WHEN** the administrator explicitly saves the draft and reloads the editor
- **THEN** both occurrences retain their accepted order, independent identities and complete configuration
- **AND** duplication itself has dispatched no entity service or automatic save
