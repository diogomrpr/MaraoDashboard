# Spec Delta

## ADDED Requirements

### Requirement: Native camera events card configuration
HA's native picker SHALL expose the existing shared event browser as Marao Camera Events. Its visual editor SHALL support ordered camera membership, local source names, per-source provider overrides, title, bounded event limit and Event columns. Individual camera editors SHALL also expose Event columns for their popup. HA SHALL own placement, layout, visibility and saving. The same public event type SHALL work in YAML and popups without a second renderer or editor product.

#### Scenario: A camera events page is configured
- **WHEN** an administrator adds Marao Camera Events to an existing HA view and selects several cameras
- **THEN** one saved card displays their combined feed and three filter dropdowns
- **AND** it supports a normal dashboard section or a full-page Panel view without generating a different dashboard root

#### Scenario: An existing single-camera event card is edited
- **WHEN** a card uses the existing `entity` contract, provider overrides and either supported public event-card type
- **THEN** its native visual editor exposes that source and current settings
- **AND** an unrelated title or layout edit preserves its original single-camera shape and public type

#### Scenario: Event columns are edited and preserved
- **WHEN** an administrator selects two event columns in the event-card editor or an individual camera's popup settings
- **THEN** the complete saved config contains `columns: 2` or `variables.event_columns: 2` respectively
- **AND** Visual/YAML round trips and unrelated edits preserve that value, native layout options and unknown fields
- **AND** responsive reductions never overwrite the saved count or change HA's outer card columns

### Requirement: Lossless camera source list editing
Camera source edits SHALL preserve order, locally configured names, per-source overrides, unknown fields, native layout and visibility options. Removing every source SHALL save an explicit empty list without discovery refill. Missing configured entities SHALL remain reviewable. Editor changes SHALL emit the complete configuration; cancelling HA's dialog SHALL preserve the previously saved card.

#### Scenario: Per-source settings survive edits
- **WHEN** a mixed-provider list is reordered and one source's local name changes
- **THEN** each source retains its own provider, Frigate identity or Protect media-source override and unknown fields
- **AND** unrelated card options and native layout/visibility remain unchanged through Visual/YAML switches

#### Scenario: The last source is removed
- **WHEN** the administrator removes the final camera and saves
- **THEN** `cameras: []` remains explicit and the card displays setup guidance without provider requests
- **AND** no registry or package update inserts cameras

#### Scenario: A source has disappeared from HA
- **WHEN** an existing selected camera is no longer in current metadata
- **THEN** it stays visible in configuration for review or removal
- **AND** saving another setting does not replace it with a discovered camera

### Requirement: Camera events layout and editing lifecycle
The shared event browser SHALL respect native card sizing and Marao's mobile typography, theme and touch geometry in dashboard and popup contexts. Preview/edit modes SHALL be inert: they SHALL NOT browse providers, resolve media, open operational details or start camera streams. Ordinary state, locale or theme updates SHALL preserve mounted filter controls, focus and active custom-range drafts.

#### Scenario: A native card preview is displayed
- **WHEN** HA displays the event card in its picker or configuration preview
- **THEN** the shared header and non-operational setup presentation remain available
- **AND** no camera/provider request, stream or device action starts

#### Scenario: Text grows while browsing a popup
- **WHEN** labels need additional space at supported enlarged text or zoom
- **THEN** essential header text and filter controls reflow and remain contained with visible 48px minimum targets
- **AND** dropdowns remain above the feed, respect the popup's focus/scroll behavior, and close independently before the containing popup

#### Scenario: State changes during range input
- **WHEN** an unrelated HA state or theme update arrives while a custom range is being entered
- **THEN** the active field, entered values, focus and current applied filters remain intact
- **AND** the update does not emit a saved configuration change
