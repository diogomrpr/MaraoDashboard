# Visual builder

## Purpose

Allow administrators to edit the same dashboard configuration through guided
controls and JSON without losing unsupported fields or silently changing options.

## Requirements

### Requirement: One editable configuration
Visual and JSON tabs SHALL edit the same local document. Unknown fields and raw
Lovelace cards SHALL survive view switches. Invalid JSON SHALL prevent returning
to Visual until corrected. Formatting, schema help and entity suggestions SHALL
use the existing bundled editor.

#### Scenario: Advanced configuration is edited in JSON
- **WHEN** the user switches back to Visual and later saves
- **THEN** unknown fields and raw cards remain present in the generated configuration

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

### Requirement: Local drafts and explicit save
Changes SHALL remain local until Save & Generate. Discard changes SHALL reload
the saved source; Open dashboard SHALL open the last generated result. Invalid
configuration SHALL produce a readable error without silently replacing valid state.

#### Scenario: A user edits a card but has not saved
- **WHEN** the existing dashboard is opened
- **THEN** it continues displaying the last successfully generated configuration

### Requirement: Catalog-backed selectors and options
Add card SHALL offer the supported Marao catalog and appropriate entity domains,
with common and advanced controls. Existing names, icons, labels, graph settings,
slider options, power units, climate labels, camera/provider options, vacuum
actions and navigation presentation SHALL be carried into runtime behavior.

#### Scenario: A custom label or supported advanced setting is saved
- **WHEN** the builder saves a supported option
- **THEN** validation and generation preserve it and the shared renderer honors its documented effect

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

### Requirement: Administrative replacement confirmation
Destructive builder or history actions SHALL require explicit confirmation naming
what will be removed or replaced, except individual card/entity-entry removal
from the local draft. The builder SHALL preserve local unsaved work or clearly
present the consequence of discarding it.

#### Scenario: A stored dashboard is about to replace the current one
- **WHEN** the user selects Restore
- **THEN** the confirmation identifies the replacement before the action is dispatched

#### Scenario: An entire container is deleted
- **WHEN** the user requests deletion of a room or custom page
- **THEN** confirmation names the container before removing it

#### Scenario: Unsaved edits are discarded
- **WHEN** the user requests Discard changes while the draft differs from the saved configuration
- **THEN** confirmation explains that unsaved changes will be discarded before reloading the saved configuration

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

### Requirement: Add by card type or entity
Add card SHALL expose localized By card type and By entity tabs for rooms and
custom pages. By card type SHALL retain the supported catalog and option forms.
Selecting a supported entity SHALL choose its compatible Marao card and open the
same form with that entity prefilled. Creating SHALL add one local draft card;
cancelling or switching tabs SHALL NOT add a card or save configuration.

#### Scenario: An entity is selected first
- **WHEN** the administrator selects a suggested or searched climate entity
- **THEN** the climate card form opens with that entity selected and normal options available
- **AND** confirming adds it once to the draft without generating until Save & Generate

#### Scenario: A card type is selected first
- **WHEN** the administrator chooses a card in By card type
- **THEN** its existing compatible-entity selector and basic/advanced options remain available

#### Scenario: The Add flow is cancelled
- **WHEN** the administrator switches tabs, searches or cancels without confirming a card
- **THEN** neither the room document nor the saved dashboard changes

### Requirement: Room suggestions and global entity search
By entity SHALL initially suggest enabled, visible, supported entities from the
room's associated HA area that are not already added to that container. Matching
SHALL respect entity-area assignment before device-area fallback. Search SHALL
match friendly name or entity ID across supported entities in all areas. Results
SHALL identify entity ID and compatible card, distinguish already-added entries,
and show localized empty/no-match states without automatic additions.

#### Scenario: A new entity becomes available in the area
- **WHEN** current registry metadata includes a new supported entity for the room
- **THEN** it appears as a suggestion after metadata refresh but is not added automatically

#### Scenario: A deleted entity can be deliberately added again
- **WHEN** the administrator removes an entity from the local room list and reopens Add
- **THEN** it is eligible for suggestions again if it still belongs to that HA area
- **AND** it remains absent until explicitly created

#### Scenario: An entity in another area is found by name
- **WHEN** the administrator searches its friendly name or entity ID
- **THEN** the supported entity can be selected regardless of its HA area
- **AND** adding it does not reassign its HA area

#### Scenario: An entity is already present
- **WHEN** it already appears in the container's entity-backed cards or raw-card entity references
- **THEN** it is omitted from suggestions and marked already added in global search
- **AND** the entity-first flow cannot accidentally add a duplicate

#### Scenario: A custom page or room has no associated area
- **WHEN** By entity opens
- **THEN** a localized explanation and global search are available without inferring an area from its name

#### Scenario: Entity metadata is refreshed
- **WHEN** Add obtains updated metadata or cannot obtain it
- **THEN** it updates suggestions or presents a readable retryable error
- **AND** the current unsaved document remains intact without repeated automatic requests

### Requirement: Per-reading energy formatting controls
The shared editor SHALL offer display unit and decimal precision for energy-related numeric readings on cards, including graph/load metrics, switch power and energy-period summaries. Unit choices SHALL offer source/automatic and supported compatible units; precision SHALL offer automatic or zero through six decimal places. Settings SHALL remain card-owned across Visual/JSON switches, selector edits, duplication and generation, including generated popups.

#### Scenario: An administrator edits an energy card
- **WHEN** `kW` and two decimal places are selected for its watt-valued sensor
- **THEN** saving generates the configured equivalent reading in both card and associated numeric history presentation

#### Scenario: The same entity appears on several pages
- **WHEN** one card's display unit or precision changes
- **THEN** other cards keep their own settings and the Home Assistant entity configuration is unchanged

#### Scenario: Formatting is removed
- **WHEN** both new options are reset to automatic/default with no stored overrides
- **THEN** the card returns to its legacy display rather than persisting artificial formatting defaults

### Requirement: Energy formatting validation and localization
Invalid unit identifiers, incompatible source/target dimensions and precision outside integer zero through six SHALL produce readable validation errors before generation. Booleans, fractions and numeric strings SHALL NOT count as precision integers. Missing/unknown source units SHALL NOT authorize conversion. Monetary and other unsupported dimensions SHALL offer source units only. Controls/help/errors SHALL be localized, semantic, scalable and visibly at least 48 by 48 CSS pixels.

#### Scenario: JSON specifies invalid precision
- **WHEN** precision is `true`, `"2"`, `1.5`, negative or greater than six
- **THEN** validation identifies the invalid option without replacing the saved dashboard

#### Scenario: Energy and power are confused
- **WHEN** a watt-valued reading is configured to display in `kWh`
- **THEN** saving reports the incompatible unit instead of emitting a misleading label

#### Scenario: Unit metadata is unavailable during editing
- **WHEN** an explicitly configured conversion cannot yet be verified
- **THEN** the editor explains that source metadata is required and preserves the draft rather than guessing, silently clearing it or generating incorrect output

### Requirement: Structural JSON folding
The JSON tab SHALL let administrators collapse and expand multiline arrays and objects, including nested regions, through discoverable touch controls and keyboard commands. Collapsing one region SHALL NOT collapse unrelated siblings. Fold controls SHALL be visible without hover and have visible dimensions of at least 48 × 48 CSS pixels, accessible names and an identifiable expanded/collapsed state.

#### Scenario: A list is collapsed and reopened
- **WHEN** the administrator collapses a multiline room-card list
- **THEN** its contents are hidden behind an identifiable collapsed region
- **AND** expanding it restores all its contents while unrelated lists remain unchanged

#### Scenario: A nested object is folded on a phone
- **WHEN** the JSON tab is open in a supported mobile layout without a mouse
- **THEN** a visible control allows folding and unfolding the nested object without hover
- **AND** each folding control remains at least 48 × 48 CSS pixels with readable expanded/collapsed state in both themes and supported text/zoom profiles

#### Scenario: Folding is operated from the keyboard
- **WHEN** the administrator uses the editor's fold or unfold command on the current region
- **THEN** the same region changes its expanded state without changing the document

### Requirement: Folded content remains part of the local document
Folding and unfolding SHALL change only the editor view, never source text, dirty state or edit history. Hidden fields and raw cards SHALL remain included in validation and Save & Generate. An unchanged document SHALL retain its folding state across Visual/JSON switches. Edits, formatting, discard or restore SHALL recompute valid ranges without dropping document content or leaving stale hidden lines.

#### Scenario: A folded document is saved
- **WHEN** the administrator collapses a region containing unknown fields and raw cards and saves
- **THEN** the complete document, including collapsed content, is validated and generated
- **AND** folding alone has not marked the draft as modified

#### Scenario: Tabs change without editing
- **WHEN** the administrator switches from JSON to Visual and back without changing the document
- **THEN** the previous folded regions and complete draft are preserved

#### Scenario: A folded region changes
- **WHEN** editing, formatting, discard or restore changes a folded document
- **THEN** folding ranges match the current source and the document remains complete
- **AND** existing undo/redo and explicit replacement behavior remain intact

#### Scenario: Invalid content is hidden in a region
- **WHEN** collapsed content contains invalid JSON or invalid configuration
- **THEN** diagnostics and save validation still report the error
- **AND** folding does not bypass the existing invalid-JSON protection when returning to Visual

### Requirement: Independent visual editor startup
The default Visual editor SHALL become usable without downloading, evaluating or
initializing JSON-only editor code, styles or workers. While saved configuration
is loading, it SHALL show localized progress and block actions requiring that
document. Once available, the document SHALL populate the normal visual controls
without waiting for optional JSON assets.

#### Scenario: An administrator opens the editor on Visual
- **WHEN** configuration and required visual resources are available
- **THEN** the visual controls become usable without any JSON-only asset request
- **AND** the initial empty content area is replaced by explicit loading feedback until ready

#### Scenario: The administrator selects JSON before configuration is ready
- **WHEN** the saved document is still loading
- **THEN** the tab cannot initialize with missing configuration or replace it with an empty draft
- **AND** Save, History and Open dashboard do not act on incomplete data

### Requirement: Deferred JSON editing preserves the draft
The existing bundled JSON editor SHALL load only when requested, show localized
progress, and reuse successful initialization during the current panel lifetime.
Visual edits and unknown fields SHALL survive asynchronous initialization and tab
switching. Formatting, schema assistance, entity suggestions and invalid-JSON
protection SHALL remain available. A superseded tab request SHALL NOT steal focus.

#### Scenario: JSON is opened after unsaved Visual edits
- **WHEN** its resources finish loading
- **THEN** the editor displays the current draft with existing JSON assistance
- **AND** saved configuration and generated dashboard remain unchanged

#### Scenario: The requested tab changes while JSON loads
- **WHEN** the administrator returns to Visual before JSON is ready
- **THEN** completion does not switch back to JSON, lose edits or move focus unexpectedly

#### Scenario: An initialized JSON tab is reopened
- **WHEN** the administrator returns to JSON in the same connected panel lifetime
- **THEN** it reuses its editor without duplicate instances, listeners or workers

### Requirement: Recoverable editor loading
Initial configuration and JSON initialization SHALL each have at most one
concurrent attempt. Failure SHALL show a localized readable error and explicit
retry, preserve usable controls and drafts, and avoid automatic repeated requests
on unrelated HA updates. Removal or replacement of the panel SHALL prevent late
completion from overwriting its current document or accessing disposed controls.

#### Scenario: Configuration loading fails
- **WHEN** the management response reports an error
- **THEN** the error and retry are visible and unrelated HA updates do not repeat the request
- **AND** a deliberate retry can load the saved document once

#### Scenario: A JSON resource fails
- **WHEN** the administrator requests JSON and a required asset cannot load
- **THEN** the existing Visual draft remains usable and unchanged
- **AND** explicit retry recovers JSON without dispatching Save or resetting the draft

#### Scenario: Repeated events occur during initialization
- **WHEN** HA updates, duplicate tab activations or panel removal occur before an attempt settles
- **THEN** concurrent duplicate work is not started and obsolete completion is not applied

### Requirement: Persistent editor header
The editor SHALL retain its title, draft/save indication, actions and Visual/JSON navigation in a sticky header while its page scrolls. Save & Generate and mode navigation SHALL remain directly reachable; secondary actions SHALL remain reachable without returning to the page top. The header SHALL use an opaque themed surface, respect the available HA content boundary and remain beneath modal dialogs and selector overlays.

#### Scenario: A long Visual form is scrolled
- **WHEN** the administrator scrolls from the start through the middle to the end of a populated editor page
- **THEN** the header remains pinned in the available content viewport and its actions remain reachable
- **AND** scrolled form content does not show through the header

#### Scenario: The JSON view is scrolled
- **WHEN** the administrator scrolls the page or the JSON editor's internal document
- **THEN** Save & Generate and Visual/JSON mode navigation remain available without resetting the JSON cursor, source or scroll state

#### Scenario: A dialog or selector opens while the header is pinned
- **WHEN** a history dialog, card dialog or native selector overlay is opened
- **THEN** it appears above the sticky header and the header cannot intercept its interaction

### Requirement: Usable sticky editor layout
The sticky editor header SHALL reflow across supported mobile sizes, orientations and text/zoom profiles without clipped essential labels, horizontal page overflow or undersized controls. It SHALL leave editor content scrollable and keep focused controls reachable below it. Sticky presentation SHALL preserve draft state, tab validation, disabled/busy actions and explicit save/discard behavior without duplicating controls or introducing automatic writes.

#### Scenario: A short or enlarged mobile viewport is used
- **WHEN** the editor is displayed at 320px, in mobile landscape or with supported enlarged/bold text or zoom
- **THEN** primary actions and tabs remain operable, secondary actions remain reachable, interactive targets are at least 48×48 CSS pixels and form content can still be accessed below the header

#### Scenario: A form field is focused or scrolled into view
- **WHEN** keyboard navigation or a native form action reveals a field below the pinned header
- **THEN** the field is not hidden beneath the header and its value can be read and edited

#### Scenario: The document has unsaved or invalid changes
- **WHEN** the user scrolls, switches tabs or operates a pinned action
- **THEN** existing dirty state, JSON validation and confirmation behavior remain intact and no extra save or discard occurs

#### Scenario: Loading or save is in progress
- **WHEN** the editor's existing lifecycle disables an action
- **THEN** the pinned presentation reflects the same disabled state and does not expose another enabled copy of that action

### Requirement: Immediate individual card removal
The builder SHALL remove an individual card/entity entry from its local draft
immediately on Delete, without a confirmation modal or additional gesture. It
SHALL remove only that occurrence, preserve other content and order, mark the
draft as changed, and reflect the removal in both Visual and JSON. Removal SHALL
NOT delete the Home Assistant entity or persist before Save & Generate.

#### Scenario: A room entity card is deleted
- **WHEN** the administrator activates Delete on one room entity card
- **THEN** that row disappears once without a dialog and the draft is marked as changed
- **AND** other occurrences of the entity, surviving entries and their options remain intact, and no Home Assistant entity is deleted

#### Scenario: A custom-page entry is deleted
- **WHEN** the administrator activates Delete on an entity card or page-shortcut card in a custom page
- **THEN** only the selected entry is removed immediately without a dialog and the remaining entries retain their order and configuration

#### Scenario: The unsaved removal is inspected and discarded
- **WHEN** the administrator deletes an entry and switches to JSON before saving
- **THEN** JSON reflects the removal while the generated dashboard continues displaying the saved configuration
- **AND** confirming Discard changes restores the saved entry in the editor

#### Scenario: The removal is saved explicitly
- **WHEN** the administrator deletes an entry and successfully uses Save & Generate
- **THEN** the generated dashboard and reloaded editor reflect the removal, with unrelated configuration preserved

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
