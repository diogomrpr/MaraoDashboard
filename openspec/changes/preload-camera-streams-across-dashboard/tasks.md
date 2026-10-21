# Tasks

## 1. Saved option and editor configuration

- [x] 1.1 Record the implementation starting commit, acceptance cases and shared consumers; capture a task snapshot and preserve unrelated work. Review released camera descriptors and add optional boolean `variables.preload_stream` to backend/builder/native validation and generation without writing missing defaults; verify missing/false/true and unrelated-field preservation with small existing tests.
- [x] 1.2 Add the default-off toggle and EN/PT resource-use help alongside Dashboard/Popup stream fields in the builder and supported native editor. Update the camera configuration documentation; verify the option round-trips through existing editor/model tests and that independent camera settings stay unchanged.

## 2. Dashboard-owned warm playback

- [x] 2.1 Add active-dashboard discovery of opted-in camera descriptors across loaded views and supported containers, excluding popup-only content/previews. Hook lazy camera startup into the existing dashboard lifecycle after navbar readiness; verify direct entry on a non-camera page discovers only that dashboard's opted-in streams with an existing targeted unit check.
- [x] 2.2 Refactor shared playback into retained background ownership plus visible presentation binding. Keep the native player connected while views mount/unmount, reuse it on arrival, and deduplicate equivalent background demand without breaking independent visible/popup owners. Extend an existing lifecycle test for background-to-visible-to-background transitions, stale initialization and last-owner release.
- [x] 2.3 Apply document visibility, dashboard exit, configuration replacement, availability and connection cleanup/resume to warm sessions. Preserve default on-demand cards, muted audio, popup/fullscreen behavior and readable loading/recovery states; verify ownership cleanup and one eligible restart with the same targeted lifecycle tests, without adding a device matrix.

## 3. Install and hand off

- [x] 3.1 Add one safe opted-in example reachable from a non-camera page and retain an ordinary default-off example in the existing disposable dashboard/gallery. Batch the final backend/generated/frontend changes into one compatible test-instance installation at `192.168.0.28`; verify served-current-assets/readiness and preserve user test configuration.
- [x] 3.2 Perform one narrow integration check: enter a non-camera page directly, allow the safe stream to play, navigate to its card and back, and confirm warm-player reuse and dashboard-exit cleanup. Restore temporary safe state, leave the final assets installed, and report actual checks plus a short manual watch list (enabled vs disabled cards, popup/fullscreen, tab return). Stop there; no timing campaign, broad browser matrix or release is requested.

## Workflow follow-up

- Apply only after a new implementation request. Planning validation does not establish playback success.
- A later release runs affected unit tests only and reuses development integration testing. Additional changed-feature/full checks require an explicit user request.

## Implementation baseline

Started at `9aaaed07157d62e3ee305e90425e346249defc2a`; starting dirty state captured
in `/private/tmp/marao-camera-preload-start.json`. Earlier release-tooling edits are
unrelated and retained. Acceptance is the default-off toggle, startup from a
non-camera view, same-player navigation reuse and scoped lifecycle cleanup.
Shared consumers: generated/native camera cards, popup/fullscreen playback and
persistent dashboard navigation. No saved-format migration or default rewrite.

## Verification and handoff

- Selected Node assertions: 7 passed (option preservation, native fields, discovery,
  player reuse/last-owner cleanup and background eligibility).
- Selected Python camera generation/validation assertions: 8 passed.
- Installed current backend, editor, generated configuration and frontend on
  disposable `192.168.0.28`; final frontend served-asset verification passed.
- One mobile Chromium interaction confirmed direct Home entry starts live video,
  Security binds the same native player/video, return to Home retains it, and
  leaving the dashboard releases it. No browser warnings/errors or failed resources.
- The temporary diagnostic probe initially had a null lookup; corrected before
  the successful interaction above. No product failure was suppressed.
- Test source matched the safe canonical fixture before installation. Backed up
  source and helpers privately; helper cleanup verified, with zero changed helper
  values. Successful feature assets and the opted-in Security example remain.
- No production access, release, comprehensive camera campaign, timing benchmark,
  real-phone inspection or additional browser/theme matrix. Manual follow-up:
  toggle individual cameras, open popup/fullscreen and return after hiding the tab.
