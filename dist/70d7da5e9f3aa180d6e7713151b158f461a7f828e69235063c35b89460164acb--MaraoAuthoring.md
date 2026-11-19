# Editing Marao with an agent

Marao is an ordinary Home Assistant storage dashboard. An agent can read and save it through [homeassistant-ai/ha-mcp](https://github.com/homeassistant-ai/ha-mcp). Marao's portable authoring tools describe the installed version and plan coherent popup edits locally. They do not connect to Home Assistant or save anything. The client needs local **Node 24 or newer** alongside ha-mcp; installing Marao does not add MCP tools or make ha-mcp invoke this planner automatically.

## Discover the installed contract

Read the registered Marao resource's adjacent `MaraoFrontend.release.json`. Resolve its `authoring` index relative to that resource directory. The stable `MaraoAuthoring.json` index names the installed package version, authoring contract version, metadata, JSON Schema, guide, module and standalone CLI. Check the referenced files against the release manifest's SHA-256 hashes. Use these installed assets rather than the latest website's definitions for an older installation.

Download the index's CLI asset locally and run it with Node. It is one self-contained `.mjs` file; no npm installation is needed. Replace `planner.mjs` below with that local filename. Commands read one JSON object from stdin and return one JSON result to stdout. Failure exits nonzero and returns diagnostics without `config`, `patch` or `config_hash`. The CLI makes no network requests, reads no credentials and writes no files itself. Keep any dashboard documents and output in private local storage, outside source control and shared logs.

```sh
node planner.mjs describe < /dev/null
```

Describe one card by passing `{"type":"custom:marao-light-card"}`. Metadata includes fields, entity domains, native configuration examples, documentation links and audited effective defaults. Defaults describe omission behavior; do not insert them into saved configurations. Groups and collections use explicit member lists rather than a primary entity. The schema describes native views/cards and `marao` settings, independently of the historical source-format schema. Existing runtime/generic aliases are compatibility inputs, not a reason to rewrite working cards.

## Validate and plan

Validate input has the shape `{"config":{...},"context":{"entities":[]}}`:

```sh
node planner.mjs validate < validation-request.json
```

Planning requires the complete original document from a fresh MCP read, a complete proposed document preserving unrelated values, its unmodified MCP hash, and context:

```json
{
  "original": {"views": [{"path": "home", "cards": [{"type": "custom:marao-light-card", "entity_id": "light.example"}]}]},
  "proposed": {"views": [{"path": "home", "cards": [{"type": "custom:marao-light-card", "entity_id": "light.example", "name": "Ceiling"}]}]},
  "config_hash": "COPY_THE_FRESH_MCP_HASH_UNCHANGED",
  "context": {
    "dashboardRoot": "marao-dashboard",
    "language": "en",
    "entities": [{"entity_id": "light.example", "name": "Ceiling", "supported_features": 0}]
  },
  "popup_edits": []
}
```

```sh
node planner.mjs plan < planning-request.json
```

Entity metadata comes from the actual target's read-only state/registry data: use existing `entity_id` values and relevant attributes such as name, device_class and supported_features. Do not invent entities, substitute another target or infer capabilities from an example. An explicit empty metadata list is valid only when the requested plan needs no entity context. No state is persisted into generated controls.

`popup_edits` optionally contains exact JSON Pointers to popup owners in the proposed document, for example `/views/0/cards/0`. This explicitly requests first creation, adoption or reopening of an editable popup source. Without it, planning only reconciles existing managed sources; automatic popups stay automatic. Reuse the resulting document for later edits rather than replaying creation against an old baseline.

The result has `authoring_contract`, `package_version`, `valid`, `diagnostics` and `ownership`. Successful plans additionally return `config`, `patch` and the original `config_hash`. Diagnostics have `path`, `message` and `severity`. Ownership entries identify owner pointers, linked source paths, external hash references and whether the source is managed. Unknown non-Marao cards stay opaque; recognized card containers are inspected. Cross-field validation uses Marao's runtime validators, not just the schema.

## Popup ownership

- Parent cards own functional targets, members, popup family, actions and forwarded options. Edit those settings on the parent.
- Popup Sections views own ordering, sections, sizes, presentation overrides and user-authored cards. Edit those values directly in the proposed document.
- `marao_popup` records management provenance and retained layouts; `marao_popup_slot` identifies managed roles. Preserve both. Do not hand-edit generated functional fields or manufacture management metadata. To make a managed child custom, remove its slot marker deliberately and retain its complete configuration.
- Missing managed controls stay deleted. Explicit emptiness, unknown fields, custom cards and retained prior-family customization survive reconciliation. Divergent shared owners receive isolated sources without retargeting the remaining owners.
- Unsupported versions, ambiguous sources or insufficient context block the plan. Do not fix those conditions by deleting provenance or rebuilding the dashboard from defaults.

## Save and verify with ha-mcp

1. Use `ha_config_get_dashboard` for the complete current storage configuration and its `config_hash`. Retain the exact original privately. Follow ha-mcp's own dashboard skill guide.
2. Plan locally and review the returned changes, including any parent and popup changes. Save only a `valid: true` result. Empty patches need no save.
3. Call `ha_config_set_dashboard` with the owning `url_path`, returned `patch` and unchanged `config_hash`. Use one call for the entire coherent plan. The patch uses supported add/remove/replace/test operations, with escaped JSON Pointer keys and at most 100 operations. Changed arrays are replaced as complete arrays to retain order. An oversized plan must be narrowed; do not split it into unreviewed writes or omit the hash.
4. Read the complete dashboard again and compare it with the returned `config`. A successful request alone does not prove the saved result. The browser popup coordinator should see an already coherent document and need no follow-up source write.
5. A stale hash requires another read and a new plan. After an uncertain write, read back first: proposed confirms, original means not applied, divergence requires reconciliation. Never retry or restore blindly over concurrent edits. Keep exact baseline/proposal until resolved; recovery must use a compatible package and preserve unrelated changes.

MCP hash checks reduce stale-write risk; they are not a global atomic compare-and-swap guarantee against every writer. The planner treats hashes as opaque and cannot verify their freshness. It supplies no production access, automatic backups, popup downloads or device actions. No direct end-to-end ha-mcp connection is implied by local CLI verification.
