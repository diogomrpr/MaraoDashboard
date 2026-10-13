# Dashboard generation

## Purpose

Generate consistent project-owned views, cards, popups and navigation from the
saved JSON while preserving deliberate manual customization.

## Requirements

### Requirement: JSON source and generated output
The saved `dashboard/MaraoDashboard/dashboard.json` SHALL be the editable source
of truth. Generation SHALL validate and normalize configuration and write
Lovelace YAML under `dashboard/MaraoDashboard/<slug>/`. Repeated generation
SHALL keep configuration-facing `hc_*` template keys and project component types stable.

#### Scenario: A supported entity is added to a room
- **WHEN** the dashboard is generated
- **THEN** entity resolution chooses the appropriate project-owned card and preserves its overrides

### Requirement: Refreshing committed dashboard output
After a committed editor save, service generation, setup repair or history restore,
the integration SHALL reload the affected registered YAML dashboard and use Home
Assistant's update notification so changed includes do not remain cached. Dry runs
SHALL NOT reload dashboards; changed registrations still require a restart.

#### Scenario: An included group changes without changing the main YAML
- **WHEN** the administrator removes members and completes Save & Generate
- **THEN** ordinary dashboard requests and open dashboard clients receive the saved membership, including an explicitly empty list, without a manual forced reload
- **AND** generation through the service and history restoration refresh the same dashboard cache

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

### Requirement: Protected custom-card regions
Generation SHALL preserve YAML between `marao:custom:start` and
`marao:custom:end` while replacing owned generated regions and footer. Damaged
markers SHALL stop generation. Exact matching legacy output MAY be adopted;
without a prior manifest, unmarked parseable card containers at expected generated
paths MAY also be adopted and replaced. Unmarked manual content SHALL NOT be
promised the protection provided by custom regions.

#### Scenario: A user adds a manual card inside the protected region
- **WHEN** the dashboard is regenerated
- **THEN** that card remains intact and the generated footer remains below it

#### Scenario: The protection markers are damaged
- **WHEN** regeneration preflights the existing output
- **THEN** it refuses unsafe overwrite with a readable error

#### Scenario: A pre-manifest dashboard has unmarked legacy card containers
- **WHEN** editor regeneration adopts its parseable containers at expected generated paths
- **THEN** the valid prior dashboard is snapshotted and those containers are rewritten with protection markers
- **AND** old unmarked edits are not copied automatically into the custom region

### Requirement: Manifest-owned cleanup and per-file writes
Generation SHALL preflight protected regions before writes and replace individual
files atomically, without claiming an all-files transaction. `.marao-generated.json`
SHALL track owned output using safe relative paths. Removed owned files SHALL be
cleaned up; stale containers with custom cards SHALL retain those cards with owned
content cleared. Unrelated files SHALL remain intact.

#### Scenario: A room containing protected custom cards is removed
- **WHEN** regeneration cleans up its previously owned container
- **THEN** the custom cards survive while obsolete generated content is cleared

### Requirement: Navigation composition and entity-free links
Generated navigation SHALL target the active dashboard root, use at most five
navbar entries, and include the shared bottom spacer exactly once. Custom room
cards SHALL precede the footer. Room/page shortcuts SHALL work without fabricated
entity dependencies; `action: none` headings SHALL be noninteractive.

#### Scenario: An empty room is configured
- **WHEN** its room shortcut is activated
- **THEN** navigation opens that room without requiring an unrelated entity

#### Scenario: Explicit navbar pages are ordered
- **WHEN** `navigation` contains page paths or objects with `page`
- **THEN** they replace automatic routes in their configured order, subject to the five-entry limit

#### Scenario: No navbar selection is supplied
- **WHEN** navigation is generated
- **THEN** the first five available generated pages are selected automatically

#### Scenario: Legacy URL entries are supplied without explicit page entries
- **WHEN** navigation is generated
- **THEN** label/URL entries append to automatic routes and the combined five-entry limit is validated

### Requirement: Configuration-driven actions and localization
Generated actions SHALL pass native numeric/service data rather than executable
string expressions, preserve supported card variables, and use localized labels.
Relative media seeking SHALL use bounded numeric offsets; configured vacuum
segments SHALL retain explicitly configured segment IDs and the documented
`vacuum.send_command` / `app_segment_clean` default, with supported service overrides.

#### Scenario: A media seek button is generated
- **WHEN** its relative seek is activated
- **THEN** shared runtime computes one bounded numeric target from authoritative playback state

### Requirement: Validated group membership and popup ownership
Generation SHALL validate group identity, type, filter and members before writes,
deduplicate members in configured order, preserve member options and reject mixed
or unsupported types and nested groups. Each group SHALL own a stable unique
popup within its dashboard; renaming or reordering SHALL NOT misroute it. Groups
SHALL NOT require a fabricated or available primary entity to generate content.

#### Scenario: A group contains an incompatible member or invalid filter
- **WHEN** configuration is previewed or saved
- **THEN** a readable validation error identifies the group and invalid input before generated output or valid saved data is replaced

#### Scenario: Two lighting groups are generated and reordered
- **WHEN** their names or positions change
- **THEN** each opener retains its own member list and popup without collisions
- **AND** conflicting group identities are rejected before writes

#### Scenario: A group includes entities absent from room cards
- **WHEN** compatible explicit members are selected from other rooms or global search
- **THEN** those members are generated with their configured options, without adding room cards or changing other page derivations

### Requirement: Legacy overview group compatibility
Legacy format-0/1 configurations lacking explicit groups SHALL retain derived light, cover,
maintenance and climate defaults through the shared group path and ordered 1→2
page conversion without rewriting source during reads or previews. Existing overview popup links, labels, order,
member options and numeric readings SHALL survive. Explicit group saves SHALL
preserve unrelated source and protected content, without recurring discovery.

#### Scenario: A supported released configuration has no group field
- **WHEN** it is loaded, previewed or generated
- **THEN** existing resolved members become compatible defaults with established overview hashes and preserved card options
- **AND** default light filtering follows Active only, correcting the observed off-light listing
- **AND** read-only operations leave exact saved source and archives untouched

#### Scenario: Legacy defaults are edited and saved explicitly
- **WHEN** the administrator saves the displayed groups after removing a member or group
- **THEN** the explicit result persists, does not reintroduce deleted groups or members through defaults, and preserves weather, scenes, raw/custom content and unrelated settings

#### Scenario: Discovery has no members of a legacy type
- **WHEN** a legacy configuration is resolved
- **THEN** no automatic group for that type is introduced, while deliberately configured empty groups remain intact

#### Scenario: A canonical page has no group cards
- **WHEN** a format-2 page is loaded, edited or generated with missing or empty groups
- **THEN** no derived group is inserted and later room or registry changes do not refill it

### Requirement: Empty explicit rooms remain empty
An explicit empty room list SHALL remain empty through planning, generation,
save, tab switches and setup. A current-format room with an omitted entity list
SHALL be treated as empty, never as an instruction to discover its area.
Room shortcuts SHALL remain usable for empty rooms. Suggestions SHALL NOT affect
generated content until explicitly added to the saved document.

#### Scenario: All cards are removed
- **WHEN** a room has an area association and an empty explicit list
- **THEN** generation keeps the room empty and its navigation usable

#### Scenario: Current-format JSON omits the entity list
- **WHEN** the administrator removes the entire entity-list property and saves
- **THEN** the room remains empty rather than being treated as an old area-only import

#### Scenario: A suggested entity is not selected
- **WHEN** the generator sees an eligible new HA entity in the associated area
- **THEN** it produces no additional card or popup for that entity

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
