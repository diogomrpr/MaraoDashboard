# Design

## Context

See `proposal.md` for motivation and the observed timing baseline. The existing affected selector already expands shared consumers, merges unit-test patterns and prepares a compatible disposable installation once. The optimization belongs inside that path rather than in another runner.

The relevant path is:

```text
changed inputs + reviewed components
                 |
                 v
       required logical cases
                 |
                 v
    validated reuse + compatible visits
                 |
                 v
 private scoped evidence + publication gate
```

Current implementation facts:

- `tests/verification-map.js` selects nine geometry profiles for slider headers, access labels and editor rendering. Their runners normally expand each selected profile into light and dark.
- `tests/test-ha-card-alignment.js --editor-rendering` delegates to the same narrow-320 rendering/drag geometry already selected by the editor-rendering component, under a different job ID.
- `tests/test-ha-ui-batch.js` runs battery threshold transitions, problem checks and popup behavior for every selected profile/theme. The value-slider runner combines endpoint geometry, native gestures and realistic-route traversal.
- `tests/verification-browser.js` selects representative cards, but each sample reapplies preferences and scans the affected families. The shared preference helper includes whole-tree readiness, a fixed delay and repeated application to accommodate late native children.
- `tests/verification.js` records job results and timings but starts every selected job anew. `tests/verify-publish.js --report` validates an entire successful report with exact scope and candidate constraints. Most check identities include whole runtime/source trees; all include the entire selection map.
- Current scoped evidence is version 3. Existing artifact validation checks private permissions, hashes, freshness and cleanup; ordinary batch receipts and preserved-install receipts have distinct purposes.

Product scope remains empty. Builder models, backend validation/generation, templates, runtime, theme and translations must remain unchanged; they supply reviewed behavior dependencies for tests. Existing Cases, safe helpers, native examples and realistic pages supply regression subjects. The shared theme has common typography/geometry and mode-specific appearance, but native controls and Monaco still require explicit dependency review. The earlier component-scoping change is a foundation, not proof that these repetitions are necessary.

## Goals / Non-Goals

**Goals:** reduce repeated browser execution while preserving independently computed logical coverage, safe preparation, private evidence, distinct failure assertions and final representative inspection. Make cold-run savings and repair/resume savings separately measurable.

**Non-Goals:** change shipped assets or persisted product data, delete fast unit coverage, invent a general test scheduler or cache service, add dependencies, or change the serial/full/parallel authorization policy. Comprehensive runs retain their complete registered coverage; automatic reuse is not added to full mode.

## Decisions

### 1. Describe independent coverage in the existing map

Extend the existing component/check descriptors only enough to distinguish geometry, appearance and behavior cases and their relevant dimensions. A logical case identifies its assertion group, fixture/route, selected profile, theme requirement and native engine/input assumptions. Keep selection reasons and explicit equivalence reasons visible in `--plan`, without contacting HA.

Use light as the reference theme for reviewed theme-independent geometry and behavior. For a family currently using nine geometry profiles, keep those nine light cases and a normal-profile dark appearance/state case instead of replaying all nine dark geometries. Additional dark cases are selected when source or native-control behavior makes geometry theme-sensitive. Appearance cases check distinct active/inactive/loading/disabled/unknown/unavailable/problem states as relevant, not one normal-state screenshot. Theme switching receives a representative check when its behavior is affected.

Separate theme-independent dispatch, threshold boundaries, draft preservation and source round trips from visual checks. Keep native touch completion/cancellation on the relevant iPhone/Android profiles and existing engine-specific regressions where required; shared Chromium device descriptors alone do not prove Safari behavior. Retain 200% text and browser zoom as separate configurations and all selected typography modes. Preserve materially distinct slider, access, popup, language and option variants. Do not replace nine geometry profiles with a single presumed worst case.

Start with the measured slider-header/access-label/editor-rendering/battery-group batch, then apply the same descriptor policy to other mapped browser checks after review. No blanket reduction based on test filenames or theme names is allowed. Keep independent specified expected case sets in selector tests, including a theme-sensitive counterexample and explicit full-mode coverage.

Alternative: globally force light mode or use arbitrary pairwise combinations. Rejected because neither expresses which appearance, state, gesture and text dependencies make a combination necessary.

### 2. Group compatible visits and deduplicate delegated coverage

Retain logical cases separately from their physical execution grouping. A visit can serve several cases only when target/candidate, route, profile, theme, engine, fixture and mutation assumptions match. Reuse the existing preparation receipt and browser helpers. Run compatible gallery assertions together and restore popup, draft and helper changes before the next dependent case. Keep a dedicated cold-load case wherever startup behavior is part of the contract.

Extract reusable assertion functions from the alignment/UI runners as needed; retain their current CLI entry points for debugging. Both a direct editor geometry command and its alignment alias refer to one canonical coverage definition. Remove the duplicate visit from the selected batch without claiming an unexecuted case passed. Do not merge checks based only on similar command strings.

The existing exclusive scheduling remains authoritative. Saves, restarts, shared helper mutations and recovery retain exclusive phases. This change does not enable parallel execution. A failed visit keeps raw diagnostics and all completed outcomes, but none of its results becomes reusable until restoration and batch cleanup have been verified.

Alternative: add parallel jobs to hide repeated work. Rejected as the default because it does not remove redundant execution and shared HA mutations must remain serialized.

### 3. Apply preferences and inspect content at the correct lifecycle boundary

Split stable page setup from readiness for newly mounted content. Apply profile/theme configuration after navigation and relevant subtree mounts; wait for native updates, fonts, measured stable geometry and preserved touch emulation before asserting. Avoid repeating whole-document preference passes and whole-family scans for every equivalent sample. Scroll and materialize the distinct selected cases, then inspect their relevant subtree plus shared navbar/popup/global diagnostics.

Retain a whole-page check where its assertion requires it, and retain warning/error/resource listeners throughout a visit. Replace fixed delays only when observable readiness covers the actual late-mount condition. Add a focused late-child regression and verify that missing header layout and the former stacked access label still fail. Screenshot policy applies consistently across delegated editor, slider and UI checks: failures plus a small representative success set by default, with exhaustive success captures available explicitly. Keep pixel comparisons used as actual assertions, such as native slider-thumb reset, even when no image is saved.

Alternative: remove waits and captures wholesale. Rejected because it could speed up an incomplete render and remove meaningful regression assertions.

### 4. Reuse individual completed checks through explicit private input

Add `--reuse <absolute-private-report>` to affected execution and the affected publication path. Keep `--report` as whole-report publication validation; reject conflicting combinations and reuse with full mode. No new background cache, report discovery service or remote storage is needed.

Compute the new plan first. Validate the source report's structure, private regular-file ownership constraints, artifact hashes, original execution freshness and verified cleanup. A previous batch may have failed overall, but only its individually successful, fully recorded cases are candidates. Failed, absent or incomplete cases run again. An interrupted report lacking verified cleanup cannot be reused. Explicitly malformed or unsafe reuse inputs fail preflight; valid reports with ineligible cases produce explained reruns.

Replace unnecessarily broad input sets with reviewed transitive file/module dependencies, relevant configuration/fixtures and the case's resolved coverage descriptor. Keep shared runtime monoliths conservatively invalidating all their consumers. Changes to shared policy helpers invalidate their dependents; an unrelated map entry need not invalidate every case when the resolved descriptor and shared selector implementation are unchanged. Unknown dependencies stay broad or fail selection. Do not infer independence from a path edit alone.

Live identities include target, source/fixture assumptions, relevant served assets, Home Assistant frontend identity, Playwright/browser identity and emulation settings. A new candidate receives current preparation/validation; an old receipt is never copied as the current installation proof. Unrelated candidate changes can preserve a result only when the reviewed dependency projection and live conditions still match. Unattributable environment or installation drift invalidates dependent browser results. Cleanup, preparation and required final visual inspection are always current, not cached.

Preserved-install evidence, exact-commit CI and native reconnect exception expiry continue through their existing validators; this reuse feature does not synthesize, extend or substitute that proof.

Alternative: accept an old report's required list, relabel its commit, or keep global candidate hashing as the sole reuse test. The first two weaken proof; the last prevents useful reuse after an unrelated repair. Instead compute requirements independently, validate each eligible result and bind the resulting report to the current candidate.

### 5. Version evidence and distinguish coverage from execution

Introduce scoped evidence version 4 for logical cases, shared visits and per-case provenance. Keep historical reports immutable. Preserve the existing version-3 whole-report validation for its original semantics; older reports lacking version-4 coverage/identity information do not supply per-case reuse and require fresh execution for the new plan. Preserve the distinct kind/version handling of upgrade evidence.

Write private results atomically after each completed case/visit and after final cleanup. A final passing report requires every current required case to have either fresh passing execution or validated reuse. Reused entries retain the originating report/result identity, original execution time and relevant capture hashes; freshness is measured from original execution and cannot be renewed by reuse chains. Resolve provenance to an original execution and reject missing or cyclic chains.

Record original execution duration separately from reuse validation time. Total wall time includes preparation and cleanup, and shared visit duration is counted once. Report physical visits, logical cases, fresh/reused counts, captures, exclusions and equivalence/invalidation reasons. Retain representative evidence from its original private artifact location with validated hashes, without rewriting it or exposing private payloads.

Alternative: keep job counts as the only metric. Rejected because one job can hide many theme/profile visits and shared executions could otherwise double-count coverage or time.

## Risks / Trade-offs

- Misclassifying a theme dependency can miss a regression -> require explicit reviewed independence, both-theme state/contrast cases and theme-sensitive selector regressions; retain broader coverage for unknowns.
- Narrow hashes can allow stale passes -> test transitive dependency changes, shared monolith invalidation, fixture/platform changes and current prepared-install validation before live reuse.
- Combined visits can leak state -> verify per-case restoration, preserve exclusive phases and disallow reuse after any cleanup failure.
- Readiness optimizations can miss delayed children -> keep assertions for mounted content, fonts, touch settings and a delayed-child regression; measure overhead before removing fallback waits.
- Old evidence can appear current -> separate schema versions, original timestamps, immutable source reports and exact final-candidate publication binding.
- Timing varies with HA/browser load -> compare the same serial scope/environment and report cold and reuse results separately; promise no fixed wall-time percentage from combination arithmetic.

## Migration Plan

Implement selector factoring and duplicate-visit removal first, then shared assertion visits and focused inspection, then dependency identities/reuse and version-4 publication integration. Validate cheap selector, safety and evidence cases before live work. Keep the work as one coherent tooling change with focused checkpoints.

Reconcile the existing "once per relevant theme" wording in `AGENTS.md`, the quality guide and development/OpenSpec context with the explicit distinction between theme-independent behavior and both-theme appearance. Correct the quality guide's leftover unconditional full-gallery release sentence to match the affected policy. Preserve full and parallel options, scenario coverage, safety and inspection rules.

Compare the same four-component serial batch used by the observed baseline, with one cold execution, one unchanged reuse validation and one controlled relevant-input invalidation. Use safe private temporary inputs for invalidation and restore exact bytes before final validation. Preserve before/after evidence and inspect representative affected test subjects last; do not run unrelated full/mobile/history suites.

There are no historical product inputs or generated-data transformations to migrate. Supported released dashboards and independent upgrade expectations remain unchanged. Do not modify historical fixtures or reports. Live validation uses the existing exact backups, safe helper restoration and current-install checks; any failure retains private recovery data and reports unsuccessful cleanup. No package downgrade is needed for a tooling-only rollback: revert the tooling change and ignore unsupported new evidence. If a live validation operation ever restores a historical installation, the existing matching-package-plus-saved-data recovery remains mandatory; this change does not alter that path.

## Apply record

Apply baseline: `c72b0d40dce4f70acd95e59b291ab7745bdb6c01`. Product affected-card set: empty for this tooling change; the companion control-grid change records its separate runtime scope. The private 889-second baseline remains unchanged. Read-only selection confirms 37 browser jobs and 16 offline checks (the baseline release included additional publication tooling checks); nine-profile header/access families each expand to 18 theme visits. Editor alignment duplicates narrow-320 rendering/drag geometry. Battery behavior currently repeats at three profiles in both themes.
