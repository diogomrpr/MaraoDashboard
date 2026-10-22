# Tasks

## 1. Camera event feed

- [x] 1.1 Separate bounded provider metadata from lazy preview resolution, normalize Protect headings conservatively, and add targeted tests for ordering, limits, parsing, deferred media, and stale-response handling.
- [x] 1.2 Implement the full-width timeline, sticky type filters, progressive rows, reserved previews, and filter/scroll restoration on Back; add localized labels and targeted feed/navigation assertions, and document behavior and existing provider limits.

## 2. Verification and installation

- [x] 2.1 Review the final diff against the requested behavior, validate this OpenSpec change, and run the scoped camera-event frontend tests, recording actual results.
- [x] 2.2 Install final compatible frontend assets on disposable Home Assistant 192.168.0.28 with prepareFrontend(), confirm its served-asset/readiness checks, and leave a concise phone-testing handoff.

## Verification notes

- Starting commit: `036190cd3e7227c73a7608180036484bad87449b`; clean worktree before this change.
- Acceptance: full-width events, headings outside previews, sticky type filters, deferred previews/progressive rows, bounded authenticated requests, and Back restoring filter/position. Both event-card names share the implementation.
- `node --test tests/frontend/marao-frigate-events-card.test.js`: 24 passed.
- `openspec validate improve-camera-event-feed --strict` and `git diff --check`: passed.
- Reviewed camera-scoped behavior selection; ran the targeted event tests only. Live playback, editor, generator and persisted configuration are unchanged.
- Real-phone scrolling/bounce and provider recordings remain a user manual check; no full suite or device matrix run.
- Installed final frontend using `prepareFrontend()` on disposable `192.168.0.28`; served-asset/readiness checks passed. Left installed for user testing.
