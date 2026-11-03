# Spec Delta

## ADDED Requirements

### Requirement: Download-free popup authoring
Popup layout creation, editing, adoption, synchronization and failure handling SHALL NOT download files, offer recovery/export links or require a user-managed backup. Source preservation and write verification SHALL remain internal to the authoring operation.

#### Scenario: First layout edit
- **WHEN** an administrator edits an automatic or hash-backed popup for the first time
- **THEN** the editable source opens without a browser download, export prompt or recovery link
- **AND** the existing popup content and unrelated dashboard configuration are preserved

#### Scenario: A save fails
- **WHEN** a popup source write fails or its result is uncertain
- **THEN** a localized error describes the unresolved save without instructing the user to download or import a file
- **AND** internal preservation data remains available for reconciliation

### Requirement: Card settings remain authoritative for managed behavior
Saving valid card settings SHALL update the popup's Marao-managed control types, target bindings and forwarded functional options. A native layout view SHALL NOT freeze those controls at their initial generated values. Unsaved changes and Cancel SHALL NOT update a saved popup source.

#### Scenario: A functional option changes
- **WHEN** a user saves a camera's popup-stream selection or a popup event-column option
- **THEN** its managed popup controls use the new setting
- **AND** the view's custom cards, placements and sizes remain unchanged

#### Scenario: Popup display is disabled and restored
- **WHEN** a user switches a media card to inline display or disables graph popup history
- **THEN** that card stops opening the managed popup and its saved layout is retained
- **WHEN** the user restores popup display
- **THEN** the retained layout is reused with current settings

#### Scenario: A card edit is cancelled
- **WHEN** a user changes the popup type or options in an unsaved native card dialog and cancels
- **THEN** the previously saved popup source and its management state remain unchanged

### Requirement: Native layout customization survives settings updates
Managed-popup synchronization SHALL preserve user card order, placement, dimensions, sections, presentation overrides, unknown fields, custom cards and intentional deletions. Ordinary settings updates SHALL NOT refill deleted controls or empty sections. Only proven Marao-owned functional fields SHALL be replaced automatically.

#### Scenario: Controls are resized and moved
- **WHEN** a managed control is moved and resized in HA and the parent card's functional options are later saved
- **THEN** its placement and dimensions remain as saved while its managed behavior updates

#### Scenario: A generated control is deleted
- **WHEN** a user deletes a managed control or deliberately empties a section and later changes an unrelated parent option
- **THEN** the deleted control and empty section are not refilled

#### Scenario: A custom card is added
- **WHEN** a user adds an arbitrary native or raw custom card to a managed popup view
- **THEN** later synchronization leaves that card's complete configuration and order unchanged

### Requirement: Popup type transitions preserve incompatible customization
A valid popup type change SHALL select compatible managed controls without silently discarding the previous managed layout's customizations. Compatible layout edits and independent custom cards SHALL remain active. Returning to a previous type SHALL restore its retained managed-layout customizations with current valid bindings and safety rules.

#### Scenario: A group changes family
- **WHEN** a user saves a light group as a cover group with an explicit compatible selection
- **THEN** its managed controls and summary use the cover configuration
- **AND** independent custom cards remain intact
- **AND** light-specific managed customizations remain retained rather than being applied to incompatible cover controls

#### Scenario: The previous type is restored
- **WHEN** a user returns to the prior popup family
- **THEN** its retained managed placements, presentation overrides and deliberate deletions are restored where their logical controls still exist
- **AND** obsolete service targets and unsafe actions are not restored

### Requirement: One popup layout authoring entry point
Edit popup SHALL remain available for supported saved popup owners, including hash-backed summaries. It SHALL open a current same-dashboard Sections source and reuse that source on later edits. A source SHALL be created or adopted only through explicit authoring; automatic popups SHALL continue to follow card settings before their first layout edit.

#### Scenario: An automatic popup becomes editable
- **WHEN** an administrator activates Edit popup on a clean saved automatic card
- **THEN** its configured content becomes one managed Sections source and HA opens its editor
- **AND** subsequent edits do not create duplicate source views

#### Scenario: A summary uses a saved popup hash
- **WHEN** an administrator activates Edit popup on a summary with an unambiguous saved popup definition
- **THEN** the existing source is reused or the exact saved popup content is adopted
- **AND** unknown fields, retained original content and unrelated hash users remain preserved

#### Scenario: The invoking card has a draft
- **WHEN** the invoking card or dashboard has unsaved changes
- **THEN** source navigation and independent writes are refused with save-first guidance
- **AND** HA Save/Cancel and the complete draft remain available

### Requirement: Conservative managed-layout compatibility
Managed layout ownership SHALL be versioned independently of package and dashboard-source versions. Existing unmarked layouts, raw cards and authored popup hashes SHALL remain valid. Adoption SHALL preserve them and SHALL NOT infer ownership from appearance alone. Unsupported newer or ambiguous ownership data SHALL remain untouched with a readable error.

#### Scenario: An older editable view is adopted
- **WHEN** an administrator adopts a supported older view with provable generated controls and custom content
- **THEN** management is attached only to proven controls and the remaining content is preserved exactly
- **AND** the source path, explicit emptiness and unrelated settings remain valid

#### Scenario: Ownership cannot be established
- **WHEN** existing content has no reliable management provenance
- **THEN** it is retained as custom content or retained in its original source while an explicit managed copy is prepared
- **AND** no speculative rewrite or deletion occurs

#### Scenario: A newer metadata version is encountered
- **WHEN** a dashboard contains an unsupported newer managed-popup record
- **THEN** authoring and synchronization do not replace, downgrade or discard that record

### Requirement: Shared popup settings isolation
Changing one popup owner's functional settings SHALL NOT retarget another owner through a shared source. Shared layout references SHALL be retained while behavior is compatible. A divergent change SHALL separate only the affected owner's managed source, preserving the prior shared view and its remaining references.

#### Scenario: Shared users keep matching behavior
- **WHEN** compatible owners continue to use one shared layout
- **THEN** native layout edits remain shared without duplicate source creation

#### Scenario: One shared owner changes popup type
- **WHEN** one uniquely identifiable owner saves incompatible popup settings
- **THEN** that owner receives a managed source with its new behavior and preserved customization
- **AND** the other owners and original shared source remain unchanged

#### Scenario: The changed occurrence is ambiguous
- **WHEN** the affected occurrence or source cannot be identified unambiguously
- **THEN** the system reports a conflict without guessing an owner or overwriting another card

### Requirement: Verified popup authoring transactions
Popup authoring writes SHALL require a connected administrator, a clean editable storage dashboard, fresh source checks and exact internal preservation data. Each planned update SHALL save and verify one dashboard result. Uncertain results SHALL be reconciled by reading current data without blindly repeating writes or replacing concurrent edits.

#### Scenario: A managed update is already saved
- **WHEN** the same confirmed settings notification is received again
- **THEN** the source remains unchanged and no duplicate save or view is created

#### Scenario: Another editor changes the dashboard
- **WHEN** the authoritative dashboard differs from the staged source before a write
- **THEN** the write is refused and both the current saved data and local draft are preserved

#### Scenario: Saving reports a failure after committing
- **WHEN** acknowledgement fails but readback matches the planned result
- **THEN** that result is accepted once and its internal pending preservation record is cleared
- **AND** no retry or file download occurs

#### Scenario: An interrupted write cannot be classified
- **WHEN** an interrupted operation is resumed and current data matches neither its source nor proposed result
- **THEN** the unresolved preservation data is retained and automatic writes stop until the conflict is reconciled
- **AND** unrelated concurrent edits are never rolled back
