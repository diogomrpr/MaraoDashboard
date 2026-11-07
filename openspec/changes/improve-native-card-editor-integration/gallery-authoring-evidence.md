# Gallery authoring audit — 2026-11-07

Requested result: reproduce the disposable dashboard's card examples using Home Assistant dashboard editing, including independently addable popup access controls. This is configuration-authoring coverage, not a claim of exhaustive device or visual testing.

Start: `48e52899fcb207bbe946afed516f7d6d95adf49f`, branch `codex/audit-native-gallery-authoring`, isolated release worktree `/private/tmp/marao-release-0-33-0`. The original workspace's existing dirty work was preserved. Task snapshot: `/private/tmp/marao-authoring-audit-start.json`.

## Actual saved-dashboard coverage

Read all 68 saved views, including 46 card gallery views and the realistic product pages. Walked top-level cards, Sections cards, nested stacks/grids and embedded popup layouts: **2,464 card occurrences**. Repeated state examples were retained in the audit rather than being presented as distinct card implementations.

| Occurrences | Evidence |
| --- | --- |
| 2,334 Marao cards and popup headers | Actual shared editor form callbacks change a name/title and compare the complete result with an independent expected configuration. Explicit renaming removes the old translation name key intentionally; aliases, actions, layout, opaque styles, options and unrelated fields remain. |
| 10 popup group-action controls | Actual native form callback changes scope and preserves the rest of each saved configuration. |
| 13 legacy control grids | Native-grid/stack representation round-trips the complete saved children, groups and unknown options. Separate regressions cover group moves, raw-card ownership and invalid YAML. |
| 2 Floor Plans | Saved placement configurations validate. Existing dedicated visual placement-editor tests cover general fields, child editing, cancellation, image handling and draft preservation. These two cards were not falsely counted as ordinary name-form callbacks. |
| 105 stock Home Assistant cards | Native grid (79), vertical-stack (12), markdown (6), entities (2) and heading (6) retain HA's own editors. No custom replacement or simulated editor was added. |

All **2,359 Marao occurrences** passed their selected configuration check after the fixes. Each of the **261 standalone legacy popup owners**, already included above, also copied into an independent native Sections canvas without an unknown Marao child type. No source popup was modified by copying.

The private actual-instance inventory/results remain in `/private/tmp/marao-authoring-rows.json` and `/private/tmp/marao-editor-roundtrip-report.json`; raw dashboard data is not committed here.

## Repairs

- Native appearance flags, effective state labels/colors and Home Assistant action selectors are available under Advanced options for applicable card renderers. Explicit access controls keep their service restrictions.
- Missing graph-source selection and compatible toggle/status source domains are exposed. Energy can display its complete period detail directly on the page. Popup settings refresh immediately when history/energy presentation changes.
- Timeline, legacy energy/power detail, popup header, group action and legacy control-grid classes now expose visual-editor entry points. Legacy energy/power edits retain their original top-level option locations and saved card types.
- Existing generic cards, legacy summary identities and media's existing `variables.apple_tv` field location remain editable without automatic source conversion.
- Security action appears in the full native picker. It can recreate the guarded Lock example using only `lock.lock` to the selected lock. Source and runtime reject unlocking, alternate targets/data and secondary opening triggers. The existing 1.2-second hold remains the interaction owner.
- Older close-role unlocking examples validate privately against their existing effective slider behavior, while explicit Close mode still rejects opening. The saved template is preserved.
- Four saved neutral Light examples incorrectly used sensor entities. They now use the existing compatible unknown/unavailable Light helpers. The gallery source is corrected too; historical release fixtures remain unchanged.
- Fields ignored by the current renderer, including old scene option icon/name fields and arbitrary old styles, remain opaque preserved YAML rather than newly exposed inert controls.

## Verification

**229 targeted Node assertions passed**, serially, in the existing native editor/cards, security, popup catalog/layout, Floor Plan, source/compiler, gallery and documentation example suites. This includes a committed gallery-wide editor regression, native action selectors, field-location preservation, safe held-Lock creation/rejection cases, grid draft/error routing, and popup mode refresh. Frozen released source/output expectations remain unchanged. OpenSpec strict validation and whitespace checks passed.

Representative installed Chrome observations:

1. An existing legacy control grid opens Home Assistant's native grid editor, including native child tabs/move controls and the Marao child settings. Editing a child enables the outer Save; outer Cancel closes the draft.
2. An existing Energy card opens its visual settings. Enabling full details changes the outer draft and immediately removes inapplicable popup settings. Cancel discards that draft.
3. An existing generic Access card opens the unified editor. Popup settings initially remain collapsed. Expanding them exposes an already editable native canvas and a lock-filtered template dropdown.
4. Selecting the unlock-slider/lock-button template produces two editable children. Native Add card opens the full native catalog, with Marao suggested first; both Grid/Thermostat and the independent Marao access/Security action entries are present.
5. Security action was selected, its native entity selector accepted the safe gallery lock, and child Save added it to the popup draft. The outer editor then showed three children. Outer Cancel discarded the template and child-card addition together.
6. A subsequent read compared the entire saved dashboard with the expected corrected document: exact equality. No device action controls were exercised. No camera playback was tested.

Actual UI Save/reload was not repeated for every card: complete parent config events and preserved native persistence ownership were checked at the configuration boundary; the representative browser work exercised child application and outer cancellation.

## Installation and safe configuration correction

Final frontend is installed on disposable `192.168.0.28` using direct `prepareFrontend()`. Served assets and readiness were checked by the installer. Final identity: `adc74d52d1926222300d5c7eae3f703629b27145c9843e40cfe91ed4dfb3db22`, 103 installed assets. Version metadata remains 0.33.1 (no release was requested).

Before the four targeted gallery binding corrections, the exact dashboard was backed up privately in `/private/tmp/marao-authoring-dashboard-before.json`. A fresh whole-document comparison immediately before saving protected concurrent edits. The readback matched `/private/tmp/marao-authoring-dashboard-corrected.json` exactly; only those four entity bindings changed.

- Original document SHA-256: `04c554b1438d9ed3b2f09d060f997536d05a9f5dd37d31ecbd28e9e71c1f53e0`
- Corrected document SHA-256: `aaf8742437fe4e48a5fcaa5c06e2df744c119dedf5170c496fcdce4e0a8b53c3`

## Compatibility limits and manual watch list

Retired Header and other legacy-only identities are not restored to the new-card picker; Manual YAML remains available and existing configurations retain visual editing where supported. Current public families provide the supported equivalent creation routes. Unknown/unavailable/loading examples describe reported entity states, not editor-controlled state overrides.

Legacy control grids preserve adaptive heights and grouped geometry. Their native editing bridge edits children, order and columns. Use a normal HA Grid for square cells or a grid title; the compatibility bridge rejects those unsupported edits instead of silently saving an ineffective value. Marked raw child edits that cannot preserve ownership fail readably and remain available in YAML.

User watch list: choose the matching family and your entity; inspect Advanced options and popup templates; use native Grid for new ordinary containers. Real-phone gestures, every physical example, theme/zoom matrices, actual devices and camera transport were not part of this authoring audit. No release, push or tag was performed.
