---
title: Schedules
description: Manage shared timer groups that run through Home Assistant.
---

Schedules use native Home Assistant automations and helpers. They continue without an open dashboard. Cards can share a collection, and removing a card does not delete its schedules.

Administration requires an HA administrator, UI-managed automations and supported timer/dropdown helper APIs. Choose dedicated switch or valve devices. Before **Set up schedules**, keep a private HA backup and acknowledge those devices. New collections start **Paused**.

## Groups and timers

Create groups such as Summer and Winter with **Manage groups**. **Active timer group** selects which group may start timers. Viewing or editing a group does not activate it. Paused prevents future starts without erasing settings.

Each timer has a name, group, target devices, weekdays and a local start time:

- **Turn on only** has no inferred stop time. It stays on until explicit Stop or an independent action.
- **Turn off after** accepts 1–1440 minutes. HA owns each accepted device's elapsed stop deadline, including overnight runs.

Different devices may start slightly apart, and failures can produce partial results. Device state and native automation traces describe those results. Failed or skipped starts are not automatically retried.

## Overlaps and changes

Within a group, overlapping timed intervals for the same device and duplicate starts are rejected. Different seasonal groups can contain the same device and time. An active or owned device is skipped by another timer; its deadline is not extended.

Switching groups, pausing, editing or deleting timers changes future starts. Existing timed runs retain their deadlines, and on-only devices are not switched off merely by selecting another group. HA restart stops recognized timed operation when devices become usable, while recognized on-only operation is preserved. Missing or ambiguous operation state requires explicit reconciliation.

Schedules use Home Assistant's timezone. Missing daylight-saving start times are skipped; repeated times run only at the first occurrence. Durations measure elapsed time. There is no missed-start catch-up.

## Ownership and recovery

Export recovery data after resource operations and retain the exact affected-record receipts privately. These API records do not preserve shared YAML comments or file formatting.

Native automation links open configuration and traces. Alias edits are supported; structural customization or newer metadata can make records read-only to Marao. Resolve changed or partial records before more writes. Never identify an uncertain helper only by its display name.

Deleting a collection requires idle devices and verified ownership. Known external/customized dependencies block cleanup. Deleting a seasonal group keeps stop resources needed by active runs. Restore matching package and saved automation/helper/selection data together for rollback, preserving unrelated changes. Unavailable helpers or targets do not prove that a physical device has turned off.

The card playground uses fictional records and devices. It demonstrates configuration and interaction without creating automations in any Home Assistant instance.
