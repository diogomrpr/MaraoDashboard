# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard and ordered content editing
The builder SHALL edit name, slug, theme and icon and manage every page in the top navbar/page section. Home, Rooms, room details and former guided/custom pages SHALL use the same page/card editor. Pages SHALL support add/edit/duplicate/delete and ordering; cards SHALL support add/edit/delete and drag or explicit reordering. Page path edits SHALL update navbar/page-shortcut references. Navbar selection SHALL remain limited to five entries.

#### Scenario: A custom page is renamed and reordered
- **WHEN** the administrator edits its path and moves it
- **THEN** its content is retained and existing page references follow the new path

#### Scenario: Home or Rooms is edited
- **WHEN** the administrator selects that page in the top page manager
- **THEN** its individual cards can be named, configured, added, removed and reordered through the same controls used for other pages
- **AND** no separate Home, Rooms or guided-page composition form overrides those edits

### Requirement: Automatic and fixed-column container layouts
All pages SHALL offer automatic domain grouping or one through six fixed columns. Fixed-column serialization SHALL preserve mixed card/shortcut order. Ordered layout sections SHALL allow full-width and multi-column content on the same page. Area associations SHALL support initial population and suggestions without recurring membership synchronization. Existing includes, excludes and overrides SHALL survive conversion into explicit card selections.

#### Scenario: A fixed-column room mixes entities and page shortcuts
- **WHEN** the administrator reorders and saves its cards
- **THEN** the ordered mixed list reaches generation without regrouping it by domain

#### Scenario: An Energy template mixes section widths
- **WHEN** the user keeps a full-width house-power section and a two-column readings section
- **THEN** both layouts remain independently editable and survive Visual/JSON switching and saving

#### Scenario: Area membership changes after page creation
- **WHEN** Home Assistant discovers another entity in the page's associated area
- **THEN** it can be suggested for addition but is not inserted into the saved page automatically

#### Scenario: JSON removes an area-associated entity
- **WHEN** the administrator deletes an entity from a room's JSON list and returns to Visual
- **THEN** the entity is absent from that room's visible list
- **AND** later editing or reordering does not import it from the associated area

### Requirement: Guided page options preserve attached configuration
Every template-created card SHALL expose its supported name, icon, entity bindings and behavior through the shared card editor. Energy loads SHALL retain optional toggles and graph options; media cards SHALL retain remote, volume-remote and app name/source/icon options. Retained entities SHALL keep attached options when bindings change. Unknown/raw options SHALL remain accessible in JSON. Names SHALL be local overrides, independent of HA entity names.

#### Scenario: A configured media player remains selected
- **WHEN** another player is added through the shared card editor
- **THEN** the original player's Apple TV options and other attached settings survive

#### Scenario: A daily energy card is renamed
- **WHEN** the administrator replaces its template name and saves
- **THEN** the card and its generated history sheet use the configured name rather than a fixed page-role title
- **AND** the entity's Home Assistant name is unchanged

### Requirement: Editable room snapshots
Add page SHALL offer an empty Room template and an editable snapshot of a current HA area. Snapshots SHALL NOT silently track later registry changes. Versioned conversion SHALL materialize older area-linked sources into independent selections, preserving includes, excludes, overrides and explicit empty selections. Area metadata SHALL remain available for optional suggestions.

#### Scenario: Registry membership changes after a room snapshot
- **WHEN** HA adds another entity to that area
- **THEN** the saved snapshot remains unchanged until the administrator edits it

#### Scenario: A migrated room was explicitly emptied
- **WHEN** its page is opened and saved again
- **THEN** deleted entities remain absent and no area or template defaults repopulate it

#### Scenario: A room's suggestion area changes
- **WHEN** the administrator changes or clears the room's associated HA area
- **THEN** future suggestions use the selected association or show no area-specific suggestions
- **AND** all existing room cards and settings remain unchanged

## ADDED Requirements

### Requirement: Snapshot page templates
Add page SHALL offer Empty, Home, Rooms, Room, Security, Energy, Wallbox and Media starters. A chosen template SHALL populate an ordinary editable local page once. Required entity bindings SHALL be configured or their cards removed before generation; optional unused roles SHALL be omittable. Later saves, registry changes and upgrades SHALL NOT reapply the starter to an edited page.

#### Scenario: A Wallbox starter is customized
- **WHEN** its status card is renamed, its power card removed and another card added
- **THEN** regeneration retains that composition without restoring the removed template card

#### Scenario: A template slot has no compatible entity
- **WHEN** the user has not bound or removed that required slot
- **THEN** the editor identifies the incomplete card and prevents generation without fabricating an entity or producing a warning card

#### Scenario: Two Media pages are created
- **WHEN** the user binds and names each starter differently
- **THEN** both are independent pages whose individual cards and app options can be edited

### Requirement: Page management independent of navbar visibility
The page manager SHALL list pinned and unpinned pages and allow creation when five navbar entries already exist. Additional pages SHALL start unpinned and remain editable and reachable through shortcuts. Unpinning SHALL preserve content. Whole-page deletion SHALL identify the page, retain at least one landing page and require affected owned references to be resolved before saving; it SHALL NOT silently break links or delete referencing cards.

#### Scenario: The navbar is full
- **WHEN** an administrator adds another page
- **THEN** the new page is created unpinned with an explanation and the existing five entries remain unchanged

#### Scenario: A navbar entry is removed
- **WHEN** the user unpins it
- **THEN** the page and its shortcut targets remain available in the page manager

#### Scenario: A referenced landing page is deleted
- **WHEN** the user confirms whole-page deletion
- **THEN** a replacement landing page and replacement or explicit removal of affected owned links are required before save
- **AND** deleting the final page is rejected

### Requirement: Reusable template card options
Every card role emitted by a starter SHALL also be available through the shared Add card flow on any page. Weather, native scenes, summaries, room shortcuts with All off, alarm/status, guarded service actions, energy periods/history, charging presets and media apps SHALL retain their applicable settings without requiring a special page type. Interactive editor controls SHALL be localized, semantic and at least 48 by 48 CSS pixels.

#### Scenario: An energy period is added to an ordinary Room page
- **WHEN** the administrator selects it through Add card and configures its entity, period, name and icon
- **THEN** it generates the same period/history behavior offered by the Energy starter

#### Scenario: A room shortcut is added manually
- **WHEN** its destination and light targets are configured
- **THEN** navigation and the separately guarded All off action retain their existing behavior without requiring a special Rooms page
