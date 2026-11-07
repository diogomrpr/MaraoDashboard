## Purpose
Provide compact group-based schedule authoring with immediate safe editing and native Home Assistant execution independent of the browser.

## ADDED Requirements
### Requirement: Compact group and timer sections
Schedules SHALL use one-open group sections, initially opening the active group. Each group SHALL have an authoritative active switch; each timer SHALL have a matching enabled switch beside its editable row. Timer creation SHALL be left aligned; labelled group deletion SHALL be below and right aligned. Labelled group creation SHALL follow a divider. Collection deletion, manual refresh and the device list SHALL be absent.

#### Scenario: Browse and manage a group
- **WHEN** another group is opened
- **THEN** the previous section closes without changing active selection
- **AND** group deletion requires confirmation and preserved ownership checks

### Requirement: Autosaving timer popup
Timer settings SHALL expose name, weekdays, local time and on/off action. Group and devices SHALL come from their owning section and configuration. Weekdays SHALL use a themed multi-select dropdown. Valid edits SHALL autosave serially; newer edits SHALL survive in-flight writes. Close SHALL flush edits and retain failed drafts. A top-right close and red trash action SHALL replace Save/Cancel; duration and enabled controls SHALL be absent.

#### Scenario: Edit during an in-flight save
- **WHEN** another field changes before the first save completes
- **THEN** the latest edit is saved afterward without overwriting it with the earlier result
- **AND** a reported failure remains visible and prevents loss of the draft on close

### Requirement: Compatible on and off schedules
An omitted action SHALL retain on behavior and existing duration metadata. Explicit off timers SHALL use native target off/close adapters through the recognized schedule admission gate. Existing source, freshness, group, enabled, weekday, local-time and epoch checks SHALL remain. Configuration and automation changes SHALL refresh automatically.

#### Scenario: A recognized off timer becomes due
- **WHEN** its group is selected and all admission checks pass
- **THEN** only its registered targets receive the native off/close operation
- **AND** unchanged older controllers and timer records remain recognized
