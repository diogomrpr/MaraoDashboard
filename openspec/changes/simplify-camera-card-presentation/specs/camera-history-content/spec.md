# Spec Delta

## ADDED Requirements

### Requirement: Minimal camera card presentation
Healthy inline camera playback SHALL show only its media and optional title.
The card SHALL omit decorative camera icons, entity activity rows, extra labels,
persistent Live or Reduced quality badges, and feedback footers. Hidden content
SHALL leave no reserved row or gap. This presentation SHALL apply to existing
generated, manual and native camera cards without changing other card families
or the camera event sheet.

#### Scenario: Healthy playback has a visible title
- **WHEN** an available camera is playing and its title is enabled
- **THEN** the card shows a slim title row above the video and no other routine text or controls
- **AND** the media fills the available card width within its rounded boundary
- **AND** the same presentation applies while a lower-quality stream is playing normally

#### Scenario: Old presentation options are present
- **WHEN** an existing camera card includes icon, state or label display options
- **THEN** normal playback still uses the minimal camera presentation
- **AND** those saved options are retained without enabling extra visible camera content or changing another card family

### Requirement: Optional camera title above the video
The camera title SHALL use the existing `name` and `show_name` fields. Omitted
or true `show_name` SHALL retain the current resolved-name behavior. False
SHALL remove the complete title row, without deleting its saved name or internal
accessible identity. A visible title SHALL sit above, never over, the video and
wrap at supported narrow, bold, enlarged-text and zoom settings.

#### Scenario: The title is hidden
- **WHEN** `show_name` is false
- **THEN** the media starts at the top of the card without an empty header or title padding
- **AND** the card and its applicable actions retain localized accessible names identifying the camera

#### Scenario: A custom title is hidden and restored
- **WHEN** a camera with a custom name has its title disabled and later enabled
- **THEN** the original custom name returns above the media
- **AND** no Home Assistant entity name or event-sheet title is changed by toggling visibility

#### Scenario: No custom name or visibility setting exists
- **WHEN** a supported existing camera configuration has no title override
- **THEN** its existing resolved camera name appears above the video without a source rewrite
- **AND** an empty custom-name value retains the existing name-resolution behavior rather than becoming a second visibility setting

#### Scenario: The camera title needs more than one line
- **WHEN** a long title is shown at 320 CSS pixels or with supported text or browser enlargement
- **THEN** the title row grows to display the complete text without ellipsis, shrinking or overlap
- **AND** the media remains below it without horizontal page overflow

### Requirement: Conditional camera media feedback
Camera loading, buffering, snapshot fallback, blocked autoplay and errors SHALL
remain honestly identified by localized feedback inside the media area.
Unknown, unavailable or disconnected cameras SHALL clear stale media and remain
neutral and disabled. Recovery actions SHALL remain readable, touch-sized and
separate from event activation. Healthy playback SHALL clear visible feedback
without changing the media area's reserved geometry.

#### Scenario: A stream is starting or only a snapshot is available
- **WHEN** native video has not begun advancing
- **THEN** the media area identifies loading or snapshot-only fallback as appropriate
- **AND** it does not claim that a still image is live or prevent native video from starting

#### Scenario: Live video briefly buffers
- **WHEN** an established stream temporarily stops advancing
- **THEN** a concise buffering indicator appears within the media area while the existing video frame stays visible
- **AND** resumed progress removes that indicator without a snapshot flash, player restart or feedback footer

#### Scenario: Playback needs user recovery
- **WHEN** playback fails or muted autoplay is blocked
- **THEN** one readable failure or recovery explanation appears with Retry or Start live view as applicable
- **AND** the action remains at least 48 by 48 CSS pixels, works once, and cannot also open the event sheet
- **AND** long localized feedback and controls remain reachable at narrow and enlarged-text sizes, using internal overflow when necessary rather than clipping or adding a permanent footer

#### Scenario: A title-hidden camera becomes unavailable
- **WHEN** the entity becomes unknown, unavailable or disconnected
- **THEN** the media area shows the relevant neutral availability state without stale imagery
- **AND** hiding the title or legacy state-label settings cannot hide the problem or enable an unavailable action

### Requirement: Camera presentation changes preserve playback and actions
Title, theme, locale and routine state changes SHALL preserve an active camera's
player and selected stream. The minimal presentation SHALL retain existing event
and custom actions, native transport, low-first startup, buffering recovery and
visibility/removal cleanup. Editing previews SHALL remain inert. Presentation
changes SHALL NOT introduce stream requests, camera control calls or new retries.

#### Scenario: The title changes while the same camera is playing
- **WHEN** its name or title visibility changes without replacing the camera
- **THEN** the title updates while the same stream continues advancing
- **AND** no additional initialization, quality reset or camera service call occurs

#### Scenario: The camera is activated normally
- **WHEN** an available card with a configured event or custom action is tapped outside a recovery control
- **THEN** that existing action executes exactly once with the same target
- **AND** hiding the title does not add a second action or remove event access

#### Scenario: A camera is edited or leaves the visible dashboard
- **WHEN** a preview is rendered, or a runtime card is hidden, removed or replaced
- **THEN** the preview starts no live session and the runtime retains its existing cleanup and stale-response protections
- **AND** a title-only change does not masquerade as a camera replacement
