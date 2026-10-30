# Proposal

## Why

Marao's dashboard builder limits customization that Home Assistant already supports and makes us maintain general layout and editing features. Use Home Assistant's editor as the primary authoring experience while preserving Marao's cards, specialized configuration, popups, appearance and navigation.

## What Changes

- **BREAKING:** Replace the active Marao Visual/Monaco dashboard builder and `source_json` authoring model with ordinary HA storage-backed views, sections and individually editable cards. HA owns layout, sizing, visibility, badges, native cards and the dashboard save workflow.
- Expose every supported Marao card family in HA's picker with native visual/YAML configuration. Reuse the existing catalog, validators and specialized editors, including floor-plan image/light/strip placement and collapsed energy contributors.
- Make card-owned details self-contained: media, camera/events, climate, access/alarm, groups, scenes, energy/history and floor-plan light lists retain their current controls without requiring separately generated popup siblings.
- Keep one shared navbar configuration per opted-in dashboard. **Confirmed requirement:** automatically display it on every page, including newly created views and direct links, without adding a navbar card/reference to each page. Preserve floating placement, overflow, selected destination, maintenance actions and scoped appearance; HA editing remains accessible.
- Provide an explicit, previewable conversion of supported saved Marao documents to ordinary HA configuration at the same dashboard address. Preserve meaningful configuration and opaque data; require exact recovery exports and protect against stale/concurrent edits and interrupted conversion.
- Retain historical conversion/read-only rendering needed for a safe transition. After conversion, ordinary HA configuration is the sole active source; loading or upgrading never regenerates over native edits.
- Retire builder-specific whole-dashboard drafts, Save & Generate, Monaco tooling and automatic page-reference repair from the new authoring workflow. Existing presets may be used by the one-time converter; a new guided page/template designer is outside this change.

## Capabilities

### New Capabilities

None. Reuse the existing capability boundaries below; this replaces the supported authoring model rather than introducing a parallel product.

### Modified Capabilities

- `native-dashboard-editing`: ordinary HA authoring, complete card editors, native sizing/visibility, specialized forms and explicit configuration ownership.
- `navigation-popups`: dashboard-wide navbar configuration and automatic mounting; HA editing access and self-contained popup ownership.
- `card-behaviors`: standalone detail parity and inert native previews across the current card collection.
- `visual-builder`: retire the former dashboard-builder requirements and transfer applicable per-card configuration contracts to native editing.
- `dashboard-generation`: scope compilation to explicit conversion and retained legacy rendering; ordinary HA edits are authoritative afterward.
- `integration-lifecycle`: versioned native-authoring metadata, exact conversion/recovery, supported compatibility and safe installation/update behavior.

## Impact

Planning baseline: v0.23.4, commit `02b78d09fb24056219a05e7a548e11724492aae6`; starting worktree was clean. Planning changes affect no running cards. Implementation affects the complete published card catalog, navigation/popup runtime, source conversion, editor/build assets, documentation, scoped tests and the disposable dashboard fixtures.

Primary paths: `frontend_src/MaraoDashboardPanel.js`, `editor-model.js`, `native-model.js`, `native-session.js`, `native-strategy.js`, `compile-dashboard.js`, `convert-document.js`, `MaraoSource.js`, shared card/navigation/floor-plan modules, `build-native.cjs`, `tests/frontend/`, `ha-test/` and native installation/migration documentation. The flat HACS Dashboard distribution remains frontend-only; the frozen Python integration is not revived.

Compatibility must cover source formats 0/1/2, native envelope 1/compiler contract 1, supported historical standalone documents and current ordinary HA cards. A distinct native-authoring metadata version is introduced; package/source/envelope/compiler versions remain separate. Preserve explicit emptiness, membership, options, unknown fields, order, names, raw/custom content, exact source/YAML recovery data, page paths and dashboard registration settings. The existing compiler alone is insufficient for lossless conversion because it relies on retaining the original source envelope.

The current `native-dashboard-editing` baseline is marked historical after `remove-native-dashboard-authoring`; this change deliberately establishes native editing as the **single** authoring workflow. `move-marao-to-native-frontend` established native storage while retaining the builder; it did not already implement this proposal. Older baseline references to Python generation or Configuration History/Restore remain historical and are not restored by this work.

Non-goals: a second full editor, a Python backend, third-party card dependencies, a new page-template system, automatic changes to independent dashboards, new physical-device actions, camera transport testing, full test campaigns or publication. Navbar metadata persistence and automatic bootstrap must be proven against supported HA before conversion is enabled; incompatibility blocks cutover rather than weakening the automatic-all-pages requirement.
