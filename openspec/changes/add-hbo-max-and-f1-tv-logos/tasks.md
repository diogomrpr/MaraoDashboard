# Tasks

## 1. Artwork, catalog and validation

- [x] 1.1 At separately authorized implementation start, record the commit, dirty state, acceptance cases and affected standalone/nested consumers; capture `npm run test:affected -- --snapshot /private/tmp/implement-seven.json` before code edits. Verify the snapshot exists and preserve unrelated work.
- [x] 1.2 Obtain the two publisher app icons from the official sources in the design, save local square PNGs under `frontend/media-apps/`, and record exact artwork URLs, publisher/app IDs, actual retrieval date, ownership notes and image preparation in `SOURCES.md`. Verify both images decode, retain the correct app marks/aspect ratio and match the recorded provenance.
- [x] 1.3 Append `hbo-max` and `f1-tv` with the exact names/verified aliases in `MaraoMediaApps.js`, and extend Python `page_model.py` accepted IDs. Extend/run small existing media-branding/editor-model/page-model assertions for exact and normalized matches, both option shapes, explicit-choice precedence, unchanged launch source/target, retained original IDs and unknown-source fallback. Verify no new matching algorithm, option field or saved-data transformation is introduced.

## 2. Existing chooser, documentation and safe examples

- [x] 2.1 Update the existing enumerated-choice assertions in `tests/frontend/native-card-editor.test.js` and `tests/docs/settings-options.test.mjs` to cover all ten IDs while retaining Automatic and the original eight entries' order. Verify both standalone and nested editors accept the two choices and an ordinary logo edit preserves source/name/icon/order/unknown fields and current cancellation behavior.
- [x] 2.2 Update Media app notes/examples in `docs/examples/manifest.js` with both brands, valid IDs and exact automatic source names; regenerate the card reference with `node docs/scripts/generate-card-pages.mjs`. Verify `docs/src/content/docs/cards/media-app.mdx` and current playground choices agree with the runtime, preview image discovery includes the files, and copied examples retain fictional entities and source-independent artwork.
- [x] 2.3 Update only the existing gallery/realistic media examples necessary to demonstrate the two new brands using safe helpers, preserving current custom test configuration. Review the examples for exact source strings, one automatic and one explicit choice, unchanged original apps, the single `/marao-dashboard` root and no shipped fake entities/test assets; reuse current cases without adding a gallery matrix or browser harness.

## 3. Distribution and final development evidence

- [x] 3.1 Run `npm run build:hacs` to regenerate owned editor assets, manifest and flat distribution. Extend/run the existing HACS package assertion in `tests/frontend/native-package.test.js` for ten choices, resolving both new images and retained originals through the flat asset resolver. Verify the installed graph supplies the bytes locally without external artwork requests.
- [x] 3.2 Review the actual task diff and a scoped `test:affected` plan from the snapshot for reviewed `labels`, `native-source` and `packaging` consumers, accounting for the changed Python allowlist. Run only the small relevant checks above serially and record outcomes/excluded concurrent hunks; do not automatically run all mapped suites, browser checks, playback, geometry or full/mobile matrices.
- [x] 3.3 When implementation is separately authorized, batch-install the final changes only on disposable `192.168.0.28` using the existing compatible preparation helper: one `ha:sync` for Python/fixture changes, or direct `prepareFrontend()` if the final diff is compatible frontend-only. Verify current served assets/readiness, preserve configuration/helper state and leave successful assets installed. Report any blocker as not installed / not ready for test; never access HA-BD or another household instance.
- [x] 3.4 Compare implementation and evidence with all acceptance cases, then hand off the disposable URL, actual focused checks and a short manual watch list for both logos, Automatic, explicit selection and reload persistence. Verify launch strings remain exactly `HBO Max` / `F1 TV`, original brands and user data remain preserved, and no current failure is described as passing.

## Workflow follow-up

- This proposal authorizes planning only. Keep every implementation task unchecked until a separate apply request; no implementation, commit, push, publication, release or deployment occurs during proposal creation.
- For a separately authorized push, tag or release, run the repository's unit-only `npm run verify:publish` gate across the full candidate and reuse development evidence; additional integration/full tests require an explicit request.
- Synchronize/archive only after implementation and required development verification are complete, applying the completed chooser requirements before this additive catalog extension.

Apply evidence: combined batch began at `0d5267902da0b2ab595db77af149a7a4b2f64da6`; initial dirty state contained only the seven untracked proposal directories. Shared pre-edit snapshot: `/private/tmp/implement-seven.json`. No historical fixture or saved-format rewrite is required.

Final evidence (2026-11-04): 262 targeted JavaScript checks and 59 page-model/catalog Python checks passed serially. `build:hacs`, `check:editor`, and `git diff --check` passed. Six room assertions were rerun after the final contrast correction. Scope plan reviewed from the shared snapshot; unrelated mapped full/browser/camera/upgrade suites were not run. Read-only disposable history/Logbook response shapes were checked without recording event values.

Installed through one `ha:sync` for the safe media fixture change, then `prepareFrontend()` for the final contrast correction. Served-asset/readiness verification succeeded for candidate `1b135de88eb62d59d39c2314662e662d34b4515b4cdce0c714eb525b2c5f54ca` at `http://192.168.0.28:8123/marao-dashboard`; native configuration was preserved. Browser appearance, physical room movement and real-device behavior were not inspected or claimed. The previously reported live room-resolution failure was not reproduced; pure resolver cases passed, and the shared diagnostics now expose its actual resolution stage. Activity remains limited to recorded coverage and explicit sources.
