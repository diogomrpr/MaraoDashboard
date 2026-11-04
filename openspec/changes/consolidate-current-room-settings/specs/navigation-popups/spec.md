# Spec Delta

## ADDED Requirements

### Requirement: Dashboard settings own current-room preferences
The existing Marao dashboard settings popup SHALL contain the current-room person selector, Automatic action and local persistence feedback directly alongside shared room configuration. Marao SHALL remove the dedicated location-preferences button and standalone popup, without adding a replacement shortcut or nested popup.

#### Scenario: An administrator opens room settings
- **WHEN** an administrator opens Marao settings with Current room enabled
- **THEN** shared room mappings and this device's local person controls are available within the same popup
- **AND** editing those controls does not open another popup

#### Scenario: Main-page shortcuts render
- **WHEN** the dashboard main page renders with Current room enabled
- **THEN** no dedicated current-room settings or Location preferences button appears
- **AND** remaining edit/cache shortcuts keep their configured visibility without an empty row reserved for the removed button

#### Scenario: The combined popup closes or loses its owner
- **WHEN** the popup closes, the account/dashboard changes, editing starts or its owning dashboard is removed
- **THEN** its controls and pending callbacks stop accepting changes for the preceding context
- **AND** modal cleanup restores background usability and appropriate focus without leaving a second dialog behind

### Requirement: Current-room preference editing requires an administrator
Only administrators SHALL edit the local current-room person choice through Marao settings. Ordinary users SHALL retain current-room navigation and existing saved choices without access to preference controls. Shared dashboard writes SHALL retain administrator authorization. Localized guidance SHALL direct administrators to Marao settings and ordinary users to an administrator.

#### Scenario: A regular user visits the dashboard
- **WHEN** a non-administrator uses Current room
- **THEN** neither the removed preference entry point nor editable preference controls are available
- **AND** automatic resolution or an existing override continues to determine navigation

#### Scenario: Administrator access is lost while settings are open
- **WHEN** the signed-in account loses administrator access before a pending preference interaction completes
- **THEN** that interaction cannot change the stored or session person choice or write shared dashboard settings

#### Scenario: Identity cannot be resolved
- **WHEN** Current room cannot identify a usable person
- **THEN** its localized guidance identifies Marao settings for administrators or asks ordinary users to contact an administrator
- **AND** no message directs users to the removed button or popup

### Requirement: Consolidated preferences preserve local storage semantics
Person selection and Automatic SHALL apply immediately to the current origin, dashboard and signed-in account using the existing preference format. Local edits SHALL remain independent of shared dashboard Save/Cancel and SHALL NOT write shared configuration. Moving the controls SHALL preserve stored choices, explicit empty mappings, unknown fields and unrelated dashboard content.

#### Scenario: An administrator selects a person or Automatic
- **WHEN** an administrator changes the local person choice inside Marao settings
- **THEN** the current client's shortcut updates immediately, with Automatic clearing only its scoped override
- **AND** no dashboard save, page navigation or entity service action occurs
- **AND** closing without saving shared edits does not revert the local choice

#### Scenario: Browser storage cannot be written
- **WHEN** an administrator makes a local choice and browser storage is unavailable
- **THEN** the choice applies for the current session with readable localized feedback in the same popup
- **AND** no shared-setting write substitutes for local persistence

#### Scenario: Existing settings are opened after the update
- **WHEN** a client already has a stored person override and existing room mappings
- **THEN** the same override is read without conversion or deletion
- **AND** opening or closing settings leaves the saved dashboard document untouched

#### Scenario: Current room is disabled
- **WHEN** the saved Current room configuration is disabled or omitted
- **THEN** no local person controls or dedicated preferences button are exposed
- **AND** existing stored overrides remain intact while administrators can still configure the shared feature in Marao settings

### Requirement: Structured current-room settings
Marao settings SHALL distinguish Navigation bar, Current room and Dashboard shortcuts. Current room SHALL contain labelled General, People and location sources, Rooms and pages, and This browser subsections. Shared draft controls and immediately applied browser preferences SHALL explain their different save behavior. Labels and feedback SHALL be localized.

#### Scenario: An administrator configures current room
- **WHEN** the administrator opens the Current room section
- **THEN** enablement and the optional Away page appear under General, person/source mappings under People and location sources, and room/page mappings under Rooms and pages
- **AND** the saved enabled feature exposes Automatic and the local person override under This browser in the same popup

#### Scenario: Shared enablement is still a draft
- **WHEN** the saved feature is disabled and an administrator enables it in an unsaved draft
- **THEN** shared mappings remain configurable and guidance explains that browser preferences become available after saving
- **AND** editing the draft does not activate the navbar feature or overwrite a stored override

#### Scenario: Mobile settings contain long labels
- **WHEN** the settings popup is used at 320 CSS pixels or with supported enlarged text
- **THEN** essential subsection, room and destination labels wrap, controls retain visible 48px targets, and the popup scrolls internally with its close and Save controls reachable

### Requirement: Navbar-style room mapping rows
Rooms and pages and People and location sources SHALL use the navbar configuration's expandable summary-row presentation, with a name/icon, matching page or source summary, chevron and explicit row actions. Expanding a row SHALL edit its mapping using native selectors in the same popup. This presentation SHALL preserve the existing keyed mappings without introducing a navigation-order requirement.

#### Scenario: Add a mapping from one selector
- **WHEN** an administrator chooses an unused person or room from its single Add selector
- **THEN** a new expanded row appears with the corresponding source or page configuration
- **AND** no separate Add button or second add-form field is needed
- **AND** Save rejects the incomplete row until it is completed or removed, while existing mappings remain intact

#### Scenario: Inspect and edit a room destination
- **WHEN** an administrator expands a configured room row and selects another existing page
- **THEN** its summary displays the room and selected page and the draft changes only that mapping
- **AND** collapsing or reopening the row retains the edit without changing ordinary navbar routes or their order

#### Scenario: A configured reference was removed
- **WHEN** a saved room or destination is missing from Home Assistant's current choices
- **THEN** the authored reference remains visible with corrective feedback and can be repaired or explicitly removed
- **AND** simply opening settings does not delete or replace that mapping

#### Scenario: Add or remove a mapping
- **WHEN** an administrator adds a complete unique room/page pair or removes an existing row
- **THEN** only the intended draft mapping changes, with existing opaque fields retained on edited rows
- **AND** cancellation leaves stored mappings untouched

### Requirement: Explicit account and location-source configuration
People and location sources SHALL provide explicit person and Bermuda Area entity selectors together, show available linked-account and source-device context, and explain the identity chain. Automatic SHALL use the signed-in HA user and its uniquely linked person before selecting that person's configured Area entity. Hardware identity SHALL NOT be inferred or replace an explicit source selection.

#### Scenario: Configure a person's carried device
- **WHEN** an administrator selects a person and the current Area entity for their phone or watch
- **THEN** the association is clear in one mapping row, including its known HA user link and device context
- **AND** the selected entity is retained explicitly rather than being replaced by another tracker or a similarly named sensor

#### Scenario: Automatic resolves the current account
- **WHEN** the account has exactly one linked visible person and a usable configured source
- **THEN** Automatic follows that person's source using the authoritative HA association, including the existing stable-person-record lookup when required
- **AND** it does not use a person's display name, the author of a state change or a browser/device fingerprint as identity

#### Scenario: The account has no unique person link
- **WHEN** the signed-in account has no usable unique person association
- **THEN** settings explain the missing or ambiguous link and offer the administrator the existing explicit local person choice and guidance to HA People settings
- **AND** no other person is silently selected and Marao does not edit HA account links

#### Scenario: A location source cannot describe a current room
- **WHEN** a chosen source lacks a usable current area identifier, is unavailable, or is a tracker/last-seen source unsuitable for the Area contract
- **THEN** settings explain the source problem and the required current Area entity
- **AND** runtime does not substitute registry assignment, a last-seen room, GPS coordinates or another device

### Requirement: Consistent current-room resolution feedback
Settings SHALL show the selected account/person, source, current area and destination, or the specific unresolved stage, using the same resolution rules as the navbar. Draft previews SHALL be labelled and read-only; shared draft changes SHALL NOT alter live navigation before Save. Account, source and state changes SHALL invalidate obsolete results without navigating automatically.

#### Scenario: A complete mapping resolves
- **WHEN** the selected person reports home, the configured Area entity reports a current mapped area, and its page exists
- **THEN** settings show that person, source, area and page, and the saved configuration resolves to that same navbar destination
- **AND** a source or room/page mapping saved by the administrator is used on the next applicable state/configuration update

#### Scenario: Resolution stops at an unavailable stage
- **WHEN** identity lookup fails or presence is unknown/unavailable, or while home the source is missing/unavailable, the current area is unknown or the room destination is absent
- **THEN** settings identify the failed stage with localized corrective guidance
- **AND** the navbar remains non-actionable rather than treating the failure as confirmed Away or following a previous room

#### Scenario: Automatic is retried after repairing an account link
- **WHEN** an administrator returns to Automatic or explicitly retries a failed identity lookup
- **THEN** the current account's association is evaluated again and outdated lookup results cannot override it
- **AND** normal state rendering does not repeatedly request the same person records

#### Scenario: Account, person or sensor changes
- **WHEN** the account changes, an override changes, or the selected source reports a different area
- **THEN** both feedback and navigation resolve from the current context and discard obsolete asynchronous results
- **AND** moving between rooms updates the shortcut without redirecting the page, while an explicit activation uses the current destination once

#### Scenario: Presence confirms Away
- **WHEN** the selected person's authoritative presence reports outside home
- **THEN** the existing optional Away destination takes precedence over any lingering room reading
- **AND** unavailable room detection while home does not enable Away navigation

### Requirement: Complete mapping draft validation
Save SHALL reject incomplete or duplicate person/source and room/page edits, including partially entered new rows, with localized inline feedback and no shared write. An untouched empty add form SHALL remain harmless. Rejection SHALL retain the attempted draft for correction and preserve existing saved data; settings SHALL NOT silently save old values in place of invalid edits.

#### Scenario: A new mapping is only partly entered
- **WHEN** an administrator chooses a person without a source or a room without a page and requests Save
- **THEN** the incomplete row is identified and no shared settings are written
- **AND** completing or removing that attempted row clears its validation problem

#### Scenario: An attempted mapping duplicates a key
- **WHEN** an added or edited row selects a person or room already used by another row
- **THEN** the duplicate is reported and Save cannot overwrite either association
- **AND** selecting a unique key or removing the attempted row allows a valid save

#### Scenario: A valid shared draft is saved
- **WHEN** every edited row is complete and unique and the dashboard has not changed concurrently
- **THEN** Save retains unknown fields, explicit empty maps, removed mappings, ordinary route order and unrelated native dashboard content
- **AND** stale or unauthorized writes still fail through the existing save protection
