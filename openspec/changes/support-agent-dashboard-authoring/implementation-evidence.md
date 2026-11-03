# Implementation evidence

Starting commit: `8614c883a320320b88702935399991d56a963eb9`, clean tree. Private task baseline: `/private/tmp/marao-agent-authoring.json`. Affected shared consumers are native/generic cards, conditional wrappers, popup ownership/editing/coordinator, native package generation and documentation. Reviewed the snapshot selector as a scope aid; selected local authoring/package/popup tests rather than its unrelated integration/build suggestions.

## Delivered contracts

- Authoring contract 1 describes 49 native, generic and runtime types, installed-version schema, examples, known fields, domains and audited defaults. Groups expose member lists without suggesting a primary entity. Historical source-format schemas are unchanged.
- The release manifest links `MaraoAuthoring.json`, which resolves hashed metadata, schema, guide, browser-safe ESM core and a single-file Node CLI. No authoring entry is added to dashboard startup. Entity Group's previously hand-maintained popup guidance now belongs to its documentation source notes, preventing site generation from discarding it.
- CLI describe/validate/plan use JSON stdin/stdout and no network, credential or filesystem APIs. Invalid plans omit configuration, patch and hash. Hashes remain opaque and unchanged. Patches reproduce reconciled documents, preserve ordering/opaque values, escape pointer keys and coalesce to at most 100 supported operations.
- Explicit popup edits reuse existing conservative adoption/creation; ordinary planning reconciles existing sources only. Missing entity metadata, unsupported ownership versions, source ambiguity and provenance edits fail without a payload. Native conditional card traversal is shared by authoring and existing browser popup consumers.

## Selected checks

- Ten authoring tests and three native package tests pass, including a copied single-file CLI, invalid JSON, no-I/O bundle checks, public/example/alias parity, installed-version hash/index agreement, standalone module import and alternate-version packaging.
- The existing popup-layout, popup-managed, popup-management and popup-coordinator suites pass (32 tests), including immutable historical v0.17.0/v0.20.0/v0.21.1 adoption fixtures and shared-source isolation.
- Documentation checks pass (21 tests); the site builds, and its link/search checker validates 224 pages and 163 redirects. Generated editor check and converter build pass. Strict OpenSpec validation passes.
- The independently expected v0.23.4 ordinary dashboard validates unchanged. Its historical strategy envelope is refused read-only, as intended. No persisted versions, source fixtures or native configuration were rewritten. Installation must preserve the existing disposable dashboard and helper state.

No direct ha-mcp connection, production instance, device actions, browser/layout campaign, full suite, camera transport or retired reconnect check was exercised. A local Python JSON Schema validator is not installed; schema coverage uses generated-definition assertions and shared runtime validation rather than claiming an independent standards-validator run.

## Final candidate installation

The final v0.27.0 candidate is installed on disposable `192.168.0.28` through direct `prepareFrontend()`; native served-asset/readiness checks passed with identity `3e02b909a0ab4a1a9cb3a976416955b792b53a7bdc57bd005a8fe02c9ce7929f`. This supersedes the initial metadata build. Test URL: `http://192.168.0.28:8123/marao-dashboard/overview`. The flat graph contains 92 files, including the stable release manifest and authoring index. Preparation preserved the existing ordinary dashboard and safe helper state without an HA restart or browser inspection.

## Publication

- Published [v0.27.0](https://github.com/diogomrpr/MaraoDashboard/releases/tag/v0.27.0), release ID `433318188`, from immutable tag commit `f16bd16b3b29e438aabbd2d5ebb98cb740203f29`. The release is public, stable and marked latest.
- Whole-candidate `verify:publish --base v0.26.1` passed all 30 selected unit-only groups serially on that clean commit. Final private report: `tests/.artifacts/verification/run-8DUYn0/report.json`; earlier successful report: `run-RS5j6D/report.json`. A redundant evidence read stalled on an ignored cloud-synced documentation output; the output was preserved outside the tree. An overlapping early retry correctly rejected changed generated inputs; the final serial gate passed after cleanup. No failed functional check was waived or suppressed.
- Exact-commit GitHub checks passed on main and tag. Tag Tests: `41736937572`; HACS: `41736937593`; hassfest: `41736937614`. Main Tests: `41736112297`; HACS: `41736112908`; hassfest: `41736111993`; documentation build: `41736112512`.
- Uploaded the complete 92-file flat distribution plus offline converter. All 93 remote asset names, sizes and SHA-256 digests match the final local candidate; the remote tag resolves to the recorded commit. Private asset receipt: `/private/tmp/marao-0270-release-verification.json`.
- Matching documentation build and Pages deployment succeeded through the approved main-branch publisher [41737277706](https://github.com/diogomrpr/MaraoDashboard/actions/runs/41737277706). The automatic tag-triggered build succeeded, but its duplicate deploy (`41737276710`) failed under the existing main-only Pages environment policy. No protection rules were changed, and that tag deployment is not claimed as passing.
- Generated cloud-sync duplicate files were preserved privately outside the release graph. Canonical distribution hashes remain unchanged. The final installed runtime identity remains the one above; this completion record changes documentation/tracking only and requires no reinstall.

All tracked work is complete. Archiving remains a separate explicit request.
