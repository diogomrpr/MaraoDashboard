# Spec Delta

## ADDED Requirements

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
