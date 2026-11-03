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

Publication evidence will be recorded after the unit-only gate and external publication complete. Archiving remains a separate explicit request.
