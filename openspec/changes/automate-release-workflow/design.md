## Scope and acceptance

Starting commit: `fa71c7a33798b32480eab41bfad6f038e8b1ebf9`; initial dirty-state snapshot: `/private/tmp/marao-release-command-start.json`. Preserve existing unrelated work. Consumers are package commands, the release driver, publication/installation helpers, unit-check registry, agent/testing instructions and packaging documentation. No card/editor/generator/theme/translation/fixture behavior changes.

An authorized release from a clean reviewed checkout must version and build a complete deterministic candidate, commit generated version outputs, run the existing serial unit gate across the latest stable baseline, verify exact installation on disposable `192.168.0.28`, publish only the checked commit and complete hash-verified asset graph, and confirm tagged documentation deployment. Failed gates block later publication. Read-only plans do not call GitHub/HA or write source. Reruns preserve candidate/tag/assets and resume partial uploads or uncertain publication outcomes.

## Decisions

`ha-test/release.mjs` orchestrates existing `build:hacs`, `build:converter`, `verifyPublish()`, `prepareFrontend()` and GitHub workflows via the installed `gh` CLI. An explicit stable version and reviewed notes file are required; no arbitrary pending files are collected. Initial source must be clean and based on current `origin/main`. Versioning skips the duplicate npm version hook because the final clean commit receives the existing full-candidate unit-only publication gate before any push. Build modifications outside known version outputs/dist are errors requiring inspection.

The source, notes hash, exact candidate tree/commit, package identity, gate report and asset digests are bound in private atomic journal files under the Git common directory. An exclusive common-directory lock serializes release runs across worktrees. A resumed unit gate validates existing exact-commit evidence instead of adding integration checks. The existing installer verifies an already matching package or syncs only compatible current assets, preserving dashboard/helper state; no fallback to full preparation occurs.

The driver creates/reuses the release branch/PR and immutable tag, prepares a draft, uploads only missing matching assets, verifies every dist file plus converter, and waits for exact-commit Tests/HACS/hassfest/documentation workflows. It checks the PR head and main/tree identities before merging and publishing. Tags never move, uploaded mismatches are never clobbered, and no rollback of public versions is automatic. A lost publication response can be reconciled from the release status. Post-publication documentation failures remain explicit and the public release remains available; resumption verifies the deployment rather than republishing.

GitHub credentials stay with `gh`; HA credentials stay in ignored developer configuration. Journals store only whitelisted target/identity data, not configuration objects or tokens. The tooling is not shipped in the runtime graph. Existing public version semantics and saved configurations remain compatible, with no migration.

## Verification

Use temporary real Git repositories with injected npm/build, unit-gate, HA and GitHub boundaries. Check stage ordering, no push after failed unit/install gates, exact graph checks, stale inputs/tags, pending/failed CI, retry without duplicate mutation, deployment failure and uncertain publication recovery. Verify CLI/read-only plan, selector mapping, syntax and instruction links. This tooling-only implementation has no installed/runtime effect and needs no HA redeployment, external publishing or browser campaign.
