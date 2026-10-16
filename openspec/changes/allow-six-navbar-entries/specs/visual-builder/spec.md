# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard and ordered content editing
The builder SHALL edit name, slug, theme and icon and manage every page in the top navbar/page section. Home, Rooms, room details and former guided/custom pages SHALL use the same page/card editor. Pages SHALL support add/edit/duplicate/delete and ordering; cards SHALL support add/edit/delete and drag or explicit reordering. Page path edits SHALL update navbar/page-shortcut references. Navbar selection SHALL remain limited to six entries.

#### Scenario: A custom page is renamed and reordered
- **WHEN** the administrator edits its path and moves it
- **THEN** its content is retained and existing page references follow the new path

#### Scenario: Home or Rooms is edited
- **WHEN** the administrator selects that page in the top page manager
- **THEN** its individual cards can be named, configured, added, removed and reordered through the same controls used for other pages
- **AND** no separate Home, Rooms or guided-page composition form overrides those edits

#### Scenario: A sixth entry is selected
- **WHEN** the administrator pins a sixth page or supplies a sixth valid navigation entry in JSON
- **THEN** Visual editing, schema help and save validation accept the ordered six-entry selection
- **AND** changing tabs preserves its labels, icons, destinations and other options

### Requirement: Page management independent of navbar visibility
The page manager SHALL list pinned and unpinned pages and allow creation when six navbar entries already exist. Additional pages SHALL start unpinned and remain editable and reachable through shortcuts. Unpinning SHALL preserve content. Whole-page deletion SHALL identify the page, retain at least one landing page and require affected owned references to be resolved before saving; it SHALL NOT silently break links or delete referencing cards.

#### Scenario: The navbar is full
- **WHEN** an administrator adds another page
- **THEN** the new page is created unpinned with an explanation and the existing six entries remain unchanged

#### Scenario: A navbar entry is removed
- **WHEN** the user unpins it
- **THEN** the page and its shortcut targets remain available in the page manager

#### Scenario: A referenced landing page is deleted
- **WHEN** the user confirms whole-page deletion
- **THEN** a replacement landing page and replacement or explicit removal of affected owned links are required before save
- **AND** deleting the final page is rejected

#### Scenario: A seventh entry is requested
- **WHEN** an administrator tries to pin a seventh destination or supplies more than six navigation entries in JSON
- **THEN** validation identifies the six-entry limit without removing, reordering or replacing the existing selection
- **AND** existing saved configuration remains unchanged until a valid explicit save
