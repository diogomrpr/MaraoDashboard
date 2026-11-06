---
title: Schedules
description: Manage shared timer groups that run through Home Assistant.
---

Schedules use native Home Assistant automations and helpers. They continue without an open dashboard. Cards can share a collection, and removing a card does not delete its schedules.

Administration requires an HA administrator, UI-managed automations and supported timer/dropdown helper APIs. Choose dedicated switch or valve devices. Before **Set up schedules**, keep a private HA backup and acknowledge those devices. New collections start **Paused**.

## Groups and timers

Create seasonal groups with **Add group**. Groups appear as sections, with one section open at a time and the active group open initially. The group toggle selects which group may start timers; opening a section does not activate it. Paused prevents future starts without erasing settings.

Use the plus inside a section to add a timer. Timer rows show their essential settings and an enable toggle. Select a row to edit its name, local time, on/off action and weekdays in a popup. Changes save automatically; close the popup with the top-right close control. The red trash control deletes the timer. **Delete group** appears below the timer-add control. Device selection belongs to card configuration. Changes from Home Assistant refresh automatically.

New timers specify an on or off action rather than a duration. An on timer has no inferred stop time; add a separate off timer to stop it. Existing timed records retain their saved duration and Home Assistant-owned stop deadlines for compatibility.

Different devices may start slightly apart, and failures can produce partial results. Device state and native automation traces describe those results. Failed or skipped starts are not automatically retried.

## Overlaps and changes

Within a group, overlapping timed intervals for the same device and duplicate starts are rejected. Different seasonal groups can contain the same device and time. An active or owned device is skipped by another timer; its deadline is not extended.

Switching groups, pausing, editing or deleting timers changes future starts. Existing timed runs retain their deadlines, and on-only devices are not switched off merely by selecting another group. HA restart stops recognized timed operation when devices become usable, while recognized on-only operation is preserved. Missing or ambiguous operation state requires explicit reconciliation.

Schedules use Home Assistant's timezone. Missing daylight-saving start times are skipped; repeated times run only at the first occurrence. Durations measure elapsed time. There is no missed-start catch-up.

## Ownership and recovery

Keep a private Home Assistant backup before setup or recovery. The card has no recovery export control. Internal operation receipts preserve affected-record baselines but do not preserve shared YAML comments or file formatting.

Native automation links open configuration and traces. Alias edits are supported; structural customization or newer metadata can make records read-only to Marao. Resolve changed or partial records before more writes. Never identify an uncertain helper only by its display name.

The card does not offer collection deletion. Resource cleanup requires idle devices and verified ownership; known external/customized dependencies block it. Deleting a seasonal group keeps stop resources needed by active runs. Restore matching package and saved automation/helper/selection data together for rollback, preserving unrelated changes. Unavailable helpers or targets do not prove that a physical device has turned off.

The card playground uses fictional records and devices. It demonstrates configuration and interaction without creating automations in any Home Assistant instance.
