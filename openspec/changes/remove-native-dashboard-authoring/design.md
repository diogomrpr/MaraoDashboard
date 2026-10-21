# Design

## Context

See `proposal.md` for motivation and the three capability deltas for acceptance requirements. The native-authoring feature crosses Python compilation, frontend wrappers, shared card registrations, navigation, build outputs and verification selectors. Removing only the wrapper files would leave picker entries and broken imports.

Two dependencies require care: MaraoDashboardPanel imports camera form helpers from `frontend_src/native-model.js`, and `native_storage.py` supports released generator installations as well as excluding independently owned native dashboards. Neither dependency justifies retaining the standalone authoring product.

## Goals / Non-Goals

**Goals:** delete the second authoring path at its entry points and dependencies; retain the minimum ownership recognizer and builder helpers under their surviving owners; make reduced verification scope observable.

**Non-Goals:** add a compatibility runtime, origin checks on shared renderers, a data-format change, a new abstraction layer or an automatic converter. Do not redesign camera playback, navigation, mobile layouts or the editor while removing their native-authoring branches.

## Decisions

### Remove discovery and adapters together

Delete the native cards, native navbar and native editor sources, native labels/model remnants and dedicated catalog/bundle outputs. Remove their build entries and runtime imports from MaraoDashboard and MaraoRuntime. Remove the starter strategy, injected configuration editors and entity suggestions. Audit picker registrations in MaraoCards, MaraoRuntime and MaraoFrigateEventsCard as well as MaraoNativeCards; all Marao native-picker entries go away.

Keep the shared custom-element definitions and generated card contracts. A runtime restriction on manually authored YAML would add complexity without helping the requested removal. Merely hiding picker entries was rejected because it preserves adapter maintenance and its test burden.

### Move only helpers used by the generator editor

Move `cameraTitleFields`, `formData`, `patchForm` and the equality helper still used by MaraoDashboardPanel into the existing `editor-model.js` owner, adapting imports without changing semantics. Preserve validation, unknown values, error handling and localization. Delete native-only form definitions after their consumers are removed. Retaining the whole native model would hide an unnecessary dependency; a new generic form framework is unnecessary.

### Separate discontinued ownership recognition from compilation

Remove the native/card and native/starter command handlers and registration, and delete the native compiler/catalog once callers are removed. Move the small `native_owned` recognition logic to `native_storage.py`, where existing historical discovery already needs it, and update lifecycle imports. Keep marker, strategy and alias recognition as a conservative exclusion from adoption and writes.

Retain historical storage-backed generator discovery, `convert_native_storage_dashboard`, staged saves, exact backups and cache recovery. Those paths refer to older generator installations, not the discontinued standalone wrappers. Deleting everything named native would break supported upgrades; keeping the compiler solely for its ownership predicate would retain needless product code.

### Preserve generated startup and shared behavior

Remove standalone-owner detection and the native edit-pencil behavior from navigation while retaining early generated-navbar loading, overflow, generated popups and normal HA shell restoration outside Marao dashboards. Retain runtime loading errors and refresh recovery. Home Assistant's camera player, native controls and native gesture assertions remain supported. No theme or action-safety behavior changes are intended.

### Retire tests by behavior, not filename

Remove native authoring suites, native examples and their selectors in `tests/verification-map.js`, package scripts, shared UI batching and disposable fixture preparation. Rehome any unique assertions for generated rendering, camera forms, navbar/popups or independent-dashboard protection before deleting their old tests. Keep historical native-storage migration fixtures and independently specified expected outputs. Minimal ownership fixtures may retain discontinued aliases as data; they are not a supported native demo.

Capture before/after affected plans for the same reviewed camera-editor, navigation, grid and shared-renderer scopes. Compare logical check identities, not only counts, and document where surviving assertions live. Use the focused tier because lifecycle/API/ownership contracts change. Run selected checks serially and inspect the relevant generated pages and gallery on the disposable instance. Do not turn all supported card families into an exhaustive device matrix.

### Keep current documentation coherent without rewriting history

Update supported-workflow documentation, source/check guidance and build instructions. Keep the existing native-dashboard documentation URL as a concise breaking-removal notice directing users to the generator. Explain that standalone saved dashboards remain but their removed types cannot render.

The completed, unarchived `support-native-dashboard-editing` change is historical evidence, not a baseline capability to resurrect. During later spec synchronization/archive, explicitly record its authoring requirements as superseded and avoid syncing them into main specs. Coordinate only directly conflicting native obligations in active camera and navbar work; preserve unrelated concurrent edits and historical reports.

## Risks / Trade-offs

- Existing native cards stop rendering → This is the selected breaking behavior; document it prominently, retain saved data and provide the generator workflow as the supported alternative.
- Deleting shared helpers or registrations breaks generated cards → Move retained helpers first; audit imports/build outputs and check generated editor, popup, camera and navigation consumers.
- Overbroad ownership cleanup adopts foreign data → Preserve conservative recognition and verify exact saved configuration and registrations before and after collision/setup/history cases.
- Reduced checks accidentally remove shared assertions → Map surviving assertions before deleting suites and compare equivalent affected plans.
- Stale clients reference removed assets → Verify fresh current resources and the existing frontend refresh/recovery path; do not ship obsolete bundles as a compatibility mode.
- Concurrent camera/navigation work changes dependencies → Review actual task hunks and current consumers at implementation time without absorbing unrelated changes.

## Migration Plan

1. Begin implementation with a fresh commit/file baseline and explicit affected components. Preserve representative released generator fixtures, independent expected outputs and exact independent-dashboard data for comparison.
2. Establish focused ownership and historical migration checks first. Relocate helpers/recognition, then remove APIs, adapters, discovery, build outputs and native-only branches as one coherent change.
3. Update generated coverage, fixtures, selectors and current documentation. Validate the built asset graph contains no retired imports or shipped bundles and verify unsupported commands do not write data.
4. Verify the supported generator editing/generation workflow and current generated cards, popups, navigation and camera playback on the disposable instance. Confirm independent saved data and registrations are unchanged and compare affected-plan selections.
5. A later explicit publication request chooses and documents the breaking release version and runs the scoped publication gate. Because lifecycle/upgrade paths are touched, select relevant preserved-install upgrade evidence then; do not publish as part of this proposal or silently request comprehensive tests.

No persisted format bump, standalone conversion or data rewrite is introduced. Existing ordered generator conversions retain their backup, preflight, atomic write and failure-recovery contracts. For a failed deployment, restore the matching package and backed-up affected owned data together; preserve unrelated concurrent edits, independent native dashboards and immutable archived history. Do not roll back another dashboard's data merely to restore the old package.
