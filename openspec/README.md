# Marao project specifications

This is the baseline for the existing Marao Dashboard and the planning home for
future tasks. It was established on 2026-10-09 from published **v0.5.1**, commit
`370c2c57088b0982a5059acbeab998624e0bf427`, the repository, its quality contract,
and the available development/release history. No application behavior changes
are introduced by this setup.

## Read first

1. [Repository contract](../AGENTS.md).
2. [Dashboard quality guide](../docs/docs/development/dashboard-quality.md).
3. [Project context and prior decisions](project-context.md).
4. [Feature coverage and source/check map](feature-coverage.md), then the capability
   specs relevant to the task below.

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
| [Dashboard generation](specs/dashboard-generation/spec.md) | Pages, entity resolution, protected YAML, generated controls |
| [Mobile theme and layout](specs/mobile-theme-layout/spec.md) | Typography, palette, touch sizing, title reflow, localization |
| [Navigation and popups](specs/navigation-popups/spec.md) | Navbar, fullscreen shell, sheets, focus, scroll and route behavior |
| [Entity state and actions](specs/entity-state-actions/spec.md) | Availability, dispatch, haptics, strict slides and security holds |
| [Value and numeric controls](specs/value-numeric-controls/spec.md) | Smooth slider geometry, native drag, confirmed/target values, steppers |
| [Card behaviors](specs/card-behaviors/spec.md) | Supported families, summaries, climate, media, vacuum, appliances |
| [Camera and history content](specs/camera-history-content/spec.md) | Providers, graphs, timelines, energy history, async failure states |
| [Gallery and release verification](specs/gallery-release-verification/spec.md) | Environment, safe cases, focused checks, mobile matrix, packaging and release |

## Work in this repository

Use the [local development guide](../docs/docs/development/local-development.md)
for setup, private disposable credentials and browser workflow. Node 22+ is
supported; the verified workstation uses Homebrew Node 24 LTS/npm and Python
3.14 in `.venv`, with `npm ci`, pinned Python requirements and Playwright Chromium.
HACS users need none of this development tooling.

Before editing, read the applicable contract, context and specs; trace builder →
validation/generator → shared runtime/theme/translations → fixtures/checks; record
the affected-card set (empty for this baseline review); preserve unrelated work.
Implement related queued tasks as one coherent batch. Use the source/check links
in the coverage map to choose its smallest covering check:

| Change | Focused starting check |
| --- | --- |
| Builder model, selectors or configuration preservation | `node --test tests/frontend/editor-model.test.js` |
| Editor source/style changes | `npm run build:editor`, then `npm run check:editor` and the relevant model/UI check |
| Generation, resolution, custom YAML or cleanup | `pytest tests/components/marao_dashboard/test_generator.py` |
| Setup, configuration patches, history | The matching `test_init.py`, `test_config_patch.py`, `test_history.py` or `test_config_flow.py` under `tests/components/marao_dashboard/` |
| Shared actions, climate, vacuum or holds | `node --test tests/frontend/marao-climate-card.test.js` plus affected safe interactions |
| Camera events | `node --test tests/frontend/marao-frigate-events-card.test.js` |
| Graph, timeline or period history | `node --test tests/frontend/marao-history-cards.test.js` |
| Navbar or scalable text | The matching `marao-navbar-card.test.js` or `marao-text-scale.test.js` under `tests/frontend/` |
| Canonical gallery/fixtures | `node --test tests/frontend/gallery-cases.test.js` and the relevant fixture/YAML check |
| Icon-only actions/shared geometry | `npm run test:ha:alignment` |
| Value sliders | `npm run test:ha:sliders` |
| Planning/specification only | `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` and changed links/context |

Activate `.venv` before Python commands. These are starting points, not automatic
proof of complete coverage; include the checks needed by the actual affected path.
For UI edits, update both canonical Cases and realistic-page examples, run
`npm run ha:sync:dry-run` before deployment, sync to `192.168.0.28`, refresh and
confirm the loaded fingerprint. Inspect only safe entities. Existing browser
commands also prepare the current workspace, so do not deploy repeatedly without
a reason. After the last edit and focused check, visually and interactively
inspect representative affected components and difficult layouts as the final
validation step.

Use the scoped `npm run verify:publish` gate before publication, with applicable
exact-commit Tests/hassfest/HACS checks. Selected failures remain failures. A
release request does not authorize the full suite. Preserve raw native reconnect
evidence and check exception expiry whenever the approved exception is applied.

## Upgrade responsibilities

The binding repository contract now requires saved-release compatibility
assessment for persisted JSON, defaults, generated components and API changes.
Record preservation or an explicit versioned conversion; retain deletions/empty
selections, order, unknown/raw/custom content and unrelated ownership. Use shared
preflight, exact backups and recoverable writes, read-only previews/dry runs and
immutable archives. Maintain historical provenance, independent expected JSON
and complete feature coverage with each relevant change.

Use focused migration checks during implementation. Versioned publication
requires live preserved-install proof only when persistence, migration, generated
ownership or installation/upgrade behavior changes. Cover affected baselines,
independent expected data, recovery and verified cleanup. Fresh fixtures cannot
prove an upgrade. `test:ha:upgrade -- --scope <components>` produces scoped proof;
`verify:release` validates final-candidate evidence and affected checks. The full
historical/feature/mobile scenario remains available only on explicit request.

## Add a future task

Describe the desired result and select **openspec-propose** from Codex's Skills
menu, or explicitly write:

```text
$openspec-propose Add <the behavior you want>
```

The proposal workflow creates `changes/<name>/proposal.md`, a design when needed,
capability delta specs when requirements change, and an unchecked `tasks.md`.
Review those files before requesting implementation. The baseline describes what
exists; future features stay under `changes/` until completed.

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
OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive
```

A change without a requirement change, such as an environment verification,
uses `skip_specs: true` in its `.openspec.yaml`. Do not invent product requirements
to satisfy the tool. An artifact status of `done` means its file exists; unfinished
task checkboxes still mean the work has not been done. OpenSpec validation checks
specification structure, not application correctness or release eligibility.

The initial open change is
[confirm-home-assistant-reconnect-fix](changes/confirm-home-assistant-reconnect-fix/proposal.md).
Its tasks are deliberately uncompleted. Creating it does not run an upgrade,
publish a release, or waive a failing check.

[Native dashboard editing](changes/support-native-dashboard-editing/proposal.md)
tracks the independent Home Assistant editing mode and its selected verification.
See the [usage guide](../docs/docs/usage/native-dashboard.md) for creation and editing.

## Tool installation and ownership

OpenSpec **1.14.1** was installed globally with npm; it is free, MIT-licensed
development tooling. Node 24 already supplies its runtime. It is not a Marao
runtime dependency, and no application lockfile or shipped integration is changed.
See the [official installation guide](https://openspec.dev/docs/installation).

```sh
npm install -g @fission-ai/openspec@1.14.1
OPENSPEC_TELEMETRY=0 openspec init --tools codex --profile core --no-animation
```

The core Codex integration generated six skills under
`.agents/skills/openspec-*/`. Treat those files as tool-owned; keep project-specific
instructions in `AGENTS.md`, `openspec/config.yaml`, and these specs. Do not hand
edit generated skills because an update can replace them. To refresh after an
intentional CLI upgrade, run `OPENSPEC_TELEMETRY=0 openspec update`.
The setup and verification here used `OPENSPEC_TELEMETRY=0`; set it on subsequent
commands as well when keeping CLI telemetry disabled. No shell settings were changed.

Use `npm run test:affected` (preview with `--plan`) as the default for
implementation, hooks, CI and publication. Include changed features and shared
consumers only. Full-suite and parallel execution require explicit requests;
`npm run test:full -- --parallel` is the comprehensive option. Live upgrade
checks apply only to changed persistence, migration, generated ownership or
installation paths, with affected baselines, expected data, recovery and cleanup.
Reuse validated unchanged scoped evidence and report omitted coverage honestly.
See [focused testing](../docs/docs/development/focused-testing.md).
