## Why
The reviewed documentation preview contains a coordinated set of card improvements that are not yet present in the installed runtime. Apply that exact reviewed scope to the actual cards and leave it installed on disposable Home Assistant for user testing.

## What Changes
- Center Access slider labels across the track; preserve the existing forgiving completion threshold and security guards. Keep history times smaller below their event icons.
- Restrict Alarm Controls to Dropdown/Grid, with distinct mode icons and selected colors; align Climate mode buttons evenly.
- Present Camera Events as a single timeline, with icon-based filter headings and without routine archive/count notices.
- Animate Cover state labels horizontally across edges, anchor them to the independent target thumb, and increase their inset.
- Integrate Dishwasher readings into icons and circular progress, map program icons, and add the existing Show reading labels option to this family. Show Glance's existing label-free option in documentation.
- Retire Header from the picker/documentation while preserving saved Header configurations; correct Energy preview values.
- Remove redundant Media App availability text/question marks; compact Number and shortcut-free Wallbox; align People and Scene icons.
- Redesign Weather with static condition scenery, large current metrics, and capability-gated hourly/seven-day forecasts in the shared popup.
- Simplify Schedules into one-open group sections with active switches, row-level timer switches, direct group deletion, labelled group creation, autosaving timer popups, implicit group/devices, weekday dropdowns and explicit on/off timers. Remove obsolete management, duration, manual refresh, collection-delete and device-list UI.

## Capabilities
### New Capabilities
- `managed-schedule-editing`: Compact group/timer authoring with serialized autosaves, explicit on/off schedules and preserved legacy records.
### Modified Capabilities
- `card-behaviors`: The reviewed family layouts, forecast presentation, Header compatibility and label options.
- `mobile-theme-layout`: Timeline/filter/icon geometry, compact numeric controls and static weather surfaces.

## Impact
Runtime owners are MaraoCards, MaraoRuntime, MaraoSlider, MaraoDropdown, MaraoFrigateEventsCard and new MaraoWeather; schedule/editor source and canonical metadata/validation are updated and generated assets rebuilt. Documentation, selected tests and verification mappings remain aligned. No dependencies, production deployment, publishing or dashboard replacement is included.

Existing unknown fields, card selections and explicit empty settings remain untouched. Dishwasher's omitted label option retains labels; Weather retains show_forecast=false; Header registrations remain compatible; omitted schedule action means on and existing duration records remain valid. No stored format/version migration is required. Existing unrelated workspace edits are preserved by baseline-aware patch promotion. Installation targets only disposable 192.168.0.28 and preserves its user configuration/helpers.
