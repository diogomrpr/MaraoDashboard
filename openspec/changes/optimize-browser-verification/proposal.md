# Proposal

## Why

Affected verification still repeats equivalent browser work: the inspected successful batch took 889 seconds across 58 jobs, while unit tests, Python checks and builds consumed about 11 seconds. Factoring independent coverage dimensions, sharing compatible page visits and reusing valid completed checks can shorten feedback without dropping distinct failure cases.

## What Changes

- Separate layout, appearance and behavior coverage in the existing affected-check map. Run theme-independent layouts and interactions in one reference theme; retain representative appearance/state checks in both themes and explicit repeats where a theme changes the contract.
- Preserve relevant 320px, iPhone/Android, portrait/landscape, normal/bold/200% text/200% zoom/bold-plus-200% text and native gesture coverage without multiplying every assertion by every dimension.
- Combine compatible checks on the same prepared page, remove duplicate delegated editor geometry jobs and separate state-transition checks from geometry-only visits.
- Reduce repeated whole-page preference application and family scans while retaining readiness checks for newly mounted content, raw diagnostics and representative final inspection.
- Add explicit per-check reuse from private reports, including successful checks from a failed batch only after verified cleanup. Recompute required coverage and rerun failed, missing or invalidated checks using reviewed dependency inputs.
- Record logical coverage, execution/reuse provenance, durations, page visits and representative captures so reduced work remains auditable and measurable. Keep the existing full mode available only on explicit request.
- Align the agent contract, quality guide, focused-testing guidance and coverage documentation with the factored policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `gallery-release-verification`: Factored mobile/theme/interaction selection, compatible browser batching, trustworthy per-check reuse and measurable scoped evidence.
- `repository-workflow`: Apply the factored coverage policy consistently during development and publication while preserving explicit full/parallel execution and final visual inspection.

## Impact

- Starting commit: `c72b0d40dce4f70acd95e59b291ab7745bdb6c01`; working tree was clean before this planning change. Affected-card set: **empty**; this is verification tooling, with existing cards used as regression subjects.
- Primary implementation areas: `tests/verification-map.js`, `tests/verification.js`, `tests/verification-browser.js`, `tests/verify-publish.js`, relevant `test-ha-*` runners and delegated editor checks, their focused frontend tests, and prepared-batch integration where required for validated reuse.
- Documentation: `AGENTS.md`, `docs/docs/development/dashboard-quality.md`, `docs/docs/development/focused-testing.md`, and relevant OpenSpec context/coverage guidance. Shipped builder, generator, templates, runtime, themes and translations are behavior inputs, not implementation targets.
- Compatibility: preserve dashboard JSON, generated output, configuration-entry versions, package behavior, CLI defaults and supported released installations. No product-data migration or live historical replay is required for this tooling change. New private evidence must be versioned; existing reports and historical fixtures remain immutable, and insufficient older proof causes a rerun.
- Observed baseline: private report `tests/.artifacts/verification/run-Y3voLV/report.json` recorded 37 browser jobs and 118 success captures. Several layout families select nine profiles with both themes; editor alignment delegates to an already selected narrow-profile geometry check. Existing publication reuse accepts a complete successful report, rather than resuming individual completed checks.
- Proposed assumption: reviewed layout and behavior code with no theme dependency can share one reference-theme execution; appearance remains independently verified in both themes. Unknown dependencies retain conservative coverage. The 18-to-10 combination example is a selection reduction, not a measured runtime promise.
- Non-goals: deleting fast unit coverage, weakening action/security/migration assertions, changing product UI, reducing supported mobile/text modes, adding dependencies or another test framework, automatic comprehensive/parallel runs, or using another Home Assistant instance.
