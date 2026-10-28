# Spec Delta

## MODIFIED Requirements

### Requirement: Persistent editor header
The editor SHALL retain its title, draft/save indication, actions and Visual/JSON navigation in a sticky header while its page scrolls. Save & Generate, Open dashboard and mode navigation SHALL remain directly reachable; secondary actions SHALL remain reachable without returning to the page top. The header SHALL use an opaque themed surface, respect the available HA content boundary and remain beneath modal dialogs and selector overlays.

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

## ADDED Requirements

### Requirement: Direct icon editor actions
The persistent header SHALL offer icon-only Open dashboard first using a left arrow, then Save & Generate, in both modes. All header action icons SHALL use Save's filled circular design. No Discard control or extra-options dropdown SHALL appear. Controls SHALL retain localized accessible names, visible 48-by-48 CSS pixel targets and existing validation, disabled states and feedback.

#### Scenario: Open the saved result from either mode
- **WHEN** an administrator opens the dashboard using the header icon while unsaved edits exist in either mode
- **THEN** the last saved dashboard opens through the existing navigation behavior without saving or generating the draft

#### Scenario: Save through the icon control
- **WHEN** an administrator activates Save & Generate
- **THEN** the same validation and explicit-save operation runs once, with existing loading and error feedback
- **AND** invalid source remains available for correction without replacing saved content

#### Scenario: State or language changes
- **WHEN** the editor refreshes its header or changes language
- **THEN** each action keeps its icon and current localized accessible name
- **AND** unavailable actions retain their existing disabled behavior, including while loading or saving

### Requirement: JSON-only transfer controls
Import JSON and Export JSON SHALL be available as distinct icon-only buttons only while JSON is the active tab. They SHALL remain outside Monaco's native editing surface, with localized accessible names and visible controls of at least 48 by 48 CSS pixels. Their existing import review, confirmation, draft replacement and export behavior SHALL be preserved.

#### Scenario: Switch editing modes
- **WHEN** the administrator opens JSON
- **THEN** import and export icons are available in its surrounding toolbar
- **AND** they are absent from Visual mode and no extra-options menu offers duplicate shortcuts

#### Scenario: A requested tab switch fails
- **WHEN** JSON preparation fails or invalid JSON prevents returning to Visual
- **THEN** transfer-control visibility follows the active mode rather than an unaccepted tab request
- **AND** the complete draft and existing retry or validation feedback remain intact

#### Scenario: Import or export from JSON
- **WHEN** the administrator activates either transfer icon
- **THEN** its existing operation runs once with its existing review and validation safeguards
- **AND** exporting does not save the draft and importing persists nothing until explicit save
