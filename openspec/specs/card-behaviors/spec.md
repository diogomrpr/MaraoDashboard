# Card behaviors

## Purpose

Preserve the complete existing Marao card family contracts and documented options,
including realistic page use and native capability-dependent controls.

## Requirements

### Requirement: Stable card families and presentation roles
The runtime SHALL preserve configured `hc_*` variants for base, header, title,
weather, glance, navigation, room, light, fan, cover, access/actions, security,
sensor, battery, switch, scene, number, Wallbox current, climate, media/app, vacuum,
dishwasher, washing machine, graph, toggle graph, timeline and energy-period
presentation. Variant-specific options SHALL use shared components and semantics.

#### Scenario: A documented existing template is loaded
- **WHEN** a generated or manually configured Marao card uses that template
- **THEN** its supported behavior remains available without requiring another Lovelace card

#### Scenario: A timeline or energy period card is generated
- **WHEN** a configured `hc_timeline_card` or energy-period metric is resolved
- **THEN** it uses `custom:marao-state-timeline-card` or `custom:marao-energy-period-card` respectively

### Requirement: Accurate multi-entity summaries and room controls
Summaries SHALL deduplicate and inspect every configured member, include active secondary entities, represent partial availability, remain usable while a member is usable, and preserve numeric readings. Rooms with configured lights SHALL expose one compact icon-only All off child action for the complete light list, stop propagation, and disable that child on disconnect or any missing/unknown/unavailable configured light.

#### Scenario: An unavailable primary summary entity has an active secondary
- **WHEN** the overview summary renders
- **THEN** the active secondary affects the reading and the usable group stays reachable

#### Scenario: All off is pressed in a room
- **WHEN** every configured fixture light is available
- **THEN** one `light.turn_off` call targets the list without triggering room navigation

#### Scenario: Availability changes before activation
- **WHEN** a configured light becomes unavailable or HA disconnects before the icon button is activated
- **THEN** the current target/connection guards prevent dispatch and the action is disabled

#### Scenario: The lights-off icon is activated
- **WHEN** the configured list is available and the user completes activation
- **THEN** its localized accessible name identifies the action and room, strong haptics accompany the press, and exactly one call uses the deduplicated list
- **AND** no visible All off text or full-width action surface is required

### Requirement: Light, fan, cover, sensor, switch and battery options
Entity cards SHALL show state/domain treatment and honor documented custom labels,
icons, colors, slider settings and graph settings. Sensors SHALL preserve configured
on/off icons and localized last-updated metadata; switches SHALL honor power entity
and power unit; batteries SHALL show threshold-aware state and configured presentation.
Unknown/unavailable cards SHALL remain neutral regardless of custom active colors.

#### Scenario: A switch has a configured power sensor and unit
- **WHEN** the card renders an available measurement
- **THEN** the configured unit and readable value appear alongside the switch's own state/control

### Requirement: Climate mode and target controls
Climate SHALL separate mode, measured temperature and numeric target, with unitless values and mode-aware colors. One supported mode SHALL turn on directly; multiple modes SHALL open a sheet with the normal climate card and localized large buttons in two columns. Graph/mode/setpoint options SHALL be honored. Requested targets/modes SHALL appear by the next frame, without waiting for acknowledgement, and remain pending until reconciled. Temperature/activity SHALL remain HA-reported.

#### Scenario: A multi-mode climate card is activated
- **WHEN** the entity exposes more than one supported mode
- **THEN** its generated mode sheet exposes the shared climate card and supported mode choices

#### Scenario: A temperature or mode change has delayed confirmation
- **WHEN** a usable thermostat receives an accepted target or supported HVAC mode request
- **THEN** the requested value or mode appears immediately with localized pending feedback
- **AND** measured temperature and actual heating/cooling activity are not fabricated

#### Scenario: A single-mode thermostat is turned on
- **WHEN** its available default direct action requests its supported mode
- **THEN** the requested mode has the same immediate feedback and reconciliation as a mode-sheet button

#### Scenario: A thermostat is turned off before its report arrives
- **WHEN** an available thermostat receives an explicit supported off-mode request
- **THEN** its requested mode, label and mode-selection treatment display off immediately with pending feedback
- **AND** reported temperature and actual equipment activity remain unchanged until Home Assistant updates them

#### Scenario: A thermostat switches between supported modes
- **WHEN** an available thermostat receives a request for another supported HVAC mode
- **THEN** its requested mode, label and mode-selection treatment update immediately with pending feedback
- **AND** the control does not wait for service acknowledgement or entity confirmation

### Requirement: Scene and current option counts
Scene cards SHALL derive all choices from `input_select`/`select` options, mark
the authoritative current option and dispatch one native select action per choice.
Overview scene entities SHALL instead dispatch `scene.turn_on`; configured toggle
entities SHALL use their explicit toggle behavior. Wallbox current SHALL retain
its shared numeric control and up to three configured shortcuts. Layouts SHALL
tolerate materially distinct option counts and wrapped labels.

#### Scenario: A selector has one or five options
- **WHEN** its scene card renders
- **THEN** actual options appear as usable semantic buttons without numbered hard-coded option variables

#### Scenario: An overview scene entity is activated
- **WHEN** the available configured `scene.*` button is pressed
- **THEN** one `scene.turn_on` action targets that scene rather than a select-option action

### Requirement: Access classification and open-only doors
Generated lock and door/garage/gate cover controls SHALL use access presentation
and explicit safety actions. Open-only doors SHALL expose the strict open slider
directly without an unused close popup. Ordinary blind position sliders SHALL
remain separate from strict access-open controls.

#### Scenario: A door exposes only native open capability
- **WHEN** its room card is generated
- **THEN** the strict slide dispatches `cover.open_cover` without offering unsupported closing controls

### Requirement: Media and Apple TV controls
Media SHALL show localized player state and optional readable background artwork,
with generated generic playback or Apple TV popups. Apple TV SHALL support configured
remote, optional volume remote and two-column app shortcuts. Icon-only controls
SHALL retain semantic names. Relative rewind/forward SHALL compute authoritative
position plus elapsed playback, then clamp to duration and send numeric data.
App cards SHALL use `hc_media_app_card` and select the configured source.
App shortcuts SHALL show full-card square app artwork without a visible title or
normal player-state line, retaining semantic app names and visible problem reasons.
Bundled brand artwork SHALL include MEO (also recognized as MEO Go); unknown apps
SHALL retain their configured icon. Saved source values and custom names remain unchanged.

#### Scenario: Rewind is requested near the start of playback
- **WHEN** the relative offset would be negative
- **THEN** exactly one seek uses a numeric target clamped to zero

### Requirement: Remote short and long commands
Supported remote buttons SHALL distinguish short activation from a completed
1.2-second hold. Short release SHALL dispatch one short command; full hold SHALL
dispatch one configured longer command; cancellation or pointer departure SHALL
dispatch neither. Availability SHALL be checked against the actual service target.

#### Scenario: A configured remote hold completes
- **WHEN** the full hold duration elapses on an available fixture remote
- **THEN** its longer command dispatches once and no short command follows on release

### Requirement: Vacuum capabilities and explicit segments
Vacuum SHALL show authoritative docked, cleaning, paused, returning and error
states, offer native start/pause/return only when supported, and honor up to three
configured segment actions. Unsupported native controls and unconfigured segment
buttons SHALL be omitted. The default SHALL use `vacuum.send_command` with
`command: app_segment_clean` and `params: [segment]` only with native command
support. Supported `on_action` service overrides SHALL be honored.

#### Scenario: A configured safe segment action is activated
- **WHEN** the fixture supports send-command and the action specifies a segment
- **THEN** exactly one `app_segment_clean` command is dispatched with that segment in `params`

#### Scenario: A segment action overrides the default service
- **WHEN** its `on_action` is a service other than `vacuum.send_command`
- **THEN** that service receives the entity target without segment command parameters

#### Scenario: No segment is configured
- **WHEN** a vacuum card renders
- **THEN** no implicit room/segment button or segment ID is invented

### Requirement: Appliances, weather and informational cards
Dishwasher SHALL retain operation, progress, remaining time, program, salt and
rinse-aid presentation; washing-machine SHALL retain running/idle states. Weather
SHALL retain localized condition and available forecast presentation. Header,
title and glance SHALL preserve their primary/secondary/multi-entity roles without
inventing actions for informational-only content.

#### Scenario: An appliance warning is configured and abnormal
- **WHEN** the card renders its actual fixture state
- **THEN** the warning remains readable alongside progress/state rather than relying on color alone

### Requirement: Header, glance and forecast detail
Headers SHALL retain localized date in HA's time zone plus optional person and
air-quality readings. Glance SHALL support one through three independently named
and icon-configured readings, preserving usable readings when another is unavailable.
Weather SHALL display available temperature/unit and up to five valid forecast
entries from entity attributes, with localized dates/conditions and `show_forecast`.
These cards SHALL NOT imply a new forecast subscription or polling service.

#### Scenario: A glance contains an unavailable secondary reading
- **WHEN** the card renders its configured readings
- **THEN** the unavailable reading is explicit and other readings remain visible

### Requirement: Room-wide lighting presentation
Room lighting SHALL derive from every configured light, not an unrelated or first entity. In normal available states, any on light SHALL select the active background; all off or no lights SHALL use the inactive surface. A separate normal on/off/All off row SHALL be omitted, while localized accessible lighting state and explicit abnormal/availability information remain. Problem presentation SHALL take precedence over normal highlighting without claiming unknown lights are off.

#### Scenario: Only a secondary light is on
- **WHEN** the first configured light is off and another available light is on
- **THEN** the room has the active background without a redundant visible lighting-status row

#### Scenario: Every configured light is off
- **WHEN** all light states are known and off
- **THEN** the room uses its inactive background and the semantic lighting summary reflects all lights off

#### Scenario: A room has no lights
- **WHEN** the configured light list is empty or absent
- **THEN** there is no lights-off action or fabricated lighting state, and an unrelated primary entity does not imply lights are on

#### Scenario: Some light states are unavailable
- **WHEN** one configured light is unknown, missing or unavailable while another is on
- **THEN** readable partial-availability information and neutral problem presentation take precedence, the semantic summary retains the known active light, and All off is disabled

### Requirement: Room navigation independent of lighting actions
The room navigation surface SHALL remain separate from its lights-off button. Navigation SHALL remain usable for empty rooms, unavailable lights and disconnected HA when its destination is configured. Decorative icons SHALL NOT intercept input or expose a second action. Lights-off activation SHALL never navigate, and navigation SHALL never dispatch a lighting command.

#### Scenario: An unavailable room light does not prevent navigation
- **WHEN** the user activates the room's navigation surface
- **THEN** the configured room opens without a service call, while its lights-off action remains disabled

#### Scenario: A cropped room icon is tapped
- **WHEN** the user taps its decorative area on a navigable card
- **THEN** the underlying room navigation behaves like the rest of the card without a separate icon control

#### Scenario: The lights-off button is pressed
- **WHEN** it is activated as a child control
- **THEN** propagation is stopped and the destination route does not change

### Requirement: Entity group summaries
Entity Groups SHALL summarize all deduplicated configured members independently
of popup filtering, using authoritative HA state. Lights, covers and thermostats
SHALL retain active counts and localized inactive labels. Batteries SHALL retain
a numeric percentage and indicate low-battery and unavailable counts. Groups
SHALL remain usable with any usable member; fully unknown/unavailable groups
SHALL be disabled neutral, with readable status rather than color alone.

#### Scenario: An unavailable primary member has an active secondary
- **WHEN** a light, cover or thermostat group renders
- **THEN** the secondary contributes to the count, partial availability is readable and the popup remains reachable

#### Scenario: Numeric battery readings and secondary warnings coexist
- **WHEN** the first configured usable battery reads 75% and a secondary reads 10%
- **THEN** the summary retains the 75% reading and indicates one low battery
- **AND** reversing popup filtering does not change the summary or hide the secondary warning

#### Scenario: Every member is unknown, unavailable or missing
- **WHEN** the group renders with loaded HA state
- **THEN** the group is neutral and disabled with localized unknown/unavailable status and member actions cannot dispatch

#### Scenario: State has not loaded or connection is lost
- **WHEN** HA state is loading or the connection is disconnected
- **THEN** loading is distinguished from inactive state, physical actions are disabled and the native connection warning remains authoritative

### Requirement: Entity group live popup filtering
All entities mode SHALL list every deduplicated member in configured order,
including disabled unknown/unavailable entries. Active only SHALL list only
known active members using type-specific state rules. Filtering SHALL update
from HA state while the sheet is open, preserve unchanged child controls and
handle focus safely when a member disappears. Empty results SHALL show a
localized explanation without altering saved membership.

#### Scenario: A lighting group lists active members
- **WHEN** lights are on, off and unavailable and the filter is Active only
- **THEN** only on lights appear and the summary still reports the unavailable count
- **AND** switching to All entities reveals off lights and disabled unavailable entries

#### Scenario: Covers and thermostats use domain-aware activity
- **WHEN** Active only is configured
- **THEN** open/opening covers appear while closed/closing covers do not, matching the established summary treatment
- **AND** thermostats with an enabled HVAC mode appear even if their HVAC action is idle, while off/unknown/unavailable thermostats do not

#### Scenario: Battery groups filter maintenance attention
- **WHEN** Active only is configured for battery sensors
- **THEN** valid numeric percentages below 20 appear while readings of 20 or higher do not
- **AND** missing, unknown, unavailable and invalid readings are excluded from active rows and identified through summary availability status

#### Scenario: The last active member becomes inactive
- **WHEN** its authoritative HA state changes while the popup is open
- **THEN** the member disappears and the sheet shows a localized No active entities result with its title and close control intact
- **AND** focus stays inside the sheet, unrelated controls retain their state, and no action is dispatched by filtering

#### Scenario: A member's state updates during a slider gesture
- **WHEN** the member remains eligible for the open popup
- **THEN** its native control remains mounted through the gesture and completed input dispatches once
- **AND** becoming ineligible or unavailable cancels the gesture safely without a late action

#### Scenario: A deliberately empty group opens
- **WHEN** a group with an explicit empty member list is activated
- **THEN** the existing popup shows a localized No entities configured result and no discovered or fabricated member appears

### Requirement: Entity group member control parity
Entity Group popups SHALL reuse Marao's shared sheet and compatible member
controls, preserving configured names, icons, options and relevant room context.
Lights SHALL retain supported brightness controls, blinds position controls,
batteries numeric thresholds, and thermostats unitless targets and mode options.
Access covers SHALL retain strict opening and safe closing semantics. Group
activation SHALL open its popup without toggling or actuating members.

#### Scenario: Configured controls are shown in a group
- **WHEN** members include a dimmable light, an on/off-only light, an ordinary blind, battery sensors or single/dual-target thermostats in separate typed groups
- **THEN** each group shows the existing applicable capabilities and configured options rather than simplified replacement controls

#### Scenario: A cover group includes an access cover
- **WHEN** a garage door, gate or door is shown
- **THEN** opening uses the existing strict slide control and cancellation rules, closing uses the safe explicit action, and open-only capability omits unsupported closing
- **AND** an ordinary position slider cannot bypass access safeguards

#### Scenario: A thermostat group opens alongside a mode sheet
- **WHEN** the group popup is activated
- **THEN** its configured title remains visible and existing mode-selection behavior remains available without popup-hash collisions

#### Scenario: The group sheet closes after state updates
- **WHEN** the sheet is closed
- **THEN** it restores focus to the current opener, releases background inertness and retains the established internal scrolling, navbar clearance and safe-area behavior

### Requirement: Consistent climate request display
Thermostat cards for the same entity SHALL share the latest requested settings
while pending, including cards opened in a mode sheet. Unrelated updates and
closure of one duplicate card SHALL NOT erase requests in a remaining card.
Reloading the dashboard SHALL start from current reported state.

#### Scenario: A mode sheet opens during a pending change
- **WHEN** another card for the same thermostat is rendered before confirmation
- **THEN** it displays the same pending target and requested mode

#### Scenario: An unrelated entity updates or one duplicate card closes
- **WHEN** a climate request remains outstanding in a displayed thermostat card
- **THEN** that request remains visible and the remaining controls stay usable

### Requirement: Bounded climate request reconciliation
Pending climate settings SHALL clear on matching reported values, current-request
rejection, disconnect, target loss/unavailability, or 30 seconds without
confirmation after the latest interaction for that setting. Failure SHALL restore
reported values and show a localized readable error. Older responses SHALL NOT
erase newer requests. Requests SHALL NOT retry silently.

#### Scenario: Home Assistant confirms the requested settings
- **WHEN** it reports the latest requested mode or temperature target
- **THEN** pending feedback for that setting clears and reported state supplies its display
- **AND** unrelated pending settings are not cleared prematurely

#### Scenario: A service succeeds but its state report is delayed
- **WHEN** the service response arrives before the requested target or mode is reported
- **THEN** pending feedback remains rather than claiming the equipment has reached the requested state

#### Scenario: A current request is rejected
- **WHEN** Home Assistant reports a service error for the latest request
- **THEN** that request is removed, reported settings are restored and one readable error is shown

#### Scenario: An earlier request settles after a newer one
- **WHEN** an older service response or intermediate state report arrives
- **THEN** it cannot clear or roll back a newer pending request
- **AND** a reported service error still uses the existing readable error path

#### Scenario: A target disconnects or becomes missing, unknown or unavailable
- **WHEN** a pending thermostat is no longer usable
- **THEN** its previews clear, the unavailable/connection treatment is authoritative and further actions are blocked

#### Scenario: Confirmation never arrives or reports a different setting
- **WHEN** 30 seconds elapse since the latest interaction for the setting without a matching report
- **THEN** its preview clears, the latest reported value appears and a readable not-confirmed message is shown
- **AND** no retry or claim of device disconnection is invented

### Requirement: Compatible energy display units
Numeric power and energy readings SHALL allow source units or supported compatible target units per card. Selecting a target SHALL convert the value using its actual source unit before presentation; power and energy SHALL NOT be interconverted. Monetary readings SHALL retain their source currency. Formatting SHALL NOT change HA state, entity units, recorded values or action payloads.

#### Scenario: Watts are displayed as kilowatts
- **WHEN** an energy graph reads `1500 W` and the chosen unit is `kW`
- **THEN** its displayed numeric value is `1.5` with the `kW` unit rather than `1500 kW`

#### Scenario: Two cards use the same entity
- **WHEN** one selects `Wh` and the other `kWh` for an entity reporting `2500 Wh`
- **THEN** each retains its own equivalent display of `2500 Wh` and `2.5 kWh`
- **AND** the entity state remains `2500` in `Wh`

#### Scenario: Cost precision is configured
- **WHEN** a cost sensor reports `12.345 EUR` with two decimal places selected
- **THEN** it displays the rounded value in the same currency without implying an exchange rate

### Requirement: Energy decimal precision
Energy-related numeric readings SHALL support automatic precision or an integer from zero through six decimal places. Explicit precision SHALL use exactly that many localized decimal places, after conversion, without changing numeric data or rounding twice. Zero and negative readings SHALL remain valid; rounded negative zero SHALL display as zero. Unknown, unavailable, loading and nonnumeric values SHALL NOT become numeric zero.

#### Scenario: A converted reading uses fixed precision
- **WHEN** `1500 W` is displayed in `kW` with precision two
- **THEN** it displays `1.50 kW` in English and `1,50 kW` in Portuguese

#### Scenario: A signed reading rounds to zero
- **WHEN** an exported-power reading of `-0.0004 kW` uses three decimal places
- **THEN** its formatted value is zero without a minus sign and the underlying signed value is preserved

#### Scenario: A source is unavailable or nonnumeric
- **WHEN** formatting is configured and its state is unavailable, unknown or invalid numeric text
- **THEN** its readable nonnumeric state remains visible and no `0`, `NaN` or misleading unit-converted value is fabricated

### Requirement: Opt-in energy formatting compatibility
With no new formatting options, existing displays SHALL remain unchanged, including legacy switch `power_unit` label behavior. New unit/precision options SHALL override only their configured reading, independently of primary toggle state and controls. Missing, changed or incompatible source units SHALL NOT be guessed or mislabeled; explicit conversion failure SHALL show a readable error and retain the original source reading.

#### Scenario: An older dashboard has only a power unit label
- **WHEN** it loads without new formatting options
- **THEN** its existing label and number are retained without an implicit conversion or saved-JSON rewrite

#### Scenario: A switch configures its power reading
- **WHEN** its secondary power sensor uses the new unit and precision options
- **THEN** only that reading changes presentation and its switch action, service target and availability guards remain unchanged

#### Scenario: A source unit changes incompatibly
- **WHEN** a card configured for `kWh` receives a source measured in `W`
- **THEN** it reports the incompatible display configuration and shows the original source value/unit instead of relabeling power as energy

### Requirement: Concise normal binary-state presentation
Semantically binary cards SHALL omit redundant normal-state text and use distinct
backgrounds, configured or native icons and localized accessible state, without an additional round on/off badge. Normal room
lighting alone SHALL use background and accessible state without a visible
count/status or marker under the approved exception. Classification SHALL follow
domain meaning. Loading, transitions, problems, actions, useful readings, other
counts, metadata and substantive custom labels SHALL remain visible.

#### Scenario: A light changes between off and on
- **WHEN** Home Assistant reports either normal light state
- **THEN** the card omits the redundant localized on/off line and distinguishes the state through its background and icon or shape
- **AND** its accessible state, title, available brightness control and confirmed value remain correct

#### Scenario: Another binary entity is displayed through a different card family
- **WHEN** a fan, switch, input boolean, ordinary binary sensor, two-state appliance or binary base/navigation presentation reports a normal state
- **THEN** the same concise presentation applies without a repeated normal-state label
- **AND** configured on/off icons, percentage/power readings and last-updated metadata retain their meaning

#### Scenario: A configured icon is static or hidden
- **WHEN** a binary card other than normal room lighting uses the same configured icon in both states or hides its icon
- **THEN** no extra round on/off badge is rendered and localized accessible state remains available
- **AND** the card does not add a redundant visible on/off sentence

#### Scenario: A binary access entity has a stable state
- **WHEN** a lock reports locked or unlocked
- **THEN** the stable state uses the concise binary presentation with an unambiguous lock-state cue
- **AND** explicit Lock and Unlock action labels, strict opening/unlocking slides and their cancellation behavior remain intact

#### Scenario: A card contains values or more than two semantic states
- **WHEN** a cover reports position or motion, a climate/media/vacuum/security/weather card reports an operational state, or a selector offers two named options
- **THEN** meaningful position, transition, mode, operation, condition or option text remains visible
- **AND** classification is not inferred from having observed only two values or options

#### Scenario: A summary contains useful counts or a partial problem
- **WHEN** a room or navigation summary has active-member counts, numeric readings or unavailable members
- **THEN** those readings, non-lighting counts and partial-problem details remain visible
- **AND** normal room lighting counts/status remain accessible without an automatic visible row or binary marker
- **AND** only a redundant normal binary line such as All off is omitted

#### Scenario: A configured label accompanies the normal state
- **WHEN** a binary card contains substantive custom text or a state-label prefix
- **THEN** substantive custom text remains visible without restoring the redundant state line
- **AND** an empty or dangling prefix is not displayed on its own

#### Scenario: History depicts binary intervals
- **WHEN** a timeline or graph shows past on/off intervals
- **THEN** the history labels and interval meaning remain available
- **AND** omitting a redundant current-state line does not remove temporal information

#### Scenario: Normal room lighting uses its approved background exception
- **WHEN** every configured light is available and the room reports a normal lighting state
- **THEN** any on light selects the active background and all off or no lights selects the inactive background, without an automatic lighting-status/count row or binary marker
- **AND** localized accessible lighting state, useful non-lighting readings and explicit action labels remain
- **AND** availability and reported problems still receive visible non-color reasons and take priority over normal lighting
