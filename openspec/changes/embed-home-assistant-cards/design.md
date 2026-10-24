## Decisions
Home Assistant renders parsed configuration objects, not YAML strings. Keep YAML as the user-authored source in `entities` entries (`template: ha_card`, `yaml: string`) and emit its parsed object directly into Lovelace. No runtime wrapper, custom card dependency or restricted option schema.

Reuse `hui-card-picker`, `hui-card-element-editor` and HA's YAML/code editor. The detached native view loader was confirmed against disposable HA 2026.10.0, including its layout-owned dialog events. Keep the adapter and any YAML parser lazy-loaded so the initial editor stays within its existing asset-size budget. Do not hardcode compiled chunk URLs. These internal APIs may change: show a readable failure and keep manual YAML editing available. Load only resources already configured by the administrator. Card behavior/appearance remain owned by HA/the installed card, an intentional exception to Marao-owned controls' interaction rules.

Existing released v0/v1/v2 configurations and raw card objects are unchanged; no source-format migration or package-version bump is needed for this additive v2 entry. Unknown wrapper fields and exact unedited YAML survive normalization, history and saves. Visual edits serialize the complete configuration; formatting/comments can change after a visual edit. Reject invalid/multiple documents, unsafe tags, duplicate keys, recursive structures and non-JSON values before generation writes. Browser and Python parsing use YAML 1.1 semantics.

## Acceptance and verification
Native and custom configurations round trip, preserve mixed fixed-column ordering, and emit unchanged nested settings; cancel leaves drafts untouched. Reject malformed source with no replacement. Use targeted Node/Python tests plus the native-editor smoke check for the internal API seam. No camera transport checks or full suite. Install final assets/backend on disposable 192.168.0.28 preserving source and helper state.

## Implementation decisions
Implementation authorized on 2026-10-24. Source format remains 2. Generated-output contract advances from 2 to 3 so startup repair and history restoration recognize intentionally embedded custom types instead of mistaking them for retired generated cards. Older contracts retain their existing compatibility checks.

- Confirm native picker/editor loading from a fresh direct visit to the Marao editor, including already configured custom resources.
- Native picker discovery depends on custom cards registering picker metadata; unregistered installed cards must remain usable through manual YAML.
- Preserve user-authored custom types through the generator's existing retired-card rewriting step, including nested configurations.
- Confirm parser parity with HA for quoted states, anchors/merges and arbitrary nested options. File directives such as `!include`/`!secret` are rejected with an inline-configuration instruction.
- Keep the native card/editor internals upstream-owned. Marao controls the surrounding dialog, mobile containment and draft save/cancel behavior.

## References
- [Home Assistant card API and helpers](https://contributors.home-assistant.io/frontend/custom-ui/card/)
- [Native card picker](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/editor/card-editor/hui-card-picker.ts)
- [Native card element editor](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/editor/card-editor/hui-card-element-editor.ts)

## Verification evidence
Targeted Node checks cover YAML/schema/model preservation, shared grids and editor draft behavior. Python checks cover generation, rejected input, exact source/history restoration and legacy repair behavior. Shared parser fixtures include quoted states, anchors/merges, unsupported tags, duplicates, numeric scalar parity and recursive aliases.

On disposable HA 2026.10.0, a fresh editor visit passed native search and Markdown selection, visual edits, YAML editing/reopening, unsupported-visual fallback, Cancel, inert preview, nested configuration retention, and JSON/Visual switching without persistence or device calls. Injected loader failure retained YAML and Retry recovered. A mixed grid passed external variables, native backend visibility, local missing-card errors and stable neighbors; the safe helper state was restored. Initial panel remains below 144 KiB and the separately fingerprinted editor/YAML bundle and license pass package checks. No third-party cards were installed.
