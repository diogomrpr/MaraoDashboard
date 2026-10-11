# Spec Delta

## MODIFIED Requirements

### Requirement: Configuration shapes and validation
Generation SHALL accept supported entity strings, objects and grouped lists/maps plus explicit page card lists, layout sections and object-valued raw cards. Legacy include/exclude/overrides SHALL be preserved by versioned conversion. Slugs and page paths SHALL be normalized and resolved duplicates checked. Columns SHALL be integers from one through six, excluding booleans. All page paths SHALL be unique; invalid paths, card bindings and owned references SHALL fail before writes.

#### Scenario: A custom page uses an existing room path
- **WHEN** configuration is planned
- **THEN** validation rejects the collision before writing generated output

#### Scenario: A raw card or column count has an invalid shape
- **WHEN** configuration is planned
- **THEN** validation reports an error rather than emitting malformed Lovelace YAML

#### Scenario: A template-created card has an invalid binding
- **WHEN** configuration is planned
- **THEN** the error identifies the page and card and leaves the existing generated dashboard unchanged

#### Scenario: Legacy explicit options are converted
- **WHEN** a room supplies explicit entities with include/exclude/overrides
- **THEN** conversion produces the effective explicit selection with its options preserved
- **AND** generation does not add entities through the area's registry membership

### Requirement: Resolved rooms and optional pages
Generation SHALL render every saved page from one editable collection, including Home, Rooms and room details. New starters SHALL be saved as ordinary pages, not regenerated special page types. Legacy Overview, Rooms, room details, Security, Energy, Wallbox, Media and custom views SHALL convert without losing selected cards, paths, metadata or raw content. Former derived access/player lists SHALL be materialized once unless an explicit replacement, including an empty list, exists.

#### Scenario: An optional page is not configured
- **WHEN** its object is absent from legacy `pages`
- **THEN** migration leaves that optional view and its navigation absent without disabling the existing home/room views

#### Scenario: A Home page no longer contains weather
- **WHEN** the saved page is regenerated
- **THEN** no weather card is recreated from a legacy field or starter default

#### Scenario: A formerly derived Media page is migrated
- **WHEN** its source has no explicit player list
- **THEN** its existing resolved players and options become editable saved cards and later room edits do not change that page automatically

#### Scenario: An entity is deleted and generation repeats
- **WHEN** the administrator removes its room entry before legacy conversion, saves and regenerates again
- **THEN** it remains absent from that room, its derived summaries and popups and default Security/Media lists
- **AND** current or future HA area membership does not reinsert it
#### Scenario: Other explicit references remain
- **WHEN** an entity is removed from one room but explicitly configured in another room, an independently configured page or a raw/protected card
- **THEN** those independent references remain rather than being silently deleted

### Requirement: Room and custom-page card layouts
Every page SHALL support automatic domain grouping or a fixed grid that preserves mixed card/shortcut order and appends raw cards. Ordered sections SHALL additionally support independently configured one-through-six-column layouts on one page, preserving section and card order. Required entity popups and the shared navbar/footer SHALL be generated once per page. Legacy full-width and multi-column template composition SHALL survive conversion.

#### Scenario: A custom page specifies two columns
- **WHEN** its ordered entity, shortcut and raw-card configuration is generated
- **THEN** one two-column grid preserves that order before the popup/footer content

#### Scenario: A page uses several layout sections
- **WHEN** a full-width metric, two-column controls and another full-width card are saved in that order
- **THEN** generation preserves their widths and order and places popups/footer after all sections

#### Scenario: A group appears between an entity and a shortcut
- **WHEN** the fixed-column page is generated
- **THEN** that mixed order is preserved and the group popup is available on the same page

### Requirement: Guided product page composition
Starter-created editable cards SHALL retain Security alarm/access/actions; Energy house power, daily/monthly energy/cost, optional-toggle loads, appliances and history sheets; Wallbox status, power/max-current readings, shared current input, up to three presets and pause/resume; and Media players/popups. Names, icons, bindings and supported options SHALL be individually configurable on any page. Composition SHALL come from saved cards rather than page-role defaults.

#### Scenario: An explicit empty access or player list is configured
- **WHEN** legacy Security or Media is converted and generated
- **THEN** the explicit list replaces derived room entities instead of being ignored

#### Scenario: A charging-current card is moved out of Wallbox
- **WHEN** it is configured on another page and generated
- **THEN** its entity bounds, step and configured presets retain the same native control behavior

#### Scenario: An Energy card is renamed or removed
- **WHEN** the page is regenerated
- **THEN** the configured name reaches its card/history sheet or the removed card and its owned popup disappear

### Requirement: Native summaries and generated popups
Home starter summaries SHALL use editable Entity Group cards with explicit members, summary options and popup filters. Converted legacy summaries SHALL preserve their resolved member selection and intended filtering. Climate, access, media and camera cards SHALL retain matching popups and appropriate native controls. Generated popup identities SHALL be unique across page/card instances while retaining compatible explicit references.

#### Scenario: The primary summary entity is unavailable but another is usable
- **WHEN** the summary and popup are generated and rendered
- **THEN** secondary usable entities remain reachable and partial unavailability is represented

#### Scenario: A light summary is created from Home
- **WHEN** its active-only popup is opened
- **THEN** only active selected lights appear while the summary considers its configured membership

#### Scenario: Two Energy or Media starters use the same entity
- **WHEN** their differently named cards open their respective popups
- **THEN** each opens the correct page/card content with no hash collision or cross-page options

#### Scenario: Explicit overview groups replace defaults
- **WHEN** the legacy saved configuration contains an explicit overview group list
- **THEN** only those groups appear in their configured order, without additional hard-coded light, cover, climate or maintenance cards
- **AND** an explicit empty list suppresses those groups while preserving weather and scenes

## ADDED Requirements

### Requirement: Universal page routes and landing selection
All saved pages SHALL have unique editable paths and a valid configured landing page. Renaming a page SHALL update owned navbar, shortcut and generated-popup references. Navbar routes SHALL remain rooted at the active dashboard and limited to five entries; unpinned saved pages SHALL still be generated. Deleted pages SHALL NOT return from defaults, registry discovery or template metadata.

#### Scenario: A former built-in page path changes
- **WHEN** Home or Energy receives a new valid path
- **THEN** owned links and generated files follow it and no duplicate old generated view remains

#### Scenario: There are more than five pages
- **WHEN** configuration is generated with five selected navbar entries
- **THEN** every saved page remains reachable through its valid route or configured shortcut while only the selected five appear in the navbar

#### Scenario: The landing page is missing
- **WHEN** configuration is planned
- **THEN** validation rejects the source before replacing the usable dashboard

### Requirement: Template creation independent of runtime generation
Templates SHALL create ordinary editable page data once. Runtime generation SHALL consume that saved data without requiring a template identifier or refilling removed cards. Room associations and template origin SHALL NOT authorize ongoing entity discovery. Empty pages SHALL remain valid when another or the same empty page provides a valid landing route.

#### Scenario: A saved page has no template identifier
- **WHEN** its supported cards and layouts are generated
- **THEN** it works exactly as an equivalent template-created page

#### Scenario: Every card is removed from a page
- **WHEN** it is saved and the integration reloads
- **THEN** the empty page remains empty and no default cards are restored
