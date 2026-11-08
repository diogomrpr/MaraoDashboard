# Tasks

- [x] Implement the version/build/gate/install/publish driver with exact candidate binding, complete asset checks and resumable private progress.
- [x] Add the package command, affected-unit mapping, agent/testing instructions and packaging guide for future release requests.
- [x] Verify orchestration, preservation and failure/retry paths with the targeted temporary-repository tests; check the read-only CLI plan, mapping, syntax/links and specification. No live publication or HA redeployment is part of this tooling-only implementation.

Evidence: 10 targeted tests passed using real temporary Git repositories and injected external/build/gate/install boundaries. Read-only CLI plan reported the existing dirty checkout without mutation or HA/GitHub calls. The selector maps only the release-workflow Node unit check; syntax, package command, skill links, scoped diff and strict OpenSpec validation passed. Existing unrelated changes were excluded. No actual version was published and the installed Home Assistant package was untouched.
