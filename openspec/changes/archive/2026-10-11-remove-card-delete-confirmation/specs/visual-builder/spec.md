# Spec Delta

## MODIFIED Requirements

### Requirement: Administrative replacement confirmation
Destructive builder or history actions SHALL require explicit confirmation naming
what will be removed or replaced, except individual card/entity-entry removal
from the local draft. The builder SHALL preserve local unsaved work or clearly
present the consequence of discarding it.

#### Scenario: A stored dashboard is about to replace the current one
- **WHEN** the user selects Restore
- **THEN** the confirmation identifies the replacement before the action is dispatched

#### Scenario: An entire container is deleted
- **WHEN** the user requests deletion of a room or custom page
- **THEN** confirmation names the container before removing it

#### Scenario: Unsaved edits are discarded
- **WHEN** the user requests Discard changes while the draft differs from the saved configuration
- **THEN** confirmation explains that unsaved changes will be discarded before reloading the saved configuration

## ADDED Requirements

### Requirement: Immediate individual card removal
The builder SHALL remove an individual card/entity entry from its local draft
immediately on Delete, without a confirmation modal or additional gesture. It
SHALL remove only that occurrence, preserve other content and order, mark the
draft as changed, and reflect the removal in both Visual and JSON. Removal SHALL
NOT delete the Home Assistant entity or persist before Save & Generate.

#### Scenario: A room entity card is deleted
- **WHEN** the administrator activates Delete on one room entity card
- **THEN** that row disappears once without a dialog and the draft is marked as changed
- **AND** other occurrences of the entity, surviving entries and their options remain intact, and no Home Assistant entity is deleted

#### Scenario: A custom-page entry is deleted
- **WHEN** the administrator activates Delete on an entity card or page-shortcut card in a custom page
- **THEN** only the selected entry is removed immediately without a dialog and the remaining entries retain their order and configuration

#### Scenario: The unsaved removal is inspected and discarded
- **WHEN** the administrator deletes an entry and switches to JSON before saving
- **THEN** JSON reflects the removal while the generated dashboard continues displaying the saved configuration
- **AND** confirming Discard changes restores the saved entry in the editor

#### Scenario: The removal is saved explicitly
- **WHEN** the administrator deletes an entry and successfully uses Save & Generate
- **THEN** the generated dashboard and reloaded editor reflect the removal, with unrelated configuration preserved
