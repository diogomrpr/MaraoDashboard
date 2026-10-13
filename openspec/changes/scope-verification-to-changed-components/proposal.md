# Proposal

## Why

Release verification currently runs broad checks regardless of what changed. The last successful preserved-install run took 85 minutes, including a 50-minute mobile matrix; an earlier failed run repeated that matrix. Development and publication should use the smallest checks that cover the implemented features and their shared consumers.

## What Changes

- Save `npm run test:affected` as the default project command, selecting focused checks from changed source, implemented features and shared component dependencies. Print the selected scope and reasons before execution; run serially by default.
- **BREAKING workflow change:** make push, versioning, release verification and automatic CI use that same affected scope. A release request alone no longer authorizes the full suite, all 26 mobile profiles, every historical baseline or a full gallery review.
- Run relevant unit, action, geometry and preservation checks when the implementation touches those contracts. Require live preserved-install verification only for changed persistence, migration, generated-output ownership or installation/upgrade behavior, scoped to the affected formats and features.
- Provide `npm run test:full -- --parallel` as an explicitly requested comprehensive diagnostic, covering the complete registered suite. Allow opt-in parallel focused checks too; isolate browser contexts and outputs, and serialize conflicting fixture, save, restart, deployment and recovery operations.
- Prepare a browser batch once, capture failures and representative changed layouts, and reuse successful evidence for unchanged scoped inputs instead of restarting unrelated checks.
- Persist the default command and explicit-full-only rule in the repository contract, quality/development guides, OpenSpec context, npm scripts and CI. Supersede the previous unconditional publication and preserved-install matrices rather than leaving contradictory instructions.

Observed entry points are `package.json`, `tests/verify-publish.js`, `tests/verify-release.js`, `tests/test-ha-upgrade.js`, the browser runners and `.github/workflows/tests.yml`. Some existing browser commands prepare or mutate the same disposable installation; independent contexts alone cannot make those operations safe to overlap.

## Capabilities

### New Capabilities

None; verification belongs to the existing capability boundaries.

### Modified Capabilities

- `repository-workflow`: persistent affected-only defaults, explicit comprehensive-test authorization, batch validation and shared-consumer scope.
- `gallery-release-verification`: executable scope selection, focused release evidence, conditional preserved-install coverage, scoped mobile checks and optional safe parallel execution.

## Impact

- Affected-card set: **empty**. This change modifies development tooling and policy, not card rendering. Future test selection must include every consumer of a changed shared component.
- Modify npm commands/version hooks, publication/release and upgrade coverage validation, browser selectors/preparation/artifact handling, focused runner tests, automatic/manual CI and the corresponding guides/specification context. Reuse the current Node, pytest and Playwright stack; add no framework or paid service.
- Dashboard JSON, public card/template keys, package runtime and Home Assistant entry formats remain unchanged; no user-data migration is needed. Private test reports need a distinguishable scoped schema so partial checks cannot masquerade as old comprehensive evidence.
- This request explicitly replaces the older mandatory full release matrix and unconditional seven-baseline live gate. Product safety, accessibility, compatibility, privacy, exact-candidate verification and honest failure reporting remain applicable to the selected changed paths.
- Non-goals: remove existing tests or gallery examples, reduce product requirements to visibility alone, change dashboard features, publish a release during planning, or parallelize conflicting operations against the shared Home Assistant instance.
