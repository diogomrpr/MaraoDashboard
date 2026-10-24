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
The builder SHALL edit name, slug, theme and icon and manage every page in the top navbar/page section. Home, Rooms, room details and former guided/custom pages SHALL use the same page/card editor. Pages SHALL support add/edit/duplicate/delete and ordering; cards SHALL support add/edit/delete and drag or explicit reordering. Page path edits SHALL update navbar/page-shortcut references.

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
match friendly name or entity ID across supported entities in all areas.

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

#### Scenario: An entity is created while the editor is open
- **WHEN** Home Assistant exposes a newly created entity
- **THEN** it becomes searchable without reloading the editor, including in an already open entity search
- **AND** existing search text, local draft, group membership and scroll are preserved
- **AND** the entity is not added to any page automatically

#### Scenario: Metadata changes during an older request
- **WHEN** a registry update arrives while an older snapshot is loading
- **THEN** a fresh snapshot is requested after that work completes
- **AND** obsolete panel lifecycles cannot apply responses or start requests

#### Scenario: Additional room suggestions and global entity search contracts
- **WHEN** an administrator searches or registry metadata changes while the editor is open
- **THEN** Results
SHALL identify entity ID and compatible card, distinguish already-added entries,
and show localized empty/no-match states without automatic additions.
- **AND** The editor SHALL follow Home Assistant's live registry collections and refresh metadata when entity, area or device metadata changes, state membership changes, or the connection recovers.
- **AND** Related updates SHALL be coalesced rather than polling or requesting metadata for ordinary state-value changes.
- **AND** Native forms SHALL receive the current Home Assistant context.

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
The JSON tab SHALL use Microsoft Monaco's native folding controller and gutter
icons for multiline arrays and objects, including nested regions. Arrows SHALL
remain visible without hover using the supported Monaco option. Folding SHALL
preserve source and unrelated siblings. Native Monaco glyph sizing and compact
line density supersede the earlier custom 48px gutter presentation by explicit
user request.

#### Scenario: A list is collapsed and reopened
- **WHEN** the administrator collapses a multiline room-card list
- **THEN** its contents are hidden behind an identifiable collapsed region
- **AND** expanding it restores all its contents while unrelated lists remain unchanged

#### Scenario: A nested object is folded on a phone
- **WHEN** the JSON tab is open in a supported mobile layout without a mouse
- **THEN** a visible control allows folding and unfolding the nested object without hover
- **AND** native icons reflect the folded state in Monaco's default light/dark themes

#### Scenario: Folding is operated from the keyboard
- **WHEN** the administrator uses the editor's fold or unfold command on the current region
- **THEN** the same region changes its expanded state without changing the document

#### Scenario: A native gutter arrow is clicked
- **WHEN** the administrator clicks the arrow beside an expandable object or array
- **THEN** that region toggles and the arrow reflects its current state through Monaco's existing controller
- **AND** neighboring fold controls do not overlap and the document and dirty state remain unchanged

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
The default Visual editor SHALL become usable from the source and display data needed by its initially visible controls, without waiting for broader editing context, History or JSON initialization. Required startup requests SHALL take priority. JSON-only browser computation SHALL wait for usable native Visual controls and idle capacity unless explicitly selected. Configuration loading SHALL retain localized progress and document-dependent action guards.

#### Scenario: An administrator opens the editor on Visual
- **WHEN** configuration and required visual resources are available
- **THEN** the visual controls become usable independently of optional JSON resource completion
- **AND** the initial empty content area is replaced by explicit loading feedback until ready
- **AND** JSON initialization cannot become a prerequisite for Visual usability
- **AND** page headers, General settings, navbar entries and initially expanded card rows retain their correct labels and availability

#### Scenario: The administrator selects JSON before configuration is ready
- **WHEN** the saved document is still loading
- **THEN** the tab cannot initialize with missing configuration or replace it with an empty draft
- **AND** Save, History and Open dashboard do not act on incomplete data

#### Scenario: Required requests finish before frontend rendering
- **WHEN** required main-page calls and critical resource requests have finished but Visual controls are still rendering
- **THEN** independent deferred context requests and low-priority JSON file downloads can overlap that frontend work without blocking it
- **AND** JSON module evaluation, document processing and editor initialization wait until Visual is usable and idle capacity is available

#### Scenario: JSON preparation is slow or unavailable
- **WHEN** optional preparation cannot complete promptly
- **THEN** main-page loading and subsequent Visual interaction remain independent of it

### Requirement: Deferred JSON editing preserves the draft
The bundled JSON editor SHALL prepare after prioritized Visual startup using available idle capacity, or on explicit selection, and reuse successful initialization during the connected panel lifetime. Foreground loading SHALL show localized progress. Visual edits, exact JSON drafts, unknown fields and editor history/view state SHALL survive asynchronous preparation and switching.

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
- **AND** unchanged source retains undo/redo, selection, scrolling and folded regions

#### Scenario: Visual edits occur during background preparation
- **WHEN** the administrator changes the draft while an asynchronous preparation stage is pending
- **THEN** opening JSON presents the latest draft rather than the source captured before that stage
- **AND** preparation itself does not mark the draft changed or write saved configuration

#### Scenario: Save or Discard replaces the draft during preparation
- **WHEN** an explicit successful Save, confirmed Discard or confirmed history restoration establishes a new current document
- **THEN** late preparation cannot restore an obsolete document, metadata projection or dirty state

#### Scenario: Additional deferred JSON editing preserves the draft contracts
- **WHEN** JSON preparation or tab switching occurs during editing
- **THEN** Existing assistance and invalid-JSON protection SHALL remain available; background completion SHALL NOT change tabs or steal focus.

### Requirement: Recoverable editor loading
Initial configuration and JSON preparation SHALL each have at most one concurrent attempt. Foreground and background JSON work SHALL share the attempt. Failure SHALL show localized readable feedback and explicit retry, preserve usable controls and drafts, and avoid automatic repeated attempts on idle or HA events. Removal or replacement SHALL prevent late completion from overwriting current data or using disposed controls.

#### Scenario: Configuration loading fails
- **WHEN** the management response reports an error
- **THEN** the error and retry are visible and unrelated HA updates do not repeat the request
- **AND** a deliberate retry can load the saved document once
- **AND** background JSON initialization does not begin from missing or failed configuration

#### Scenario: A JSON resource fails
- **WHEN** the administrator requests JSON and a required asset cannot load
- **THEN** the existing Visual draft remains usable and unchanged
- **AND** explicit retry recovers JSON without dispatching Save or resetting the draft

#### Scenario: Repeated events occur during initialization
- **WHEN** HA updates, duplicate tab activations or panel removal occur before an attempt settles
- **THEN** concurrent duplicate work is not started and obsolete completion is not applied

#### Scenario: Background preparation fails
- **WHEN** a required JSON resource or initialization stage fails while Visual remains selected
- **THEN** localized nonmodal failure feedback and an explicit retry remain available without blocking Visual actions or changing focus
- **AND** later idle callbacks, repeated JSON selection and HA updates do not automatically retry the failed attempt
- **AND** actual failed resources and exceptions remain available to verification as failures

#### Scenario: The panel is removed and revisited
- **WHEN** scheduled or in-flight preparation belongs to a removed panel lifecycle
- **THEN** queued work is cancelled and abandoned editors, models, observers and listeners are disposed
- **AND** revisiting preserves the current draft while preventing obsolete completion and duplicate live resources

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

### Requirement: Reusable template card options
Every card role emitted by a starter SHALL also be available through the shared Add card flow on any page. Weather, native scenes, summaries, room shortcuts with All off, alarm/status, guarded service actions, energy periods/history, charging presets and media apps SHALL retain their applicable settings without requiring a special page type. Interactive editor controls SHALL be localized, semantic and at least 48 by 48 CSS pixels.

#### Scenario: An energy period is added to an ordinary Room page
- **WHEN** the administrator selects it through Add card and configures its entity, period, name and icon
- **THEN** it generates the same period/history behavior offered by the Energy starter

#### Scenario: A room shortcut is added manually
- **WHEN** its destination and light targets are configured
- **THEN** navigation and the separately guarded All off action retain their existing behavior without requiring a special Rooms page

### Requirement: Explicit access opener selection
The builder SHALL offer the unified Access family for lock, access-cover, button, switch and script entities. Selecting opening-slide behavior SHALL preserve exact bindings and options through Visual/JSON edits and generation. Button/switch/script entities SHALL NOT automatically become access openers; legacy opener aliases SHALL retain their behavior.

#### Scenario: An administrator selects a button opener
- **WHEN** the draft is edited, reordered and saved
- **THEN** its strict-slide template and exact entity remain selected

### Requirement: Shared native configuration metadata
Native forms and the builder SHALL use the same catalog-backed option definitions. Adding native editing SHALL preserve current builder drafts, saved configuration and generated contracts.

#### Scenario: A shared option is edited in either mode
- **WHEN** an administrator sets supported energy formatting
- **THEN** both modes retain the same option semantics without synchronizing their dashboards

### Requirement: Discoverable JSON search and replace
The JSON editor SHALL expose search and replace through Monaco's native widget and keyboard shortcuts. Search SHALL show match count, previous/next navigation and a no-match state. It SHALL include folded content and reveal a selected result. Searching SHALL NOT modify the source or dirty state; confirmed replacements SHALL be local, undoable text edits and SHALL NOT save automatically.

#### Scenario: Finding text in a collapsed section
- **WHEN** the administrator searches for text inside a folded object
- **THEN** it contributes to the match count and navigating to that match reveals and selects it
- **AND** closing search preserves the source text and existing dirty state

#### Scenario: Replacing a repeated value
- **WHEN** the administrator explicitly replaces the current match or all matches in the indicated scope
- **THEN** the expected text changes once in the local document, including any matching folded content
- **AND** undo restores the replaced text while the generated dashboard remains unchanged

#### Scenario: A query has no matches
- **WHEN** search finds no matching text
- **THEN** a readable no-match state appears and match navigation cannot jump to an unrelated location

### Requirement: Visible JSON positions and navigable diagnostics
The JSON editor SHALL display line numbers and readable syntax/schema issues with line and column locations. Selecting an issue SHALL reveal its affected code, including folded content. Diagnostics SHALL update after edits without rewriting text. Existing validation before returning to Visual or saving SHALL remain authoritative; editor assistance SHALL NOT bypass it.

#### Scenario: Correcting an invalid nested value
- **WHEN** an issue is selected for a folded nested value
- **THEN** its line is revealed and selected with the issue message available
- **AND** correcting the value updates the issue list without resetting unrelated folds or edits

#### Scenario: Invalid JSON cannot leave the editor
- **WHEN** the source is syntactically invalid and the administrator selects Visual or Save & Generate
- **THEN** existing validation rejects the operation and the complete local text remains available for correction

### Requirement: Contextual dashboard JSON suggestions
Suggestions SHALL cover supported card/template names, catalog-backed basic and advanced options, known entity IDs and current draft page paths at applicable JSON locations. They SHALL offer contextual help and be reachable by typing and native editor commands. Accepting a suggestion SHALL change only its intended edit range. Unknown/custom properties and valid manual values SHALL remain editable and preserved.

#### Scenario: Completing a card option
- **WHEN** the caret is in a supported card's configuration
- **THEN** suggestions identify applicable field names and documented value choices using that card's metadata
- **AND** unrelated card-only options are not presented as universally applicable

#### Scenario: Completing a binding or page link
- **WHEN** an entity binding or page-reference value is being edited
- **THEN** compatible known entities or the current draft's page paths are suggested as appropriate
- **AND** renaming or adding a page refreshes path suggestions without replacing the draft

#### Scenario: Preserving advanced custom content
- **WHEN** a suggestion is accepted beside nested command data, raw cards, explicit empty selections or unknown fields
- **THEN** those neighboring values and their ordering remain unchanged
- **AND** no entity service or automatic save is dispatched

### Requirement: Single-document JSON editing tools
The JSON tab SHALL provide native formatting and undo/redo within the available HA panel area while keeping Save and mode navigation reachable. These tools SHALL operate on the same document. Resizing the editor SHALL preserve source, cursor, selection, scroll, folds and dirty state and SHALL NOT request browser fullscreen access.

#### Scenario: Using more editing space
- **WHEN** the available editor area changes size
- **THEN** the same document and editing position remain active with save/navigation controls reachable
- **AND** no new editor, document or saved configuration is created

#### Scenario: Undoing an accepted edit
- **WHEN** the administrator formats text, accepts a completion or replaces text and then uses Undo or Redo
- **THEN** the corresponding source edit is reversed or reapplied through the editor's existing text history
- **AND** dirty state reflects the resulting text relative to the saved source

### Requirement: JSON editing session continuity
Switching Visual/JSON without a source change SHALL retain the same JSON edit history, selection, scroll position and folds. Changed drafts SHALL synchronize without dropping content or applying stale positions/diagnostics. Existing explicit discard/restore and asynchronous loading behavior SHALL remain intact. Panel removal SHALL dispose added controls/listeners and prevent obsolete results from changing another document.

#### Scenario: Returning to an unchanged document
- **WHEN** the administrator switches to Visual and back without changing its content
- **THEN** JSON retains its previous source, cursor/selection, scroll position, folds and undo history

#### Scenario: Metadata arrives after another edit
- **WHEN** entity metadata or asynchronous language assistance finishes after the draft changed or the panel was removed
- **THEN** it does not overwrite text, apply obsolete issues or reopen a superseded tab

### Requirement: Mobile JSON tools and local resources
JSON tools SHALL remain usable with touch and keyboard in both Marao themes and required narrow, landscape, text and zoom layouts. The editor SHALL retain stock Monaco typography, themes, density and native widget sizes, as explicitly requested by the user; surrounding Marao app controls SHALL retain their existing UI rules. Marao controls/feedback SHALL follow English/Portuguese localization.

#### Scenario: Editing with a mobile keyboard
- **WHEN** an administrator types, selects, pastes, searches or accepts a suggestion in the selected iPhone/Android mobile profiles
- **THEN** the caret, active tool and essential controls remain reachable without clipped content or unintended text changes
- **AND** native gutter, result navigation and suggestion interactions retain Monaco's standard presentation

#### Scenario: Opening Visual only
- **WHEN** the administrator uses Visual without requesting JSON
- **THEN** Visual remains usable independently of optional JSON downloads or background preparation
- **AND** JSON assistance never fetches a remote schema or sends configuration text to an external service

#### Scenario: Additional mobile JSON tools and local resources contracts
- **WHEN** JSON tooling is used or prepared on a supported mobile host
- **THEN** Added editor assets SHALL remain local and versioned; optional preparation SHALL follow prioritized Visual startup and idle-capacity rules.

### Requirement: Card drag placement within a page
The Visual builder SHALL allow every visually editable card occurrence to be dragged to a precise position within its section or another section of the same page. Destinations SHALL include the start, gaps, end and empty sections. Flat pages SHALL retain single-container reordering. A move SHALL transfer exactly one occurrence without duplication or deletion of its source section.

#### Scenario: Reordering in both directions
- **WHEN** an administrator moves a card upward or downward within a populated section
- **THEN** it appears at the indicated insertion position exactly once and the relative order of all other cards is preserved

#### Scenario: Moving into an empty section
- **WHEN** a card is dropped into an empty section on the same page
- **THEN** it becomes that section's first card, disappears from its source and retains its complete configuration
- **AND** an emptied source section stays present with its original layout settings

#### Scenario: Moving between populated sections
- **WHEN** a card is dropped before, between or after cards in another section of its page
- **THEN** only the source and destination card lists change and the indicated destination position is honored

### Requirement: Touch-friendly card dragging
Dragging SHALL use a visible, named handle at least 48 by 48 CSS pixels and work with touch and mouse. The editor SHALL show the selected card and insertion position and scroll reachable content near viewport edges. Ordinary scrolling outside the handle SHALL remain available. Dragging SHALL NOT activate another row action or a Home Assistant entity action.

#### Scenario: Dragging on a phone
- **WHEN** an administrator drags a handle through a long section to a destination below the visible content
- **THEN** scrolling reveals the destination, the insertion feedback stays aligned with it and releasing commits one move
- **AND** Edit, Delete and Save do not activate as a consequence of the gesture

#### Scenario: Scrolling without grabbing a card
- **WHEN** the administrator scrolls from a card's label or other non-handle content
- **THEN** the editor scrolls normally without initiating a move

#### Scenario: Enlarged mobile layouts
- **WHEN** the editor uses either theme at 320 CSS pixels, representative iPhone or Android portrait/landscape, or supported bold/text/zoom settings
- **THEN** handles, actions and drop feedback remain reachable without horizontal overflow, clipped essential labels or targets smaller than 48 by 48 CSS pixels

### Requirement: Explicit card move controls
The builder SHALL retain explicit up/down reordering and provide a localized Move to section action with a destination insertion position. These controls SHALL produce the same configuration result as dragging and remain usable by tap and keyboard. Controls and feedback SHALL use the existing English and Portuguese localization behavior.

#### Scenario: Moving without dragging
- **WHEN** the administrator selects another section and a destination position through Move to section and confirms
- **THEN** the selected occurrence moves once to that position with the same result as a matching drag
- **AND** cancelling the action leaves the draft unchanged

#### Scenario: A page has one section
- **WHEN** its card actions are displayed
- **THEN** up/down reordering remains available and no unusable cross-section destination is offered

### Requirement: Atomic local card movement
Card movement SHALL remain local until Save & Generate. A cancelled, invalid, stale or unchanged drop SHALL preserve the source document and existing dirty state. Only a completed valid move SHALL update the draft. The editor SHALL clear gesture feedback and stop gesture scrolling on cancellation, lifecycle interruption or completion.

#### Scenario: An active drag is interrupted
- **WHEN** Escape, pointer cancellation, lost gesture capture, panel removal, tab switching, document replacement or a busy operation interrupts a drag
- **THEN** the uncommitted move is cancelled without changing the document or saving
- **AND** no drag overlay, captured gesture or scrolling task remains active

#### Scenario: Dropping outside a valid destination
- **WHEN** a card is released outside its page, on an invalid target or in its unchanged position
- **THEN** no move is committed and existing unsaved edits and dirty state remain intact

#### Scenario: Inspecting and discarding an unsaved move
- **WHEN** a completed move is inspected in JSON before saving
- **THEN** JSON reflects the move and the generated dashboard still reflects the last saved source
- **AND** confirming Discard restores the saved ordering and section membership

### Requirement: Configuration-preserving card transfer
Moving a card SHALL preserve its occurrence identity, names, bindings, nested options, explicit empty selections, unknown fields and popup references. Other occurrences, raw cards, section metadata and protected custom content SHALL remain intact. Visual/JSON switching, Save & Generate, reload and repeated generation SHALL preserve the accepted move through the existing source format and recovery contracts.

#### Scenario: Duplicate entities carry different options
- **WHEN** one of two occurrences of the same entity is moved to another section
- **THEN** only that occurrence moves with its own identity and options, and the other occurrence and its popup references remain unchanged

#### Scenario: Moving advanced or entity-free cards
- **WHEN** a group, heading, scene collection, page shortcut or card with advanced nested settings is transferred and saved
- **THEN** its membership/order, empty selections, command data, links and unknown options survive the move and subsequent reload
- **AND** raw Lovelace cards stay in their authored containers and no entity action is dispatched

### Requirement: Card moves respect section layouts
Card moves SHALL preserve source and destination layout settings. Fixed-column sections SHALL render the accepted mixed card order. Automatic sections SHALL retain their existing domain grouping, with localized guidance explaining how fixed columns preserve exact mixed order. Moving a card SHALL NOT silently convert a layout or reorder unrelated sections.

#### Scenario: Moving into a fixed-column section
- **WHEN** an administrator inserts a card between other card types and saves
- **THEN** the generated grid preserves that position and the destination column count

#### Scenario: Moving into an automatic section
- **WHEN** a card is moved into a section with automatic layout
- **THEN** its accepted source position is retained while the generated dashboard uses the existing domain grouping
- **AND** the editor explains the layout behavior without changing the column setting

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

### Requirement: Targeted Visual draft updates
Completed local edits SHALL refresh their affected sections, page metadata and dependent controls without recreating unrelated page bodies or General controls. Unaffected controls SHALL retain focus, selection and usable scroll position. A same-page card move SHALL update only its source and destination sections and dependent feedback.

#### Scenario: One card changes on a populated page
- **WHEN** the administrator adds, edits, deletes or reorders one card while other pages are expanded
- **THEN** the changed section and required feedback update once without rebuilding unrelated sections, page bodies, General settings or navbar controls
- **AND** unaffected focused inputs, selections, page expansion and scroll position remain usable

#### Scenario: A card moves between sections
- **WHEN** a drag or explicit move places a card into another section of the same page
- **THEN** both affected sections reflect the move exactly once and focus can reach the moved occurrence
- **AND** unrelated sections retain their controls and order, with no automatic save or entity action

#### Scenario: Page structure or references change
- **WHEN** the administrator reorders, pins, renames, duplicates or deletes a page, or changes its sections
- **THEN** the affected headers, order, references, selectors and navigation update consistently
- **AND** actions subsequently target the currently displayed page, section and card rather than an obsolete position
- **AND** page bodies and controls without an affected dependency are not recreated

### Requirement: Deferred Visual page contents
On a fresh editor panel, every saved page header SHALL be available and only the landing page SHALL start expanded. Collapsed pages SHALL have no mounted section/card body controls. Expanding a page SHALL create its controls from the current local draft without reloading saved configuration; collapsing it SHALL remove those body controls without changing the draft. Multiple pages SHALL remain independently expandable.

#### Scenario: A dashboard with several pages first opens
- **WHEN** saved configuration becomes available in a fresh Visual editor
- **THEN** all page headers, their page actions, General settings and navigation are available, while only the landing page body is mounted
- **AND** unopened page card counts do not increase the mounted card-control count
- **AND** an empty landing page remains usable without requiring an entity row to exist

#### Scenario: A page opens and closes repeatedly
- **WHEN** the administrator expands a previously closed page, edits its draft, collapses it and opens it again
- **THEN** its latest cards and options appear once, with no duplicate listeners or actions
- **AND** collapsing releases its body controls without changing source, dirty state or another page's expansion
- **AND** opening does not issue a configuration reload or generation request

#### Scenario: A page is created or duplicated
- **WHEN** the administrator deliberately creates or duplicates a page
- **THEN** its new header and editable body become reachable and expanded
- **AND** existing pages retain their independent expansion states

### Requirement: Visual presentation continuity
Expansion state SHALL remain panel-local and follow page identity through ordinary edits, page reorder/rename and Visual/JSON switches. Surviving pages SHALL retain that state after a validated document replacement; newly encountered pages SHALL start collapsed. A fresh panel SHALL use the landing-page default. Removed controls SHALL not receive obsolete focus, gesture or asynchronous completion effects.

#### Scenario: The user returns from JSON
- **WHEN** the administrator switches to JSON and back, with or without valid document edits
- **THEN** surviving pages keep their expansion states, closed pages stay unmounted and opened pages show current draft data
- **AND** invalid JSON leaves the existing document and Visual presentation available without accepting invalid changes
- **AND** existing Monaco text, edit-history and view-state continuity contracts remain intact

#### Scenario: A page is renamed or reordered
- **WHEN** an expanded page changes name, path or position through the Visual editor
- **THEN** that same page stays expanded and actions use its current position
- **AND** the change does not open unrelated pages or add presentation fields to the source

#### Scenario: Source replacement removes the focused page
- **WHEN** a valid JSON change, discard or history replacement removes the focused page or card
- **THEN** obsolete body controls and gesture work are disposed and focus returns to a surviving relevant control or the page manager
- **AND** no late completion can recreate removed content or affect a different occurrence

### Requirement: Complete drafts independent of mounted page controls
All page data SHALL remain in the shared draft independently of mounting. Opening, closing or updating controls SHALL NOT discover entities, insert defaults, alter dirty state or serialize presentation data. Validation and explicit save SHALL include unopened pages, preserving names, IDs, order, options, unknown fields, raw cards and explicit emptiness under the existing conversion and recovery contracts.

#### Scenario: Unopened content is inspected or saved
- **WHEN** the administrator edits one page and switches to JSON or explicitly saves without opening the other pages
- **THEN** all other pages and their complete nested configuration remain present and unchanged
- **AND** invalid configuration in an unopened page still blocks saving with the existing readable error

#### Scenario: An unsaved change is discarded
- **WHEN** the administrator confirms Discard after editing and collapsing a page
- **THEN** the saved complete document is restored, including that page's prior content
- **AND** no unopened page is replaced with discovered or template content

#### Scenario: Equivalent entities occur in several containers
- **WHEN** one occurrence is edited or removed and another page containing that entity remains collapsed
- **THEN** the other occurrence, its attached options and raw or unknown content remain independent and unchanged
- **AND** expansion and rendering dispatch no entity service or automatic save

### Requirement: Stable Visual card pickup
The Visual editor SHALL retain its scroll position during handle press, movement below drag activation and initial drag activation. Holding still, horizontal movement or movement away from an edge SHALL NOT initiate automatic scrolling. The source row SHALL remain mounted with stable geometry during pickup. These guarantees SHALL apply to every visually editable card occurrence with touch and mouse.

#### Scenario: A handle is picked up near either edge
- **WHEN** an administrator presses a visible card handle near the sticky header, in the middle or near the bottom of a scrolled editor and activates dragging
- **THEN** press and initial activation leave the editor scroll position and source-row position unchanged
- **AND** holding the activated pointer still does not begin scrolling or change the source document or dirty state

#### Scenario: Pickup movement is sideways or away from the nearby edge
- **WHEN** a handle near either edge is activated by horizontal or diagonal movement, followed only by horizontal movement or movement away from that edge
- **THEN** no automatic scrolling begins, including when the pointer remains inside an edge scrolling area
- **AND** insertion feedback and valid local card placement remain available

#### Scenario: A short or enlarged mobile editor is used
- **WHEN** a card is picked up in a narrow, portrait, landscape, bold, enlarged-text or enlarged-browser-zoom editor layout
- **THEN** pickup retains the same stable-scroll behavior using the currently visible area below the header
- **AND** native scrolling outside the handle and keyboard focus reveal remain available

### Requirement: Deliberate Visual drag edge scrolling
Automatic scrolling during a Visual card drag SHALL begin only after additional deliberate vertical movement toward the current usable top or bottom edge after pickup. An armed edge SHALL continue bounded scrolling while held still there and keep insertion feedback aligned. Leaving its edge area, deliberately reversing away, ending or interrupting the drag SHALL stop scrolling. Layout changes alone SHALL NOT arm scrolling.

#### Scenario: The administrator deliberately approaches an edge
- **WHEN** an active drag subsequently moves far enough toward the top or bottom edge to meet the deliberate-movement threshold while in its scrolling area
- **THEN** the actual editor scroll container scrolls in that direction within its bounds
- **AND** holding the pointer there continues scrolling so an initially offscreen same-page destination becomes reachable
- **AND** insertion feedback follows the current destination geometry and a valid release moves the selected occurrence exactly once without activating another control or saving

#### Scenario: The administrator moves away and approaches again
- **WHEN** the pointer leaves an armed edge area or deliberately reverses away from it
- **THEN** automatic scrolling stops and remains stopped during a stationary hold
- **AND** a tiny outward movement after stopping does not reuse the earlier approach to restart scrolling
- **AND** scrolling resumes only after a new deliberate approach toward an edge, including an inward move followed by a renewed approach when pickup started extremely near the viewport boundary

#### Scenario: The usable viewport changes during an unarmed pickup
- **WHEN** orientation, viewport dimensions or header geometry change before deliberate edge movement has occurred
- **THEN** the new usable bounds are respected without the layout change itself arming automatic scrolling
- **AND** the next deliberate approach uses the current bounds rather than stale coordinates

#### Scenario: Scrolling is interrupted or reaches its bound
- **WHEN** the drag ends, is cancelled, loses capture, is interrupted by editor lifecycle changes or reaches a scroll limit
- **THEN** no scrolling task continues after termination or spins at the limit
- **AND** cancellation preserves the source document and dirty state and clears gesture feedback and capture
- **AND** a subsequent drag starts without inherited edge intent

### Requirement: Progressive editor data loading
The initial read SHALL contain the complete editable source and only auxiliary data required by the initially visible controls. Broader editing context SHALL load separately in a shared deferred request; History SHALL load when requested. Related data SHALL be bundled by consumer need and identical in-flight reads reused. Optional results SHALL NOT replace the local source or redefine unloaded metadata as missing.

#### Scenario: The initial page is populated
- **WHEN** a current-format dashboard opens in Visual
- **THEN** one initial response supplies the complete source, route/conversion information, compact display definitions and the primary entity metadata required by initially expanded rows
- **AND** full registry metadata, detailed option schemas, area lists, creation templates and History are not prerequisites for that response
- **AND** group member metadata and raw-card entity metadata are not fetched solely to display group counts or raw-card counts

#### Scenario: Broader editing context is prepared
- **WHEN** required initial calls have completed
- **THEN** one deferred context request supplies the full catalog, entity/area metadata and creation templates together for Visual editing and JSON
- **AND** independent file downloads can progress concurrently without serializing unrelated waits
- **AND** preparing JSON reuses that context rather than issuing a second context request

#### Scenario: Another page body becomes visible
- **WHEN** opening or duplicating a page, or replacing the document while retaining expanded pages, needs metadata outside the initial subset
- **THEN** the affected body obtains the shared context or shows localized loading until its metadata is ready
- **AND** unrequested metadata is not displayed as Missing, Unknown or a genuinely empty result

#### Scenario: A feature is used before its data arrives
- **WHEN** the administrator requests card editing, creation, Save or JSON before the required context is ready
- **THEN** the action acknowledges immediately and joins or promotes the necessary request with localized progress and retry on failure
- **AND** Save and JSON acceptance retain complete validation across the whole document
- **AND** independent General edits, page management, deletion and reordering do not wait for unrelated data

#### Scenario: History is opened before loading
- **WHEN** the administrator opens History without a loaded list
- **THEN** only History's read is requested, with localized loading followed by versions, a genuine empty result or a retryable error
- **AND** no false empty list or Restore action appears before the response

#### Scenario: Save waits for complete context
- **WHEN** the administrator selects Save while context is still loading
- **THEN** normal single-operation editing guards and immediate progress apply before waiting, and repeated presses cannot dispatch duplicate generation
- **AND** the guarded current source is completely validated before one generation, with no unrelated Monaco initialization
- **AND** context failure restores usable controls with the draft intact, while superseded document/lifecycle work is cancelled without writing stale data

#### Scenario: HA state updates arrive during preparation
- **WHEN** unrelated HA updates or repeated preparation triggers occur
- **THEN** the initial read and optional preparation are not repeated
- **AND** data already loaded or in flight is shared across compatible consumers rather than requested per row or control

### Requirement: Cooperative background JSON preparation
Background JSON computation SHALL use browser idle opportunities after Visual usability, yield between preparation stages and defer further stages during active Visual interaction or document operations. It SHALL NOT force work through a busy period using a fixed deadline. Without a supported idle signal, optional downloads remain permitted and CPU-heavy initialization SHALL wait for explicit JSON selection.

#### Scenario: The browser provides no idle opportunity
- **WHEN** the main page stays busy after required requests finish
- **THEN** optional computation remains deferred while Visual stays usable
- **AND** a timer cannot force editor initialization into the busy period

#### Scenario: JSON is selected before preparation finishes
- **WHEN** the administrator explicitly selects JSON after configuration is ready
- **THEN** the existing attempt proceeds as foreground work without waiting for a future idle callback
- **AND** localized progress remains visible until ready, with no duplicate request, editor or worker

#### Scenario: Preparation has completed before the first selection
- **WHEN** the administrator first selects JSON after successful preparation
- **THEN** the existing editor displays the latest draft without repeating resource initialization

#### Scenario: Visual actions are used during preparation
- **WHEN** the administrator edits a field, opens a dialog, scrolls, saves, discards or opens History during background preparation
- **THEN** those actions retain their normal availability, dispatch and confirmation behavior, waiting only for data required by the explicitly requested action
- **AND** preparation does not display foreground loading feedback or move focus
- **AND** optional work does not cause a reproducible regression in Visual startup or interaction responsiveness in paired focused measurements

### Requirement: Energy contributor and price editing
The builder and native energy-card editor SHALL expose ordered energy contributor
items with an energy sensor, optional name and optional cost sensor, plus optional
`cost_per_kwh` and `calculate_cost` settings. Validation, JSON schema and generation
SHALL carry the same settings. Ordinary edits SHALL preserve unknown fields and
explicit empty contributor lists; old configurations SHALL remain valid.

#### Scenario: Remove every configured contributor
- **WHEN** the user removes the last contributor and saves
- **THEN** the list remains explicitly empty through editor/generator round trips
- **AND** no discovery defaults refill it or alter unrelated card options

#### Scenario: Configure an invalid override
- **WHEN** a price override is negative, nonnumeric or nonfinite
- **THEN** validation rejects it before generating misleading cost output

### Requirement: Ordered power device configuration
Graph cards SHALL expose an ordered optional Power devices list with a sensor binding and optional name in the visual builder, native editor and JSON schema. Validation SHALL reject malformed, duplicate and known incompatible bindings. Editing SHALL preserve unknown row fields, order, explicit emptiness and unrelated options. Existing saved cards SHALL continue to work without a device list or a source-format migration.

#### Scenario: Saving a customized device list
- **WHEN** devices are added, renamed, reordered or removed and the card is saved
- **THEN** every supported editor and generator preserves the selected order, names and source bindings
- **AND** an explicitly empty list remains empty without discovery filling it

#### Scenario: A cumulative energy sensor is selected as a power device
- **WHEN** available metadata identifies its unit as kWh
- **THEN** validation explains that a power sensor is required instead of estimating instantaneous power from energy totals

### Requirement: Optional cache reset shortcut
The dashboard editor SHALL offer a General toggle labelled Show cache reset button. The optional boolean `show_cache_reset` SHALL preserve explicit false through Visual/JSON editing, save and generation. Missing settings SHALL retain the enabled behavior without migration. Native navbar editing SHALL expose the equivalent option.

#### Scenario: Administrator disables the shortcut
- **WHEN** the administrator disables the toggle and saves
- **THEN** navigation configuration contains `show_cache_reset: false`
- **AND** unrelated dashboard fields remain unchanged

#### Scenario: An existing configuration omits the option
- **WHEN** the editor opens the configuration
- **THEN** the toggle is enabled by default
- **AND** opening the editor alone does not alter the source

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

### Requirement: Searchable card catalog
The Add card type tab SHALL offer a localized search field that filters card names and descriptions case- and accent-insensitively, reports empty results, and restores all discoverable cards when cleared. Filtering SHALL preserve card selection behavior and keep legacy aliases hidden.

#### Scenario: Find and select a card
- **WHEN** an administrator searches for part of a card name or description
- **THEN** matching cards remain selectable with their original template identity

#### Scenario: Clear a search
- **WHEN** an administrator clears an unmatched query
- **THEN** the empty message disappears and all discoverable cards return
