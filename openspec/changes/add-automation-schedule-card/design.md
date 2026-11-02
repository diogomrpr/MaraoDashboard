# Design

## Context

See [proposal.md](proposal.md) for revised scope. At revision baseline v0.24.4, commit `cf4662333dd6223c761e698f4131a197d67e19a7`, the native-editor prerequisite is complete and the schedule feature remains unimplemented. Extend `frontend_src/native-cards.js`, `native-card-editor.js`, the shared catalog/composition/runtime and hashed packaging; do not restore the former builder or Python scheduler/generator. Existing native editor code supplies member selectors, forms and lossless configuration patterns, but no scheduling owner.

The original plan recorded HA's [automation client](https://raw.githubusercontent.com/home-assistant/frontend/20260930.2/src/data/automation.ts), [configuration endpoint](https://raw.githubusercontent.com/home-assistant/core/2026.10.0/homeassistant/components/config/automation.py), [admin configuration view](https://raw.githubusercontent.com/home-assistant/core/2026.10.0/homeassistant/components/config/view.py), [timer implementation](https://raw.githubusercontent.com/home-assistant/core/2026.10.0/homeassistant/components/timer/__init__.py) and [helper collection APIs](https://raw.githubusercontent.com/home-assistant/core/2026.10.0/homeassistant/helpers/collection.py) as interface evidence. These pinned references are not proof against the implementation-time HA version; native CRUD/readiness remains a preflight requirement.

HA's [input select documentation](https://www.home-assistant.io/integrations/input_select/) describes shared selection state and restoration without a fixed initial override. Its [timer documentation](https://www.home-assistant.io/integrations/timer/) explains that expiry during downtime does not deliver the normal finished event at startup. Both behaviors were checked for this planning revision. A server-held active group and an explicit distinction between timed and turn-on-only operation are therefore necessary; a browser selector or blanket startup-off rule would not meet the revised requirements.

## Goals / Non-Goals

**Goals:** one or several explicit targets per timer; named seasonal groups with a single active choice; optional automatic turn-off; execution independent of a browser; existing ownership, permissions and recoverable resource operations preserved.

**Non-Goals:** general automation authoring, arbitrary services, security/access targets, sequenced multi-zone orchestration, weather-based irrigation, one-off dates, manual Start now, non-admin management, new backend or physical all-or-nothing multi-device operation. The initial supported adapters remain switch, valve and safe input_boolean examples.

## Decisions

### 1. Separate collection ownership, timer groups and timer targets

A card stores schema version 1, a stable collection reference and presentation options. Retain the proposed `group_id` key as that collection reference to avoid confusing it with seasonal selection. A collection owns explicitly registered dedicated targets and execution resources; it contains named `timer_group_id` definitions such as Summer and Winter. Each timer belongs to exactly one timer group and selects one or more of the collection's targets. A timer group can contain many timers; a timer can control one device or several. The group's activation applies to all timers and every target on those timers.

Stable IDs, not editable labels, establish ownership and assignments. The collection manifest records ordered timer-group identities/names and actual target/helper identities. A separate collection cannot silently claim the same target; Summer and Winter inside one collection intentionally share target resources. Adding or retargeting registered devices is an explicit idle-only resource-management operation. Do not infer membership from HA areas, floors, entity names or device discovery.

The native card editor selects an existing collection or prepares a local new collection/target draft. Runtime **Set up schedules** explicitly provisions resources. Native Save/Cancel, preview, loading and duplication never provision resources or actuate devices. Duplicate cards share the collection, group definitions and active selection. Target adapters are `switch.turn_on/turn_off`, `valve.open_valve/close_valve` and `input_boolean.turn_on/turn_off`. Require supported capabilities and dedicated-target acknowledgement; exclude security/access families and known access-opener bindings.

### 2. Make automatic turn-off an explicit optional policy

Store `stop_mode: none` for Turn on only, without `duration_minutes`, and `stop_mode: after_duration` with integer minutes 1–1440 for timed operation. A new timer can be saved without selecting any turn-off; show **No automatic turn-off**. No zero-duration sentinel, hidden default, paired off automation or indefinite running countdown is used. Switching the form back to Turn on only removes the inactive duration setting deliberately; unrelated unknown metadata remains preserved.

One timer's stop policy applies to every target it accepts. Turn-on-only dispatch records that policy and sends an explicit on/open action, without arming a timer. It stays on until manual/independent external action or explicit Stop; neither a seasonal switch nor startup creates a delayed off. Editing a timer's policy affects future occurrences, not previously acquired operations.

Weekdays/start times use HA's timezone. Check conflicts within each timer group per shared target: reject duplicate starts and intersecting timed intervals across midnight/week boundaries, including an on-only start inside a timed interval. Groups are mutually exclusive, so equivalent Summer/Winter slots are valid. Do not invent an indefinite reservation/end time to calculate on-only overlaps; later starts are skipped at runtime if the device remains active. Explain that a turn-on-only activation may leave a later timed start ineligible until the device is turned off.

### 3. Keep automations authoritative and one active selection in HA

Each timer remains one stable start automation containing literal recognized metadata: manager/version/role, collection/group/timer IDs, explicit target IDs, stop mode and optional duration, plus weekday/time parameters. Its actual alias, triggers, conditions, actions and native enabled state are read and validated. The ready controller manifest records group definitions and target resources; the card does not mirror a second schedule database in dashboard JSON.

Use one restored native `input_select` for the active timer-group ID, with an explicit Paused sentinel and stable IDs as options; card labels resolve to the stored names. Omit a permanent `initial` so restarts restore the selection. New collections begin Paused. An absent, unknown or unrecognized selection fails closed rather than selecting the first seasonal group. Group creation never activates it implicitly; rename does not change its helper value or timer IDs.

A group switch is one explicit selection request processed by the collection's queued controller, followed by reading HA's actual selected state. No per-timer enable/disable fan-out, automation configuration rewrite or global reload is needed for ordinary switching. Effective schedule eligibility is native enabled AND selected group matches AND controller/resources are ready. Individual native enabled states remain unchanged. Selection persists across cards/devices and works with no browser. Browsing or editing an inactive group does not select it for execution.

Controller discovery deduplicates reads per connection/collection, refreshes on relevant configuration/state changes and explicit Retry, and avoids per-state-tick config fetches/unbounded polling. Validate identity, role, metadata version and structure, not aliases/prefixes alone. Customized/newer resources remain read-only with native editor links; compatible narrow patches preserve unknown fields. Metadata is ownership evidence, not a cryptographic authorization boundary; native HA authentication/service permissions remain authoritative.

### 4. Serialize selection, admission and per-device recovery

Use one queued collection controller with short service sequences for group selection, schedule admission and stop/recovery events; no duration-long delay or browser execution. Each registered target has a restored timer and a restored native operation-mode helper (`idle`, `timed`, `on_only`). This replaces the earlier draft's single target/Boolean ownership design. Persist actual helper storage/registry identities; never derive them from display names. Recognized on-only operation must remain distinguishable from timed ownership through restart.

The controller stores a derived approved-request contract for source automation/group/timer IDs, explicit targets, weekdays/time and stop policy. Validate those values, current native enabled state, request age and current selection at execution time inside the queue. HA runtime cannot inspect another automation's arbitrary config metadata, so this persisted contract is needed without an open dashboard. Discovery compares it to actual start configurations; divergence blocks affected starts until reconciled. A request cannot supply arbitrary services/devices.

Selection changes and admissions have a defined order in the same queue. Bind start requests to the current selection epoch (for example the helper's current last-changed boundary), so a queued event from a prior Summer selection cannot run after Summer→Winter→Summer. Requests before a switch that were already admitted keep their accepted target set and stop policy; requests admitted afterward must match the new selection. Unknown selection or request-contract state blocks new starts, without disabling existing stopping.

For every target in an admitted occurrence, deduplicate and recheck supported action, availability and inactive/unowned state. Skip unusable/busy targets independently, reporting partial results; never queue a later activation, extend an existing timer or silently discover replacements. Multi-device actions need not be simultaneous and cannot be atomic across native services. One failure is not permission to resend successful targets. For timed targets record `timed` and arm that target's elapsed timer before activation; if either helper step fails, do not activate that target. For on-only targets record `on_only` before activation and do not start an automatic stop timer. Keep reported errors and partial outcomes in the controller/native trace and card; service acceptance does not prove physical activation.

The same controller handles expiry/cancel/pause/invalid timed state, explicit Stop, target/helper recovery, HA startup and automation reload. Clear operation ownership only on an authoritative inactive report, preserving requested operation through delayed initial reporting. Timed stop/cleanup checks current mode/timer identity so a stale timer event never stops a newer valid timed or on-only operation. On-only mode ignores unrelated/stale timer events; explicit Stop still uses the appropriate supported off/close action. Do not repeatedly dispatch identical commands on every state tick.

Schedule enablement, deletion, reassignment, group deletion and switching affect future starts only. Timed deadlines are per-target accepted-run state and never depend on the current active group or continued existence of the originating timer. If an old Summer operation occupies a device, a Winter timer skips that device until it is available/idle; it does not inherit or extend the old run.

### 5. Distinguish clock, restart and reload policies

Weekly triggers use HA local time; nonexistent DST start times are skipped and a server-side first-fold condition prevents duplicate repeated starts. Timed duration is elapsed time through the native timer. There is no missed-start or group-activation catch-up, including when a card is reopened.

Startup ends recognized timed operations when their targets become usable, even when a finished event was missed; do not resume the interrupted cycle. Recognized on-only operation is left unchanged, with no synthetic stop deadline. Idle state with an externally active target or lost/ambiguous operation metadata must not cause a blanket turn-off: show an impaired state, block further starts for that target and require explicit administrator reconciliation. The prior draft's unconditional startup-off policy is superseded because it contradicts turn-on-only semantics. Native restored state is not a cross-helper durable transaction and no physical-stop guarantee exists during HA/device outages.

Global automation reloads reconcile current mode/timer without aborting valid active timed runs or turning off on-only targets. Disabled/customized/missing controllers block new starts; never overwrite or reenable external customizations automatically. Active selection restoration is verified independently of any timer/operation helper restoration.

### 6. Provide simple native management and honest state

At the top of the card show **Active timer group: Summer / Winter / Paused**, using a localized shared dropdown with visible 48px targets, strong haptics and authoritative selection feedback. One selection changes the entire group, including multi-device timers, without immediate device actions. Provide **Manage groups** to create/rename/delete and inspect/edit inactive groups independently of activation. Show each timer's name, devices, weekdays/start, Turn on only or duration, enabled control and Edit/Delete actions; show an inactive-group cue separately from individual enablement.

Expose current per-target operation and remaining time only for timed runs, **No automatic turn-off** for on-only operation, and guarded explicit Stop. Local ticking merely formats HA deadlines. Existing focus/modal/scroll/typography/theme rules apply; localize EN/PT labels and preserve readable loading/empty/denied/customized/impaired/partial/error states. Do not fabricate physical success from a service acknowledgement or optimistic selector value.

Initial group/schedule management and selection are admin-only; non-admin cards show a localized explanation without privileged config reads/writes. Never copy private automation configuration into publicly readable dashboard JSON to avoid this boundary. Mutations are single-flight, disconnected/edit/preview guarded, and retain failed form input. A failed/uncertain group switch reads current helper state and shows the actual result; another device's accepted selection is reflected without claiming cross-device compare-and-swap. Destructive deletion names the group/collection and describes what remains running; creating/browsing a group does not activate it.

### 7. Stage resources and preserve configurations

Use native automation configuration and timer/input-select helper CRUD after preflight; no raw storage/filesystem writes or new integration. Support UI-managed automation storage only. Native config APIs can reserialize shared automation YAML, so preserve unrelated definitions semantically and require a private native HA/affected-state backup before first setup; API response snapshots cannot preserve file comment/byte formatting.

Generate stable IDs once and retain operation exports with exact affected baselines, missing-record expectations and returned helper IDs. Provision a disabled collection controller manifest, selection helper (Paused), then per-target mode/timer helpers. Read back actual identities/configuration and readiness. No starts become eligible before resources are complete, target bindings are acknowledged and dependent targets are safe. Never leave a permanent false initial-enabled override in an automation intended to restore enabled state.

Create timer groups inactive in controller metadata and selection options, rechecking baselines before writes. Rename changes labels only. Group deletion first selects Paused if that group is active, then revokes/removes its future-start contracts and schedules while preserving per-target stopping resources. A partial deletion cannot leave that group admitting starts. Deleting a collection or removing a target is more restrictive: require every affected target inactive/idle, proven ownership and no unresolved custom/external dependencies. Deleting a card invokes none of these operations.

Timer create: save disabled start, publish/read back its approved contract, then enable if requested. Edit/reassign/stop-policy change: disable and revoke first, save the changed start, publish/read back the updated contract, then restore requested enabled state. Delete: revoke first, remove the start only. Partial operations stay disabled/revoked and reconcilable. Reload during contract edits preserves independent timed deadlines. Ordinary group selection uses only the runtime selection path, not this multi-write configuration sequence.

Fresh-read/compare before mutations and compensating cleanup, stopping on concurrent or unknown changes. Reconcile actual resources after uncertain responses instead of creating duplicate IDs. If helper creation succeeds without a saved receipt, do not delete based on name; retain candidates for explicit reconciliation. Native APIs do not provide cross-resource transactions. Rollback/export retains affected group definitions, active selection, automation records and target/helper state; package downgrades never delete resources automatically. Explicit resource rollback stops operations safely and restores matching package plus affected data, preserving unrelated changes and reporting failed recovery.

### 8. Integrate and verify the current shared path

Extend the native catalog, registration/editor, shared runtime, EN/PT labels and `build-native.cjs`/HACS graph. Keep model/API/templates in focused frontend modules; no Python backend, dashboard-format migration or separate general-purpose scheduler. Card/managed-resource metadata is still a new proposed version 1, so these draft revisions have no deployed-version migration. Reject unknown/newer versions and do not adopt unrelated automations. If any actual existing managed resources are discovered at implementation, stop for provenance/version assessment rather than relabeling them as this draft.

Add the smallest meaningful assertions in the existing Node/native-card harnesses for optional duration, per-target outcomes, authoritative group selection, group-local conflicts, closed-browser template admission, switch epoch ordering, stop preservation, mode-specific recovery and staged compensation. Keep independently specified expected automation/helper contracts. Because this feature introduces persisted resources and automatic actions, one focused disposable API/execution/recovery check uses two safe input_boolean targets: on-only remains on until explicit Stop, timed stopping survives group switching/deletion, Summer/Winter reuse the same time, a switch affects both target bindings, another card sees the selection, and uncertain-write recovery preserves unrelated definitions. Simulate controller startup recovery only in the owned fixture; never emit a global startup event that could actuate unrelated devices.

Update card/setup documentation with one-device and multi-device examples, Summer/Winter/Paused switching, optional turn-off, individual-enabled versus group-active state, partial results and recovery. Add safe Cases and a realistic page under the existing `/marao-dashboard`. Run scoped checks serially, install final applicable assets/fixtures on `192.168.0.28` with the fastest compatible helper and preserve user data/helper state. No real valves, production operation, camera checks, full browser/device matrix or publication is authorized by this planning revision.

## Risks / Trade-offs

- The old unconditional restart-stop rule would violate on-only operation → distinguish recognized timed/on-only modes; ambiguous lost state requires explicit recovery rather than guessing.
- Seasonal groups reuse targets and start times → one server-held selection, serialized admission and per-target busy guards; reject only same-group static overlaps.
- A queued old start could run after switching away and back → selection-epoch validation at admission, without replay.
- Partial multi-device service failure → explicit per-target results/deadlines, no physical atomicity claim or automatic resend/compensation.
- A seasonal change could accidentally erase a timed stop → per-target operation state independent of group/schedule lifetime and active selection.
- Native API/version/storage differences → preflight supported interfaces and readiness before any writes; retain unsupported/customized states without replacement backend.
- Resource setup or group CRUD can partly fail → exact affected-record receipts/private HA backup, disabled/revoked starts and conservative recovery preserving unrelated data.
- Multiple cards/editors compete → stable collection/target ownership, authoritative helper readback and fresh-baseline checks, without claiming global locking.

## Migration Plan

1. Recapture implementation baseline/dirty snapshot and confirm current native card paths. No existing dashboard/user automation is automatically adopted or migrated; all implementation tasks remain unchecked now.
2. Preflight automation/timer/input-select CRUD, restoration and selected-group admission. Specify independent expected data for native records and refusal of unknown/newer/customized resources.
3. Provision explicit collections in Paused state with backups/receipts; prepare registered targets and group contracts before enabling future starts. Turn-on-only needs no duration or generated off schedule.
4. Run the bounded safe-helper execution/recovery checks, clean only temporary proven-owned resources and retain matching package/data recovery exports. Do not rewrite historical evidence as this revision's results.
5. Install final assets/fixtures, leave the safe example available and hand off manual group-selector/form/phone appearance checks. Implementation, real watering and publication are outside this request.
