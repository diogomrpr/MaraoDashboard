# Spec Delta

## Purpose

Let administrators manage recurring device starts with optional automatic stopping, organize timers into selectable named groups, and rely on Home Assistant to execute schedules independently of the browser.

## ADDED Requirements

### Requirement: Native schedule card and explicit setup
Marao SHALL provide a native Schedules card with a stable collection reference, localized configuration and shared mobile styling. Collections SHALL register explicit dedicated supported targets. Card previews/configuration SHALL NOT create resources or actuate entities. Initial setup SHALL require an explicit administrator action outside preview. Timer groups SHALL organize schedules within a collection, independently of card occurrences.

#### Scenario: A watering group is configured
- **WHEN** an administrator saves a card bound to a new Garden collection and selected devices
- **THEN** its runtime setup offers an explicit action to create the managed resources
- **AND** merely saving, previewing, duplicating or loading the card sends no watering command

### Requirement: Authoritative schedule discovery
The card SHALL read recognized schedule automations, enabled states, timer-group definitions and active selection from HA for its collection. Stable managed identities and recognized metadata SHALL establish membership; names alone SHALL NOT establish ownership. Empty, loading, access-denied, failed, customized and usable results SHALL remain distinct. All cards/devices referencing the collection SHALL observe the same saved selection.

#### Scenario: Previously created schedules are listed
- **WHEN** an administrator opens a card on another device for an existing collection
- **THEN** saved timer groups, their selected active group, weekday/start/target entries, optional durations and enabled states appear from HA
- **AND** an unrelated similarly named automation is not adopted

#### Scenario: A schedule is renamed or removed in HA
- **WHEN** the card refreshes after that change
- **THEN** it shows the current saved name or removes the deleted entry without recreating it

### Requirement: Recurring schedule management
Administrators SHALL be able to create, edit, enable/disable and explicitly delete recurring schedules. Each SHALL have a name, timer-group assignment, at least one weekday, local start time and one or more supported targets. Duration SHALL be required only when automatic turn-off is selected, as an integer from 1 to 1440 minutes. Invalid or failed changes SHALL retain input and preserve existing resources.

#### Scenario: A recurring watering time is added
- **WHEN** Monday, Wednesday and Friday at 07:00 for 15 minutes is saved
- **THEN** one identifiable start automation is stored and read back as that schedule
- **AND** a retry after an uncertain response does not create another schedule ID

#### Scenario: A schedule conflicts or is invalid
- **WHEN** a selected duration is invalid, no weekday or target is selected, or the timer-group assignment is invalid
- **THEN** the form identifies the problem before writing
- **AND** existing schedules and unrelated configuration remain unchanged

### Requirement: Optional automatic turn-off
Timers SHALL offer Turn on only without a required duration or off schedule, and optional Turn off after a duration. Turn-on-only execution SHALL issue the supported explicit on/open action without arming a stop deadline. The UI SHALL state No automatic turn-off. Schedule edits, deletion, group changes and HA restart SHALL NOT invent an automatic off for that operation; manual or independent external actions remain possible.

#### Scenario: A turn-on timer is saved without turn-off
- **WHEN** the administrator saves weekdays and 07:00 with Turn on only and no duration
- **THEN** the timer is valid, reads back as turn-on-only and runs with the dashboard closed
- **AND** no stop timer, off automation, default duration or implicit restart-stop is scheduled for that activation

#### Scenario: Automatic turn-off is selected
- **WHEN** Turn off after 15 minutes is saved
- **THEN** the accepted timed operation gets a 15-minute elapsed stop deadline
- **AND** selecting Turn on only on a later edit changes future starts without removing a current timed operation's deadline

### Requirement: Single-device and multi-device timers
A timer SHALL support one or several explicit registered targets, deduplicated without area/domain discovery. Each target SHALL use its supported action and independent availability/ownership guard. Busy or unusable targets SHALL be skipped without extending existing runs; partial outcomes SHALL remain inspectable. Accepted timed targets SHALL each retain stopping. Multi-device execution SHALL NOT be represented as physically simultaneous or atomic.

#### Scenario: One timer controls several devices
- **WHEN** a Summer timer at 07:00 selects two switches and a supported valve
- **THEN** that one timer requests the corresponding explicit on/open action once for each eligible target
- **AND** its chosen automatic-stop policy applies to all accepted targets

#### Scenario: One target cannot start
- **WHEN** a multi-device timer fires while one target is unavailable and another is usable and inactive
- **THEN** the usable target can start and the skipped target remains identified without an automatic retry
- **AND** no target outside the timer's saved selection is operated

### Requirement: Named timer group management
Administrators SHALL be able to create, rename and explicitly delete named timer groups such as Summer and Winter within a collection, and assign each timer to one group. Stable group identities SHALL survive rename and retain targets, weekdays, optional durations and individual enabled states. Inactive groups SHALL remain editable and saved. Selecting a group to inspect or edit SHALL NOT activate it.

#### Scenario: Summer and Winter are configured
- **WHEN** the administrator creates Summer and Winter with different timers
- **THEN** both named groups and all of their settings remain available after reopening the card
- **AND** each group can include timers for one device or several devices

#### Scenario: A seasonal group is deleted
- **WHEN** an administrator confirms deletion of an active Summer group
- **THEN** future Summer starts are paused before its owned schedule resources are removed
- **AND** other groups, target state and any current timed stop deadlines are preserved

### Requirement: Active timer group selection
The card SHALL provide a top-level Active timer group selector with Paused. One group at most SHALL admit future starts per collection; switching SHALL apply to every timer in that group and all of their targets. HA SHALL enforce the authoritative selection with the dashboard closed, preserving individual timer enabled states. Switching SHALL NOT actuate targets, catch up starts or change existing stop deadlines; Paused SHALL block new starts only.

#### Scenario: Summer changes to Winter
- **WHEN** Winter becomes the authoritative active group
- **THEN** enabled Winter timers become eligible and Summer timers cannot admit new starts, without individually toggling each automation
- **AND** a Winter timer targeting several devices uses its complete configured target list

#### Scenario: A timed run crosses a group switch
- **WHEN** a Summer timed run is active and Winter or Paused is selected
- **THEN** the Summer run keeps its original stopping deadline and can still be stopped explicitly
- **AND** devices started by turn-on-only timers receive no new turn-off action

#### Scenario: An old start request is queued
- **WHEN** a request reaches admission after its group has been deactivated, including a switch away and back
- **THEN** the old request is refused rather than replayed under the new selection

#### Scenario: Selection is unavailable or a switch fails
- **WHEN** HA cannot establish the selected recognized group or acknowledge a requested switch
- **THEN** starts fail closed for an unusable selection and the card shows actual server selection/error rather than optimistic success
- **AND** a fresh group never becomes active merely because it was created or viewed

### Requirement: Timer-group conflict scope
Known same-target timed overlaps and duplicate starts SHALL be rejected within a timer group, including midnight/week boundaries. A turn-on-only start inside a timed interval SHALL count as a conflict, without inventing an end time for turn-on-only operation. Mutually exclusive timer groups SHALL be allowed to reuse weekly times/targets. Runtime guards SHALL still prevent extending a busy or owned target across group changes.

#### Scenario: Seasonal timers reuse the same time
- **WHEN** Summer and Winter both schedule the same device for Monday at 07:00
- **THEN** that cross-group reuse is valid because only one group can admit starts

#### Scenario: Same-group timed intervals overlap
- **WHEN** two timers in Summer overlap on one shared target even if their other targets differ
- **THEN** validation identifies the shared-target conflict before saving

#### Scenario: Turn-on-only operation precedes another timer
- **WHEN** a later timer becomes due and an earlier turn-on-only activation still leaves that target active
- **THEN** runtime skips that target without assuming a turn-off time or replacing its operation policy

### Requirement: Browser-independent timed execution
HA SHALL execute eligible starts and optional elapsed-duration stopping with the dashboard closed. Starts SHALL use HA's timezone, skip missed starts and use only the first occurrence during a DST fold. Timed runs SHALL support midnight crossing and elapsed duration. Start admission and group switches SHALL be serialized; acquisition SHALL refuse a second operation per active/owned target. Requests SHALL match approved group, target and stop-policy metadata.

#### Scenario: The dashboard is closed overnight
- **WHEN** a valid schedule starts before midnight and its duration ends afterward
- **THEN** HA starts and stops the dedicated target without a connected browser

#### Scenario: A clock change occurs
- **WHEN** a start time does not exist during a clock advance or repeats during a clock rollback
- **THEN** the nonexistent start is skipped and the repeated start is eligible only on its first occurrence
- **AND** an accepted run retains its actual elapsed duration

#### Scenario: Two starts arrive together
- **WHEN** two requests compete for the same target
- **THEN** only one run acquires it and the other is skipped without restarting or extending the active run

#### Scenario: An unapproved start request arrives
- **WHEN** a request has a revoked/unknown source ID or parameters outside the collection's persisted approved contract
- **THEN** HA refuses activation even with no dashboard connected
- **AND** a schedule/configuration mismatch remains impaired until explicitly reconciled

### Requirement: Independent stop ownership
A collection's stop/recovery controller SHALL remain available independently of start schedules and active timer-group selection. Editing, disabling, deleting or regrouping a timer SHALL affect future starts without removing any active timed stop path. Stop SHALL remain an explicit guarded action using authoritative target/operation state. Turn-on-only operations SHALL remain explicitly stoppable without requiring an automatic deadline.

#### Scenario: A running timed schedule is disabled or deleted
- **WHEN** an administrator disables or deletes a timed operation's start schedule
- **THEN** future starts cease and the current run retains its existing stop deadline
- **AND** no controller/helper needed for that stop is removed

#### Scenario: The administrator selects Stop
- **WHEN** the collection is usable and an active managed operation is stopped explicitly
- **THEN** one stop request is dispatched and the card waits for authoritative inactive state
- **AND** a reported failure remains visible without falsely clearing run ownership

### Requirement: Recovery without missed-event dependence
Restart recovery SHALL stop recognized timed operation when targets become usable, without replaying starts or automatically stopping recognized turn-on-only operation. Timed cancellation, pause, expiry and invalid timed state SHALL reconcile stopping. Reloads SHALL preserve valid deadlines. Stale events SHALL NOT stop newer operations. Ambiguous/lost operation state SHALL block new starts for explicit reconciliation rather than guess an off policy.

#### Scenario: The timer expires while HA is down
- **WHEN** HA starts with recognized timed-operation ownership and the dedicated target becomes usable
- **THEN** the controller requests its inactive state even if no timer-finished event was delivered
- **AND** no elapsed watering cycle is resumed or caught up

#### Scenario: A turn-on-only target remains on after restart
- **WHEN** HA restores a recognized turn-on-only operation and its target is active
- **THEN** no automatic inactive request or replacement deadline is generated
- **AND** explicit Stop remains available using current authoritative state

#### Scenario: Ownership cannot be recovered
- **WHEN** operation metadata is missing or inconsistent and the actual target is active
- **THEN** new starts are blocked and recovery requests an explicit administrator decision
- **AND** the controller does not silently treat it as timed or turn-on-only operation or claim physical shutoff

#### Scenario: Another automation is saved
- **WHEN** HA reloads automations while a target's timer is valid and active
- **THEN** the run retains its original deadline

#### Scenario: An old timer event is queued
- **WHEN** that event is handled after a newer run became active
- **THEN** the controller checks current run/timer state and does not stop the newer run because of the stale event

### Requirement: Customized automation preservation
Before changing an automation, Marao SHALL validate its identity, metadata version and generated structure. Renaming SHALL remain supported; unrecognized structural changes SHALL appear as customized/read-only with native editor access. Unsupported versions, unknown fields and unrelated records SHALL NOT be overwritten, silently repaired or adopted.

#### Scenario: Advanced conditions are added in HA
- **WHEN** the administrator adds custom trigger/action logic to a previously managed automation
- **THEN** the card identifies it as customized and offers native editing
- **AND** saving another schedule does not replace that custom logic

### Requirement: Administrator and availability boundaries
Management SHALL require HA administrator authorization and recognized UI-managed automation/helper capabilities. Non-administrators SHALL receive a localized management-access explanation without privileged configuration requests. Disconnection or unusable targets/helpers/controllers SHALL disable dependent actions and show neutral availability feedback; reported failures SHALL stay readable.

#### Scenario: A regular user opens the card
- **WHEN** that user lacks management permission
- **THEN** schedule-management controls are unavailable without attempting administrator configuration reads/writes
- **AND** no private automation configuration is copied into dashboard data to bypass the restriction

#### Scenario: The stop controller is unavailable or disabled
- **WHEN** a scheduled start becomes eligible
- **THEN** no new run is activated and the available card reports the group problem
- **AND** no replacement backend or unsafe shortened stop path is substituted

### Requirement: Recoverable resource mutations
Multi-resource operations SHALL stage resources without enabling starts prematurely, retain exact affected baselines/receipts and recheck recognized ownership before mutation or compensation. Stale/conflicting or partial results SHALL remain visible and recoverable. Native APIs SHALL NOT be represented as cross-resource transactions or cross-device conditional writes.

#### Scenario: Setup stops after creating a helper
- **WHEN** the client loses connection before the collection's provisioning is complete
- **THEN** no schedule starts, created resources remain identifiable and resumption reconciles actual saved records
- **AND** cleanup removes only proven unchanged resources created by that operation

#### Scenario: A competing editor changes the same resource
- **WHEN** the saved baseline differs before replacement or recovery
- **THEN** the operation stops for reconciliation without overwriting the competing change

### Requirement: Independent group and dashboard lifecycle
Native card duplication SHALL share the collection reference without creating resources. Removing a card SHALL NOT delete schedules. Collection/target-resource deletion SHALL require confirmation, idle/inactive state and owned-resource checks. Seasonal groups within a collection SHALL share registered targets, but separate collections SHALL NOT claim the same target silently. No operation SHALL modify unrelated automation/helper/dashboard configuration.

#### Scenario: The last card is removed
- **WHEN** its dashboard card is deleted
- **THEN** managed schedules and active timer-group selection continue to exist in HA and can be viewed by another card using that collection

#### Scenario: A collection is deleted
- **WHEN** all registered targets are authoritatively inactive, no managed operation is active and the administrator confirms deletion
- **THEN** only the recognized owned start automations, controller and helpers are removed
- **AND** external/customized dependencies or ambiguous ownership block destructive cleanup
