# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic and fixed-column container layouts
Rooms and custom pages SHALL offer automatic domain grouping or one through six
fixed columns. Fixed-column serialization SHALL preserve mixed entity/shortcut
order. Room membership SHALL be explicit; an area association SHALL NOT add
entities during serialization, tab switches, card edits or reordering.

#### Scenario: A fixed-column room mixes entities and page shortcuts
- **WHEN** the administrator reorders and saves its cards
- **THEN** the ordered mixed list reaches generation without regrouping it by domain

#### Scenario: JSON removes an area-associated entity
- **WHEN** the administrator deletes an entity from a room's JSON list and returns to Visual
- **THEN** the entity is absent from that room's visible list
- **AND** later editing or reordering does not import it from the associated area

### Requirement: Editable room snapshots
Add room SHALL support empty rooms and an editable snapshot of a current HA area.
Snapshots SHALL NOT silently track later registry changes. Rooms SHALL retain an
optional, editable area association for suggestions only. Changing or clearing
that association SHALL NOT modify cards, name, path or layout. Legacy area-linked
sources SHALL follow the explicit-membership conversion contract before editing.

#### Scenario: Registry membership changes after a room snapshot
- **WHEN** HA adds another entity to that area
- **THEN** the saved snapshot remains unchanged until the administrator edits it

#### Scenario: A room's suggestion area changes
- **WHEN** the administrator changes or clears the room's associated HA area
- **THEN** future suggestions use the selected association or show no area-specific suggestions
- **AND** all existing room cards and settings remain unchanged

## ADDED Requirements

### Requirement: Add by card type or entity
Add card SHALL expose localized By card type and By entity tabs for rooms and
custom pages. By card type SHALL retain the supported catalog and option forms.
Selecting a supported entity SHALL choose its compatible Marao card and open the
same form with that entity prefilled. Creating SHALL add one local draft card;
cancelling or switching tabs SHALL NOT add a card or save configuration.

#### Scenario: An entity is selected first
- **WHEN** the administrator selects a suggested or searched climate entity
- **THEN** the climate card form opens with that entity selected and normal options available
- **AND** confirming adds it once to the draft without generating until Save & Generate

#### Scenario: A card type is selected first
- **WHEN** the administrator chooses a card in By card type
- **THEN** its existing compatible-entity selector and basic/advanced options remain available

#### Scenario: The Add flow is cancelled
- **WHEN** the administrator switches tabs, searches or cancels without confirming a card
- **THEN** neither the room document nor the saved dashboard changes

### Requirement: Room suggestions and global entity search
By entity SHALL initially suggest enabled, visible, supported entities from the
room's associated HA area that are not already added to that container. Matching
SHALL respect entity-area assignment before device-area fallback. Search SHALL
match friendly name or entity ID across supported entities in all areas. Results
SHALL identify entity ID and compatible card, distinguish already-added entries,
and show localized empty/no-match states without automatic additions.

#### Scenario: A new entity becomes available in the area
- **WHEN** current registry metadata includes a new supported entity for the room
- **THEN** it appears as a suggestion after metadata refresh but is not added automatically

#### Scenario: A deleted entity can be deliberately added again
- **WHEN** the administrator removes an entity from the local room list and reopens Add
- **THEN** it is eligible for suggestions again if it still belongs to that HA area
- **AND** it remains absent until explicitly created

#### Scenario: An entity in another area is found by name
- **WHEN** the administrator searches its friendly name or entity ID
- **THEN** the supported entity can be selected regardless of its HA area
- **AND** adding it does not reassign its HA area

#### Scenario: An entity is already present
- **WHEN** it already appears in the container's entity-backed cards or raw-card entity references
- **THEN** it is omitted from suggestions and marked already added in global search
- **AND** the entity-first flow cannot accidentally add a duplicate

#### Scenario: A custom page or room has no associated area
- **WHEN** By entity opens
- **THEN** a localized explanation and global search are available without inferring an area from its name

#### Scenario: Entity metadata is refreshed
- **WHEN** Add obtains updated metadata or cannot obtain it
- **THEN** it updates suggestions or presents a readable retryable error
- **AND** the current unsaved document remains intact without repeated automatic requests
