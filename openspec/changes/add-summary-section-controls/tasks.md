# Tasks

All tasks below are future implementation work. This request creates planning artifacts only.

## 1. Additive section configuration and native authoring

- [x] 1.1 Record the implementation starting commit, acceptance cases, dirty state and shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/summary-section-controls.json` and review supported flat native/converted group inputs. Verify a written compatibility assessment preserves existing formats and flags any incompatible boundary before writes.
- [x] 1.2 Extend the shared group schema/validation and native descriptor adapters with optional `summary_sections` references; add focused existing-model round-trip assertions for omission, explicit emptiness, unknown fields, member options, stable IDs, duplicate assignments and dangling references. Verify invalid drafts leave valid saved data untouched and missing HA entities remain saved references.
- [x] 1.3 Extend `frontend_src/native-card-editor.js::_renderGroup` with section add/rename/order/delete and member assignments; retain unassigned members and prune references on deliberate member removal. Verify Save/Cancel, Visual/YAML round trips and member-option preservation with the existing native editor harness; document section authoring and Other behavior in the Entity Group usage guide.

## 2. Shared section rendering and scoped actions

- [x] 2.1 Carry sections through `card-composition.js` and retained JS compilation, and reconcile headings/toolbars/keyed member hosts in the shared group sheet. Verify section/member order, flat compatibility, unassigned Other, empty filtered sections, mounted-control preservation and independent duplicate ownership with the smallest existing composition/runtime assertions.
- [x] 2.2 Add summary-wide and section-wide light/climate action resolution from complete configured membership, explicit deduplicated targets, current availability and supported native capabilities. Verify Active only cannot narrow targets, sections cannot affect siblings, unsupported climate modes are not guessed, previews remain inert and room All off behavior is unchanged; document actual target/exclusion semantics alongside the controls.
- [x] 2.3 Add distinct Open all / Close all at both cover scopes using shared access classification and capability guards. Verify ordinary covers receive the corresponding explicit action once, unsupported closing is skipped and doors/gates/garages never enter tap-based Open all; retain individual strict slides. Document this access exception and mixed-capability behavior.
- [x] 2.4 Integrate immediate feedback, duplicate-submission guarding and retained scope-local reported errors without retries or fabricated physical success. Verify rejected/partially accepted calls, disconnection/unavailability changes at activation and filter updates cannot resend a request, using targeted existing action-harness assertions.
- [x] 2.5 Add localized EN/PT toolbar, section, empty, exclusion and error copy using existing labels/theme/semantic controls. Review wrapping and visible 48px targets against the mobile contract and provide a short manual watch list for 320px/enlarged text, title/close reachability and navbar clearance; no automated layout matrix is required.
- [x] 2.6 Update the existing safe gallery and one realistic page under `ha-test/` with two floor sections for lights and a cover example reusing fake helpers. Verify fixture references are safe and confined to `/marao-dashboard`, and update native card configuration examples without adding test-only shipped assets.

## 3. Focused verification and installation handoff

- [x] 3.1 Review the actual implementation diff and select `test:affected -- --since /private/tmp/summary-section-controls.json --tier focused --component <reviewed IDs> --plan` for the concrete access-dispatch and persisted-section risks. Run only the smallest relevant serial checks from earlier tasks; verify filter-independent scope, once-per-target dispatch, access exclusions and lossless configuration. Report exclusions and failures; no full/parallel/camera campaign is implied.
- [x] 3.2 Build applicable assets and install the final batch on disposable `192.168.0.28` using direct `prepareFrontend()` when compatible, or `ha:sync` only if needed. Verify installed current-asset/readiness checks and preserve existing dashboard data/helper state; recover failed operations with exact backups and matching package/data. Leave final assets installed for the user, or explicitly report not installed / not ready for test if blocked.
- [x] 3.3 Compare each requested acceptance case with the final implementation and selected evidence: top-level actions, editable floor sections, top actions per section, separate cover Open all / Close all, complete configured scope despite filtering, safe access handling and retained selections. Deliver the test URL, any reload requirement, actual checks and the short feature-specific manual watch list; leave unsupported/unverified outcomes explicit.

## Workflow follow-up

- Implementation requires a separate user request invoking `openspec-apply-change add-summary-section-controls` or equivalent authorization.
- Before any separately authorized push/tag/release, run unit-only `npm run verify:publish` across that candidate and the required release installation/metadata checks. Additional integration/full tests require an explicit request.
- Archive only after implementation, essential verification and disposable installation are complete; artifact validation alone does not complete this feature.
