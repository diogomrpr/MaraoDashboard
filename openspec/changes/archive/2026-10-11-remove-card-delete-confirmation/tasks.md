# Tasks

## 1. Individual-entry deletion

- [x] 1.1 Remove the confirmation condition from the shared `card-delete` branch in `frontend_src/MaraoDashboardPanel.js`, retaining indexed deletion, room materialization, dirty tracking, rendering and propagation handling; verify room and custom-page entries use the same path and no save or HA registry operation is dispatched by Delete.
- [x] 1.2 Use the existing frontend/browser tooling for a focused behavior regression with safe editor data: exercise room entity cards, custom-page entity and shortcut cards, first/middle/last rows and duplicate entity references; verify one activation removes one occurrence without a dialog, sets dirty state, updates JSON, and preserves surviving order, options, unknown fields and raw/custom content. Verify legacy area-linked first-edit conversion remains unchanged, Discard restores the saved entry, and room/page deletion and history restoration still require confirmation.
- [x] 1.3 Narrow the individual-entry confirmation exception in `docs/docs/development/dashboard-quality.md` and document immediate local deletion and Save & Generate/Discard behavior in `docs/docs/installation/configuration.md`; review wording against the delta spec and retain confirmation guidance for other administrative actions.
- [x] 1.4 Rebuild the shipped editor assets with `npm run build:editor`, run `npm run check:editor` and the focused behavior regression; verify generated assets match the edited source and saved configuration format has not changed.

## 2. Disposable editor validation

- [x] 2.1 Deploy to `192.168.0.28` through the existing development workflow, preserving its configuration privately. Verify immediate deletion, Visual/JSON consistency, unchanged dashboard before save, Discard recovery, and explicit Save & Generate followed by reload using safe fixture entities; restore the original test configuration and verify cleanup. Runtime-card affected set is empty: reuse existing gallery/realistic fixture content without new card variants.
- [x] 2.2 After the final edit, focused check and cleanup, visually and interactively inspect affected room/custom-page editor rows at 320px and representative iPhone/Android portrait and landscape layouts, with both themes and required text/zoom profiles; verify Delete remains visible, accessible and usable, without clipping, overlap, console errors or failed resources. Confirm surviving fixture content remains correct. Record results without claiming real-phone testing. No icon-only runtime layout changes are planned, so the alignment gate is not applicable.

## Workflow follow-up

- Archive only after implementation and focused verification are complete; synchronize the delta to the baseline through the established workflow.
- Before any later push, tag or release, run `npm run verify:publish` against the disposable instance. Explicit versioned-release preparation also requires the separate preserved-install upgrade gate and required GitHub validations. Publication is outside this change's implementation tasks.
