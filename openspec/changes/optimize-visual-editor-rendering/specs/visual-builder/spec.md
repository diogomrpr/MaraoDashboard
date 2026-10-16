# Spec Delta

## ADDED Requirements

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
