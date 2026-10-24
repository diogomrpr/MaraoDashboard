## Why
Administrators need Home Assistant's built-in and already installed custom cards alongside Marao cards, using the native picker and card editors without losing arbitrary configuration.

## What Changes
- Add a Home Assistant tab to Add card and reuse the installed frontend's searchable picker and visual card editor, with YAML editing and preview.
- Store each embedded card as an ordered `template: ha_card` entry with its complete `yaml` string. Parse safely into an ordinary Lovelace card at generation.
- Preserve existing sources, raw cards and draft/save semantics. Embedded cards retain upstream appearance and interactions; Marao does not install or modify third-party cards.

## Capabilities
### Modified Capabilities
- `visual-builder`: native card selection, configuration and ordered YAML descriptors.

## Impact
Builder, JSON model/schema, canonical page validation/generation, documentation and targeted tests. Mixed control grids host embedded children through HA’s native card host, keeping visibility and card errors local. Starting commit a7e7b1411b08fb5106498f1eba22fc9f379c5ed2; private dirty snapshot /private/tmp/marao-ha-cards-implement.json. Existing unrelated light changes are preserved.
