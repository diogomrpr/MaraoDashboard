---
title: Focused testing
description: Select the smallest useful verification and keep installation separate from proof of behavior.
---

Verification starts with the change's concrete behavior and risks. A visual-only edit can use code review and a short manual watch list. Nontrivial logic benefits from a small targeted assertion. Security, data loss, migration and recovery require focused evidence for the affected path.

## Capture and select scope

Before editing for automated verification:

```sh
npm run test:affected -- --snapshot /private/tmp/marao-task.json
```

Afterward, review the actual diff, including shared-file hunks and concurrent work. Select reviewed component IDs and inspect the plan:

```sh
npm run test:affected -- --since /private/tmp/marao-task.json --tier behavior --component people --plan
```

Use IDs that actually map to the affected code. The selector is a scope aid, not a requirement to run every suggested suite. Unknown mappings need resolution, not a fallback to everything. Tests run serially by default.

## Choose the useful layer

| Changed contract | Useful evidence |
| --- | --- |
| Configuration transformations, action guards, preservation | Targeted Node assertions |
| Python lifecycle or historical conversion | Scoped pytest with independent expected data |
| Native input lifetime or observed browser defect | One representative safe browser flow |
| Public docs and examples | Build, coverage, configuration round trips and links |
| Persisted data or recovery | Focused before/after and failure-preservation assertions |

A visible control does not prove correct service targeting or exactly-once dispatch. Likewise, a simulated website preview does not establish HA integration or physical-device behavior.

## Completion and publication

Install applicable final changes on the disposable instance before calling software ready for testing. Served-asset/readiness checks establish installation without requiring another browser campaign. Leave successful assets installed and restore any temporary safe-helper state.

Before pushes, tags or releases, `npm run verify:publish` runs affected unit tests. Release preparation reuses development integration evidence; it does not automatically run browsers, preserved upgrades or a full matrix.

Full-suite and parallel runs require an explicit request. Camera playback/transport checks are permanently manual-only, and the native HA reconnect outage/expiry probe is retired. Preserve historical failures honestly without turning them into current automatic gates.

Read the [canonical focused-testing guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/docs/docs/development/focused-testing.md) for selector details and recovery evidence.
