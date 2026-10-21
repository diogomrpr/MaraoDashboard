# Tasks

## 1. Server signals and lifecycle identity

- [x] 1.1 Capture a fresh task snapshot, starting commit and reviewed shared-consumer scope; verify the selected focused plan covers lifecycle authentication, editor completion, navbar/startup and frontend refresh without absorbing unrelated camera or native-removal work.
- [x] 1.2 Add the read-only authenticated frontend subscription with owned dashboard scope, active fingerprint and cleanup on disconnect and unavailable identity on unload; verify ordinary users can subscribe without generation access and review the existing HA authenticated WebSocket boundary. Document the payload and lifecycle contract.
- [x] 1.3 Publish a unique dashboard-scoped signal after each successful editor Save & Generate, after success processing and response enqueue; assert identical repeated saves and failed-save suppression in the focused backend test; review that preview/dry-run/service/history paths contain no refresh publisher or signal-driven writes.
- [x] 1.4 Publish active identity after successful asset registration and retain identity delivery across integration reload; verify identity changes and subscription cleanup in the focused test and review that publication occurs only at the successful end of setup, and document that backend-only updates need no frontend reload.

## 2. Shared client refresh handling

- [x] 2.1 Add an early shared subscriber alongside navbar startup, with connection/foreground identity checks and affected-dashboard filtering; verify regular-user delivery, matching-version no-op, update-without-save recovery and rendering when the endpoint is unavailable. Keep it independent of native-authoring wrappers.
- [x] 2.2 Route save signals unconditionally and version mismatches conditionally into the existing refresh operation; verify duplicate delivery, overlapping reasons, repeated distinct saves and manual-refresh overlap cause no concurrent or looping reloads. Document the two independent triggers.
- [x] 2.3 Add bounded session-scoped pending/attempt markers and post-reload identity verification; test storage denial, stale-after-reload, cleanup failure and a later distinct request. Confirm cookies, preferences, IndexedDB and unrelated cache data remain untouched.
- [x] 2.4 Defer automatic recovery during hidden/offline state, editing, unsaved changes, active gestures, popups and in-flight interactions; add focused assertions that pending work resumes safely, editor save feedback remains visible and unrelated pages never reload. Localize updating/deferred/failure messages and retain manual navbar recovery.

## 3. Integrated acceptance and documentation

- [x] 3.1 Reuse existing local refresh tests and backend WebSocket assertions for repeated saves, failures and version changes. Hand off two-device and actual updated-asset acceptance to the user, as explicitly requested; do not add a browser/gallery campaign.
- [x] 3.2 Update user/development guidance for both triggers, deferred states, first-handler-load limitation and manual fallback; check links and clarify that committed generation success is separate from client refresh success.
- [x] 3.3 Review actual task hunks and run the minimal selected checks serially. Record that no HA deployment or physical Android verification was performed; leave routine device testing to the user under the updated AGENTS.md.
- [x] 3.4 Match every capability scenario to evidence and run strict OpenSpec validation; report omitted coverage honestly and leave unverified tasks unchecked without implicitly running a full suite or device matrix.

## Workflow follow-up

- Implementation was authorized and completed locally. Phone/two-device acceptance is handed to the user; no release or deployment was performed.
- Before any push/tag/release, run scoped verify:publish for the whole candidate. During explicit release preparation include applicable preserved-install lifecycle/upgrade evidence and matching package/data rollback coverage.
- Archive only after implementation and verification, preserving historical evidence and unrelated active changes.
