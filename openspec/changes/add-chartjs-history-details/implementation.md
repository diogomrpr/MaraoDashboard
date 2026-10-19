# Implementation record

- Starting commit: `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`.
- Affected: all shared `showsGraph` consumers (graph/toggle graph, configured sensor/base/switch/climate and other graph-enabled cards), energy detail/summary, generated/native/manual hosts and shared popup consumers (groups, lighting, media, climate, access/security, camera/history).
- Existing graph and energy source options, unit/precision, raw cards and popup assignments are preserved; chart selection/window is transient. No new persisted setting or source migration. The simultaneous section-layout change owns generated-wrapper differences independently of chart behavior.
- Compatible editor/camera/layout work is developed concurrently; builds, deployment and final checks are serialized. All tests are deferred until the batch's last edit at the user's request.
- No tests, deployment or visual inspection claimed yet.

## Local batch verification — 2026-10-18

The final serial scoped offline gate passed all 40 selected checks. Evidence:
`tests/.artifacts/verification/run-V5Sxpp/report.json` (`passed: true`,
`verified_cleanup: true`), with all 40 selected checks executed freshly. The final chart build and its package staging were aligned before the
gate. Browser fixtures declare UTF-8; canvas text inherits computed typography. The selected components were `control-grid`, `camera`,
`editor-drag`, `editor-preload` and `chart-details`; file mapping also selected
relevant editor, native, gallery, packaging, documentation and verification checks.
Editor reproducibility, unchanged eager budgets, package boundaries, backend
scope authorization, released conversion/History preservation and recovery passed.
No full suite, parallel tests, publication or historical live upgrade was run.

Local Chromium/WebKit proof uses synthetic media/history and clearly labelled
native-host/raw-card doubles. Compact English/Portuguese slider cards measured
128px tall at 172px width in the local font environment; full HA Montserrat
geometry is still pending. Chart point/window selection, retained popup DOM,
Back/Forward/focus and zero entity-service dispatch passed locally. The original
drag controller fails the final pickup unit regression against the starting
commit; the current controller passes. This does not replace actual HA mouse/
touch and native-input proof.

Home Assistant, SSH, credentials and `ha-test/local.json` have not been accessed.
Native HA camera transport, actual Safari/Protect interoperability, deployed
alignment/action/slider profiles, editor startup/cache/CPU comparisons and final
integrated inspection remain pending. Separate authorization required by camera
`tasks.md` section 6 applies to the whole combined safe disposable deployment.
No real phone, real camera or production installation was tested. Historical
reports and fixtures remain unchanged; pending evidence tasks stay unchecked.

Final local visual review covers section surfaces in both themes, advancing camera
playback and blocked-autoplay recovery, and chart detail/popup captures. Chart
captures use synthetic Recorder data and report the local/emulated scope. The
independent section/group expectations also fail against the original starting
commit generator (`/private/tmp/marao-original-grid-proof.log`); current checks
pass. No Home Assistant inspection or performance acceptance is inferred.

## Authorized disposable measurements (2026-10-19)

The user's later explicit authorization supersedes the earlier local-only phase.
Only the safe synthetic installation at 192.168.0.28 was used. Current chart
asset SHA-256 is 79ef0a297048dcbf3d4614a76c95e2bb325f8089a77793da8aa972ab8f27c1f4.
Native iPhone receipts in run-fP1aHQ (with current-input provenance carried through
run-PWWNpM) measured one 153735-byte decoded detail module, 154035 transferred
bytes, 14.7/13.8 ms resource duration in light/dark. Native Recorder detail opened
in 489/525 ms including its popup transition; shared update took 8.2/8.9 ms.
The synthetic dense case retained all 12002 original samples and the exact narrow
peak while drawing 323 points at 350 CSS pixels. Recorder examples drew 332 of
6347 observations; known gaps and original timestamps remained intact.

Window/reading changes made no extra Recorder requests, repeated opens loaded one
module, and close/drill-in tests released instances/listeners while preserving the
parent, saved source and zero entity-service calls. All eight selected chart
profiles passed; these are browser-emulation observations, not phone or paint
benchmarks. The final integrated gate and visual inspection remain separate.


## Final scoped batch evidence (2026-10-19)

The current combined candidate passed all 123 selected checks serially: 50 offline
and 73 native browser checks. Private report
`tests/.artifacts/verification/run-SifpEH/report.json` records 87 fresh checks and
36 checks reused only with matching reviewed inputs. Direct `validateEvidence`
validation passed required IDs, current input identities, logical routes, private
capture hashes and verified disposable cleanup. All five change artifacts passed
strict OpenSpec validation. No full suite, exhaustive historical live upgrades,
publication or archive was requested or performed.

Final editor inspection is retained in
`tests/.artifacts/final-editor-inspection-native-actions/`; final dashboard and
history drill-in inspection in
`tests/.artifacts/final-dashboard-inspection-ready/`. Both verify unchanged saved
source and History. Dashboard inspection recorded four isolated profile/theme
visits, 22 representative captures, zero entity-service calls and zero saved
writes, with strict browser diagnostics and managed native-camera cleanup.
Representative captures were visually reviewed after the automated gate.
Earlier inspection failures remain intact: the private inspection initially
assumed multiple Studio sections shared one grid, then sampled gallery resource
identity before actual card readiness. The corrected inspection selects the two
independently configured grids and waits for real cards before verifying assets.
Neither correction changed shipped code or weakened geometry/state assertions.

An earlier held-touch slider check timed out waiting for confirmed fill 40, while
its immediate diagnostic showed connected input/current 40/held target 60. The
held target was intentional. A focused dark-theme diagnostic passed all 47
sliders with the original RAF assertion and exact mutation/frame/timer evidence;
the original failure's timing remains unproven. The final test observes only this
HA-driven DOM update with 50 ms polling, retaining the original five-second
limit, exact input identity and value predicate. No product workaround or deadline
extension was introduced; original failure and diagnostic receipts are preserved.

The reproduced native Home Assistant late-WebRTC-event warning is still an open
camera acceptance limitation, documented in the camera implementation and
`docs/docs/development/camera-live.md`. Clean current visits do not establish an
upstream fix. Camera task 6.2 stays unchecked; the other four changes are complete.
No physical phone, actual Safari or real Protect interoperability is claimed.

Final history drill-in inspection used the safe Recorder-backed graph in both
themes, viewed its detail and retained parent after Back, and verified zero service
calls or saved writes. Current scoped chart checks passed exact readings, time
windows, dense/gapped data, resource lifetime and selected narrow/text/zoom
geometry. Earlier bounded-data and lazy-module performance evidence remains
current because chart source/assets did not change afterward.
