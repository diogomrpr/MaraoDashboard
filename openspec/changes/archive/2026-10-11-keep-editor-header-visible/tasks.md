# Tasks

## 1. Establish the editor regression

- [x] 1.1 Confirm the current HA/editor scrolling path and reproduce the header leaving view on the disposable populated document. Extend an existing focused editor browser check, or add one small Playwright check using existing target/auth guards, that requires real scroll progress before checking header bounds. Record the empty dashboard-card set and no-data-migration compatibility decision; verify the test fails on the current non-sticky header without altering saved configuration.

## 2. Sticky shell and responsive controls

- [x] 2.1 Group the existing toolbar and Visual/JSON tabs into one CSS-sticky header with an opaque theme surface, appropriate shell/inset alignment and layering below dialogs/selectors. Preserve existing IDs/actions and normal page/Monaco scrolling. Verify the focused scroll regression at top/middle/bottom in both modes, including focused-field reveal clearance and overlay hit testing; document the pinned header behavior in the existing editor/development guide.
- [x] 2.2 Make the header compact across supported narrow/short/enlarged profiles using wrapping and reduced nonessential spacing/subtitle content. If inline secondary actions leave no usable form area, use one localized ≥48px secondary-action popup control while retaining direct Save & Generate and mode switching. Verify title/status/action labels, touch sizing, content reachability, no horizontal overflow and all secondary actions in the focused browser check; document any compact action location.
- [x] 2.3 Verify the existing dirty/busy/disabled states, JSON validation, save/discard/history, new-tab dashboard link and repeated mode switching remain unchanged with a single action handler path. Add focused interaction assertions using mocked actions or isolated safe configuration with verified restoration, and check source equality when scrolling/switching without saving. Rebuild the complete editor assets and verify `npm run check:editor`; update browser-check instructions and preserve pending startup/folding work.

## 3. Final deployed verification

- [x] 3.1 Deploy the rebuilt assets only to **192.168.0.28**, confirm the served version and run the focused editor check across existing 320px/iPhone/Android portrait/landscape profiles, both themes and normal/bold/200% text/200% zoom/bold-plus-200% text. Verify actual scrolling, header bounds, action reachability, form/JSON usability and dialogs; fix console exceptions, failed resources and repeated requests. Preserve/restore any safe test document and keep detailed evidence private.
- [x] 3.2 After the last edit and focused check, visually and interactively inspect the editor header/content in the affected profiles, checking spacing, centering, wrapping, clipping, focused fields and overlay layering. Fix findings, rerun the focused check and repeat this final inspection. Record actual browser evidence and any limits; no gallery or icon-only-card alignment pass is needed while the dashboard-card set remains empty.

## Workflow follow-up

- Archive only after implementation and verification are complete. Publishing remains separate.
- Before any later push, tag or release, run `npm run verify:publish`. Versioned publication additionally requires the final-candidate preserved-install upgrade evidence required by repository rules; run that expensive scenario only during explicitly requested release preparation.
