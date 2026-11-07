# Spec Delta

## ADDED Requirements

### Requirement: Built-in popup template selection
Native popup-capable card editors SHALL offer one localized Template dropdown filtered by parent family and Entity Group kind, plus Empty. Templates SHALL use the parent's configured entities and image bindings without a separate binding form. The catalog SHALL cover existing automatic popup families. Personal templates SHALL NOT be offered.

#### Scenario: Choose a compatible starting layout
- **WHEN** an administrator chooses the current card family's built-in template
- **THEN** its configured entities populate the always-editable native canvas and only the parent draft changes
- **AND** missing or incompatible inputs produce readable guidance without silently choosing other entities

#### Scenario: Start empty
- **WHEN** Empty is applied to a new popup
- **THEN** its draft contains no child cards and offers Add card without inserting automatic defaults

### Requirement: Popup child cards edited together
The opening card's native editor SHALL expose popup settings and nested content in one editing session. Administrators SHALL be able to add Marao and built-in HA cards, edit children through their visual or YAML editors, duplicate, delete and explicitly reorder them, and choose column/grid placement. Unknown fields and existing nested native card structures SHALL survive edits.

#### Scenario: Customize a template
- **WHEN** an administrator renames a template child, adds a native history card, duplicates another child and changes their order and columns
- **THEN** the preview and saved popup reflect those edits without navigating to a separate source view
- **AND** unrelated parent settings, visibility conditions and opaque child options remain intact

#### Scenario: A child has no visual editor
- **WHEN** a child supports YAML configuration only
- **THEN** its YAML remains editable with readable validation and its configuration survives subsequent parent edits

### Requirement: Unified native popup draft lifecycle
Opening-card settings and embedded popup content SHALL share HA's native card Save/Cancel boundary, including new unsaved cards. Template application and child edits SHALL stay local until that save. Invalid content SHALL block acceptance with a readable error. Preview and ordinary rendering SHALL NOT persist configuration or send device actions.

#### Scenario: Edit an automatic or linked popup directly
- **WHEN** an administrator expands popup settings for a supported automatic or linked source
- **THEN** its native canvas is immediately editable without changing configuration or dispatching device actions
- **AND** the first real layout/child change materializes an independent parent draft while a no-op save leaves the original source contract untouched

#### Scenario: Preview saved content without redundant settings
- **WHEN** popup settings is expanded in a new editing session
- **THEN** saved custom or automatic content appears in the always-editable native canvas without device actions
- **AND** duplicate Title, Columns, Height and Maximum height inputs are absent while their existing saved values remain unchanged

#### Scenario: Cancel a new card
- **WHEN** an administrator creates an unsaved card, applies a template, edits a child and cancels the card dialog
- **THEN** no card, source view or popup content is persisted

#### Scenario: Save and reopen
- **WHEN** valid parent and child changes are saved through HA's normal card flow and the editor is reopened
- **THEN** the saved settings and ordered children are restored together, subject to the host's normal dashboard save lifecycle
- **AND** no second Marao-managed source save is required

### Requirement: Direct popup template selection
Valid template selections SHALL update the temporary draft directly and leave the native canvas editable. Separate chooser/customization buttons, mode selector, template binding form and replacement controls SHALL be absent. Missing inputs SHALL retain the last valid draft with readable guidance. Outer Save/Cancel SHALL own persistence.

#### Scenario: Choose Empty
- **WHEN** an administrator selects Empty from the Template dropdown
- **THEN** the canvas immediately offers native Add card/Add section controls without inserting automatic cards or requiring another edit action

#### Scenario: Select a model then cancel editing
- **WHEN** a valid model is selected directly in the draft and the administrator later cancels the native card dialog
- **THEN** the previously saved content and source references remain unchanged

### Requirement: Template identity reflects actual content
The dropdown SHALL display the name of an applicable template only when the current layout and presentation match it canonically, ignoring object-key order and origin metadata. Actual manual differences SHALL display Custom. Exact restoration SHALL recover the matching name. Opening/no-op saving a child SHALL NOT mark content Custom. Saved customized children SHALL NOT be regenerated to achieve a match.

#### Scenario: Customize and restore a template
- **WHEN** an administrator changes a child name, order, dimensions, visibility or opaque option
- **THEN** the dropdown displays Custom
- **AND** restoring the exact original content restores its template name without another template selection, including after reopening saved content

### Requirement: Mobile popup content authoring
Template selection, native canvas/dialog operations, replacement guidance and errors SHALL use localized EN/PT text and semantic controls. Essential labels SHALL wrap at 320 CSS pixels and enlarged text. Native controls SHALL own arrangement and editing; Marao SHALL NOT add a duplicate move toolbar.

#### Scenario: Edit on a narrow phone
- **WHEN** the template picker, native canvas and native editing dialogs are used on a narrow mobile screen
- **THEN** templates, Edit, Add and native arrangement controls remain reachable and essential guidance remains readable without horizontal page scrolling

### Requirement: Marao popup card catalog
The popup SHALL use Home Assistant's full native picker and create ordinary native card configurations. Public Marao families SHALL appear first as suggested cards while built-in HA cards remain available. Selecting a card SHALL open its native editing dialog. Existing native or opaque content SHALL survive editing. Popup arrangement SHALL reuse Home Assistant Sections editing with draft-only callbacks until the parent card is saved.

#### Scenario: Add an owned card to a popup
- **WHEN** an administrator chooses Marao Climate from the native popup picker
- **THEN** its native editing dialog opens and accepting it adds the child only to the parent draft
- **AND** native HA choices remain available and no separate view is saved

### Requirement: Native popup editing dialogs
The popup canvas SHALL use native menus and native card/section editing dialogs, including native visual/YAML, visibility and layout controls. Marao SHALL NOT duplicate those controls in a custom toolbar or inline inspector. Child dialogs SHALL be scoped instances whose configuration and lifecycle events cannot replace or close the outer card dialog. Their Save callbacks SHALL update only the popup draft. Outer Save/Cancel SHALL remain the sole persistence boundary.

#### Scenario: Apply a native child edit then cancel the parent
- **WHEN** an administrator edits a popup card or section in its native dialog, accepts that dialog, then cancels the outer card editor
- **THEN** the saved dashboard, original popup sources and every other card remain unchanged

#### Scenario: Child cancellation and closure
- **WHEN** an administrator cancels a child dialog
- **THEN** its unaccepted edits are discarded and the parent card editor stays open with its previous draft
- **AND** late imports and callbacks after parent closure cannot apply changes

### Requirement: Collapsed popup settings
The card editor SHALL present popup management in a toggle section closed by default. Expansion and collapse SHALL NOT persist configuration or reset the parent draft. The native canvas SHALL load when the section is first expanded and retain its draft while editing.

#### Scenario: Open card settings
- **WHEN** an administrator opens an existing or new card editor
- **THEN** Popup settings is collapsed and the ordinary card controls remain available
- **AND** expanding it exposes popup editing on the same screen without saving a source view
