# Camera and history content

## Purpose

Present live camera and historical data through native providers and Marao-owned
components, with explicit failures and correct asynchronous lifecycle cleanup.

## Requirements

### Requirement: Native camera previews and event sheets
Camera SHALL use its HA-provided `entity_picture` preview and open its generated
event sheet on activation; this preview SHALL NOT imply a separate live-video player.
Unknown, unavailable and disconnected cameras SHALL remain neutral without old previews.
Audio SHALL NOT autoplay. Frigate and UniFi Protect events SHALL use project-owned
presentation with provider detection and documented identifier/media-source overrides.

#### Scenario: An available camera card is activated
- **WHEN** its generated popup opens
- **THEN** it shows events from the configured/native detected provider without a third-party camera card

### Requirement: Provider selection and event lists
Explicit provider selection SHALL take precedence over HA entity/device registry
detection. Frigate SHALL support camera/instance overrides; Protect SHALL support
same-device matching across NVRs and a configured media source that bypasses discovery.
Lists SHALL normalize responses, sort Frigate events newest first and preserve
Protect's recent-media order. Event limits SHALL be bounded; names, labels and
dates SHALL honor configuration, provider metadata and the HA locale.

#### Scenario: A Protect camera source is configured explicitly
- **WHEN** events are requested
- **THEN** the card browses that source's supported recent event folder without rediscovering the camera

#### Scenario: An event limit is omitted or exceeds the bound
- **WHEN** the event card is configured
- **THEN** its default is 12 and finite requested limits are rounded and clamped to one through 100

### Requirement: Event detail, back and refresh
Event activation SHALL show a signed Frigate clip when available or its snapshot,
or resolved Protect clip media. Video SHALL retain controls and inline playback
without autoplay. Back SHALL restore the list and invalidate pending detail work.
Refresh SHALL explicitly retry the list; empty/error lists SHALL NOT refetch on
unrelated HA state changes. Disconnection or unavailability SHALL clear old media.

#### Scenario: The user leaves detail before media resolves
- **WHEN** Back is activated while the detail request is pending
- **THEN** its late result cannot replace the restored list

### Requirement: Authenticated provider media
Frigate thumbnails/clips and UniFi Protect media SHALL use their HA authenticated
proxy/signed media interfaces. UniFi events SHALL represent completed recent clips
from the supported last-24-hours media browser. Card configuration SHALL NOT carry
an NVR password or HA token. Provider, permission and detail errors SHALL be readable.

#### Scenario: A provider cannot resolve its camera media
- **WHEN** the event request fails
- **THEN** the card displays a localized error rather than stale data or silent retries

### Requirement: Project-owned background history trace
Graph-enabled cards SHALL use the shared Marao 24-hour trace from Recorder history
and authoritative live numeric state, without nested native history-graph or external
card resources. Optional line/fill/color/background tint SHALL preserve readable
primary content. Empty or failed history SHALL leave the trace neutral, not fabricate a flat line.

#### Scenario: History is empty while the live sensor is valid
- **WHEN** a graph card renders
- **THEN** the current reading and any control remain usable with a localized empty state and neutral background trace

### Requirement: Toggle and history roles stay independent
Toggle-graph availability/control state SHALL come from `toggle_entity`, not its
numeric metric. Timelines SHALL show authoritative state transitions and energy
period cards SHALL retain period values, graph sheets and previous-period navigation.
Each asynchronous content family SHALL distinguish loading, empty, error, unknown and unavailable.

#### Scenario: A metric is numeric but its related toggle is unavailable
- **WHEN** the toggle graph is displayed
- **THEN** the metric remains readable while the actual toggle action is disabled

### Requirement: Timeline and energy period semantics
Timelines SHALL use 24-hour Recorder transitions plus authoritative live state.
Energy period cards SHALL show the live period reading and, in their sheet, day
or month history with previous/next navigation. Navigation SHALL stop at the
current period and disable while loading or unavailable. An absent legacy energy
entity SHALL render a neutral state rather than throw during card configuration.

#### Scenario: A period sheet is at the current month
- **WHEN** its navigation controls render
- **THEN** Previous is available when usable and Next cannot navigate into a future period

### Requirement: Stale-response protection and cleanup
Async history/camera work SHALL invalidate stale completions after entity/route
change, disconnection or removal. Subscriptions, timers, listeners and pointer
capture SHALL be cleaned up. Late responses SHALL NOT overwrite newer state.

#### Scenario: An older history request finishes after the entity changes
- **WHEN** that request resolves
- **THEN** its data is discarded and the new entity's state remains authoritative

### Requirement: On-demand content and bounded requests
Secondary camera/graph/popup content SHALL load lazily where practical, deduplicate
rendered graph history work, and reserve usable space during loading. State updates
SHALL update affected components rather than rerender the entire dashboard.
Disconnected or failed requests SHALL NOT enter repeated retry loops.

#### Scenario: HA disconnects while secondary content loads
- **WHEN** the component receives the outage
- **THEN** stale work is invalidated, controls disable appropriately, and no repeated failed requests are emitted

### Requirement: Consistent energy history presentation
Configured energy unit and precision SHALL apply consistently to current readings and existing numeric labels/scales in generated history sheets. History samples SHALL convert before bounds are calculated, retaining full precision; only visible text SHALL be rounded. Chart shape and period navigation SHALL retain existing semantics. Each sample's source unit SHALL be respected, and incompatible samples SHALL NOT be combined as equivalent measurements.

#### Scenario: An energy period card and its sheet use kilowatt-hours
- **WHEN** the source reads `2500 Wh` and the card selects `kWh` with two decimal places
- **THEN** the card shows `2.50 kWh` and its sheet's numeric bounds use equivalent converted values and the same unit/precision

#### Scenario: Different samples round to the same text
- **WHEN** full-precision history values differ but the selected display precision rounds them equally
- **THEN** chart geometry still reflects their actual converted differences rather than a fabricated flat trace

#### Scenario: A configured graph uses a distinct history entity
- **WHEN** the live entity reports watts and the history entity reports kilowatts
- **THEN** each value is converted from its own metadata to the configured compatible target before presentation

#### Scenario: Historical samples contain incompatible units
- **WHEN** a requested conversion cannot interpret some samples in the target dimension
- **THEN** the sheet reports the incompatibility without drawing a misleading mixed-unit line or altering recorded history

### Requirement: Formatting preserves history request lifecycle
Display-option changes SHALL reuse available raw history without new requests solely for formatting. Unit or precision changes SHALL NOT alter period selection, request identity, controls or authoritative state. Existing loading/empty/error/availability states and stale-response cleanup SHALL remain intact. Source-unit changes SHALL invalidate derived presentation without converting already-converted data again.

#### Scenario: Precision changes after history loads
- **WHEN** the same card and period change from two to zero decimal places
- **THEN** labels rerender from the retained numeric history without another Recorder request or resetting the selected period

#### Scenario: A formatted history request completes after entity replacement
- **WHEN** the old request resolves
- **THEN** existing stale-result protection discards it rather than showing the old entity's values under the new unit

#### Scenario: Loaded history is empty or failed
- **WHEN** formatting options are applied
- **THEN** the existing readable empty/error state remains and no graph values or retry loop are fabricated
