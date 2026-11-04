# Tasks

Spec deltas are explicitly skipped: this repair preserves existing popup contracts. The optional design artifact is omitted because the change is confined to one existing stylesheet and its generated bundle, with no architectural, data, security or migration decision.

## 1. Enlarge the settings close icon

- [x] 1.1 Record the starting commit, dirty state and affected settings-popup consumers; capture `npm run test:affected -- --snapshot /private/tmp/implement-seven.json` before editing. Verify the task scope is the close glyph and its layout, preserving the separate current-room proposal.
- [x] 1.2 Add a scoped `[data-close]` rule in `frontend_src/dashboard-settings-dialog.js` with a clearly larger glyph, centered content, no crowding text-button padding and a non-shrinking 48px minimum touch target. Verify by source/diff review that the localized name, close handler and focus restoration are unchanged, and header title wrapping retains room for the button. Reuse existing theme/localization and examples; no new tests, fixtures or product documentation are needed for this presentation-only rule.
- [x] 1.3 Run `npm run build:editor`, review the final source/generated diff, select `npm run test:affected -- --since /private/tmp/implement-seven.json --tier visual --component navbar --plan`, and run `npm run check:editor`. Verify only the intended settings-popup presentation changes and that the shipped bundle matches its source; do not expand to browser/integration suites for this visual fix.
- [x] 1.4 Install final applicable frontend assets once through `prepareFrontend()` from `ha-test/prepare-frontend.js` on disposable `192.168.0.28`, preserving configuration/helper state. Verify compatibility and served-asset/readiness checks, leave assets installed, and report `/marao-dashboard` with any required reload. Give the user a short manual watch list: larger centered close glyph, clear header at narrow/enlarged text sizes, and normal close/reopen behavior. Report installation failure as not installed / not ready for test.

## Workflow follow-up

- If both changes are explicitly applied, batch this repair with `consolidate-current-room-settings` and install the final combined assets once. Do not implement that behavior change solely because this visual fix is authorized.
- Run unit-only `npm run verify:publish` before any separately requested push, tag or release. Additional integration/full tests require an explicit request. Archive only after the fix is implemented and verified.

Apply evidence: combined batch began at `0d5267902da0b2ab595db77af149a7a4b2f64da6`; initial dirty state contained only the seven untracked proposal directories. Shared pre-edit snapshot: `/private/tmp/implement-seven.json`. No historical fixture or saved-format rewrite is required.

Final evidence (2026-11-04): 262 targeted JavaScript checks and 59 page-model/catalog Python checks passed serially. `build:hacs`, `check:editor`, and `git diff --check` passed. Six room assertions were rerun after the final contrast correction. Scope plan reviewed from the shared snapshot; unrelated mapped full/browser/camera/upgrade suites were not run. Read-only disposable history/Logbook response shapes were checked without recording event values.

Installed through one `ha:sync` for the safe media fixture change, then `prepareFrontend()` for the final contrast correction. Served-asset/readiness verification succeeded for candidate `1b135de88eb62d59d39c2314662e662d34b4515b4cdce0c714eb525b2c5f54ca` at `http://192.168.0.28:8123/marao-dashboard`; native configuration was preserved. Browser appearance, physical room movement and real-device behavior were not inspected or claimed. The previously reported live room-resolution failure was not reproduced; pure resolver cases passed, and the shared diagnostics now expose its actual resolution stage. Activity remains limited to recorded coverage and explicit sources.
