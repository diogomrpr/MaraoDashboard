# Spec Delta

## MODIFIED Requirements

### Requirement: Standalone native detail parity
Native Marao cards SHALL own automatic detail sheets with current media, climate, alarm, access, camera/events, group, scene, energy/history and floor-plan light-list behavior. Duplicate cards SHALL have independent automatic sheets. Explicit external popup references SHALL NOT create extra sheets. Saved custom popup content SHALL remain attached to its intended owner or explicitly preserved external sheet.

#### Scenario: Duplicate media cards open details
- **WHEN** differently configured instances are opened
- **THEN** each exposes its own remote and app options without popup collisions

#### Scenario: Native duplication copies a card
- **WHEN** HA duplicates a card with automatic details and the copy is moved or edited
- **THEN** each occurrence opens its own configuration and restores focus to its own opener
- **AND** deleting one occurrence does not remove or retarget the other's automatic details

#### Scenario: A camera detail opens
- **WHEN** the native Marao camera card's detail control is activated
- **THEN** its configured popup video appears above its configured event content with the current fullscreen/return behavior
- **AND** native authoring does not require adding a separate generated popup card

#### Scenario: Explicit custom sheet content is retained
- **WHEN** a converted card uses custom popup content or an explicit external popup link
- **THEN** that content/link retains its intended behavior without an additional competing automatic sheet
- **AND** unavailable external targets produce a readable error without changing saved configuration

### Requirement: Inert native previews
Native previews, edit mode and conversion previews SHALL prevent entity-service dispatch, popup navigation, browser fullscreen and dashboard-wide shell effects while preserving readable authoritative state. Published security gestures and transient PIN clearing SHALL remain unchanged outside previews. Editing and cancellation SHALL NOT send device commands.

#### Scenario: An access control is previewed
- **WHEN** gestures are attempted in an editor preview
- **THEN** no physical service is dispatched and the native editor remains usable

#### Scenario: Native cards are rearranged or configured
- **WHEN** an administrator drags a light card, changes a floor-plan marker or edits a media shortcut in native edit mode
- **THEN** no light, media or other entity command is sent
- **AND** edited values are applied only through the native configuration workflow

#### Scenario: A runtime security action completes
- **WHEN** a valid configured access slide or security hold completes outside editing
- **THEN** the existing guarded interaction dispatches once to the configured target
- **AND** cancelled gestures, unavailable targets and disconnection retain their current no-dispatch behavior
