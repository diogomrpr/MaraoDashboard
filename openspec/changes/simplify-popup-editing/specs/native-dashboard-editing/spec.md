# Spec Delta

## ADDED Requirements

### Requirement: Popup editing from native authoring
Supported configured popup owners SHALL expose a localized Edit popup action in their native card editor for authorized administrators. The action SHALL open the linked same-dashboard Sections view in HA's editor, creating and linking the source on the first explicit edit when necessary. Users SHALL NOT need a separate Create editable layout step.

#### Scenario: A linked popup is edited
- **WHEN** an administrator activates Edit popup for a saved card with a valid source view
- **THEN** HA opens that same view in native editing without copying its content or creating another view
- **AND** native controls own card sizes, placement, sections, additions and deletions

#### Scenario: An automatic popup is edited for the first time
- **WHEN** an administrator activates Edit popup for a saved automatic popup with no unresolved draft
- **THEN** its current configured content is preserved in one dedicated Sections subview and the invoking card is linked to it
- **AND** that source opens in the normal HA editor through the same action

#### Scenario: Editing is requested again
- **WHEN** Edit popup is activated after a source has been created and confirmed
- **THEN** the existing source is reused rather than creating another layout

#### Scenario: A summary references a saved popup hash
- **WHEN** an administrator edits a saved summary whose hash resolves to one popup definition in its view
- **THEN** Edit popup remains available and opens that definition's existing source view
- **AND** if no source exists, the first explicit edit seeds it from the saved popup and binds only that popup definition
- **AND** the invoking hash, original popup content and unrelated data remain unchanged
- **AND** missing or duplicate popup definitions fail readably without writes

### Requirement: Popup authoring draft preservation
Popup editor navigation and first-edit creation SHALL leave unresolved native card or dashboard drafts intact. An unsaved or new card SHALL receive localized save-first guidance without navigation or independent dashboard writes. HA Save/Cancel SHALL remain authoritative; after a native save, the saved occurrence SHALL be editable through Edit popup.

#### Scenario: A card has unsaved changes
- **WHEN** Edit popup is activated while the card name, options, layout reference or other native settings are unsaved
- **THEN** the editor remains open with its complete draft and readable save-first guidance
- **AND** no view is created and no saved configuration or navigation state is replaced

#### Scenario: A new card is not saved
- **WHEN** Edit popup is activated for an unsaved new card
- **THEN** the draft remains available for native Save or Cancel without creating an orphan source view

#### Scenario: A draft is saved or cancelled
- **WHEN** the user saves the card normally and opens its editor again
- **THEN** Edit popup works from the confirmed saved configuration
- **WHEN** the user cancels instead
- **THEN** the previous saved card and existing source remain unchanged

### Requirement: First-edit popup source preservation
First-edit source creation SHALL preserve the invoking configuration and all unrelated saved data, adding only its source reference and dedicated view. It SHALL require an authorized connected editable context, an unambiguous saved occurrence, fresh source checks and exact recovery data. Stale, unsupported or uncertain saves SHALL fail readably without blind retries.

#### Scenario: Existing configured content becomes a native source
- **WHEN** the first explicit edit creates a view from supported automatic content
- **THEN** configured order, member options, sections, filtering, raw cards, native dimensions, visibility, unknown fields and explicit emptiness are retained
- **AND** unrelated cards, views, navbar settings and retained automatic options are unchanged

#### Scenario: The source context is stale or ambiguous
- **WHEN** the invoking occurrence is missing or duplicated, the dashboard changes during preflight, or the user loses authorization or connection
- **THEN** creation does not replace saved data and explains the blocking condition

#### Scenario: The save outcome is uncertain
- **WHEN** the first-edit save cannot be confirmed
- **THEN** exact original and proposed dashboard data remain available for recovery
- **AND** the operation checks current saved data without automatically issuing another creation write

#### Scenario: A linked source is missing
- **WHEN** Edit popup is requested for a missing, ambiguous or unsupported linked view
- **THEN** a localized source error is shown without inventing a replacement, returning to defaults or clearing the stored reference
