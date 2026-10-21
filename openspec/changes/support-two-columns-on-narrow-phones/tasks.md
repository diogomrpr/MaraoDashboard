# Tasks

## 1. Shared responsive sizing

- [x] 1.1 Record the implementation starting commit and all affected shared-grid consumers, then review `npm run test:affected -- --plan` with the appropriate `control-grid` and action/slider selections. Verify the scope includes generated, native-wrapper and popup hosts while preserving unrelated work and treating this as a rendering-only change unless inspection shows otherwise.
- [x] 1.2 Introduce one internal sizing policy for the CSS and JavaScript column calculations, adjusting both the fixed floor and font multiplier. Extend existing grid tests with independent expected counts for 282px, 322px, 346px and 352px sections, enlarged text, fractional boundary widths, one-column preferences and mixed groups; verify both paths agree without remounting children or changing saved/generated configuration.
- [x] 1.3 Verify and, where needed, fix shared card containment in the narrower cells. Extend relevant room/control checks for long English/Portuguese titles, mandatory problems, odd final rows, section-wide heights and detailed content; verify full-size controls, room navigation versus lights-off, strict-slide/hold cancellation and exactly-once valid completion with safe fixtures.
- [x] 1.4 Update the configuration and dashboard quality guides for narrow-phone two-column support, explicit one-column preservation and enlarged-text reflow. Verify the documented settings remain the existing `columns`/group contract, no phone-specific option is introduced, and any changed visible help follows the existing localization path.

## 2. Explicit phone-width acceptance

- [x] 2.1 Update the canonical safe gallery and realistic Rooms fixture, then extend the existing local/disposable grid browser checks to require two visible columns at 360px and 384px viewports with normal page margins. Verify normal and bold typography, record actual section/font measurements, and prove the old threshold fails these assertions without widening the tested section.
- [x] 2.2 Add only the missing feature-scoped 384px case and update the verification map/coverage documentation. Verify selected coverage includes 320px containment, representative iPhone and Android portrait/landscape, 200% text, bold plus 200% text, 200% zoom, two-to-one-to-two transitions, relevant alignment and slider/access interactions, and representative appearance in both themes without expanding unrelated device matrices.

## 3. Integrated verification and restoration

- [x] 3.1 After the batch's last edit, back up disposable `192.168.0.28` before any deployment or fixture mutation, and run the smallest covering serial affected selection through the existing preparation workflow. Resolve failures and verify the evidence explicitly demonstrates the required column counts, preserved configuration/order/grouping, contained content, mounted-control continuity and interaction safety; passing generic no-overflow checks alone is insufficient.
- [x] 3.2 Reuse the verified compatible installation to inspect representative final Rooms, mixed-control and difficult text/access layouts after the selected checks. Verify the requested outcomes against the measured evidence, restore all changed disposable package/fixture/configuration state and confirm cleanup. Report emulated widths and any unperformed physical Galaxy A35 inspection accurately.

## 4. Follow-up: smaller shared reflow threshold

The completed tasks above record the initial 156px/8.5 sizing implementation;
their evidence does not establish the follow-up's narrower acceptance.

- [x] 4.1 Lower the shared cell floor to 136px and font multiplier to 7.5, supporting two columns at 282px usable width within a 320px viewport's ordinary margins. Update independent boundary/reflow expectations and aligned documentation; verify current representative room/control layouts, full-size controls, safe strict-access cancellation/completion, enlarged-text reflow and restoration without changing saved preferences or adding device detection. Use the scoped task selection, inspect the latest disposable preview, leave successful assets installed and record any unperformed physical-device coverage.

Follow-up evidence (2026-10-20): visual-tier task baseline
`/private/tmp/marao-narrow-breakpoint.json`, starting commit
`68a9deb96ffd5164949ac6c20f040beed57d654d`. Current disposable frontend
`1704ca027d63ef2d` showed two columns at a measured 282px section in a 320px
viewport (normal and bold), two at 322px with 20px primary text, and one at
282px with doubled text; returning to normal restored two without remounting
cards or changing configuration. The existing mixed gallery retained 137px
cells, contained controls and equal surfaces. Actual simulated touch cancelled
incomplete/vertical gestures and dispatched one completion to a browser-only
service recorder. No helper state changed; browser diagnostics were empty.
Private measurements/captures are under
`ha-test/.artifacts/narrow-breakpoint-followup/`. Successful assets remain
installed after closing preview. Regression expectations were updated; no
automatic suite, full matrix, publication gate or physical-phone inspection was
run for this presentation-only follow-up.
