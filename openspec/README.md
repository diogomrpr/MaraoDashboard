# Marao project specifications

This is the baseline for the existing Marao Dashboard and the planning home for
future tasks. It was established on 2026-10-09 from published **v0.5.1**, commit
`370c2c57088b0982a5059acbeab998624e0bf427`, the repository, its quality contract,
and the available development/release history. No application behavior changes
are introduced by this setup.

## Read what the task needs

Follow the [repository contract](../AGENTS.md), then read the affected capability
specs below. Use the [project context](project-context.md) for relevant prior
decisions and the [coverage map](feature-coverage.md) for source/check routing.
Read applicable [quality-guide](../docs/docs/development/dashboard-quality.md)
sections for changed controls, layouts or release behavior. These are targeted
references, not a required full-document reading list for every task.

Higher-priority instructions and the repository contract win over OpenSpec.
Specifications record intended contracts; they do not prove the current build
passes them. Known deviations belong in open changes. In particular, the native
Home Assistant reconnect issue remains unconfirmed.

## Baseline capabilities

| Specification | Covers |
| --- | --- |
| [Repository workflow](specs/repository-workflow/spec.md) | Ownership, shared fixes, privacy, development loop, task lifecycle |
| [Integration lifecycle](specs/integration-lifecycle/spec.md) | Installation, admin APIs, frontend registration, history, migration |
| [Visual builder](specs/visual-builder/spec.md) | Visual/JSON editing, selectors, room snapshots, validation and save |
| [Native dashboard editing](specs/native-dashboard-editing/spec.md) | Historical standalone feature; retired authoring, preserved independent ownership |
| [Dashboard generation](specs/dashboard-generation/spec.md) | Pages, entity resolution, protected YAML, generated controls |
| [Mobile theme and layout](specs/mobile-theme-layout/spec.md) | Typography, palette, touch sizing, title reflow, localization |
| [Navigation and popups](specs/navigation-popups/spec.md) | Navbar, fullscreen shell, sheets, focus, scroll and route behavior |
| [Entity state and actions](specs/entity-state-actions/spec.md) | Availability, dispatch, haptics, strict slides and security holds |
| [Value and numeric controls](specs/value-numeric-controls/spec.md) | Smooth slider geometry, native drag, confirmed/target values, steppers |
| [Card behaviors](specs/card-behaviors/spec.md) | Supported families, summaries, climate, media, vacuum, appliances |
| [Camera and history content](specs/camera-history-content/spec.md) | Providers, graphs, timelines, energy history, async failure states |
| [Gallery and release verification](specs/gallery-release-verification/spec.md) | Environment, safe cases, focused checks, mobile matrix, packaging and release |

## Codex workflow and project skills

Start with the requested outcome and concrete acceptance cases. Small fixes
restoring documented behavior, refactors and documentation corrections use a
short path: inspect the affected code, make the change, complete the selected development tier,
and compare the result with the request. They need no new OpenSpec change when
requirements stay the same.

New behavior, public or persisted contracts, migrations and substantial
cross-layer work use an applicable existing change or a new one. Preserve the
user's planning or implementation intent: a request to plan ends with a plan;
an authorized implementation request continues through implementation and
verification without an extra approval solely for creating its artifacts.

| Project skill | Use for |
| --- | --- |
| [marao-ha-integration](../.agents/skills/marao-ha-integration/SKILL.md) | Python lifecycle, config flows, admin APIs, async work, saved-data preservation |
| [marao-ha-frontend](../.agents/skills/marao-ha-frontend/SKILL.md) | Existing JavaScript custom elements, editor/cards, rendering, controls and mobile layouts |
| [marao-testing](../.agents/skills/marao-testing/SKILL.md) | Check selection, meaningful assertions, browser failures and validated evidence reuse |

Codex can select these skills automatically, or you can request `$marao-testing`
and the other names directly. They are local adaptations of community guidance;
each records sources and licenses. Load only relevant references, preserve the
existing architecture, and consult current official APIs when the task needs it.
The six `openspec-*` skills remain owned by the CLI. Keep custom skill names
outside that prefix so tool updates preserve them.

Before claiming completion, compare each acceptance case with the implementation
and selected evidence. Resolve gaps even when tests pass. Report the delivered
outcome, actual coverage and material limitations briefly; do not claim physical
device inspection or task-time improvements that were not measured.

## Select verification

Use the [local development guide](../docs/docs/development/local-development.md)
for setup, private disposable credentials and browser workflow. Node 22+ is
supported; the verified workstation uses Homebrew Node 24 LTS/npm and Python
3.14 in `.venv`, with `npm ci`, pinned Python requirements and Playwright Chromium.
HACS users need none of this development tooling.

Before editing, record acceptance cases, the starting commit and affected shared
consumers (empty for tooling-only work). Capture a private task snapshot including
already dirty content, then select subsequent changes. Review concurrent hunks and
disclose any `--file` exclusions; shared files need reviewed component scope:

```sh
npm run test:affected -- --snapshot /private/tmp/marao-task.json
npm run test:affected -- --since /private/tmp/marao-task.json --tier visual --component slider-headers --plan
npm run ha:preview -- --component slider-headers --watch
```

Choose `visual` for presentation-only work: current targeted inspection completes
development without automated suites. `behavior` adds selected offline checks and
the smallest actual interaction assertion needed by changed behavior. Security,
persistence, migration, ownership and installation use `focused`. Existing commands
without a tier retain focused coverage. Implement related tasks as one batch and
run only tier-required checks after the last edit. Unknown scope needs resolution.
See [focused testing](../docs/docs/development/focused-testing.md) for component,
reuse and publication options. Activate `.venv` before Python commands.

For supported UI behavior changes, update safe Cases and realistic-page examples.
Frontend preview syncs frontend files to compatible disposable HA, reloads Marao
when changed and refreshes the real page. It does not reset helpers, explicitly
generate dashboards or restart HA; normal reload lifecycle may update generated
output/history. Keep the latest applicable project changes installed before completion
and leave successful assets in place after inspection/error/close unless the project
is reverted. Safe helper restoration and failed-operation recovery still apply.
Watch runs only while open; fresh/backend/fixture setup uses explicit `ha:sync`.
Preview does not replace publication/upgrade proof. Full focused browser batches
prepare once; do not manually sync immediately before them. Inspect current changed
components once, adding only relevant difficult layouts/themes. Stop when acceptance,
tier-required checks, diagnostics and cleanup are satisfied; do not repeat for
reassurance. Documentation/skill-only work needs no application build,
HA visit or browser checks; validate its links, skills and affected specs instead.

Use `npm run verify:publish` before publication: affected unit tests only,
with applicable exact-commit Tests/hassfest/HACS validation. Version hooks and
automatic CI also select unit tests only. Reuse development integration testing;
additional camera, browser, geometry, mobile and upgrade checks require an explicit
user request at release. Known failures remain failures; report skipped coverage
honestly. This supersedes stricter release requirements in older change artifacts.

Before every release is published, install the final candidate and its version
metadata on disposable `192.168.0.28`, preserving test configuration and helper
state. Reuse an exact matching installation; otherwise install once after final
edits. A failed installation blocks publication. Installer asset/readiness checks
are sufficient; no extra integration tests are implied.

## Upgrade responsibilities

The binding repository contract now requires saved-release compatibility
assessment for persisted JSON, defaults, generated components and API changes.
Record preservation or an explicit versioned conversion; retain deletions/empty
selections, order, unknown/raw/custom content and unrelated ownership. Use shared
preflight, exact backups and recoverable writes, read-only previews/dry runs and
immutable archives. Maintain historical provenance, independent expected JSON
and complete feature coverage with each relevant change.

Use focused migration/recovery checks during development where needed. Releases
reuse that testing and run only unit tests by default. `test:ha:upgrade -- --scope
<components>` and supplied-report `verify:release` validation remain available
for explicit integration verification; neither is an automatic release prerequisite.

## Plan or implement a substantial change

Describe the desired result and select **openspec-propose** from Codex's Skills
menu, or explicitly write:

```text
$openspec-propose Add <the behavior you want>
```

An explicit proposal request creates `changes/<name>/proposal.md`, a design when
needed, capability deltas and unchecked tasks for review. It ends at planning.
For an implementation request, reuse the accepted change or record the required
artifacts and continue under that authorization. Do not auto-select a
planning-only skill as the entire response to an implementation request.
The baseline describes delivered behavior; future features stay in changes.

Use **openspec-explore** for investigation, **openspec-update-change** to revise
an existing plan, **openspec-apply-change** to implement it, and
**openspec-archive-change** after its verification is complete. Codex CLI/IDE
invocations use `$` followed by those exact skill names. Reopen the project or
start a fresh chat if newly installed skills have not appeared yet.

Example implementation request:

```text
$openspec-apply-change <change-name>
```

For terminal inspection:

```sh
OPENSPEC_TELEMETRY=0 openspec list
OPENSPEC_TELEMETRY=0 openspec list --specs
OPENSPEC_TELEMETRY=0 openspec status --change <change-name>
OPENSPEC_TELEMETRY=0 openspec validate <change-name> --strict --no-interactive
```

Validate affected changes/specs during ordinary iteration. Use `--all --strict
--no-interactive --concurrency 1` for an intentional whole-spec audit, such as an
OpenSpec tool upgrade or baseline reconciliation; it is not an application test.

A change without a requirement change, such as an environment verification,
uses `skip_specs: true` in its `.openspec.yaml`. Do not invent product requirements
to satisfy the tool. An artifact status of `done` means its file exists; unfinished
task checkboxes still mean the work has not been done. OpenSpec validation checks
specification structure, not application correctness or release eligibility.

The initial open change is
[confirm-home-assistant-reconnect-fix](changes/confirm-home-assistant-reconnect-fix/proposal.md).
Its tasks are deliberately uncompleted. Creating it does not run an upgrade,
publish a release, or waive a failing check.

[Standalone native authoring is retired](changes/remove-native-dashboard-authoring/proposal.md).
The earlier [native editing change](changes/support-native-dashboard-editing/proposal.md)
is historical and must not restore its superseded authoring requirements. See the
[retirement notice](../docs/docs/usage/native-dashboard.md) for saved-data implications.

## Tool installation and ownership

OpenSpec **1.14.3** was verified on 2026-10-19 and installed globally with npm;
it is free, MIT-licensed
development tooling. Node 24 already supplies its runtime. It is not a Marao
runtime dependency, and no application lockfile or shipped integration is changed.
See the [official installation guide](https://openspec.dev/docs/installation).

```sh
npm install -g @fission-ai/openspec@1.14.3
OPENSPEC_TELEMETRY=0 openspec update
```

For a new checkout without generated skills, initialize Codex with
`OPENSPEC_TELEMETRY=0 openspec init --tools codex --profile core --no-animation`.
The core Codex integration generates six skills under
`.agents/skills/openspec-*/`. Treat those files as tool-owned; keep project-specific
instructions in `AGENTS.md`, `openspec/config.yaml`, and these specs. Do not hand
edit generated skills because an update can replace them. Keep the six-workflow
core selection (propose, explore, apply, update, sync, archive). On intentional
upgrades, review the official release, install an exact version, run update, and
verify generated versions and retained custom skills. Review community-source
changes selectively; never overwrite the local Marao adaptations automatically.
The setup and verification here used `OPENSPEC_TELEMETRY=0`; set it on subsequent
commands as well when keeping CLI telemetry disabled. No shell settings were changed.

Use `test:affected -- --since <snapshot> --tier <visual|behavior|focused>` for the
current development task, with reviewed shared consumers. Hooks, CI and publication
select affected unit tests only; task subsets cannot narrow that unit scope.
Full-suite and parallel execution require explicit requests;
`npm run test:full -- --parallel` is the comprehensive pre-release option. Live upgrade
checks apply only to changed persistence, migration, generated ownership or
installation paths, with affected baselines, expected data, recovery and cleanup.
Reuse validated unchanged scoped evidence and report omitted coverage honestly.
See [focused testing](../docs/docs/development/focused-testing.md).
