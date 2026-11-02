---
title: Theme and interaction
description: Understand Marao's appearance, language and state feedback.
---

Marao provides coordinated light and dark appearances, Montserrat typography and touch-first controls. Its cards retain their own appearance on ordinary Home Assistant dashboards. Dashboard-wide shell changes apply only when [Marao settings](../../start/dashboard/) are enabled, and the normal Home Assistant shell returns when you leave.

The selected Home Assistant language controls Marao labels. English and Portuguese are supported. Card names and deliberate custom labels remain yours.

## State feedback

Cards use Home Assistant's reported state. Active, inactive, loading, disabled, unknown and unavailable states have distinct presentation. An unavailable reading does not become zero, and disconnected controls do not dispatch actions. Home Assistant supplies its native connection warning.

Normal room-lighting state uses the room background and accessible state text without an extra lighting-status row. Other families retain their relevant non-color cues. Configured abnormal alerts take priority over normal content.

## Touch controls

Buttons and sliders provide strong haptic requests where the browser or companion app supports them. Haptic strength and physical-device feedback depend on that environment.

- Opening or unlocking an access point uses a strict horizontal slide. An incomplete or vertical gesture cancels.
- Closing or locking uses an explicit tap.
- Other risky security actions use a 1.2-second hold with visible progress. Early release or moving outside cancels.
- Sliders show the current value and a separately moving target. Climate controls can preview a requested mode or target while the measured temperature remains authoritative.

Essential names and values wrap when space is tight. Internal grids can show fewer columns without rewriting saved settings. For layout choices, see [Layouts and visibility](../layout/).
