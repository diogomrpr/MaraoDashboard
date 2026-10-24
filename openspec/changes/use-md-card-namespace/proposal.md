## Why
Marao-owned card and option identifiers still use the predecessor namespace. New configurations, generated cards and public examples should use `md_`.
## What Changes
- Rename owned template IDs, option keys and current documentation/examples to `md_`.
- Accept released `hc_` identifiers at shared model/runtime boundaries, and automatically migrate active saved owned identifiers with namespace migration v1.
- On setup/upgrade, back up and atomically replace active source containing owned legacy names. Already-canonical source remains byte-for-byte unchanged; previews remain read-only. Do not rewrite historical snapshots, entity IDs, arbitrary raw cards, unknown fields or service data.
## Capabilities
### Modified Capabilities
- `dashboard-generation`: canonical owned names and legacy input compatibility.
## Impact
Builder/native editors, validators, generator, migrations, shared cards/preload, docs, fixtures and verification mappings. No dashboard source-format or HA entry-version migration; existing backup/atomic-save/history paths remain unchanged. Native custom-element names and integration service/API names already use Marao and remain stable.
