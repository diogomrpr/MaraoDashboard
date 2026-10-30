# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. Baseline: v0.23.4, commit `02b78d09fb24056219a05e7a548e11724492aae6`. These are proposed changes, not demonstrated native-authoring parity.

The current HACS package saves through HA but remains a generated dashboard: `native-strategy.js` opens `MaraoDashboardPanel`, `native-session.js` coordinates its draft, and `compile-dashboard.js` creates grids, separate popup siblings and a copied navbar descriptor per view. The source remains in `strategy.source_json`.

Shared card, floor-plan, sheet and persistent-navbar renderers already exist. The active catalog contains 36 identities including hidden access compatibility roles. The earlier standalone editor adapters were removed; their historical implementation is reference, not a second product to restore.

Saving current compiled output alone is unsafe: compilation omits source-only opaque fields and turns embedded YAML text into objects because the envelope retains the exact original source. Conversion must explicitly account for that data.

## Goals / Non-Goals

**Goals:** ordinary native configuration as the active source; independently editable cards; retained specialized editors and automatic details; one navbar on every page without placement; explicit recoverable same-root conversion.

**Non-Goals:** another page/layout editor, dual-source synchronization, new page templates/discovery, a custom HA view layout, Lit adoption, Python integration changes or stronger persistence/locking guarantees than HA provides.

## Decisions

### 1. Ordinary native configuration with versioned shared settings

Store ordinary HA `views`, `sections`, `cards`, sizing and visibility, without an active dashboard/view generation strategy. One root extension is the canonical global settings source:

```yaml
marao:
  version: 1
  navbar:
    routes:
      - path: /marao-dashboard/home
        label: Home
        icon: mdi:home
  show_cache_reset: true
  show_editor_button: true
views:
  - title: Home
    path: home
    type: sections
    sections: []
```

This example represents a fresh empty dashboard. For an existing dashboard, add only the settings block, retain every existing view and set the initial route to an actual current-view address. An explicitly saved empty route list stays empty. New views receive the existing navbar surface but are not silently inserted into its configured destinations. Views absent from the list show no false selected destination. HA's view order determines the landing view; conversion places the old landing view first and preserves the rest.

Unknown root/native/settings fields survive patches. A preexisting unrelated `marao` key, unsupported version or ambiguous ownership blocks opt-in/conversion instead of being overwritten. Historical source 0/1/2, envelope 1, compiler contract 1 and new native-authoring metadata 1 remain separate version axes.

HA Core's [2026.10.0 save API](https://raw.githubusercontent.com/home-assistant/core/2026.10.0/homeassistant/components/lovelace/websocket.py) accepts the complete configuration and requires administrator access. The [matching frontend](https://raw.githubusercontent.com/home-assistant/frontend/20260930.2/src/panels/lovelace/ha-panel-lovelace.ts) supplies native save/edit operations and treats strategy dashboards differently. This supports the proposed shape but does not prove every visual edit retains the extension. The first implementation check must establish retention through card/section/view/dashboard-settings/raw edits, undo/redo, save and reload on disposable HA. Failure blocks cutover and requires revisiting this design.

Alternatives rejected: per-page route copies drift; browser storage does not work across devices; a settings card couples global behavior to content; retaining a generation strategy constrains native authoring.

### 2. Bootstrap the existing persistent navbar from the resource

Add a small compatibility adapter to the critical graph that discovers the active `hui-root`, reads its native document and initializes navigation for valid dashboard opt-in. Reuse `MaraoNavigation.js`'s WeakMap/root ownership and single persistent surface; no navbar card, footer, marker or per-view reference is required.

Discovery must cover cold/direct URLs and empty, new, Sections, Masonry and Panel views before any Marao content card mounts. Use route/lifecycle signals with bounded observers along HA's relevant shadow-host path. DOM child-list mutations alone are insufficient for configuration-only saves and current role/theme/edit-mode updates. Encapsulate host updates in one feature-detected adapter; a plain JavaScript controller attached through the host's controller lifecycle is the preferred candidate. It must import no Lit internals, patch no HA prototype and replace no native view.

This is an HA-internal compatibility boundary requiring a bounded installed proof: direct entry without content cards, settings-only updates, fresh role/theme/edit-mode state, single ownership across routes, and full disposal on exit/opt-out. Refuse unsupported opt-in/conversion visibly. Per-view placement or a generated/custom view is not a fallback to the user's automatic-all-pages requirement.

Optional content failures cannot prevent navigation once HA provides the document. Exit/opt-out disposes the surface, controller, listeners, observers, gestures and scoped shell/theme effects. Explicit empty routes remove navigation without fabricating a hidden hold target.

### 3. Small shared settings dialog and native editing access

Add one localized **Marao settings** dialog to the administrator maintenance menu for routes and main-page shortcut preferences. Patch only the versioned settings block after a fresh native-baseline comparison; retain conflicting/failed input. Use current views for destination selection plus explicit external links. Show unresolved destinations for correction without deleting routes or recreating pages.

Conversion opts existing dashboards in. Fresh ordinary dashboards enable the small block through HA's native raw editor using a documented example with one valid existing-view route, then configure it visually through the menu. Instructions preserve all existing views and use the actual dashboard root/path. If navigation is later deliberately emptied, restore it through HA's raw editor; no inaccessible maintenance menu is promised. Initial no-YAML dashboard onboarding is outside this proposal; no extra setup/discovery strategy is introduced.

Keep current role behavior: a three-second administrator hold opens Maintenance, while regular users retain direct cache refresh. Add shared settings alongside Edit dashboard/cache actions. The pencil and Edit dashboard invoke HA's native edit operation instead of a Marao editor path. Recheck privileges/ownership and preserve exactly-once dispatch, haptics and modal guards.

Native editing restores HA's toolbar/host layout and suppresses the floating navbar and viewing overrides. If navigation is empty and both main-page shortcuts are disabled, keep HA's native visible header/edit entry for administrators. This also leaves native raw-settings recovery reachable. Adding an individual Marao card elsewhere never enables dashboard-wide shell changes.

### 4. One catalog-driven native card model

Derive picker entries, defaults and schemas from the existing catalog. Thin catalog-derived element adapters provide distinct named picker entries where required and delegate to shared renderers and one editor implementation. Preserve generic runtime types and hidden compatibility identities without duplicating picker aliases or restoring a parallel `marao-native-*` architecture.

Editors use HA's `getConfigElement`, `setConfig`, `hass` and complete `config-changed` contract. Reuse descriptor/variable semantics instead of unnecessarily renaming public fields. Preserve native layout/visibility metadata, opaque nested options, service command structures, explicit emptiness and absence. Native selectors and existing validation remain shared. Names are occurrence-local; HA entities are not renamed.

Add appropriate Sections sizing and existing Masonry size APIs so HA can resize each individual top-level Marao card. Controls reflow inside their cells while retaining essential touch geometry. Keep `marao-control-grid` for intentional grouped content, not as a whole-page wrapper. Native outer spacing can differ from generated grids; layout now belongs to HA.

Extract specialized forms before deleting panel ownership. `floor-plan-editor.js` currently depends on panel methods and needs a small editor-host interface; energy disclosures keep presentation state outside saved values. Move shared validators, schema/patch helpers and EN/PT labels to surviving owners.

| Family | Retained configuration/runtime |
| --- | --- |
| Light/fan/cover/sensor/switch/battery | Bindings, names/icons, graphs/thresholds, sliders and current availability behavior |
| Room/Entity Group/scenes | Explicit ordered members, per-member options, summaries/filtering and detail behavior |
| Climate/access/alarm | Existing modes/targets, bounded requested-setting feedback, unified access settings, strict slides/holds and transient PIN handling |
| Energy/graphs | Period, units/precision, ordered collapsed contributors, names/cost sensors, pricing and ordered power devices |
| Wallbox current | Number/input_number binding, existing up-to-three presets, authoritative selected shortcut color |
| Generic numeric input | Current stepper/settings; no new shortcut row is implied |
| Media/camera | Inline/popup mode, apps/remotes/volume targets, popup stream/provider/events and fullscreen return behavior |
| Floor plan | Image upload/replacement, controls beside preview, marker-opened light dialog, strips, YAML-only coordinates, Lights list and full-page mode |
| Vacuum/appliances/weather/information | Existing command data, warning semantics and presentation choices |

### 5. Card-owned composition and popup lifecycle

Extract pure per-card detail composition from `compile-dashboard.js` into a shared owner used by native cards and conversion. Reuse current `MaraoPopupCard`, history and light-color sheets. Media/climate/access/alarm/camera/group/scene/energy/floor-plan cards own automatic details, loaders and cleanup without separately generated siblings.

Allocate automatic popup identities per live occurrence, so HA duplication cannot make copies share details merely because persisted IDs match. Preserve deliberate external popup references and custom fragment attachments without competing automatic sheets. Scope legacy explicit hashes to the dashboard and block ambiguous conversions. Retained raw/custom sheets remain ordinary authored content.

All picker/card/conversion previews and native edit mode are inert, including nested controls, fullscreen, navigation and security actions. State remains readable. Composition and validation never invoke services. Shared runtime availability, dispatch guards, climate reconciliation, haptics and readable errors remain the action owners.

### 6. Explicit conversion with complete data accounting

Extend the existing ordered `MaraoSource.js` / `convert-document.js` engine and offline converter. Classify strategy envelopes, supported historical source, recognized historical standalone documents, ordinary native documents and invalid/newer input. Ordinary native documents are never adapted back into builder source.

Keep the current strategy's source renderer read-only with export/conversion guidance until explicit conversion. Do not keep the full builder as an active second editor. Convert source into independently editable native cards/sections, materializing the currently resolved automatic grouping/order and fixed mixed layouts. Preserve intentional raw containers, empty sections, full-page Panel floor plans, explicit links and custom popup contents. Do not reset from registry discovery.

Account for each source element as active target data or retained provenance. Preserve opaque native values in place; retain unmapped source-only fields and original embedded YAML strings in an inert versioned `marao.migration` provenance record. Keep exact original document/source text in the recovery export too. Provenance is immutable origin data, never a generator or an automatically maintained second source. Report dispositions; native YAML editing can reformat comments while exact originals remain recoverable. Required unresolved private files/includes/secrets remain blockers.

The recovery export includes the received native document, exact original source text, protected YAML supplements, proposed native document and hashes/version manifest. The manual guide also requires a matching package and private HA/affected-state backup; browser exports cannot claim byte-exact server storage-file snapshots. Recovery data never ships in `dist`. Stored provenance shares HA's authenticated source-read boundary; reuse explicit visibility/dependency review rather than moving private data silently.

### 7. Stage once, save explicitly and recover within HA's limits

Preview is read-only. Before import verify supported HA/assets, settings/bootstrap compatibility, source validity, custom-content mapping, privacy/dependencies, same root/registration and a fresh baseline. Prepare recovery data and the complete target before one explicit administrator native replacement save. Preserve registration settings; do not recreate dashboards or rewrite resources/themes.

Reuse single-flight/pre-save checks. A client hash or local lock is not global compare-and-swap; two simultaneous writers retain HA's last-writer limit. Native acknowledgement/readback does not independently prove disk durability. Save errors preserve input/exports and require re-reading/classifying current data before retry.

After interruption: unchanged original can be explicitly retried, matching converted state resumes native editing without reconversion, and divergent state stops for reconciliation. Never overwrite a concurrent edit during recovery. Rollback restores the matching package and exact backed-up affected data together, preserving unrelated state. Export any subsequent native edits before restoring the old snapshot; reverse-compiling them into the old source is unsupported. There is no new Configuration History/Restore feature.

### 8. Retire assets by surviving responsibility

Keep the stable `MaraoFrontend.js` entry and coherent flat hashed HACS graph. Move only reusable forms/catalog/localization, conversion and read-only compatibility rendering into surviving bundles. Remove panel/Monaco dependencies and build entries after parity/conversion are verified. Update `build-native.cjs`, readiness/version checks and refresh deferral for native editing/dialog ownership. Produce no new frozen Python Integration release.

Update installation/configuration/native-authoring/migration docs, README, source/check maps and affected project guidance. This change supersedes the former native-authoring retirement and builder-specific deltas. During later spec synchronization apply this change after affected completed builder deltas and reconcile capability purposes/historical notices so removed authoring requirements cannot return. Historical evidence remains immutable.

### 9. Verify the concrete host and migration risks

Reuse Node native-source/session/strategy/compiler/converter, model/preservation, floor-plan and navigation suites. Rehome meaningful panel form assertions before removing panel-only tests. Catalog-wide schema/patch assertions cover shared behavior. Add provenance-backed v0.23.4 input with independently specified ordinary-target expectations for opaque fields, emptiness, raw/custom YAML, duplicates and shared navbar.

The automatic host adapter needs one targeted installed compatibility check because pure DOM stubs cannot prove native normalization/edit lifecycle behavior. Conversion needs one focused preserved-install migration/recovery check because it replaces the active persisted document: exact originals, same-root registration, independent saved-state comparison, reload retention, failure classification and matching rollback/reapply. Reuse backup/upgrade helpers and safe fixtures; do not introduce a general browser harness or theme/device matrix. Camera playback/transport remains manual-only.

Final installation uses `prepareFrontend()` after final edits and essential checks, with readiness detection adapted for ordinary dashboards. Asset installation never converts configuration implicitly. Use `ha:sync` only for changed fixtures/setup. Retain the single `/marao-dashboard` root, helpers and final converted test configuration. Routine phone/appearance checks belong to the user. Publication unit gates run only on a later push/tag/release request.

## Risks / Trade-offs

- HA host lifecycle/normalization changes -> one compatibility adapter, pinned primary references and bounded installed proof before opt-in/cutover; clear refusal on unsupported hosts.
- Premature builder removal loses configuration/popups -> extract and verify shared forms/composition first, retain read-only source rendering.
- Opaque fields/YAML disappear -> explicit mapping, inert provenance, exact originals and independent expectations; block unmappable behavior.
- Copied IDs join duplicate details -> live-occurrence ownership; preserve explicit external references separately.
- Native layout differs from generated geometry -> retain content/order/initial sizes and essential control geometry; document native layout ownership.
- Global shell changes hide editing or leak -> opt-in scope, edit restoration, empty-navigation fallback and disposal checks.
- Concurrent writes/disk failures -> disclose native limits, fresh baseline comparison, exact recovery data and honest failure classification.
- Some compiler code remains for legacy reading -> isolate conversion/read-only compatibility from ordinary authoring; no second builder.

## Migration Plan

1. Capture implementation baseline/dirty state and reviewed affected consumers; prove shared metadata and automatic host integration before conversion is enabled.
2. Implement catalog/editor/sizing adapters and card-owned details; preserve the old renderer read-only while the transition is prepared.
3. Implement deterministic native conversion/provenance/recovery through the existing historical chain and independent expected data.
4. Perform the scoped preserved-install migration/recovery check on disposable HA, retaining exact backups through failure. Reapply final conversion after rollback proof.
5. Redirect edit actions, retire active builder assets and align packages/docs/readiness. Rebuild the flat distribution.
6. Sync final applicable assets once after final edits/checks, preserve safe helpers and the converted disposable dashboard, then hand off a short watch list for sizing/visibility, specialized editors, details and shared navigation. Applying this proposal does not publish a release.
