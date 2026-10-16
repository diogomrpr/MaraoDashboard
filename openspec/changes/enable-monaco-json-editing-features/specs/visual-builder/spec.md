# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
JSON tools SHALL remain usable with touch and keyboard in both Marao themes and required narrow, landscape, text and zoom layouts. The editor SHALL retain stock Monaco typography, themes, density and native widget sizes, as explicitly requested by the user; surrounding Marao app controls SHALL retain their existing UI rules. Marao controls/feedback SHALL follow English/Portuguese localization. Added editor assets SHALL remain local, versioned and deferred until JSON is requested.

#### Scenario: Editing with a mobile keyboard
- **WHEN** an administrator types, selects, pastes, searches or accepts a suggestion in the selected iPhone/Android mobile profiles
- **THEN** the caret, active tool and essential controls remain reachable without clipped content or unintended text changes
- **AND** native gutter, result navigation and suggestion interactions retain Monaco's standard presentation

#### Scenario: Opening Visual only
- **WHEN** the administrator uses Visual without requesting JSON
- **THEN** JSON-only editor features, styles and workers are not loaded
- **AND** JSON assistance never fetches a remote schema or sends configuration text to an external service
