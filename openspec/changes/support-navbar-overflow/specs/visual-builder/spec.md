# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard and ordered content editing
The builder SHALL edit name, slug, theme and icon and manage every page in the top navbar/page section. Home, Rooms, room details and former guided/custom pages SHALL use the same page/card editor. Pages SHALL support add/edit/duplicate/delete and ordering; cards SHALL support add/edit/delete and drag or explicit reordering. Page path edits SHALL update navbar/page-shortcut references. Navbar selection SHALL have no product-level entry-count limit; screen overflow SHALL be a presentation concern.

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

### Requirement: Page management independent of navbar visibility
The page manager SHALL list pinned and unpinned pages and allow creation regardless of the number of selected navbar entries. Newly created pages SHALL follow ordinary creation/pinning behavior without a count barrier. Unpinning SHALL preserve content. Whole-page deletion SHALL identify the page, retain at least one landing page and require affected owned references to be resolved before saving; it SHALL NOT silently break links or delete referencing cards.

#### Scenario: The navbar is full
- **WHEN** an administrator adds another page while the current horizontal bar has no free visible route slot
- **THEN** page creation succeeds and any selected new route is handled through overflow without removing existing entries
- **AND** existing unpinned pages stay unpinned unless explicitly selected

#### Scenario: A navbar entry is removed
- **WHEN** the user unpins it
- **THEN** the page and its shortcut targets remain available in the page manager

#### Scenario: A referenced landing page is deleted
- **WHEN** the user confirms whole-page deletion
- **THEN** a replacement landing page and replacement or explicit removal of affected owned links are required before save
- **AND** deleting the final page is rejected

## ADDED Requirements

### Requirement: Native navbar route-list editor parity
The native Marao navbar editor and read-only compiler SHALL accept valid finite route lists without a product count cap. Adding, editing and ordering entries in Visual or YAML SHALL preserve the complete list and unknown fields. Route-shape validation SHALL remain active. Available screen slots SHALL NOT limit configuration or replace saved route data with a visible subset.

#### Scenario: Editing a long native route list
- **WHEN** an administrator adds more than six routes and switches between Visual and YAML
- **THEN** all entries remain editable in order and reach the shared renderer intact
- **AND** preview does not navigate or alter the ordinary HA shell

#### Scenario: A route is malformed
- **WHEN** an entry lacks a required destination or label
- **THEN** a readable validation error identifies the invalid configuration and the draft remains available for correction
- **AND** removing the count limit does not bypass existing route validity checks
