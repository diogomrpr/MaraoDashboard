# Tasks

## 1. Baseline and compatibility

- [x] 1.1 At implementation start record the current commit, dirty state, acceptance cases and affected popup/toolbar consumers; capture `/private/tmp/simplify-popup-editing.json` with `npm run test:affected -- --snapshot`, and verify task scope against the actual current diff rather than assuming this planning baseline is unchanged.
- [x] 1.2 Confirm supported automatic, linked and externally owned configurations against the existing native/popup fixtures and frozen released inputs; record preservation of unknown fields, explicit emptiness, member options, raw cards and source references without rewriting historical fixtures or bumping unrelated versions.

## 2. Native popup authoring

- [x] 2.1 Add localized Edit popup to the native editor for actual popup-owning configurations, resolving document/runtime contexts separately and retaining the existing layout selector. Add small assertions in `native-card-editor.test.js` for linked-source navigation, absence on nonowners, administrator/connection guards and edit-mode availability without device actions.
- [x] 2.2 Implement the save-first draft policy before either creation or navigation. Verify new/dirty cards and unresolved dashboard drafts keep their complete draft, show EN/PT guidance and perform no navigation or write; verify native Save then reopen enables editing, while Cancel and editor removal invalidate pending work.
- [x] 2.3 Adapt the existing guarded source-creation helper for a validated native authoring context. In `popup-layout.test.js`, verify one append-and-bind save, independent expected preservation data, stale/duplicate refusal, lifecycle rechecks, exact recovery export, uncertain-save readback without retry and reuse of the confirmed source on later edits.
- [x] 2.4 Remove shared runtime popup authoring tools and obsolete unused copy while retaining linked rendering and modal/preview safeguards. Verify ordinary open/preview/reload never creates views; review close/focus/inert cleanup and source-editor return/reopen behavior through existing focused assertions, using one safe installed-host inspection only if the native dialog boundary requires it.
- [x] 2.5 Update the current popup guide, relevant troubleshooting and native architecture documentation for Edit popup, first explicit edit and native save-first behavior. Review existing safe Home/Cases and documentation playground examples; update only affected examples, keep `/marao-dashboard` ownership and verify changed links/configurations remain accurate.

## 3. Concise shared summary toolbars

- [x] 3.1 Remove the routine eligible/skipped `info` element and sentence from the shared group renderer, including any resulting empty spacing, while retaining button labels, semantic scope names and the service-error element. Verify by diff review that automatic and linked whole/section toolbars for covers, lights and climate share the change and batteries gain no actions.
- [x] 3.2 Adapt existing affected mocks and reuse the smallest relevant collection/popup assertions to confirm unchanged explicit target scopes, filter independence, access-opening exclusions, disconnected/no-eligible disabling and once-per-interaction behavior. Retain reported-error visibility; do not add tests that merely mirror the deleted markup.
- [x] 3.3 Update the collection guide, Entity Group reference and affected safe examples to remove promises of a persistent eligible/excluded explanation. Verify they still describe ordinary-cover bulk actions, individual access slides and readable service errors without introducing replacement diagnostic UI.

## 4. Final integration and installation

- [x] 4.1 Review the task-only diff and use `test:affected -- --since /private/tmp/simplify-popup-editing.json --tier focused --component <reviewed IDs> --plan` to select the smallest serial checks for the concrete native-draft/dashboard-write risks. Complete the selected existing unit assertions, regenerate source-owned assets with `npm run build:editor`, and run `openspec validate simplify-popup-editing --strict`; do not expand into full/browser/mobile/camera campaigns.
- [x] 4.2 Install final applicable frontend changes once on disposable `192.168.0.28` through direct `prepareFrontend()`, retaining dashboard configuration, safe helper state and recovery data. Verify served assets/readiness and leave them installed; use full `ha:sync` only if changed fixture/setup requirements demand it. If blocked, report not installed / not ready for test.
- [x] 4.3 Compare implementation/evidence with all requested outcomes: one Edit popup action during native authoring, first-edit preservation, no runtime creation toolbar, linked layout reuse, draft retention and no routine text beneath shared bulk buttons. Hand off the test URL/reload guidance and a short manual watch list for edit/return/reopen and toolbar presentation; report selected checks and any known limitations honestly.

## Workflow follow-up

- This request creates planning artifacts only. Start implementation only after a separate apply request; keep all implementation tasks unchecked until verified.
- A later specification sync must reconcile this change with the superseded runtime-authoring and routine-eligibility clauses in the older completed popup/summary changes. Preserve their historical evidence; archive only separately requested, completed and verified work.
- Before any later push, tag or release, run unit-only `npm run verify:publish` across the release candidate and the applicable package metadata/final-candidate installation gates. Additional integration/full testing requires an explicit request.

## Implementation evidence

- Starting commit: `e613bf85422a9b749e58c0618f7f9c5327c6e2dc`; starting dirty work contained only this change directory. Snapshot: `/private/tmp/simplify-popup-editing.json`.
- Acceptance scope: native Edit popup for automatic/linked owners, save-first draft retention, read-only runtime sheets, shared bulk-row removal, unchanged action safeguards.
- Compatibility review: current native/popup fixtures and the frozen v0.17.0/v0.20.0/v0.21.1 native inputs retain their descriptors and ownership. No fixture provenance, persisted formats, release metadata or generator contracts are rewritten. Existing independent append-and-bind expectations cover unrelated raw cards, native sizing, visibility, unknown fields and explicit emptiness.

- Verification: 54 focused Node assertions passed serially across popup layout/preservation, native card editor/bootstrap, collections, native cards/edit context and the existing live-group filtering assertion. `npm run build:editor`, strict change validation and diff whitespace review passed. The selector plan is retained at `/private/tmp/simplify-popup-editing-plan.json`; the concurrent `choose-bundled-media-app-logos` planning files were excluded using reviewed file arguments. Broader mapped suites, mobile/theme matrices and camera transport checks were not run.
- Installation: disposable native frontend `89fc756f17c75b68218ee4b2a2bd033d1d91c0470d84caf9a17705f9f166b999` installed successfully with served-asset/readiness verification. The preview reused that unchanged installation. No production instance or physical action was used.
- One installed-host visit confirmed Editar popup is available in the native card dialog, resolves its sibling runtime root, creates exactly one source and reference, closes the dialog and opens the Sections view in native edit mode. The recovery export matched exact original/proposed documents. The temporary view/reference were restored only after checking that the dashboard had no concurrent changes; user configuration and helper states were retained. Runtime popup checks confirmed no authoring toolbar, no repeated eligibility text and labeled bulk buttons. Native dialog entry used keyboard activation; real-phone touch/layout testing remains manual.
- Private before/after/recovery documents remain under `/private/tmp/simplify-popup-*`; no private configuration was added to the repository. The preview browser and watcher were closed.

### Summary popup source follow-up

- Reported missing Edit popup on overview summaries. The disposable instance confirmed native summary descriptors retain `variables.popup_hash` references to saved popup definitions; the editor previously excluded those owners.
- Snapshot `/private/tmp/summary-popup-editor.json` preserves the starting dirty work. Hash-backed native authoring now resolves the saved popup in the invoking view, reuses its source, or seeds and binds the saved popup definition on first explicit edit. Summary hashes, original popup content and shared ownership remain unchanged. Missing/duplicate sources and unsaved drafts fail without writes; no automatic migration or runtime ownership change was introduced.
- 44 targeted Node assertions passed across native-card-editor and popup-layout, including external-source reuse, exact append/bind preservation, retained member options, no duplicate creation and missing/ambiguous/dirty failures. Editor build, strict OpenSpec validation and whitespace review passed. Scope plan: `/private/tmp/summary-popup-editor-scope.json`.
- Frontend `d0b3e673f196cf3b2ef9d84a23e6a53967f948e3000381161c753d8ff1bfad4c` is installed on disposable `192.168.0.28` with served-asset checks. Chrome confirmed Editar popup is visible and enabled on the actual overview summary, opens its existing Sections source in edit mode and closes the card dialog with zero save attempts. First-edit source writes were covered by the focused preservation assertions; no dashboard data or device state was changed during the browser visit. Task-owned Chrome and its watcher were closed. Full/mobile/camera checks were not run.
