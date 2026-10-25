# Proposal

## Why

Numeric sensor cards such as humidity currently have no configurable value-based background colors. Users need to see a reading and its configured range at a glance without building a separate card or automation.

## What Changes

- Add optional threshold/color pairs to `md_sensor_card`, available through Visual editing and JSON configuration.
- Apply the color belonging to the greatest threshold less than or equal to the current numeric source reading. The user confirmed inclusive lower bounds: 40 → green and 60 → red means green from 40 to below 60, red from 60 upward, and the normal background below 40.
- Keep numeric values and units readable; neutral availability and problem presentation take precedence over threshold colors.
- Preserve the existing appearance when the list is omitted or empty, or the sensor state is nonnumeric. Binary sensor appearance remains unchanged.

Observed: the sensor catalog exposes an active color and on/off icons, while `stateAppearance` recognizes discrete states rather than numeric ranges. Proposed: a sensor-only optional rule list using the existing card, builder and generation paths. Thresholds use source units and unrounded readings; this is a recorded design assumption rather than a new display-unit feature.

Affected-card set: numeric `md_sensor_card` instances, including supported legacy aliases and sensor members rendered through that shared card. Binary sensors are compatibility consumers only. Non-goals: thresholds for every card family, changing battery thresholds, graph coloring, alerts, services, automations, gradients, hysteresis or separate standalone authoring.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Optional numeric sensor background thresholds, exact boundaries, fallback and availability precedence.
- `visual-builder`: Threshold/color list editing, validation, schema help and preserved configuration round trips.

## Impact

- Python card catalog, page-model validation and generator option propagation; shared frontend sensor appearance and runtime configuration validation.
- Visual editor list controls, shared editor model/JSON schema, English/Portuguese labels and errors, generated editor assets, sensor documentation and existing coverage inventories.
- Small targeted runtime/model/generator assertions and safe humidity examples in Cases and a realistic page.
- Compatibility: released v0.20.0 configurations remain valid without inserting defaults or changing the dashboard format. Existing names, order, options, aliases, unknown fields, raw YAML and history remain preserved. No migration or dependency is proposed.
