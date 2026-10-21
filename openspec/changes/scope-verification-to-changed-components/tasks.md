# Tasks

## 1. Focused selection and persistent defaults

- [x] 1.1 Add the small affected-check runner and source/component/consumer map using existing commands and selectors; verify focused selection tests for a label, shared slider, popup, editor model, migration and documentation-only change, including exclusions and deduplication.
- [x] 1.2 Implement explicit comparison-base handling for batch, release and CI scopes, including staged/unstaged/deleted/untracked inputs and all candidate commits; verify a clean multi-commit release still selects its changes, missing references fail, ambiguous scope requires resolution and shared consumers cannot be omitted.
- [x] 1.3 Save `test:affected`, route `npm test` and version/publication defaults to focused selection, and expose explicit `test:full`/`--parallel` modes; update `AGENTS.md`, quality/local-development guides, OpenSpec config/context/README and the source/check map, verifying command help/plan output and absence of contradictory mandatory full-matrix wording.

## 2. Focused browser batches and optional concurrency

- [x] 2.1 Extend existing browser runners with affected family/case/popup/profile selection and separate popup behavior from repeated geometry traversal; verify selector tests retain required alignment, actions, cancellation and difficult layouts while excluding unrelated gallery traversal, and document the focused browser options.
- [x] 2.2 Reuse guarded preparation once per compatible batch and give jobs private distinct artifacts without weakening preserved-upgrade provenance; verify one preparation, rejection of changed served assets/unsafe fixtures, no artifact collisions and restoration/error reporting using focused prepared-runner tests; document ordinary versus preserved-install receipts.
- [x] 2.3 Implement opt-in bounded parallel scheduling with default serial execution, exclusive mutation/restart/upgrade phases and awaited cleanup; verify scheduler tests with controlled fake jobs demonstrate overlap only when requested, block conflicting readers/writers, retain failed/cancelled results and prevent output overwrites; document safe parallel limits. Do not launch live parallel or comprehensive checks merely to validate this option.

## 3. Scoped publication, upgrade evidence and CI

- [x] 3.1 Adapt publication/release gates and upgrade selection/coverage validation to affected contracts and baselines; add focused gate tests proving UI-only releases need no historical replay, shared migrations require every affected format, selected failures/cleanup block release and no default path invokes the full matrix; update release/upgrade instructions with those conditions.
- [x] 3.2 Version scoped private evidence, validate required coverage independently and reuse unchanged selected results with final-commit binding; verify focused tests reject missing consumers, modified test/selector/source/target/fixture inputs, edited exclusions, stale proof and partial evidence mislabeled comprehensive while preserving old reports and approved native-exception semantics; document honest scope/timing reports.
- [x] 3.3 Change automatic Tests CI to explicit affected event ranges and provide manual comprehensive/parallel inputs defaulting off; align applicable packaging/hassfest/HACS checks with changed inputs and document that live checks remain local; verify workflow configuration and selected command arguments without requesting an actual comprehensive run.

## 4. Combined focused validation

- [x] 4.1 After the final batch edit, run the smallest covering runner/selector/preparation/gate checks once and strictly validate this OpenSpec change; compare plans for representative narrow changes and the complete optional suite, confirming plan mode has no HA contact, default serial execution and no hidden full-suite hook.
- [x] 4.2 Run one small serial browser batch against safe representative cases on disposable `192.168.0.28`, verifying shared preparation, selected visibility/geometry/action assertions, diagnostics, artifact isolation, cleanup and measured duration; inspect its representative output and report excluded checks honestly. Do not run the full suite, 26-profile matrix, live historical upgrade campaign or publication as part of this tooling validation.

## Workflow follow-up

- Synchronize verified deltas into baseline specifications, applying this later scope policy after any older completed upgrade deltas so their unconditional gates cannot reappear; preserve prior release artifacts as historical evidence.
- Archive only after implementation and the focused validation above are complete. A later release uses affected checks; a comprehensive run requires a separate explicit request.

## Implementation evidence

Completed on 2026-10-13. The final focused command selected 12 checks, including
62 Node assertions, package staging and two serial browser jobs in both themes.
It inspected seven representative light states/options per theme, one selected
popup's geometry/focus/scroll/close behavior and safe single-dispatch switch toggles.
The final private report records a 31.3-second pass with verified source/output,
fixture ownership and helper-state cleanup. Representative normal and popup
screenshots were inspected after the last edit and focused check.

Full-suite plans and parallel scheduling were checked without a live comprehensive
or parallel run. No historical live upgrade campaign, publication, physical-phone
or Safari inspection was performed. Historical upgrade execution still requires
the configured SSH Python runtime; its absence is rejected at preflight.

## Unit-only release revision (2026-10-21)

Starting commit: `9aaaed07157d62e3ee305e90425e346249defc2a`. Affected card
consumers: none (tooling/instructions only). Acceptance: release/version/CI
select only unit tests, never prepare HA or launch browsers; explicit changed-
feature and comprehensive commands remain available; development integration
results are reused without new release reports.

- [x] Default release selection, version hook and automatic CI to affected unit tests.
- [x] Supersede conflicting release instructions in the contract, skill and guides.
- [x] Verify unit-only camera/UI/migration selection and explicit integration availability with existing selector tests (24 passed); review the diff. No HA deployment needed.
