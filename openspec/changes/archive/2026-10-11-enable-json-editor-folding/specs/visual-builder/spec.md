# Spec Delta

## ADDED Requirements

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
