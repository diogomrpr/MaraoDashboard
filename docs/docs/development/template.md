# Add or change a card

Public Marao cards use named `custom:marao-*` types. The catalog's `md_*` identities remain stable internal/source keys, and supported generic `custom:marao-card` configurations remain compatible.

## Trace the complete path

1. Read the relevant capability, current card runtime and callers. Identify shared controls and consumers.
2. Update catalog metadata and shared validators when exposing configuration. Add native editor fields without rewriting unrelated fields, unknown options, order or explicit emptiness.
3. Update composition and the shared runtime owner. Keep `hass` state authoritative; do not replace an active input during routine state updates. Register lifecycle cleanup for listeners, requests, timers and gestures.
4. Add English/Portuguese labels and a fictional documentation scenario for every new materially distinct behavior. Keep the card reference, option table and clean YAML export aligned.
5. Reuse a safe gallery case or add only what is needed for the behavior. Choose the smallest meaningful regression and inspect representative shared consumers.
6. Rebuild generated editor bundles, complete essential checks and install final applicable assets on disposable `192.168.0.28` before handoff.

Use browser-native components and existing Marao controls. Do not introduce a third-party card, second action dispatcher or copied popup/slider implementation. Home Assistant owns outer layout and native Save/Cancel; Marao forms emit the complete `config-changed` configuration.

## Public configuration

```yaml
type: custom:marao-sensor-card
entity_id: sensor.temperature
variables:
  graph_entity: sensor.temperature
```

Keep native type, editor metadata, validation and composition aligned. A backward-compatible optional field needs no persisted-format migration. Changes to saved meaning require the compatibility assessment and ordered conversion described in [source migrations](source-migrations.md).

Before a push/tag/release, run the separate unit-only publication gate. Routine implementation does not imply a full suite or browser matrix; follow the [repository contract](../../../AGENTS.md).
