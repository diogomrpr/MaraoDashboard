# Spec Delta

## MODIFIED Requirements

### Requirement: Local drafts and explicit save
Changes SHALL remain local until Save & Generate validates, compiles and submits the complete native document. Discard changes SHALL reload the saved source; Open dashboard SHALL open the native result within the current Home Assistant app, retaining the local draft. A successful native save SHALL keep the current Visual or JSON editor open without navigation. Applying changes inside HA dashboard settings SHALL remain there until HA saves those settings. Validation and reported save errors SHALL retain the draft with readable feedback. Native save success/readback SHALL NOT be presented as independent disk-durability proof.

#### Scenario: A user edits a card but has not saved
- **WHEN** the existing dashboard is opened
- **THEN** it continues displaying the last successfully saved configuration
- **AND** the editor draft remains local until explicit save

#### Scenario: Open dashboard stays within Home Assistant
- **WHEN** an administrator selects Open dashboard in the editor
- **THEN** the saved landing page opens through HA's internal navigation in the current app or browser tab
- **AND** no new window, browser tab or external browser is opened
- **AND** the complete unsaved draft remains available when returning to the editor in the same session
- **AND** loading, busy or detached editors cannot initiate this navigation

#### Scenario: Save and generate stays in the editor
- **WHEN** HA acknowledges a successful Save & Generate for the current editor document
- **THEN** Marao clears the saved draft's dirty and busy state and retains the current editor view and tab
- **AND** no navigation occurs until the user explicitly selects Open dashboard, which uses the current dashboard root and saved landing-page path
- **AND** a detached editor or superseded document does not redirect the user

#### Scenario: Applying dashboard settings requires HA's settings save
- **WHEN** the strategy editor applies changes inside HA's dashboard settings
- **THEN** Marao remains in those settings so the administrator can complete HA's separate save
- **AND** applying the strategy is not presented as a completed native dashboard save

#### Scenario: HA reports a save failure
- **WHEN** HA's native API returns an error for a valid draft
- **THEN** the editor remains open with a readable failure and the complete Visual/JSON draft for retry or export
- **AND** Marao emits no additional successful-save refresh; any HA-originated update retains its native semantics

### Requirement: Administrative replacement confirmation
Destructive builder and source-import actions SHALL require explicit confirmation naming what will be removed or replaced, except individual card/entity-entry removal from the local draft. The builder SHALL preserve local unsaved work or clearly present the consequence of discarding it. Removed configuration-history restoration SHALL NOT remain an alternate replacement workflow.

#### Scenario: A stored dashboard is about to replace the current one
- **WHEN** an administrator imports a source that would replace the current document
- **THEN** confirmation identifies that replacement before any native save
- **AND** read-only validation/preview does not commit the replacement

#### Scenario: An entire container is deleted
- **WHEN** the user requests deletion of a room or custom page
- **THEN** confirmation names the container before removing it

#### Scenario: Unsaved edits are discarded
- **WHEN** the user requests Discard changes while the draft differs from the saved configuration
- **THEN** confirmation explains that unsaved changes will be discarded before reloading the saved configuration

### Requirement: Progressive editor data loading
The initial phase SHALL provide the complete source and only auxiliary data required by visible controls. Broader metadata, catalog details and templates SHALL prepare separately through shared native/local reads. Identical in-flight work SHALL be reused. Optional results SHALL NOT replace the draft or redefine unloaded metadata as missing. Configuration History SHALL NOT be requested.

#### Scenario: The initial page is populated
- **WHEN** a current-format dashboard opens in Visual
- **THEN** initial readiness supplies complete source, route/conversion information, compact display definitions and metadata needed by visible rows
- **AND** full registry/context data, detailed option schemas, templates and deferred Monaco are not prerequisites
- **AND** group/raw-card member metadata is not fetched solely to display counts

#### Scenario: Broader editing context is prepared
- **WHEN** required initial work completes
- **THEN** shared deferred work supplies the remaining catalog, native entity/area metadata and templates
- **AND** independent file downloads can progress without serializing unrelated waits
- **AND** JSON reuses the same context instead of requesting a second copy

#### Scenario: Another page body becomes visible
- **WHEN** opening or duplicating a page, or replacing the document while retaining expanded pages, needs metadata outside the initial subset
- **THEN** the affected body obtains shared context or shows localized loading until its metadata is ready
- **AND** unrequested metadata is not displayed as Missing, Unknown or a genuinely empty result

#### Scenario: A feature is used before its data arrives
- **WHEN** the administrator requests card editing, creation, Save or JSON before required context is ready
- **THEN** the action acknowledges immediately and joins or promotes the necessary work with localized progress and retry on failure
- **AND** Save and JSON acceptance validate the complete document
- **AND** independent General edits, page management, deletion and reordering do not wait for unrelated data

#### Scenario: History is opened before loading
- **WHEN** an obsolete link or restored editor state refers to configuration History
- **THEN** the new editor exposes no History/Restore operation and explains the retired feature where needed
- **AND** it neither reads old archives nor invokes a removed endpoint

#### Scenario: Save waits for complete context
- **WHEN** the administrator selects Save while required context is loading
- **THEN** single-operation guards and immediate progress apply, and repeated presses cannot dispatch duplicate saves
- **AND** the guarded source is completely validated before one native save, without unrelated Monaco initialization
- **AND** context failure restores controls with the draft intact, while superseded lifecycle work cannot save stale data

#### Scenario: HA state updates arrive during preparation
- **WHEN** unrelated HA updates or repeated preparation triggers occur
- **THEN** initial/optional work is not repeated unnecessarily
- **AND** compatible consumers share loaded or in-flight data instead of requesting it per row

### Requirement: Deferred JSON editing preserves the draft
The bundled JSON editor SHALL prepare after prioritized Visual startup using available idle capacity, or on explicit selection, and reuse successful initialization during the connected panel lifetime. Foreground loading SHALL show localized progress. Visual edits, exact JSON drafts, unknown fields and editor history/view state SHALL survive asynchronous preparation and switching.

#### Scenario: JSON is opened after unsaved Visual edits
- **WHEN** its resources finish loading
- **THEN** the editor displays the current draft with existing JSON assistance
- **AND** saved source and native dashboard remain unchanged

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
- **WHEN** an explicit successful Save, confirmed Discard or confirmed source import establishes a new current document
- **THEN** late preparation cannot restore an obsolete document, metadata projection or dirty state

#### Scenario: Additional deferred JSON editing preserves the draft contracts
- **WHEN** JSON preparation or tab switching occurs during editing
- **THEN** Existing assistance and invalid-JSON protection SHALL remain available; background completion SHALL NOT change tabs or steal focus.

### Requirement: Preserve and validate embedded YAML
Embedded cards SHALL be ordered `template: ha_card` descriptors with complete YAML in a `yaml` string. Unknown descriptor fields and exact unedited YAML SHALL survive normalization, moves, duplication, native saves and source import/export. Actual visual configuration edits MAY reformat YAML but SHALL retain configuration values.

#### Scenario: Round-trip a card without changing its settings
- **WHEN** an administrator opens, reorders, duplicates or saves an unchanged YAML card
- **THEN** its YAML, comments, explicit empty values and unknown descriptor fields remain intact
- **AND** merely opening Visual does not serialize the configuration again

#### Scenario: Invalid or unsupported YAML
- **WHEN** YAML is malformed, has duplicate explicit keys, recursive aliases, unsafe tags or non-JSON values, or is not one mapping with a nonempty string type
- **THEN** the shared frontend validator rejects it before native save/import without replacing saved source or touching legacy files/archives
- **AND** file directives require inline configuration instead

### Requirement: Independent visual editor startup
The default Visual editor SHALL become usable from the source and display data needed by its initially visible controls, without waiting for broader editing context or JSON initialization. Required startup requests SHALL take priority. JSON-only browser computation SHALL wait for usable native Visual controls and idle capacity unless explicitly selected. Configuration loading SHALL retain localized progress and document-dependent action guards.

#### Scenario: An administrator opens the editor on Visual
- **WHEN** configuration and required visual resources are available
- **THEN** the visual controls become usable independently of optional JSON resource completion
- **AND** the initial empty content area is replaced by explicit loading feedback until ready
- **AND** JSON initialization cannot become a prerequisite for Visual usability
- **AND** page headers, General settings, navbar entries and initially expanded card rows retain their correct labels and availability

#### Scenario: The administrator selects JSON before configuration is ready
- **WHEN** the saved document is still loading
- **THEN** the tab cannot initialize with missing configuration or replace it with an empty draft
- **AND** Save and Open dashboard do not act on incomplete data

#### Scenario: Required requests finish before frontend rendering
- **WHEN** required main-page calls and critical resource requests have finished but Visual controls are still rendering
- **THEN** independent deferred context requests and low-priority JSON file downloads can overlap that frontend work without blocking it
- **AND** JSON module evaluation, document processing and editor initialization wait until Visual is usable and idle capacity is available

#### Scenario: JSON preparation is slow or unavailable
- **WHEN** optional preparation cannot complete promptly
- **THEN** main-page loading and subsequent Visual interaction remain independent of it

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
- **WHEN** the administrator edits a field, opens a dialog, scrolls, saves, discards or imports/exports source during background preparation
- **THEN** those actions retain their normal availability, dispatch and confirmation behavior, waiting only for data required by the explicitly requested action
- **AND** preparation does not display foreground loading feedback or move focus
- **AND** optional work does not cause a reproducible regression in Visual startup or interaction responsiveness in paired focused measurements

## ADDED Requirements

### Requirement: Standalone historical JSON converter
Marao SHALL ship a self-contained local browser converter using shared migration, validation and compilation for every historical configuration format. It SHALL produce current native JSON through paste, translate and copy/download, independent of HA's builder, login, backend, CLI, server or build tools. Automatic detection and safe historical defaults SHALL preserve explicit choices and emptiness while minimizing questions.

#### Scenario: Complete historical JSON is pasted
- **WHEN** the user translates a supported self-contained document
- **THEN** conversion completes without a technical questionnaire or intermediate release installation
- **AND** the source remains unchanged while the result can be selected, copied or downloaded locally
- **AND** supported historical HA storage wrappers and the current native source envelope use the same conversion path

#### Scenario: Conversion needs missing information
- **WHEN** the document lacks required membership, route identity or referenced custom content
- **THEN** short localized conditional controls explain only the missing decision, with suggested answers where justified
- **AND** changing an answer retains the pasted source and other relevant answers without inventing membership or silently losing content
- **AND** metadata JSON and supplemental custom content are optional advanced inputs rather than mandatory preparation

#### Scenario: Offline use or denied clipboard access
- **WHEN** the downloaded converter cold-starts as a local file with networking blocked or clipboard permission denied
- **THEN** all required assets are available and selectable output/local download remain usable
- **AND** pasted content neither executes nor leaves the browser or persists automatically, and separate conversions cannot share private input accidentally

#### Scenario: Invalid input replaces a successful conversion
- **WHEN** source or answers change and conversion fails or requires more information
- **THEN** a stale or partially converted result is not offered as a current successful download
- **AND** plain-language recovery guidance preserves input for correction

### Requirement: Preserved Marao strategy editor
Marao SHALL keep its own Visual and JSON builder, card catalog, page/section/card operations, drag and explicit move controls, native-card interoperability, localization and stock bundled Monaco presentation. Native strategy storage SHALL NOT require users to rebuild their dashboard with a different authoring interface.

#### Scenario: An existing installation completes migration
- **WHEN** the administrator edits its migrated dashboard
- **THEN** the supported controls and complete source remain available through Marao's own editor
- **AND** edits preserve unknown/raw fields, order, names, options, explicit emptiness and deletions

### Requirement: Editor route within the owned dashboard
The frontend editor SHALL use a noncolliding route under the existing dashboard root. Administrators SHALL access it through the navbar maintenance menu, or its direct address when navigation is empty, independently of cache-reset visibility. It SHALL preserve page paths and navigation, restrict editing controls to administrators and rely on HA authorization for writes. Migration SHALL disclose replacement of the old standalone editor URL.

#### Scenario: An administrator opens the editor from the dashboard
- **WHEN** an administrator completes the three-second navbar hold with the native HA top bar hidden
- **THEN** the localized Edit dashboard maintenance action opens the actual noncolliding editor route under the current dashboard root
- **AND** hiding the optional cache-reset button does not hide maintenance; empty navigation retains the direct editor address
- **AND** regular users have no editor-access link

#### Scenario: A user page resembles the internal editor path
- **WHEN** the frontend selects its editor route
- **THEN** no saved user page is renamed, removed or displaced
- **AND** the editor remains reachable without adding itself to the user's configured navbar

#### Scenario: A regular user visits the editor route
- **WHEN** the user lacks administrator rights
- **THEN** no save/import replacement controls are available and native writes remain unauthorized
- **AND** hiding the controls is not claimed to make stored source private

### Requirement: Portable source import and export
Administrators SHALL be able to export the complete current source or unsaved draft and validate/preview a supported imported source before replacement. Import SHALL share format/conversion rules with normal compilation, preserve unknown data and reject unsupported newer sources without altering the saved dashboard. Export SHALL NOT require a Python endpoint.

#### Scenario: An import contains an unsupported format
- **WHEN** validation rejects the selected source
- **THEN** the saved dashboard and current draft remain unchanged with readable guidance

#### Scenario: An old deferred editor asset is unavailable
- **WHEN** an outdated client cannot finish loading the full editor
- **THEN** a lightweight recovery surface retains and can export its available draft before any deliberate refresh
- **AND** it does not force a reload that discards unsaved work

### Requirement: Detected competing saves preserve drafts
The editor SHALL compare its saved baseline with current native source before committing and react to native change notifications. A detected competing change SHALL block that save and retain/export the draft. The UI/documentation SHALL NOT claim cross-device locking or atomic compare-and-swap that HA's native API does not provide.

#### Scenario: Another client has already changed the source
- **WHEN** pre-save validation finds a different saved baseline
- **THEN** the editor reports the conflict without overwriting the detected newer document
- **AND** the local draft can be exported, reloaded or deliberately reconciled

#### Scenario: Two devices save at the same instant
- **WHEN** generic native save calls race after both baseline checks
- **THEN** the documented native last-writer limitation is not represented as guaranteed lossless concurrency

### Requirement: No configuration History product
The new editor SHALL NOT offer configuration History/Restore, enumerate legacy archives, create configuration snapshots or embed former snapshots in native storage. Removing configuration history SHALL NOT remove sensor/recorder charts, camera timelines or migration recovery backups.

#### Scenario: A migrated installation retains old archives
- **WHEN** its new builder loads, saves or exports source
- **THEN** no old archive is exposed or changed and no new configuration-history version is created
- **AND** ordinary sensor/energy history remains available
