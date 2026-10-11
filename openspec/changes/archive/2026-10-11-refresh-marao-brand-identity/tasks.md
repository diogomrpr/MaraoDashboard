# Tasks

## 1. Create the original asset family

- [x] 1.1 Record the affected-card set (expected empty) and branding surface inventory from the design before editing; verify each current consumer and preserve unrelated work in the working tree.
- [x] 1.2 Create canonical mountain SVGs under `custom_components/marao_dashboard/frontend/brand/`, including the full logo with transparent outlined Marao lettering, simplified compact mark and required theme variants; verify readability on actual light/dark backgrounds and recognizability of the mark at 16px and 32px in browser previews.
- [x] 1.3 Produce square integration icons and rectangular logo PNGs with native light/dark and high-resolution filenames from the canonical SVGs using existing browser tooling; add a focused asset check that verifies valid dimensions/formats, transparency and required files, and run it successfully.
- [x] 1.4 Document canonical asset paths, palette, minimum full-logo width, variant selection and the reproducible export command in the development documentation; verify the documented command reproduces the exports without adding a dependency or requesting external artwork/fonts.

## 2. Apply identity to the integration and editor

- [x] 2.1 Add the compact monochrome mark to the existing custom iconset and use it for the editor sidebar constant plus the starter/missing dashboard icon defaults; extend the focused setup/generator tests for registration, defaults and preservation of explicit icons, and run those relevant tests with the existing Python environment.
- [x] 2.2 Add the decorative mountain mark to the editor header through `frontend_src/MaraoDashboardPanel.js` and `panel.css`, preserving the heading, localized subtitle and action space; regenerate with `npm run build:editor`, pass `npm run check:editor`, and inspect header reflow and accessible naming in a focused browser check.
- [x] 2.3 Update only the disposable fixture dashboard's root identity as needed and the asset placement guide; verify that functional icon paths, navbar icons, configured dashboard icons, custom YAML and existing gallery/product examples are preserved. If supported card behavior or an icon-only shared layout changes, update Cases and realistic examples together and pass `npm run test:ha:alignment` before completion.
- [x] 2.4 Run `node --test tests/frontend/package-boundary.test.js` with any necessary asset assertions and inspect the built integration's brand files; verify the distribution contains the new artwork without fixtures, secret files or third-party card dependencies.

## 3. Apply identity to documentation

- [x] 3.1 Replace `docs/assets/images/logo.svg` and `favicon.svg` with derived mountain artwork and place the full logo once in README and `docs/index.md`; verify image paths, consistency with canonical sources and preservation of the README's single approved attribution, using light/dark rendering where supported.
- [x] 3.2 Build documentation using `bundle exec jekyll build --destination ../_site` from `docs/` and inspect the rendered header, landing page and favicon alongside a README preview; verify unclipped aspect ratios, readable cutout lettering and absence of broken resource requests at mobile widths.

## 4. Final integration validation

- [x] 4.1 After the last edit, rerun only the relevant asset/setup/generator/package/editor checks above, then run `npm run ha:sync:dry-run` and synchronize to disposable `192.168.0.28`; verify the loaded frontend fingerprint and native integration images through Home Assistant's authenticated branding path without exposing credentials.
- [x] 4.2 As the final validation step, visually inspect every affected branding surface and every card in any revised affected-card set. Verify cold-load and refresh sidebar marks, editor header, integration logo/icon, README/docs/favicon, both themes, 320px and iPhone/Android portrait/landscape, and normal/bold/200% text/200% zoom/bold plus 200% text. Check centering, spacing, clipping, overlap, overflow, original control sizes and resource/console diagnostics; repair defects and repeat focused checks and final inspection before marking complete.

## Workflow follow-up

- Keep these tasks unchecked until their implementation and verification are complete; synchronize the new capability into the baseline and archive only after verified completion and the requested archive workflow.
- Publishing is outside this change. Before any subsequent push, tag or release, pass `npm run verify:publish` against the disposable instance and satisfy exact-commit GitHub Tests, hassfest and HACS validation. The known native reconnect issue remains in `confirm-home-assistant-reconnect-fix`; the prior release exception is not a continuing waiver.
