# Design

## Accepted revision: unit-only releases (2026-10-21)

The user requires releases to run only affected Node/Python unit tests, reusing
integration testing performed during development. This supersedes the broader
release-gate and fresh preserved-install evidence requirements below. Apply the
same unit-only default to verify:publish, verify:release without a report,
version hooks and automatic Tests CI. Additional changed-feature integration or
full testing requires an explicit user request. Keep known failures honest and
retain applicable hassfest/HACS metadata validation. No runtime, saved data,
card consumers or test-instance installation changes are involved.


## Context

See [proposal.md](proposal.md) for motivation. The current npm `test` command runs all static/frontend and Python tests; `preversion` calls `verify:publish`. That publication runner either executes broad browser scripts or requires complete upgrade evidence. `verify:release`, `tests/upgrade_coverage.py` and `ha-test/upgrade/coverage.json` assume fixed comprehensive coverage. Automatic Tests CI also runs all static and Python checks.

The accessibility runner already batches three browser processes, but traverses the gallery and every popup in each selected profile. Other runners call `prepare()` independently, use fixed artifact directories and sometimes save dashboard source or mutate the same helpers. Those are shared-state conflicts, even with separate browser contexts.

Affected-card set: empty; no runtime behavior changes. Existing uncommitted product/editor/generator/fixture edits belong to other work and must remain untouched during this tooling change.

## Goals / Non-Goals

**Goals:** One explainable focused selection used throughout development and publication; no implicit comprehensive run; opt-in bounded parallelism; preserved action/data guarantees for changed paths; measurable timings.

**Non-Goals:** New test framework, worker service, complete automatic source dependency analysis, removal of existing checks, additional dashboard roots, product changes or a release as part of implementing this proposal.

## Decisions

### 1. Use a small checked-in map and existing test selectors

Add a small runner under `tests/` with a checked-in mapping of source paths/component identifiers to existing test commands, shared consumers, relevant profiles and shared-state conflicts. Start from `openspec/feature-coverage.md`, existing test files and gallery case identities. Reuse Node test-name patterns, pytest file/test selectors and browser scenario/theme options; extend browser selection to affected families/cases/popups where necessary. Do not build a dependency-analysis framework.

The commands are:

| Command | Intended behavior |
| --- | --- |
| `npm run test:affected -- --plan` | Print selected checks and reasons; no tests or HA contact |
| `npm run test:affected` | Execute the focused plan serially |
| `npm run test:affected -- --base <ref> --component <id>` | Explicit comparison/scope when needed; retain shared consumers |
| `npm run test:affected -- --parallel` | Explicitly overlap independent selected jobs |
| `npm run test:full -- --parallel` | Explicit comprehensive run, with safe jobs in parallel |
| `npm run verify:publish` / `npm run verify:release` | Validate affected release scope and relevant evidence; never implicitly invoke `test:full` |

Route the usual `npm test` entry point to affected selection. Keep the existing individual commands for deliberate focused use. All default runner-controlled test concurrency, including the current three-profile loop, becomes serial unless `--parallel` is supplied.

For an implementation batch, compare to its recorded starting commit and include staged, unstaged, deleted and relevant untracked files. Publication compares the whole candidate to the previous published release tag, not just the last commit or working tree. CI uses the explicit event comparison range with required history fetched. Print resolved revisions; a missing/ambiguous base is an error. Never infer an empty release scope from a clean checkout.

When a monolithic file contains several components, explicit component identifiers can refine selection only after reviewing its diff. The map expands shared consumers automatically. An unmapped path or unresolved component relationship stops selection with a precise message; it does not silently skip work or fall back to everything. A CI event without sufficient component scope must report that limitation rather than guessing success. A conservative mapped consumer set is acceptable where finer selection cannot be established.

Examples: slider changes cover light/fan/cover value behavior and geometry; popup changes cover affected popup families plus focus/inertness and relevant narrow/landscape layouts; editor model changes select model and relevant save/round-trip assertions; documentation-only changes select relevant documentation/specification checks and no HA deployment. Changes to common foundations can legitimately select many card families, but do not authorize unrelated integration/history suites.

### 2. Replace unconditional release coverage with the selected contract

Update `verify-publish.js`, `verify-release.js`, `preversion`, Tests CI and upgrade coverage validation to consume the same resolved selection. Apply packaging/build/metadata/HACS/hassfest checks when their changed inputs require them. Keep selected failures and known relevant defects blocking. Automatic CI runs applicable offline checks; required live browser proof remains local to the authorized disposable instance, with no credentials added to CI. An explicit manual workflow enables comprehensive offline CI; the local comprehensive command supplies all live checks.

UI-only releases need relevant component unit/interaction/layout checks and representative final review, without historical replay. Changes to persisted structure, defaults, generated-output contracts/ownership, migration, setup or restoration select the matching migration/recovery checks and live preserved-install baselines. If shared conversion affects every supported format, all affected baselines remain necessary, but unrelated browser features and all profiles are not added. Complete seven-baseline/browser coverage remains available only through an explicit comprehensive request.

For focused mobile checks, select representative normal and difficult profiles based on the changed contract: 320px/enlarged text for wrapping, landscape for sheets/navbar, both native touch geometries for gesture-dependent sliders, both themes when styling/state colors differ. Assert relevant visibility, clipping, overlap, touch sizing, diagnostics and actual action results. Split reusable popup behavior checks from geometry traversal so every profile does not repeat focus/action sequences. Validate cheap unit, selection and migration prerequisites before expensive browser work.

### 3. Prepare once and parallelize only independent jobs

Use the existing child-process approach and a bounded pool of three jobs only in explicit parallel mode. Each job has a private unique artifact subdirectory, isolated browser context, result and duration. Independent unit/static/browser jobs can overlap after shared assets are built. Node test-file concurrency must follow the same explicit mode; do not add pytest parallel dependencies.

Build and prepare a compatible browser batch once. Extend the prepared-install receipt path for ordinary batches instead of abusing the existing preserved-upgrade receipt, which must keep its provenance semantics. Subsequent jobs validate the served candidate and safe fixtures without redeploying or resetting them.

Jobs that save source, restart HA, modify shared registrations/theme state or run historical upgrade/recovery take an exclusive phase: no dependent reader overlaps. Helper mutators overlap only if their safe entity sets and restoration are proven disjoint; otherwise serialize them. Historical installations against the one disposable instance always run sequentially. Cleanup is awaited on success, failure or cancellation; cleanup failures retain private recovery data and fail the result. Never create another dashboard to obtain concurrency.

### 4. Record scoped evidence without claiming comprehensive coverage

Extend private verification evidence with a versioned scoped schema identifying comparison base, final candidate, source/test/selector hashes, component consumers, required checks/profiles/baselines, pass/fail results, exclusions, timings and cleanup. The verifier computes required coverage independently from the current map; an edited report cannot reduce it. Keep existing version-2 comprehensive reports distinguishable and immutable; never relabel them as scoped or claim partial version-2 coverage.

Reuse successful selected checks only while their relevant code, test code, dependency map, source, target, fixtures and prepared installation remain valid. A candidate change recomputes scope and invalidated checks; evidence is then bound to the clean final release commit. Push/tag/release can reuse that final proof without another browser traversal. Selected browser failures always capture evidence; success captures and final human review stay representative. Reports explicitly say which broad checks were not run.

## Risks / Trade-offs

- Narrow selection can miss an indirect consumer → explicitly map shared roots, test representative selections and reject unresolved scope. This policy accepts less detection of unrelated regressions than a comprehensive run.
- Simultaneous HA operations can contaminate results → default serial execution, exclusive mutation/recovery phases and private job artifacts; browser isolation alone is insufficient.
- Hidden hooks or CI could preserve the slow default → audit all test/publication/version entry points and document one authoritative command; manual full mode remains opt-in.
- Focused evidence could be mistaken for the old full upgrade proof → versioned schema, independent expected selection and explicit exclusions.
- Fixed runtime targets are machine-dependent → report actual per-check and total durations; make no promised speedup before measurement.

## Migration Plan

Implement selector/runner and their focused tests first, then adapt browser preparation/filtering and conditional publication/upgrade evidence as one batch. Update `AGENTS.md`, the quality and local-development guides, `openspec/config.yaml`, context/README/coverage map, npm hooks and CI together. Explicitly supersede the old unconditional full matrix, seven-baseline replay and full preserved-install evidence requirements. Completed upgrade-change artifacts remain an honest record of the prior release; when reconciling baseline specs, apply this later policy after those older deltas so their gate wording cannot reintroduce the old default.

No dashboard/package/config-entry migration is needed. No historical fixture or previous private report is rewritten. Reverting the tooling commit restores the former runner and report validation without altering user dashboards; no package/data rollback is needed because this change must not write shipped behavior or persisted user state. Any exercised live scenario still uses existing exact backups, preflight, atomic writes and complete restoration.
