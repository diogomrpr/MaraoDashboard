---
name: marao-testing
description: Select, write, run, or diagnose Marao's scoped pytest, Node, and Playwright checks. Use when choosing verification for a change, repairing a failing test, or validating mobile interactions and data preservation with the existing test harness.
license: MIT
---

# Marao scoped testing

The [focused testing guide](../../../docs/docs/development/focused-testing.md)
is the command and evidence contract. Use the existing selector and helpers;
Marao's browser checks use the Playwright library, not an `@playwright/test` suite.

## Minimal verification first

Follow `AGENTS.md`'s verification policy before selecting commands. Routine visual
and real-device testing belongs to the user. Do not turn this skill, a selector
plan, or the coverage map into a requirement to run every available check.

1. Review the requested result and affected path. For routine changes, use the
   smallest check that demonstrates success; a camera stream playing is enough
   for ordinary playback acceptance. Visual-only edits need installation, but no
   automatic browser/app suites. Instruction-only edits need no deployment.
2. For nontrivial logic, prefer one existing targeted test or small assertion at
   the lowest useful layer. Add a regression for a concrete defect where useful.
   Do not build new browser tooling or fixtures just to verify an ordinary change.
3. Broaden only for an explicit request, a reported/observed defect, or a concrete
   security, data-loss, migration or recovery risk. Name the reason and limit the
   extra checks to it. Shared consumers inform risk review, not automatic suites.
4. If scoped automated coverage is needed, capture a task snapshot before editing,
   review the actual diff (including concurrent changes), and use `test:affected
   --since <snapshot> --tier <tier> --component <ids> --plan` to understand scope.
   A plan does not require running its entire selection for routine development.
   Explicit focused/publication coverage still follows its command contract.
5. Agent browser inspection is optional for routine work. If needed, use existing
   preview/check helpers on disposable HA `192.168.10.229`; inspect the requested
   behavior once. Leave successful assets installed and restore temporary helpers.
   Stop once it works; do not add themes, devices, zoom or timing investigations
   without a concrete reason. If the user takes over testing, finish mandatory
   installation and cleanup, then hand off.
6. Installation is required before a software task is done, even without browser
   checks: batch edits and normally sync the final applicable changes once to
   disposable HA `192.168.10.229`. Use the lightweight `prepareFrontend()` helper
   directly when compatible, without opening a browser; use `ha:sync` only when
   full preparation is required. Its asset/readiness checks confirm installation;
   no additional browser suite is implied. Local builds/browser overrides do not
   count. If blocked, report not installed / not ready for test. Instruction-only
   changes with no runtime effect need no redeployment.

Full suites and parallel runs need explicit requests. Releases, version hooks and
automatic Tests CI run affected unit tests only. Reuse integration testing from
development; do not request new browser, camera, mobile or upgrade evidence at
release unless the user explicitly asks. `verify:publish` and `verify:release`
without an upgrade-report argument enforce that default. Report what passed and what was left to the user; never
claim a manual handoff is automated coverage.

## Add an assertion where it can catch the defect

| Changed contract | Existing test layer |
| --- | --- |
| Python validation, generation, lifecycle, migration/recovery | [pytest fixtures and suites](../../../tests/components/marao_dashboard/) in `.venv` |
| JavaScript transformations, editor preservation, action/state logic | [Node tests](../../../tests/frontend/) and their current fixtures |
| Native input lifetime, touch cancellation, actual service dispatch, mobile geometry | Selected [browser checks](../../../tests/) with safe gallery cases |

Prefer the lowest layer that can observe the failure. Add a small regression for
nontrivial changed behavior; avoid tests that merely restate code or multiply
identical labels/colors/values. Use independent expected preservation data, not
output from the converter under test. Reuse suite-local setup and cleanup helpers.

## Browser execution and diagnosis

- Only disposable HA `192.168.10.229` and safe fixtures are permitted. Follow the
  [local workflow](../../../docs/docs/development/local-development.md) for private
  authentication and deployment. Existing live checks prepare the current build;
  do not add a second preparation or restart without a demonstrated need.
- Prefer scoped role/name or label locators. Playwright locators reach open Shadow
  DOM; use existing component helpers for geometry and native gestures. Do not
  introduce private selector engines or bypass gesture contracts with a click.
- Wait for the observable state with existing bounded helpers or locator waits.
  Register a request/response wait before its triggering action. Avoid arbitrary
  sleeps and network-idle readiness for HA's persistent connection.
- Keep contexts and evidence private, and restore mutated safe helpers in cleanup.
  Serialize shared deployment/dashboard writes even when parallel checks are requested.
- Inspect the failing assertion, current loaded asset identity, and relevant
  DOM/network/console evidence before changing a test. Distinguish application,
  fixture, environment, and assertion defects; fix their cause. Do not weaken
  assertions, quarantine failures, or turn a retry into proof of correctness.
- Save failures and representative successes using existing artifact paths. Capture
  traces only when useful and keep credentials, camera content, and private data
  out of shared logs or captures.

Finish with a concise result, the checks actually performed, and a short list of
feature-specific things the user should watch for. State any known failure or
important unchecked risk. Do not delay handoff for a final duplicate inspection.

[Community sources and adaptations](references/sources.md) record provenance;
load upstream detail only to resolve the specific test problem.
