# Tasks

## 1. Preserve the implementation baseline

- [x] 1.1 Record the current commit, acceptance cases, shared activity consumers, and dirty state with `npm run test:affected -- --snapshot /private/tmp/use-marao-timeline-dropdowns.json`; verify the existing `MaraoActivity.js` loading/layout edits and unrelated artifacts are identified and preserved.

## 2. Integrate shared timeline dropdowns

- [x] 2.1 Replace the activity list-filter helper with `MaraoDropdown.js` markup, styles, and binding for Date, Event type, optional Source, Origin, and Initiator; verify localized names, visible current labels/checkmarks, semantic controls, and 48px targets by reviewing the shared integration and existing equivalent consumers.
- [x] 2.2 Synchronize dropdowns from effective period/filter state, including Reset and rebuilt Origin/Initiator options; add a focused assertion in the existing activity test harness proving a changed date selection invokes the query callback once, unchanged selection does not, custom inputs retain their behavior, and reset/dynamic choices display the effective value.
- [x] 2.3 Close menus when the containing panel hides and destroy controllers before replacement or popup removal; extend the same focused harness to verify disposal and dismissal leave no removed-control callbacks or extra queries, reusing the existing shared-dropdown lifecycle test if shared code changes.
- [x] 2.4 Update the Card activity section of `docs/docs/development/dashboard-quality.md` to describe shared dropdowns and retained From/Through inputs; verify its wording matches the implemented controls and preserved date rules.

## 3. Verify and install the final frontend

- [x] 3.1 Review the actual task diff and `npm run test:affected -- --since /private/tmp/use-marao-timeline-dropdowns.json --tier behavior --component activity --plan`; run only the smallest relevant activity/adapter checks, confirm the three delta requirements against the selected evidence, and review mobile menu containment and modal event handling in code. Use one targeted preview only if a concrete layout concern needs inspection; disclose excluded concurrent hunks.
- [x] 3.2 Install the final frontend on disposable Home Assistant `192.168.0.28` with the existing `prepareFrontend()` helper, preserving configuration and helper state; verify served assets/readiness, then hand off `/marao-dashboard` with any reload instruction, actual checks, and the short Date/reset/custom-range/menu-dismissal watch list. Report an installation failure as not installed / not ready for test.

## Implementation evidence

- Shared pre-edit baseline: `23c0d0e2c14eee774ac10a23ad50ae1449c31028`, snapshot `/private/tmp/marao-pending-1793824384352.json`. Existing Activity loading/layout hunks and duplicate distribution artifacts were preserved; reviewed file subsets separate the three proposals' checks.
- Passed: 36 serial navbar/settings tests, 5 Activity tests, 4 selected glance/Activity/problem tests, editor build/check, and changed documentation links. Scope plans were reviewed; their broader suggested suites were not run.
- Final frontend installed on disposable `192.168.0.28`; served-asset/readiness checks passed. No backend or shared-format migration was required.
- Manual handoff: phone tile layout/enlarged text, timeline menu/reset/custom dates, and browser/Companion sensor persistence across reloads and independent clients. No browser matrix or real Companion inspection was performed.
