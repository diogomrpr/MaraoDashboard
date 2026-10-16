# Spec Delta

## ADDED Requirements

### Requirement: Card drag placement within a page
The Visual builder SHALL allow every visually editable card occurrence to be dragged to a precise position within its section or another section of the same page. Destinations SHALL include the start, gaps, end and empty sections. Flat pages SHALL retain single-container reordering. A move SHALL transfer exactly one occurrence without duplication or deletion of its source section.

#### Scenario: Reordering in both directions
- **WHEN** an administrator moves a card upward or downward within a populated section
- **THEN** it appears at the indicated insertion position exactly once and the relative order of all other cards is preserved

#### Scenario: Moving into an empty section
- **WHEN** a card is dropped into an empty section on the same page
- **THEN** it becomes that section's first card, disappears from its source and retains its complete configuration
- **AND** an emptied source section stays present with its original layout settings

#### Scenario: Moving between populated sections
- **WHEN** a card is dropped before, between or after cards in another section of its page
- **THEN** only the source and destination card lists change and the indicated destination position is honored

### Requirement: Touch-friendly card dragging
Dragging SHALL use a visible, named handle at least 48 by 48 CSS pixels and work with touch and mouse. The editor SHALL show the selected card and insertion position and scroll reachable content near viewport edges. Ordinary scrolling outside the handle SHALL remain available. Dragging SHALL NOT activate another row action or a Home Assistant entity action.

#### Scenario: Dragging on a phone
- **WHEN** an administrator drags a handle through a long section to a destination below the visible content
- **THEN** scrolling reveals the destination, the insertion feedback stays aligned with it and releasing commits one move
- **AND** Edit, Delete and Save do not activate as a consequence of the gesture

#### Scenario: Scrolling without grabbing a card
- **WHEN** the administrator scrolls from a card's label or other non-handle content
- **THEN** the editor scrolls normally without initiating a move

#### Scenario: Enlarged mobile layouts
- **WHEN** the editor uses either theme at 320 CSS pixels, representative iPhone or Android portrait/landscape, or supported bold/text/zoom settings
- **THEN** handles, actions and drop feedback remain reachable without horizontal overflow, clipped essential labels or targets smaller than 48 by 48 CSS pixels

### Requirement: Explicit card move controls
The builder SHALL retain explicit up/down reordering and provide a localized Move to section action with a destination insertion position. These controls SHALL produce the same configuration result as dragging and remain usable by tap and keyboard. Controls and feedback SHALL use the existing English and Portuguese localization behavior.

#### Scenario: Moving without dragging
- **WHEN** the administrator selects another section and a destination position through Move to section and confirms
- **THEN** the selected occurrence moves once to that position with the same result as a matching drag
- **AND** cancelling the action leaves the draft unchanged

#### Scenario: A page has one section
- **WHEN** its card actions are displayed
- **THEN** up/down reordering remains available and no unusable cross-section destination is offered

### Requirement: Atomic local card movement
Card movement SHALL remain local until Save & Generate. A cancelled, invalid, stale or unchanged drop SHALL preserve the source document and existing dirty state. Only a completed valid move SHALL update the draft. The editor SHALL clear gesture feedback and stop gesture scrolling on cancellation, lifecycle interruption or completion.

#### Scenario: An active drag is interrupted
- **WHEN** Escape, pointer cancellation, lost gesture capture, panel removal, tab switching, document replacement or a busy operation interrupts a drag
- **THEN** the uncommitted move is cancelled without changing the document or saving
- **AND** no drag overlay, captured gesture or scrolling task remains active

#### Scenario: Dropping outside a valid destination
- **WHEN** a card is released outside its page, on an invalid target or in its unchanged position
- **THEN** no move is committed and existing unsaved edits and dirty state remain intact

#### Scenario: Inspecting and discarding an unsaved move
- **WHEN** a completed move is inspected in JSON before saving
- **THEN** JSON reflects the move and the generated dashboard still reflects the last saved source
- **AND** confirming Discard restores the saved ordering and section membership

### Requirement: Configuration-preserving card transfer
Moving a card SHALL preserve its occurrence identity, names, bindings, nested options, explicit empty selections, unknown fields and popup references. Other occurrences, raw cards, section metadata and protected custom content SHALL remain intact. Visual/JSON switching, Save & Generate, reload and repeated generation SHALL preserve the accepted move through the existing source format and recovery contracts.

#### Scenario: Duplicate entities carry different options
- **WHEN** one of two occurrences of the same entity is moved to another section
- **THEN** only that occurrence moves with its own identity and options, and the other occurrence and its popup references remain unchanged

#### Scenario: Moving advanced or entity-free cards
- **WHEN** a group, heading, scene collection, page shortcut or card with advanced nested settings is transferred and saved
- **THEN** its membership/order, empty selections, command data, links and unknown options survive the move and subsequent reload
- **AND** raw Lovelace cards stay in their authored containers and no entity action is dispatched

### Requirement: Card moves respect section layouts
Card moves SHALL preserve source and destination layout settings. Fixed-column sections SHALL render the accepted mixed card order. Automatic sections SHALL retain their existing domain grouping, with localized guidance explaining how fixed columns preserve exact mixed order. Moving a card SHALL NOT silently convert a layout or reorder unrelated sections.

#### Scenario: Moving into a fixed-column section
- **WHEN** an administrator inserts a card between other card types and saves
- **THEN** the generated grid preserves that position and the destination column count

#### Scenario: Moving into an automatic section
- **WHEN** a card is moved into a section with automatic layout
- **THEN** its accepted source position is retained while the generated dashboard uses the existing domain grouping
- **AND** the editor explains the layout behavior without changing the column setting
