# Visual builder delta

## MODIFIED Requirements

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
The bundled JSON editor SHALL prepare after prioritized Visual startup using available idle capacity, or on explicit selection, and reuse successful initialization during the connected panel lifetime. Foreground loading SHALL show localized progress. Visual edits, exact JSON drafts, unknown fields and editor history/view state SHALL survive asynchronous preparation and switching. Existing assistance and invalid-JSON protection SHALL remain available; background completion SHALL NOT change tabs or steal focus.

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

## ADDED Requirements

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
