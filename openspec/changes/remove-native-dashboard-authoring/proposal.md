# Proposal

## Why

Supporting both Marao's generator and Home Assistant's dashboard builder adds a second set of configuration forms, runtime adapters and verification paths. Return to one supported authoring workflow to reduce maintenance and repeated testing: Marao's visual/JSON builder → generator → generated dashboard.

## What Changes

- **BREAKING:** remove standalone `custom:marao-native-*` cards, native configuration forms, card-picker entries, entity suggestions and the Community dashboard starter. Existing standalone native dashboards remain saved but removed types no longer render; no compatibility renderer or automatic conversion is provided.
- Remove `marao_dashboard/native/card` and `marao_dashboard/native/starter`, their compiler/catalog code and dedicated frontend bundles/loading paths.
- Keep the generator's visual/JSON editor, shared card renderers, theme, navigation, generated detail sheets and Home Assistant camera playback. Move the small form helpers still consumed by the builder before deleting native-only modules.
- Keep supported generator upgrades/recovery and minimal discontinued-dashboard recognition so setup, generation and history restoration cannot adopt or overwrite independently owned data.
- Remove native-only tests, fixtures and selector dependencies. Retain shared assertions in generated-dashboard coverage and compare equivalent affected-test plans to demonstrate reduced scope without claiming unmeasured time savings.
- Update current documentation, capability requirements and relevant active work to the generator-only product boundary; retain historical records.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: establish generator-only authoring, remove native creation/editing surfaces and preserve the generator editor and its shared rendering contracts.
- `integration-lifecycle`: retire native compilation endpoints/assets while preserving independent-dashboard isolation and historical generator compatibility.
- `gallery-release-verification`: remove standalone-native verification and fixtures while retaining generated behavior and ownership checks, with explicit evidence of selection reduction.

The completed, unarchived `support-native-dashboard-editing` change contains native requirements that are not yet in the main spec inventory. This change supersedes its authoring/starter/standalone-parity promises. Do not sync those superseded requirements back into the baseline when archiving; retain its original artifacts as historical evidence. Data isolation remains required here.

## Impact

Planning starts at `68a9deb96ffd5164949ac6c20f040beed57d654d` with unrelated dirty work present; baseline: `/private/tmp/marao-native-removal-proposal.json`. This artifact-only task has an empty affected-card set. Implementation affects all native card variants and the shared runtime/bootstrap, navbar, camera-editor and popup consumers used by generated cards.

Observed dependencies include native wrappers/editors/catalog builds, two WebSocket compiler endpoints, card-picker registrations in shared renderers, builder camera helpers imported from `native-model.js`, and native tests selected by camera, navigation and grid changes. Code named `native_storage` also supports released generator installations and is not wholesale-removal scope.

Compatibility: the user explicitly selected full breaking removal for the recent standalone-native feature. Preserve generated `hc_*` contracts, generator JSON formats, selections/order/options/unknown fields, raw/protected content, independently owned registrations and immutable history. No new persisted format or data rewrite is proposed. Saved raw references to removed native types remain saved but unsupported; preservation does not promise their rendering.

Non-goals: removing Marao's own builder, removing HA-native controls/player internals, blocking manually authored YAML from referencing surviving shared renderers, adding a migrator/compatibility mode, rewriting historical archives, implementing unrelated camera work, publishing a release or running comprehensive verification. This proposal workflow creates planning artifacts only; implementation requires a later apply request.
