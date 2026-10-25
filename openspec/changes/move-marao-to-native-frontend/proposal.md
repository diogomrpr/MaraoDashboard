# Proposal

## Why

Marao's frequently changing editor/catalog/generator ships as a Python integration, so ordinary updates ask users to restart all of Home Assistant. Move ongoing dashboard operation and distribution to Home Assistant's native frontend/storage facilities while proving that an existing customized installation can migrate, recover and receive later frontend updates safely.

## What Changes

- Make a self-contained HACS Dashboard resource, a JavaScript dashboard strategy and Marao's existing visual/JSON builder the final product. Normal Marao updates require a client refresh, not an HA restart. There is no permanent Marao Python integration, companion app, external server or CDN.
- Keep `diogomrpr/MaraoDashboard`. After backing up each instance, remove its old HACS Integration registration and add the same repository again as Dashboard. Do not mutate HACS private storage or create another repository. Verify the first frontend stable release is available before cutover: HACS validates the latest stable tag before offering version selection; a frontend prerelease alone does not replace the old Integration layout.
- Move the canonical model, validation, catalog, templates, ordered legacy conversion and dashboard compiler into shared JavaScript. Reuse the current custom elements, native HA services/history/media APIs, layout, navigation, popups, localizations and bundled Monaco.
- Provide a self-contained offline browser converter: paste any historical configuration JSON, translate and copy/download a native dashboard document without HA's builder, a local server or a build step. Infer deterministic values and historical defaults; ask short conditional UI questions only for genuinely missing information. Preserve input and answers, keep supplemental metadata/custom content optional, and never invent missing room membership or discard unresolved content.
- Keep adjacent source-format migrations (0→1→2 and future N→N+1) in one shared ordered chain. Future changes that require conversion add one step and independent expectations; ordinary compatible releases need no format bump. Preserve historical step/default behavior and test every historical input through the complete chain.
- Replace ongoing generated YAML and configuration-file patching with a native HA storage dashboard, preserving the existing dashboard root, ordered views and user meaning. Keep source-format, storage-envelope, compiler and package versions separate.
- Use the user-selected guided manual migration: export open drafts, make exact private per-instance backups, convert JSON locally, remove the legacy integration/YAML registration through supported HA/HACS operations, then create/import a native dashboard at the same address with the saved sidebar settings. Document interruption/recovery and matching package-plus-data rollback. A one-time restart and administrator participation are accepted; no new Python migration integration or automatic in-place bridge is built.
- **BREAKING, explicitly requested:** remove configuration version-history creation, the History UI and historical restoration from the new product. Preserve existing archives unchanged as legacy data; migration recovery backups are separate and mandatory.
- **BREAKING, explicitly permitted:** remove Marao's custom Netatmo metadata endpoint and typed detection filters if native HA cannot supply them directly. Retain ordinary HA-native camera support and offer basic Netatmo recording browsing only through a small, verified native-media frontend adapter. No Netatmo upstream change or replacement backend is a prerequisite.
- **BREAKING storage/API boundary:** native dashboard configuration is readable under HA's dashboard authorization model. Do not silently expose formerly private source-only content: require an explicit migration disclosure and preflight, preserve unknown fields, and block data with unresolved privacy requirements. An admin-only panel or hidden dashboard is not a private data store.
- **BREAKING API boundary:** the Python file-based generation service and management endpoints cannot remain available after Python removal. Inventory dependent automations/tools, specify browser import/export and native-save replacements, and block handoff while any dependency lacks an administrator-approved disposition. Do not silently remove a public workflow.
- Plan rigorous, serial verification of compiler parity, supported released installations, preservation/security, interruption/recovery, stale clients, actual HACS handoff and a subsequent update without restarting HA. Camera playback/transport remains manual-only.

## Capabilities

### New Capabilities

None. Extend the existing lifecycle, generation, builder, camera and verification boundaries rather than creating a second authoring product.

### Modified Capabilities

- `integration-lifecycle`: frontend-only steady state, capability/privacy gates, versioned native storage, guided manual migration, exact backup and package-plus-data rollback, removal of product history and obsolete Python APIs, and replacement frontend freshness coordination.
- `dashboard-generation`: browser-side deterministic compilation and native storage instead of ongoing YAML writes; preserved custom content and released-format conversion.
- `visual-builder`: preserve the full visual/JSON builder with native persistence, remove History, retain drafts/validation and define the editor-route transition.
- `camera-history-content`: native-only Netatmo behavior, optional basic recordings and explicit removal of unsupported typed-event guarantees; other cameras and sensor history remain supported.
- `gallery-release-verification`: frontend packaging, modern released-install fixtures, migration/recovery/privacy evidence and proof of a later restart-free frontend update.

## Impact

Planning refresh baseline: `459084c120e2641b6fa1b72fc74a822cf43b310d`, repository version v0.21.1, 2026-10-25. This supersedes the original v0.20.0 planning baseline; the earlier implementation attempt started at `d9bda6d2e2cbce844da3e307194322b6662ca6e1`. Preserve the integrated sensor thresholds, secondary triggers and access request feedback, plus v0.21.1 final-release slide handling, access-popup hierarchy and shared navbar/popup spacing. Existing dirty/untracked frontend foundations are partial work to review and reuse, not completed native migration. Implementation is authorized. On 2026-10-25 the user selected guided manual migration over the automatic in-place bridge; no new bridge release is required.

Affected runtime consumers: every supported Marao card and sheet, navbar, shared controls, embedded HA cards, camera-provider UI, graph/energy/history views, builder, themes, localization, assets and existing installations. Sensor/recorder history is unrelated to the removed configuration-history feature.

Implementation reaches `custom_components/marao_dashboard/` (legacy compiler/lifecycle/recovery and editable shipped frontend), `frontend_src/`, HACS staging and metadata/workflows, `tests/`, `ha-test/`, current installation/update/configuration/development documentation and affected active OpenSpec work. Keep shipped source in the project-owned tree; emit frontend release artifacts through the existing staging boundary. The user selected the existing repository and manual migration on every instance. No additional repository is authorized. Stable publication remains a separate final step after a reviewable candidate and required checks; do not silently turn the approved test-prerelease work into stable publication.

Compatibility covers historical native storage, source formats 0/1/2 and generated contracts through the v0.21.1 baseline, including custom roots, explicit emptiness/deletions, order, raw/unknown settings and protected custom YAML. Source format remains 2 and generated contract remains 3; the recent runtime fixes do not justify a JSON migration. Add a provenance-verified v0.21.1 package/source/output baseline alongside representative older contracts, verifying the actual release/tag before labeling evidence as released-package execution. The existing historical runner's latest true released-package baseline remains v0.5.1. Preserve exact old source/output/history/package/configuration bytes for rollback. Never treat a package-only downgrade as recovery.

The final plan has hard gates for native API/version support, source privacy, public-service dependencies, HACS category/package handoff and verified manual recovery. HA 2026.10.4 and frontend 20260930.5 establish strategy/editor feasibility, not complete parity. Upcoming 2026.11 Marketplace behavior must be tested at its stable boundary before it is promised.

Native dashboard save semantics are explicitly accepted: HA may acknowledge and notify an in-memory change despite a logged storage write failure. Marao follows built-in dashboards, preserves drafts on reported errors and offers manual JSON export; acknowledgment/events/readback are not independent disk-durability proof. This is tracked in [Core #188548](https://github.com/home-assistant/core/issues/188548) and does not block the transition or weaken exact migration backup/recovery requirements.

Non-goals: a standalone app/container, a permanent fallback Python backend, resurrection of retired standalone native card wrappers, visual redesign, unrelated card features, automatic deletion of old archives, synthetic camera transport tests, automatic in-place migration, or publishing a release.
