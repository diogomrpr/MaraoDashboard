# Camera and history content

## Purpose

Present live camera and historical data through native providers and Marao-owned
components, with explicit failures and correct asynchronous lifecycle cleanup.

## Requirements

### Requirement: Native camera previews and event sheets
Available camera cards SHALL show live inline video using Home Assistant's native player when supported by the camera and browser. Unknown, unavailable and disconnected cameras SHALL remain neutral without old media. Audio SHALL NOT autoplay. Activating the camera's event action SHALL open its generated event sheet. Frigate and UniFi Protect events SHALL retain project-owned presentation, provider detection and documented identifier/media-source overrides.

#### Scenario: An available camera card is activated
- **WHEN** its generated popup opens
- **THEN** it shows events from the configured/native detected provider without a third-party camera card

#### Scenario: A supported camera card becomes visible
- **WHEN** an available camera with a supported live source is displayed outside an editing preview
- **THEN** the existing card shows its available still image while its native player starts muted inline live video automatically
- **AND** it switches to live playback when ready without a new card, setting or user activation unless autoplay is blocked
- **AND** the rendered media advances over time rather than remaining an image or event clip

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

#### Scenario: A toggle graph opens history
- **WHEN** the user activates its History control
- **THEN** the numeric source's detail opens without dispatching a toggle or the configured card action
- **AND** its actual toggle target retains independent state and availability handling

#### Scenario: Additional project-owned background history trace contracts
- **WHEN** a numeric graph card renders with configured history options
- **THEN** Compact previews SHALL remain non-interactive and provide a separate visible History control for numeric detail without replacing existing card actions.

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
or month history with previous/next navigation and interactive numeric point inspection.
Navigation SHALL stop at the current period and disable while loading or unavailable.
An absent legacy energy entity SHALL render a neutral state rather than throw during card configuration.

#### Scenario: A period sheet is at the current month
- **WHEN** its navigation controls render
- **THEN** Previous is available when usable and Next cannot navigate into a future period

#### Scenario: A calendar period crosses a clock change
- **WHEN** a day or month history period is selected
- **THEN** its bounds and labels follow the Home Assistant time zone and calendar boundaries
- **AND** a daylight-saving day is not forced into a fixed 24-hour duration

### Requirement: Stale-response protection and cleanup
Async history/camera work SHALL invalidate stale completions after entity/route
change, disconnection or removal. Subscriptions, timers, listeners and pointer
capture SHALL be cleaned up. Late responses SHALL NOT overwrite newer state.

#### Scenario: An older history request finishes after the entity changes
- **WHEN** that request resolves
- **THEN** its data is discarded and the new entity's state remains authoritative

### Requirement: On-demand content and bounded requests
Secondary camera/graph/popup content SHALL load lazily where practical, except for explicitly enabled dashboard camera background preloading. Background preload SHALL apply only within its active dashboard lifetime; popup streams and event content SHALL remain on demand. Rendered graph history work SHALL remain deduplicated and usable space reserved during loading.

#### Scenario: HA disconnects while secondary content loads
- **WHEN** the component receives the outage
- **THEN** stale work is invalidated, controls disable appropriately, and no repeated failed requests are emitted

#### Scenario: Camera preload is disabled
- **WHEN** the user opens a page that does not display that camera
- **THEN** the camera retains lazy startup instead of acquiring a background session

#### Scenario: Additional on-demand content and bounded requests contracts
- **WHEN** secondary content initializes or receives an HA state update
- **THEN** State updates SHALL update affected components rather than rerender the entire dashboard.
- **AND** Disconnected or failed requests SHALL NOT enter repeated retry loops.

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

#### Scenario: History includes past nonnumeric states
- **WHEN** compatible numeric samples are interspersed with unknown, unavailable or other nonnumeric states
- **THEN** the card and history sheet convert the numeric samples without a unit error
- **AND** nonnumeric samples are omitted from numeric conversion without becoming zero or modifying recorded history

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

### Requirement: Shared numeric history details
All consumers of the shared numeric graph path and energy-period sheets SHALL use consistent detail behavior in generated, native and raw-config hosts. Existing graph source, title, line/fill/color and unit/precision options SHALL retain their meaning. Detail selection and windows SHALL remain transient without changing saved source, generated YAML, popup assignments or entity actions.

#### Scenario: A configured power or climate graph is inspected
- **WHEN** its History control is activated
- **THEN** the detail uses the configured graph source and applicable presentation options
- **AND** climate controls, toggles and configured tap/hold actions retain their original behavior

#### Scenario: A card is displayed in native editor preview
- **WHEN** history controls are rendered in the preview
- **THEN** no operational detail sheet, service action or history request is started by that preview

#### Scenario: Existing saved graph configuration is loaded
- **WHEN** the new frontend renders a supported released graph or energy card
- **THEN** detail works without rewriting its configuration or adding a required option
- **AND** unknown fields, raw cards and protected custom content remain unchanged

### Requirement: Touch point inspection
Numeric details SHALL support tap selection of the nearest available recorded sample along the time axis without requiring a precise hit on the line. The selected value and timestamp SHALL appear in readable text outside the plot. Visible previous/next-reading controls SHALL provide equivalent selection and disable at the endpoints. Point selection SHALL not dispatch entity services.

#### Scenario: A finger selects a narrow peak
- **WHEN** the user taps near its time position
- **THEN** the readout identifies an actual source sample and its timestamp
- **AND** it does not report an interpolated or rounded drawing coordinate as an exact measurement

#### Scenario: Selection reaches the last reading
- **WHEN** Next reading would leave the current window
- **THEN** that control is disabled and the existing selection remains visible

#### Scenario: A valid selection receives an unrelated state update
- **WHEN** the source samples and chosen window remain applicable
- **THEN** the selected timestamp and readout remain stable instead of resetting to the newest reading

### Requirement: Bounded detail windows and summaries
Numeric-card details SHALL offer 1h, 6h and 24h windows using available 24-hour history. Changing a window SHALL reuse loaded raw history without a new request solely for filtering. Details SHALL show minimum and maximum from available full-resolution numeric samples; measurement series SHALL also show a labeled sample average. No summary SHALL imply unavailable historical coverage or newly derived energy consumption.

#### Scenario: The user switches from 24h to 1h
- **WHEN** the existing history covers the requested window
- **THEN** the chart and summaries use only that window without refetching Recorder
- **AND** any selection outside the window reconciles to an available reading with its actual timestamp

#### Scenario: A measurement has irregular reporting intervals
- **WHEN** its sample average is displayed
- **THEN** it is labeled as a sample average and calculated from actual samples
- **AND** it is not presented as a time-weighted average

#### Scenario: An energy counter resets
- **WHEN** existing energy-period history is displayed
- **THEN** the selected view preserves recorded values and resets; energy-period sheets derive interval consumption only from valid counter baselines, preserving gaps instead of treating raw cumulative readings as consumption bars
- **AND** a cumulative counter is not given a misleading measurement-average summary

#### Scenario: Only part of the requested period exists
- **WHEN** Recorder provides partial or no historical coverage
- **THEN** the chart shows only available data and an appropriate localized partial/empty indication
- **AND** no values are invented to complete the period

### Requirement: Faithful numeric chart presentation
Numeric charts SHALL use real time coordinates, preserve relevant extrema when reducing drawn data and derive summaries and selected readouts from full-resolution values. Known nonnumeric/unavailable intervals SHALL break the trace rather than become zero or be silently connected. An isolated reading SHALL remain an isolated reading. Formatting SHALL not change raw data or imply more precision than available.

#### Scenario: Dense history contains a brief high peak
- **WHEN** the rendered point count is reduced for mobile display
- **THEN** that peak remains represented and the full-resolution maximum remains correct

#### Scenario: A sensor becomes unavailable and recovers
- **WHEN** history includes that interval
- **THEN** the graph leaves a gap and point inspection selects actual available samples
- **AND** no zero or smoothed segment is fabricated across the unavailable interval

#### Scenario: A history response contains one reading
- **WHEN** it is rendered
- **THEN** a point and its real timestamp are shown without extending a flat line over unobserved time

### Requirement: Mobile detail readability
Details SHALL use Marao theme and scalable typography with sparse time labels and a persistent selected-reading area. Controls SHALL have visible 48px minimum dimensions and localized semantic names. At 320px, landscape and selected enlarged-text/zoom profiles, essential values and controls SHALL remain readable and contained. Climate-context values SHALL omit units visually and semantically.

#### Scenario: Text size increases in a narrow sheet
- **WHEN** controls and selected values no longer fit one row
- **THEN** they wrap or reflow without shrinking text, reducing targets or covering the plot's essential content

#### Scenario: Theme changes while detail is open
- **WHEN** light or dark mode changes
- **THEN** axes, trace, selection and surrounding text update coherently and retain readable contrast
- **AND** existing graph colors and line/fill preferences remain meaningful

### Requirement: Local on-demand chart lifecycle
Detailed chart code SHALL load from integration-owned assets only when numeric detail is opened. Repeated opens SHALL share the module load and reuse compatible history. Module/history failures SHALL have readable explicit retry without automatic loops. Unavailable sources SHALL remain neutral. Closing, source/route replacement or removal SHALL release chart resources and invalidate stale completions.

#### Scenario: Chart code fails to load
- **WHEN** a user opens numeric detail
- **THEN** a localized error and explicit Retry are displayed without breaking the summary or an unrelated card action
- **AND** no repeated automatic fetch loop starts

#### Scenario: Detail closes before an asynchronous load completes
- **WHEN** the load later resolves
- **THEN** it cannot recreate the closed chart or overwrite a newer source's detail
- **AND** chart listeners and observers do not accumulate across repeated opens

#### Scenario: A theme or precision option changes
- **WHEN** valid raw history is already loaded
- **THEN** its presentation updates without another history request solely for formatting
- **AND** the mounted chart and selected window remain stable where still applicable

### Requirement: Standard still-to-live behavior on the existing camera card
The existing `hc_camera_card` SHALL show its available HA still image while initializing native live video concurrently, then automatically replace the still with confirmed live playback in the same media area. This SHALL be standard behavior without a new card, template, mode or setting. A missing or failed still SHALL NOT block live startup. The handoff SHALL NOT require a click or remount the player.

#### Scenario: Live startup takes longer than the still image
- **WHEN** an available existing camera card has displayed its still image and native live playback is still loading
- **THEN** the still remains visible with loading feedback until live playback is confirmed
- **AND** live playback replaces it automatically without a blank intermediate state, layout jump, Play action or mode selection

#### Scenario: The still image is slow or cannot load
- **WHEN** the still image is missing, delayed or fails while native live playback initializes
- **THEN** live startup proceeds independently and the media area keeps its reserved geometry with loading feedback
- **AND** confirmed live playback appears automatically without waiting for the still image
- **AND** a late still-image completion cannot replace video that has already started

#### Scenario: A camera resumes after retry or a lifecycle restart
- **WHEN** explicit Retry or an eligible visibility/availability recovery starts a fresh live attempt for the current camera
- **THEN** the available current still is displayed while the native player initializes
- **AND** it switches automatically to confirmed live playback using the same standard behavior

### Requirement: Safari and UniFi Protect live compatibility
Live video SHALL use Home Assistant's native camera transport and authenticated camera entity. Compatible UniFi Protect streams SHALL work without provider-specific live URLs or credentials. Safari SHALL attempt muted inline autoplay; blocked autoplay SHALL expose an explicit playback action. Marao SHALL NOT enable, reconfigure or control the camera to obtain a feed.

#### Scenario: Safari can autoplay the configured Protect camera
- **WHEN** Safari displays a visible available UniFi Protect camera whose native Home Assistant stream and codec are supported
- **THEN** its still image automatically gives way to muted inline live video without a Play action, fullscreen transition or changes to Protect settings
- **AND** event-provider or recorded-media-source overrides do not replace the live source

#### Scenario: Safari blocks autoplay
- **WHEN** the native player reports that playback requires a user gesture
- **THEN** the card retains its available still and exposes an exceptional playback action of at least 48 by 48 CSS pixels with an internal accessible name
- **AND** activating it retries playback once without opening the event sheet or enabling audio automatically
- **AND** confirmed playback replaces the still automatically; no Play action is required during normal permitted autoplay

### Requirement: Explicit live playback and fallback states
Camera cards SHALL distinguish stream loading, confirmed playback, still-only fallback and reported playback failure from entity recording/activity state. A still fallback SHALL be labelled as a snapshot and SHALL NOT imply live playback. Unsupported or failed playback SHALL expose a readable localized reason and explicit recovery when retry is applicable, without an automatic retry loop.

#### Scenario: A camera exposes only a snapshot
- **WHEN** an available entity supplies a preview but its native camera path cannot provide continuous playback
- **THEN** a snapshot is explicitly identified as such and live playback is not claimed
- **AND** its existing event action remains usable

#### Scenario: Stream initialization or playback fails
- **WHEN** player loading cannot complete within its bounded initialization window or the native player reports a stream, permission or codec error
- **THEN** the shared card problem presentation shows the localized failure with an explicit Retry action where applicable
- **AND** any retained preview is labelled as a snapshot, no frozen frame is marked live, and unrelated state updates do not repeatedly retry

#### Scenario: Recording state changes while video is loading
- **WHEN** Home Assistant reports that a camera is recording but playback has not begun
- **THEN** the recording state remains authoritative without being used as evidence of successful live playback

### Requirement: Stable and bounded camera stream lifecycle
Each visible camera occurrence SHALL retain at most one active native player across ordinary entity, theme, locale and unrelated state updates. Hidden or removed visible occurrences SHALL release their own playback ownership; an explicitly enabled same-dashboard preload owner MAY retain its background session. Unavailable, disconnected or replaced cameras SHALL release affected resources and invalidate stale initialization.

#### Scenario: Updates arrive during live playback
- **WHEN** unrelated states or camera metadata, theme or locale change without changing the camera identity or availability
- **THEN** the existing player continues without duplicate stream requests or playback restart

#### Scenario: The card or page becomes hidden
- **WHEN** the card is outside the visible view, the page is hidden, a containing sheet closes, or navigation removes the camera
- **THEN** its visible playback ownership is released; only an eligible, explicitly enabled same-dashboard background-preload owner may retain a session, and a hidden document releases that owner too
- **AND** making the card visible again permits one current initialization

#### Scenario: Availability or configuration changes during initialization
- **WHEN** a camera becomes unknown, unavailable, disconnected or is replaced while its player is loading
- **THEN** obsolete work cannot attach media or overwrite the current card state
- **AND** unavailable/disconnected cards retain neutral presentation without stale media

#### Scenario: Multiple cards and an editing preview use the same entity
- **WHEN** two visible runtime cards and a read-only editing preview reference one camera
- **THEN** each runtime card owns at most one player and removing one does not stop the other
- **AND** the editing preview starts no stream or device action

#### Scenario: Native signaling ends while the provider still has queued events
- **WHEN** a native WebRTC offer is unsubscribed or its camera occurrence is hidden, removed or invalidated
- **THEN** its dedicated native authenticated connection closes immediately, ending the server session without retiring a subscription on the shared dashboard connection
- **AND** pending authentication cannot start an offer after disposal, unrelated cameras and HA subscriptions remain connected, and native warnings and unexpected errors remain failures
- **AND** Home Assistant retains native transport selection and authentication without a warning filter, grace delay or transport override

#### Scenario: Additional stable and bounded camera stream lifecycle contracts
- **WHEN** a camera occurrence changes visibility, availability or ownership
- **THEN** Editing previews SHALL remain inert.
- **AND** Restoring visibility or availability SHALL initialize only the current camera without a retry storm.

### Requirement: Preserved camera configuration and independent actions
Live playback SHALL preserve existing saved camera selections, labels, options, unknown fields, raw cards, custom actions, popup hashes, provider overrides, generated structure and archived history. It SHALL require no source rewrite. Playback and retry interactions SHALL be isolated from event activation; user-facing controls SHALL remain localized, visibly touch-sized and usable at the supported mobile text and zoom sizes.

#### Scenario: An existing camera configuration is rendered
- **WHEN** an existing supported saved or manually authored camera card is opened with the updated runtime
- **THEN** that same card gains the standard automatic still-to-live behavior when supported without a replacement card, opt-in setting or source/generated event configuration change
- **AND** explicit actions and the generated event sheet retain their configured behavior

#### Scenario: A playback action is used beside the event action
- **WHEN** the user activates playback or Retry within the camera surface
- **THEN** only that action executes once and the event popup does not open
- **AND** activating the separate event action still opens the configured popup once

### Requirement: Preserve video during brief buffering
After confirmed playback, brief buffering SHALL keep the current video frame visible with localized buffering feedback. It SHALL NOT replace that frame with the snapshot or claim a stalled frame is live. Observation SHALL recover when the media clock advances even if native events are sparse.

#### Scenario: A playing stream briefly buffers
- **WHEN** media temporarily stops advancing
- **THEN** the native player stays mounted and the snapshot stays hidden
- **AND** resumed progress restores live status without a new stream request

### Requirement: Optional camera background preload configuration
Each camera card SHALL expose a localized background-preload toggle in the builder and supported native editor. `variables.preload_stream` SHALL accept booleans only; missing SHALL mean disabled without inserting a saved default. Saving SHALL preserve unrelated fields, selections and explicit false values.

#### Scenario: Existing or new card has not enabled preloading
- **WHEN** a card lacks the option or sets it to false
- **THEN** its stream retains existing on-demand startup behavior
- **AND** simply opening another page does not start a background stream for that card

#### Scenario: The user enables one camera
- **WHEN** the user saves the enabled toggle on a camera card
- **THEN** that card's option persists and other cards' options remain unchanged
- **AND** nearby localized help explains background bandwidth and device-resource use

### Requirement: Preload from any page of the active dashboard
For opted-in cards, the dashboard SHALL start the configured Dashboard stream while any page of that dashboard is open in a visible browser document, without requiring the camera page to mount first. It SHALL preload video muted and SHALL NOT preload a distinct Popup stream, events, editor previews or other dashboards' cameras. Recovery navigation SHALL remain usable during initialization.

#### Scenario: The dashboard opens directly on a page without cameras
- **WHEN** another page of the same dashboard contains an opted-in camera
- **THEN** its Dashboard stream starts in the background once dashboard configuration and HA state are available
- **AND** unselected cameras and distinct popup streams stay on demand

### Requirement: Reuse warm camera playback during dashboard navigation
Navigating between pages of the same dashboard SHALL retain an opted-in stream and reuse its ready playback when its camera card appears. Preloading and displaying that occurrence SHALL NOT start redundant players. Equivalent background requests for the same dashboard camera entity SHALL be deduplicated; ordinary independently visible cards SHALL retain correct ownership.

#### Scenario: The user visits a preloaded camera page
- **WHEN** its Dashboard stream has already reached live playback
- **THEN** the card presents that live playback without a fresh camera-session startup
- **AND** returning to another dashboard page keeps the opted-in stream warm

#### Scenario: The stream has not become ready
- **WHEN** the camera card appears before preloading finishes or browser autoplay is blocked
- **THEN** normal localized loading or recovery feedback remains available
- **AND** the card does not claim a snapshot or stalled frame is live

### Requirement: Preloaded stream lifetime is dashboard scoped
Background streams SHALL release owned resources on dashboard exit, hidden browser document, HA disconnection, unavailable camera, removal of the last opted-in owner or configuration replacement. Returning to an eligible state SHALL permit current initialization without retry loops. Removing a visible card during same-dashboard navigation SHALL NOT release its still-enabled background ownership.

#### Scenario: The tab is hidden or the user leaves Marao
- **WHEN** the document becomes hidden or navigation leaves that dashboard
- **THEN** preloaded players, signaling, timers and subscriptions are released and late work cannot attach stale media
- **AND** re-entering a visible eligible dashboard can start only its current enabled streams

#### Scenario: The preload setting changes during startup
- **WHEN** the last enabled owner is disabled, removed or assigned a different camera
- **THEN** obsolete background work is invalidated and released
- **AND** an independently visible or popup-owned session is not stopped by that cleanup

### Requirement: Energy interval consumption bars
Energy period sheets SHALL show minimalist vertical bars of interval consumption
or cost: one per HA-local calendar day in a month, and one per elapsed hour in a
day. Exact interval values SHALL be readable outside the graphic. Current power,
month/today energy and cost summaries and existing period navigation SHALL remain.

#### Scenario: Scroll an energy period sheet
- **WHEN** the user scrolls through an energy or cost sheet
- **THEN** the active month/day label and both period arrows remain pinned below the popup title
- **AND** the pinned controls account for title wrapping and orientation changes
- **AND** opaque bottom spacing keeps scrolling content clear of the pinned controls
- **AND** the period controls remain stationary from the first scroll pixel without scrolling through an initial gap

#### Scenario: Inspect a daylight-saving day
- **WHEN** a day sheet opens for a local day containing 23 or 25 hours
- **THEN** the bars cover those actual hours without inventing or merging an hour
- **AND** a month sheet uses calendar-day boundaries in the same HA timezone

#### Scenario: Recorder has missing or reset counter data
- **WHEN** statistics or counter history contain unavailable intervals or missing baselines
- **THEN** unavailable consumption is distinguished from measured zero and partial totals retain the approximation marker
- **AND** energy sheets omit the incomplete-history and partial-recorded-period text labels
- **AND** resets use the new counter reading while signed total deltas remain signed
- **AND** a multi-bucket gap is not filled by fabricated uniform consumption

### Requirement: Configured energy contributors
An energy period card SHALL accept an optional ordered `sub_entities` list with
required energy `entity_id` and optional `name` and `cost_entity`. Its sheet SHALL
show contributor names, selected-period energy and available cost beneath the
chart. A circular comparison SHALL supplement readable numeric values and SHALL
NOT imply that overlapping or incomplete configured sensors exhaust the total.

#### Scenario: Responsive circular comparison and legend
- **WHEN** two columns fit under the existing card width and text-size capacity rule
- **THEN** the circular comparison and legend appear beside each other
- **WHEN** only one column fits
- **THEN** they stack vertically with readable wrapping values
- **AND** a breakdown without a circular comparison retains a full-width legend

#### Scenario: Select a previous month
- **WHEN** the user navigates to a previous month
- **THEN** the chart and every configured contributor use that same month
- **AND** current live sensor readings are not presented as historical totals

#### Scenario: Focus on a day and restore the monthly overview
- **WHEN** the user selects a day bar or uses the daily navigation arrows
- **THEN** the selected bar and the circular contributor breakdown use that same day
- **AND** the existing total row shows the selected date before its value without adding a readout row or pushing the chart down
- **AND** each contributor's energy and actual or estimated cost use the selected day's interval
- **WHEN** the user presses Full month on the left of the daily navigation row
- **THEN** the bar selection clears and the readout and contributor breakdown return to the whole month
- **AND** missing daily data stays missing instead of falling back to monthly totals

### Requirement: Explicit estimated energy costs
Dedicated cost sensors SHALL take precedence over estimates. Otherwise the card
MAY calculate cost from energy with an explicit nonnegative `cost_per_kwh` in HA
currency or the unambiguous applicable HA Energy grid-import tariff. Calculated
cost SHALL be visibly identified as estimated, including when current prices are
applied to historical usage. `calculate_cost` SHALL opt an energy source into a
cost display without changing its recorded data.

#### Scenario: More than one unmatched tariff exists
- **WHEN** no explicit override or uniquely matched grid tariff is available
- **THEN** cost remains visibly unavailable pending explicit configuration
- **AND** usable energy data remains visible without an arbitrarily chosen price

#### Scenario: A contributor has a dedicated cost sensor
- **WHEN** the sensor provides cost for the selected period
- **THEN** that cost is used instead of multiplying energy by the current tariff

### Requirement: Nearby energy periods load in the background
Month and day sheets SHALL share a bounded prefetch/cache implementation for the
nearest four navigable periods in each direction. Prefetch SHALL include chart
and contributor data without blocking the selected period or requesting future
periods. Summary cards SHALL NOT prefetch historical data.

#### Scenario: Navigate nearby months or days
- **WHEN** a selected period finishes loading successfully
- **THEN** the selected period renders and gets a paint opportunity before prefetch begins
- **AND** the four earlier and four later non-future months or days load in the background, nearest first
- **WHEN** the user selects a cached period
- **THEN** its chart and breakdown render immediately without an intermediate loading frame
- **AND** selecting an in-flight period shares that request instead of duplicating it
- **AND** the cache window follows navigation and discards periods outside that window

#### Scenario: Stale or failed background data
- **WHEN** a prefetched period failed to load and is later selected
- **THEN** the loader retries it and reports a persistent failure for that selected period
- **WHEN** sources, source availability or HA timezone change, or the card is removed
- **THEN** cached data is invalidated and old background responses cannot replace the selected data or schedule more work
- **WHEN** the user returns to the current period after its cached data is over one minute old
- **THEN** that period is refreshed

### Requirement: Filterable full-width camera event timeline
Camera event lists SHALL use one full-width column with a compact timestamp and event-type heading outside and above each preview. A localized All filter and filters for available event types SHALL remain reachable at the top of the events section while scrolling. Filters SHALL apply to the complete bounded metadata list before progressive display, preserve provider order, and expose their selected state.

#### Scenario: Filtering events beyond the first visible batch
- **WHEN** the user selects an event type represented only among older loaded metadata
- **THEN** matching events appear in the feed in provider order without requiring other types to be scrolled past
- **AND** each preview has its timestamp and type above it, outside the media

#### Scenario: Narrow phone filter bar
- **WHEN** available event types exceed the screen width
- **THEN** the bar scrolls horizontally with full-size touch controls and its selected filter remains usable

### Requirement: Progressive event previews with stable navigation
The event feed SHALL reveal older entries in small batches and load preview media only near the viewport, with reserved preview space. Existing configured limits SHALL remain the total maximum. Returning from detail SHALL restore filter and feed position. Pending work SHALL be bounded, deduplicated, and invalidated on replacement, refresh, disconnection or removal; failed previews SHALL remain readable without automatic retry loops.

#### Scenario: Opening a populated event feed
- **WHEN** the provider returns event metadata
- **THEN** the feed becomes usable without waiting for all preview URLs to resolve
- **AND** offscreen previews are deferred until approached and older entries are progressively revealed within the configured maximum

#### Scenario: Returning from an older filtered event
- **WHEN** the user opens an event after filtering and scrolling, then activates Back
- **THEN** the same filter, revealed entries and scroll position are restored

#### Scenario: Preview finishes after refresh or removal
- **WHEN** a deferred preview request finishes after its feed was replaced or disconnected
- **THEN** it cannot alter the current feed or start further requests

### Requirement: Calendar power history and device comparison
House Power SHALL open a detailed power chart directly. A sticky day/week/month selector and period arrows SHALL show the selected calendar interval in HA's time zone and prevent future navigation. ISO weeks SHALL begin Monday. The chart SHALL preserve recorded extrema, gaps and source units without invented readings. Configured power-device traces SHALL share the chart and expose their recorded value at the selected time.

#### Scenario: Opening and navigating power history
- **WHEN** House Power or its History action is activated
- **THEN** today's detailed chart opens with visible period selection and arrows
- **AND** changing to week or month shows that calendar interval with its label, without an intermediate summary card

#### Scenario: A recorded spike occurs between ordinary readings
- **WHEN** history contains a brief high reading
- **THEN** reducing plotted data preserves the recorded extremum, without smoothing it away
- **AND** invalid or unavailable intervals remain gaps rather than fabricated zeros

#### Scenario: Comparing devices reported in different power units
- **WHEN** the house reports kW and a configured device reports W
- **THEN** their historical values convert from their own recorded units to the chart unit
- **AND** selecting a time shows each device's last recorded state at or before that time, without substituting a later reading

#### Scenario: History is missing, failed or obsolete
- **WHEN** Recorder lacks data, a request fails, or the popup changes period/closes while a request is pending
- **THEN** missing history stays empty, failures have an explicit retry, and stale completions cannot overwrite the current interval or start more requests

#### Scenario: Loading neighboring periods without delaying opening
- **WHEN** the selected day, week or month has loaded and rendered successfully
- **THEN** after yielding for paint, up to four periods in each direction load sequentially in nearest-first order, excluding future periods
- **AND** navigation reuses cached or already pending results, keeping the selected period and its nearest neighbors bounded in memory
- **AND** background failures do not replace the selected chart or loop, and stale work stops after navigation, source changes or closing

#### Scenario: Time-unit options match the dashboard theme
- **WHEN** the time-unit menu is opened
- **THEN** Day/Week/Month options use Marao theme colors and full touch targets with a non-color selected cue
- **AND** updates preserve mounted controls/focus, keyboard selection works, and Escape closes only the menu

#### Scenario: Switching time units uses warmed first pages
- **WHEN** the first visible chart has loaded and rendered
- **THEN** the current page of every time unit warms sequentially in the background before the active unit's neighboring periods
- **AND** changing unit uses its cached or pending current page, then warms that unit's four nearest periods each way without requesting future periods
- **AND** current pages stay cached while navigating another unit, with existing freshness and stale-result guards retained

### Requirement: Netatmo camera feature parity
Marao SHALL support the Netatmo camera integration's available live/still/fullscreen path and recorded events through the existing generated camera popup. Explicit provider selection SHALL override registry/device detection. Provider-defined unavailable features, including doorbell live video, SHALL be documented rather than fabricated.

#### Scenario: Netatmo camera is opened
- **WHEN** a registered Netatmo camera opens its popup
- **THEN** its available native video and bounded newest-first event feed appear without credentials or third-party cards
- **AND** filters, event headings, lazy previews, Back and Refresh use the existing shared presentation

### Requirement: Permission-scoped event metadata
Netatmo metadata SHALL be read only for the selected registered camera after checking the requesting user's read permission. Responses SHALL contain normalized event time/types, optional-thumbnail presence and native media-source identifiers, without raw provider transport URLs or account/person IDs. Missing provider data SHALL yield a readable error.

#### Scenario: Camera permission is denied
- **WHEN** an authenticated user requests metadata for a camera they cannot read
- **THEN** no provider cache or camera state is returned

#### Scenario: Recording contains multiple detections
- **WHEN** Netatmo reports several event types in one recording
- **THEN** that recording appears under each relevant filter with its authoritative timestamp

### Requirement: Native Netatmo recording playback
Netatmo recordings SHALL resolve through HA media sources and play using HA's native HLS player with visible controls and inline playback, without autoplay. Missing optional thumbnails SHALL not prevent recording playback. Stale/disconnected work SHALL retain the existing event-card cancellation and cleanup behavior.

#### Scenario: Recording is selected
- **WHEN** a user opens a Netatmo event
- **THEN** the recording resolves on demand and exposes controlled HLS playback
- **AND** Back restores the event feed without a late response replacing it
