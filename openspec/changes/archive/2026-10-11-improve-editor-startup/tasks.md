# Tasks

## 1. Reproducible startup baseline

- [x] 1.1 Add a focused editor-startup check using the existing Playwright dependency and safe disposable configuration. Measure navigation, panel definition, shell, management response, visual DOM and usable native controls, plus resource bytes/counts and long tasks; collect three cold and three warm samples on `192.168.0.28`. Verify readiness uses populated enabled controls rather than the toolbar, keep artifacts private, and document the command/profile and dated baseline in the local-development guide.

## 2. Defer JSON-only assets

- [x] 2.1 Move existing Monaco/JSON setup into one JSON-specific source entry and update `build-editor.cjs` plus committed generated files. Add a focused build/import-graph assertion that Monaco is absent from eager Visual assets, eager JavaScript is at most 128 KiB and eager CSS at most 32 KiB; verify `npm run build:editor` and `npm run check:editor`, retained workers/fonts/license and no new dependency/CDN. Document editable source and generated-file ownership alongside the build instructions.
- [x] 2.2 Load the JSON module and stylesheet on request with the current panel fingerprint and preserve worker URLs. Verify local/current-version assets in focused resource/package tests and browser requests, including an asset update followed by first JSON opening; extend setup/fingerprint tests only if integration registration actually changes.

## 3. Safe loading and usable content

- [x] 3.1 Add localized initial loading/error/retry feedback and prevent incomplete-document actions. Retain one configuration attempt at a time and stop automatic retries on ordinary HA updates after failure. Add focused lifecycle/browser checks for delayed/rejected configuration, early JSON clicks, explicit retry, Discard/Restore reloads and panel removal; verify readable failures and no draft replacement, duplicate requests or automatic writes. Document the loading/retry behavior.
- [x] 3.2 Make JSON initialization single-flight and preserve the latest draft/tab intent across delayed imports, stylesheet/worker failures, repeated clicks and panel revisit. Add focused checks for edits during loading, failed-asset retry, current theme, format/schema/entity assistance, unknown fields/raw cards, invalid-JSON protection and disposal/recreation; verify one editor instance and no focus steal, dirty-state loss or background save.
- [x] 3.3 Compare stage timings and correct any remaining measured post-response visual render/native-control readiness bottleneck in the existing mount/render path. Exercise the representative document and a larger test-only document using safe fixture references; add a focused regression for the identified delay and record the cause/result. Verify all controls still work and no arbitrary wait, eager unrelated HA panel, custom replacement selector or speculative backend rewrite is introduced. Record any necessary scope expansion before changing additional contracts.

## 4. Integration and final visual validation

- [x] 4.1 Dry-run and sync only to `192.168.0.28`, verify served editor resources match the current build, and run focused editor/model/build/browser checks. Collect matched cold/warm timings and show a reduction in usable-content delay, including the shell-to-ready interval; verify zero JSON-only requests during Visual startup and report first-JSON cost separately. Confirm read-only startup changes no saved JSON/generated files and preserves administrator API behavior. Do not declare the reported delay fixed based on bundle size alone.
- [x] 4.2 After the last edit and focused check, make the final visual/interactive pass over affected editor surfaces: loading/retry, General/Overview forms, rooms/pages, selectors/dialogs, Visual/JSON, toolbar and revisit. Cover light/dark, 320px and representative iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold plus 200% text. Verify spacing, control sizing, alignment, clipping, overflow, focus and draft preservation; inspect console/resource diagnostics and a representative generated page. Fix defects, rerun focused checks and repeat the final inspection. The dashboard-card set remains empty unless implementation expands into shared card/layout code; then add its required gallery/realistic examples and affected-card/alignment validation.

## Workflow follow-up

- Archive/sync only after implementation and verification; baseline specs remain unchanged during planning.
- Before any push, tag or release, require `npm run verify:publish` against the disposable instance and matching GitHub Tests, hassfest and HACS checks. Publishing is separate and the native reconnect exception is not waived.
