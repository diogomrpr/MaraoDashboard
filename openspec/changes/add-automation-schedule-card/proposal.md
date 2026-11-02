# Proposal

## Why

Users should be able to schedule devices to turn on without requiring a turn-off time, optionally stop them after a duration, and organize timers into named groups such as Summer and Winter. Home Assistant should store and execute the selected group's schedules even when the dashboard is closed.

## What Changes

- Add a native **Marao Schedules** card for a schedule collection, initially supporting `switch` and `valve` devices, with safe `input_boolean` examples. Each timer selects one or several explicitly configured devices, a name, weekdays and local start time. Automatic turn-off is optional: **Turn on only** needs no duration; **Turn off after** accepts a duration.
- Create named **timer groups** within the collection, for example Summer and Winter, with timer create/edit/enable/disable/delete and group create/rename/delete. A timer belongs to one group; groups can reuse the same devices at different times or durations.
- Provide an **Active timer group** selector at the top of the card, including **Paused**. One selection applies to every timer in that group and all devices targeted by those timers. At most one group is active per collection; other groups remain saved and retain their individual timer enabled settings. Switching controls future scheduled starts, without immediately operating devices or catching up missed starts.
- Create an identifiable HA start automation for each timer. Read actual managed automation configurations, group definitions and the server's active selection on other devices; dashboard configuration holds a collection reference, not another schedule database. HA enforces the active group without an open browser.
- Keep a shared execution/recovery controller with independent per-device timer/operation state. Timed runs retain their original stop deadlines through schedule edits, deletion or group switching. Turn-on-only operation has no automatic stop deadline, including after switching groups or restarting HA; the UI states **No automatic turn-off**.
- Use HA's timezone, support overnight timed runs, reject conflicts within a timer group and skip missed starts. Timer groups are mutually exclusive, so Summer and Winter may intentionally reuse the same weekly times. HA restart ends recognized timed runs without replay/resume; it does not invent turn-off behavior for turn-on-only operation. Unknown recovery state blocks new starts for explicit reconciliation.
- Require administrator rights for schedule management, validate ownership and generated structure before mutation, and show externally customized automations without overwriting them. Provide native automation-editor access for advanced changes.
- Preserve independent schedules, automations, helpers and dashboard settings. Card duplication shares the collection and its active timer group; deleting a card does not delete its automations. Group switching never deletes schedules or removes an active stop path. Resource cleanup is an explicit, guarded management operation.

## Capabilities

### New Capabilities

- `managed-schedules`: optional-duration timers with one or several targets, named timer groups and active selection, native schedule-card configuration, managed automation discovery/CRUD, execution/recovery, ownership, permissions and data preservation.

### Modified Capabilities

None. The native card/editor, shared UI and action contracts supplied by the prerequisite apply unchanged; this adds a new family without changing existing cards' behavior.

## Impact

**Prerequisite:** [use-home-assistant-dashboard-editor](../use-home-assistant-dashboard-editor/proposal.md) supplies the current native picker/card editors, ordinary HA configuration and shared components. Its tasks are now complete; this feature extends that architecture and does not restore the retired builder.

Revision baseline: v0.24.4, commit `cf4662333dd6223c761e698f4131a197d67e19a7`, 2026-11-01. This updates the existing unimplemented proposal; unrelated distribution copies and people/summary proposals remain untouched. The user's clarification explicitly permits one or several devices per timer; selecting a seasonal group applies to all its timers and their targets. Proposed implementation adds one card/editor, native API/model and deterministic automation templates, targeted tests, documentation and safe fixtures. Affected existing consumers are the native catalog/editor, shared mobile controls, labels and packaging; planning changes no runtime cards.

HA already exposes automation config read/save/delete and native helper management. Compatibility checks must establish UI-managed automation storage and required timer/selection/operation helper APIs before writes. Distribution remains frontend-only; there is no Marao Python backend, scheduler process, required blueprint or third-party card.

The new card/resource metadata remains a proposed version 1 independently of HA/package/dashboard versions; the earlier draft has not shipped, so this revision requires no deployed-resource migration. Existing dashboards and user automations are never migrated automatically. Managed resource creation is staged with recovery data and conflict checks; unrelated records, unknown fields and custom logic remain preserved. One HA-held group selection avoids a partially switched set of automation enable toggles. Native APIs and multi-device actions provide no cross-resource transaction or physical all-or-nothing guarantee.

Proposed first-version boundaries: recurring weekly start times, optional duration, one or several dedicated supported targets per timer, one active timer group per collection, one managed operation per target and admin management. Multiple devices can receive the same scheduled start; ordered multi-zone sequencing remains outside scope. Arbitrary automation authoring, security/access targets, weather/rain/soil logic, standalone countdown timers, one-off dates, missed-run catch-up, manual Start now, non-admin configuration writes, production operation and publication remain outside scope. Native explicit Stop is included. HA/device outages cannot guarantee physical shutoff; device-side maximum runtime remains outside this card's guarantees. This request updates planning only.
