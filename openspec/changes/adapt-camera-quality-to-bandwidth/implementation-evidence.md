# Implementation baseline and feasibility findings

Recorded 2026-10-20. This is investigation evidence, not adaptive-playback acceptance.

## Baseline (task 1.1)

- Original working checkout HEAD: `68a9deb96ffd5164949ac6c20f040beed57d654d`.
- Selected implementation baseline: released v0.12.1, commit
  `d3f83edaa15feb4fcd616dc663d54e956a874a54`, in the existing clean managed
  checkout `/Users/digas/.codex/worktrees/release-0-12-1/HaCasa`.
- Verified that checkout is clean and contains the released native camera,
  slow-connection fallback, buffering-retention and native regression files.
- The original working tree is not an exact release baseline: besides unrelated
  work, its camera `stop()` increments generation unconditionally, whereas the
  released version guards that increment. Do not deploy or replace the released
  implementation from this older checkout.
- Affected set: `hc_camera_card`, including duplicate, manual and generated
  occurrences and inert previews. Camera event actions remain regression
  consumers; generated configuration and event identity must be preserved.
- No application code was edited or deployed. Existing unrelated changes and
  predecessor artifacts were preserved. Planning/evidence stays in the original
  checkout until implementation can proceed.

## Early continuity feasibility check (task 1.4 remains incomplete)

Before building the three-tier fixture or capacity probe, inspected actual native
playback of the existing synthetic low camera on disposable `192.168.0.28`.
The browser script is private, ignored evidence at
`tests/.artifacts/adaptive-feasibility/inspect.cjs`. It uses the existing guarded
test authentication helper, checks the exact host, and closes each browser in
`finally`. No dashboard configuration, services, production instance or real
camera was changed/accessed.

The normal camera path selected WebRTC. A separate temporary `ha-hls-player`,
using its public URL property and a stream obtained for the same synthetic
camera, exercised the HTTP path. This explicit HTTP selection was a diagnostic,
not a proposed runtime transport override.

| Browser | HTTP observation |
| --- | --- |
| Playwright Chromium | 320px video, readyState 4, blob media source; `getStartDate` absent; frame callback supplies mediaTime/display timing but no captureTime |
| Playwright WebKit | 320px video, readyState 3, blob media source; `getStartDate()` returns `Invalid Date`; frame callback supplies mediaTime/display timing but no captureTime |

These are browser-engine checks, not physical Safari/iPhone/Android proof.
The WebKit sample alone is not sustained-playback validation.

The [pinned native HLS implementation](https://raw.githubusercontent.com/home-assistant/frontend/20260930.2/src/components/ha-hls-player.ts)
keeps its hls.js instance private (`_hlsPolyfillInstance`). Its public properties
do not expose the fragment-to-wall-clock mapping or a stop-loading operation that
preserves a decoded frame. Disconnect cleanup destroys the player and clears
the video source. Reading private fields would violate the approved design.

The installed Home Assistant stream source also initializes each muxer's HLS
program date time from `utcnow()` and advances it by segment duration
(`components/stream/worker.py`, `StreamMuxer`; `core.py`, segment playlist).
It is not, by itself, proof of a shared camera capture timestamp. Matching
independent `currentTime` values, request arrival times, or assuming equal stream
latency would therefore invent the clock mapping the design explicitly forbids.

**Decision:** the current approved design has no established public continuity
signal for the required native HTTP promotion. Do not implement a controller
that claims successful safe upgrades by retaining low quality forever or by
guessing this mapping. Task 1.4 is not completed: synchronized three-tier proof,
aggregate shaping and downgrade frame/capacity proof have not been performed.
No speed-probe endpoint or adaptive controller was added.

Resolve the design before continuing: either investigate a player/timing
architecture that exposes the necessary controls and establish its capture-time
limitations, or explicitly revise the no-rewind acceptance requirement. A
bandwidth measurement alone does not resolve this issue.

## Approved startup-only implementation baseline (2026-10-20)

User explicitly selected “Ship low-first startup first”. Starting commit is
`c99f23447a12f74cb0d56fddeecbefbd580ecb92` (released v0.12.2), clean attached
checkout `/Users/digas/.codex/worktrees/release-0-12-1/HaCasa`, branch
`codex/camera-low-first-0-12-3`. Affected set is `hc_camera_card` and its native,
manual, generated and duplicate consumers; event actions and inert previews are
regression consumers. Saved configuration and generator output contracts remain
unchanged: selection is ephemeral and the configured entity remains identity and
ceiling. No migration or probe endpoint is included. Original working-tree changes
are preserved. Automatic upgrades and full adaptive acceptance remain incomplete.


### Startup candidate verification follow-up

Candidate `fe1d5fc6b5bf3ab2b7515fb06dcb871da34c2f9c` contains the low-first
selection/Retry change, a hidden-card availability regression, and a test-only
cleanup ordering correction. The native request ledger previously waited for a
snapshot of pending transport handoffs; another handoff could begin during that
wait and the test could dispose its temporary duplicate before proof completed.
It now drains newly added handoffs before entering the release boundary. The
fixed-clock regression requires the later handoff to finish; no cancellation or
playback assertion was relaxed. Native playback failures now retain the selected
video clock/baseline for diagnosis. The original failed private evidence is kept.

Scoped publication checks are in progress; this entry does not establish success
or publication. S2 remains unchecked until the checks, restoration and release
are complete.


### Startup verification and restoration (2026-10-20)

Final candidate `fe1d5fc6b5bf3ab2b7515fb06dcb871da34c2f9c` passed all 30
selected checks in private report `run-LYUxfk/report.json` in the release
checkout. This includes 14 native browser selections and 16 offline selections;
13 unchanged offline results were validated and reused. The current camera
unit suites passed 42 runtime/native-observation tests and 31 request-ledger tests.
The original Retry observation timeout remains retained in `run-i6x678`; the
subsequent native Retry checks passed without extending their five-second
advancement budget or relaxing assertions.

The synthetic slow-source checks request only the low camera before playback:
first request at about 0.40–0.62 seconds and live observed at 0.84–1.23 seconds
from navigation in these runs. Chromium and WebKit both decoded advancing 320px
video; the explicit brief buffering case kept the video surface and native host.
These timings are synthetic-fixture observations, not cold real-Protect or WAN
performance guarantees. The source cap is 24,000 bytes/s, not an aggregate
viewer-side bandwidth shaper. No adaptive promotion was tested or implemented.

Native lifecycle/Retry/event checks passed in both themes. Selected checks also
cover narrow 320px, iPhone/Android portrait and landscape, bold text, 200% text,
200% browser zoom and combined bold/200% text. Representative current light,
dark, narrow and enlarged-text captures were inspected; no clipping or missing
feedback was observed. Physical phones and a real Protect NVR were not tested;
full-suite and historical upgrade matrices were not selected for this UI-only
change with unchanged persisted contracts.

The exact-commit publication gate validated current prepared assets and evidence
before restoration. Private recovery completed `restored-and-verified` on
2026-10-20 at 15:51 UTC: 24 owned paths restored, exact pre-start bytes verified,
original integration/panel identities and safe helper values checked after
restart. Authentication files were excluded. The live instance was not changed.
HACS and hassfest passed for the exact commit; publication awaits the final
GitHub Tests result. S2 remains unchecked until publication is confirmed.


### Startup-only release published

Published [v0.12.3](https://github.com/diogomrpr/MaraoDashboard/releases/tag/v0.12.3)
on 2026-10-20 at 15:53 UTC. Public non-draft/non-prerelease tag verified at
`fe1d5fc6b5bf3ab2b7515fb06dcb871da34c2f9c`. Exact-commit GitHub
[Tests](https://github.com/diogomrpr/MaraoDashboard/actions/runs/39452041192),
[hassfest](https://github.com/diogomrpr/MaraoDashboard/actions/runs/39452040866)
and [HACS](https://github.com/diogomrpr/MaraoDashboard/actions/runs/39452040845)
all succeeded. Scoped local gate and restored disposable state were reconfirmed
before publication. Startup milestone S1/S2 is complete. The full adaptive
change remains open: no automatic upgrades, bandwidth probe, aggregate shaping
or continuity-safe promotion is claimed.

## Explicit-stream follow-up (2026-10-29)

Started at `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84` with the existing dirty
worktree preserved; scope snapshot is `/private/tmp/camera-explicit-finish.json`.
Affected consumers reviewed: builder camera form/JSON model, native compiler,
shared camera runtime/fullscreen, popup events, and the existing synthetic
Security/Cases examples. No persisted format, default or runtime change was
needed in this follow-up.

Four focused Node tests passed: title/options preservation across editing and
duplication; optional camera-only popup binding validation; existing low/high
gallery examples; and a new native compiler regression covering exact dashboard
and popup entities, events identity/provider/limit, video-before-events order,
fullscreen action, custom actions, raw content and source preservation. Missing,
null and empty popup bindings retain the dashboard stream without saved defaults.
The selector plan was reviewed; broader Python, transport and browser suites were
not selected. Documentation and change artifacts now match native frontend
ownership and retired standalone card editors. The omitted existing visible-camera
scenario was restored to the delta; strict OpenSpec validation passed.

At the user's explicit request, Chrome was opened on disposable
`192.168.0.28:8123/marao-dashboard/security`, using only synthetic camera media.
Dashboard preview and popup video were visibly playing; the popup showed the
Entrance camera video above its synthetic provider event. Native fullscreen
opened with controls, and Escape returned to the same popup and event list.
This was a Chrome responsive preview at 400px, not a physical-phone check.
Exact decoded low/high dimensions and native session identity were not measured;
the configured entity targets are covered by the compiler assertion. No camera,
lock, gate or alarm services were actuated.

The remaining 320px/landscape inspection is pending: Chrome control/capture
returned `noWindowsAvailable`, `elementHasNoFrame` and a ScreenCaptureKit error,
and DevTools focus made the inspected document hidden, suspending playback.
Collapsed/stale captures and the subsequent blank reload were not counted as
product layout failures or passing checks. DevTools was closed and a fresh
computer-control session established; foreground access was requested from the
user. Earlier native camera playback/cancellation exceptions remain exceptions,
not passing checks. No synthetic transport/latency/cancellation harness was run.

The lightweight installer reconfirmed current assets and readiness on the
disposable instance, identity
`52e693abbc949caf34d383089e5c1f536eed79c3fd7f98548a8d6dad15075519`
(`/private/tmp/camera-explicit-install.log`). No publication or production change
was made. Task 5 is complete; task 6 stays open until the remaining requested
layout check and UI cleanup can be confirmed.

### Remaining Chrome inspection completed (2026-10-29)

The user installed the ChatGPT Chrome extension and requested another attempt.
The extension appeared in Chrome but was not exposed as a connected browser to
the computer-use tool. Native Chrome control worked on this attempt. Docking
DevTools beside the page kept the inspected document visible; observing field
focus/selection before typing resolved the responsive-toolbar input problem.

At a confirmed **320×817 CSS pixels**, the popup title, close control, live video,
event filters and synthetic event preview fit within the sheet. At **817×320**,
the video remained contained and internal scrolling reached events while the
header/close control stayed available. Activating the landscape video opened
native fullscreen with contained playback and native controls. The native Exit
fullscreen control returned to the same popup with video and events present.
These are Chrome responsive-mode observations, not physical-phone or OS-rotation
testing. Exact decoded stream dimensions/session identity remain unmeasured.

All console levels were inspected. The only additional messages were two
non-passive `touchstart` notices attributed to HA's `home-assistant-main.ts:48`;
no Marao console exception was observed. While restoring the viewport after
closing the popup, the dashboard preview showed its readable startup timeout.
One explicit Retry restored visible synthetic playback. This transient failure
is retained as an observed limitation; this inspection does not establish that
native camera startup is failure-free or change the standing manual-only
transport policy. No transport stress or cancellation harness was run.

Fullscreen and the popup were closed. The responsive preset was restored to
400×790, the console filter to Default levels, and DevTools to its original
undocked layout before closing it. The disposable Security page was left open
with the recovered dashboard preview. No saved dashboard or helper state was
changed. The loaded runtime still reported installed identity `52e693a…5519`
(full identity above); documentation-only follow-up needed no reinstallation.
Task 6 is complete. All eight tracked tasks are complete, with the transient
startup timeout and upstream notices recorded rather than relabelled as clean
transport evidence. No archive, publication or production action was performed.
