# Proposal

## Why

A HACS update must preserve an existing dashboard and user configuration even when Marao's JSON format or generated components change. Current legacy repairs and fresh-fixture release checks do not establish that an existing installation can upgrade safely across releases.

## What Changes

- Establish explicit dashboard JSON schema versions, deterministic ordered migrations and shared migration/preflight behavior across setup, editor/save, generation and history compatibility checks. Separate JSON schema version from package and HA config-entry versions; preserve current-format JSON on no-op upgrades.
- Automatically migrate supported saved configurations on an upgrade that requires conversion, after backup and validation. Preserve entity selections/deletions, order, options, raw/custom cards, unknown fields and unrelated HA settings. Failed, interrupted, invalid or newer-schema conversions must not reset or silently overwrite the saved dashboard.
- Make upgrade impact assessment binding in `AGENTS.md` and related project/OpenSpec guidance: every persisted-format, default, generated-component or API-contract change needs a compatibility decision, migration when necessary, fixtures and recovery instructions.
- Add a dedicated release-only upgrade scenario and `verify:release` gate. Upgrade preserved historical installations/configurations to the actual candidate, verify persisted JSON transformations and all supported feature families, exercise restart/idempotence/recovery, then restore the disposable environment. Do not add this expensive scenario to routine tests, push checks or ordinary stabilization.
- Retain the existing `verify:publish` check before every push/tag/release. Require the additional upgrade gate immediately before versioned publication, with evidence tied to the tested candidate and baseline versions.

## Capabilities

### New Capabilities

None; extend the capabilities that already own migration, repository rules and release verification.

### Modified Capabilities

- `integration-lifecycle`: versioned JSON conversion, automatic saved-install upgrade, preservation and recoverable failure across configuration entry points.
- `repository-workflow`: mandatory upgrade-impact analysis and explicit migration/compatibility responsibilities in the agent contract.
- `gallery-release-verification`: a release-only preserved-install upgrade gate with complete feature coverage and candidate-specific evidence.

## Impact

Observed in source: `ConfigFlow.VERSION = 1` versions HA's entry, not `dashboard.json`; no dashboard schema marker or ordered JSON migration exists. Theme/resource repairs are specialized, setup generally preserves meaningful existing dashboards, and editor generation snapshots JSON/generated files with limited rollback. JSON writes are direct, generation is atomic per file rather than globally transactional, and history restore copies exact historical source/files. `ha-test/prepare.js` can overwrite the fixture JSON and regenerate; each browser runner calls it, so those checks cannot directly prove an in-place upgrade.

Implementation reaches integration setup and management/service paths, JSON loading/validation/generation/history, editor model/schema preservation, existing release/browser preparation entry points, private disposable fixtures, package scripts, `AGENTS.md`, OpenSpec guidance and update/development docs. Reuse installed tooling; introduce no third-party cards or test framework. Local tags available for baseline provenance are v0.2.0, v0.3.0, v0.3.1, v0.5.0 and v0.5.1; released-format coverage must be explicit and must not silently expire older versions.

**Affected-card set:** every generated or configured Marao family, its supported options/actions/states, popups, navbar and realistic views, including separate camera/event/history/energy components. Builder, administrator APIs, generation, protected custom YAML, history and installation/resource/theme ownership are also in scope for upgrade verification. This proposal itself changes no application behavior or cards.

Coordinate the existing `independent-room-entities` proposal's `config_version: 1` conversion with this shared mechanism rather than inventing conflicting version meanings. This proposal's safe automatic saved-install upgrade supersedes deferred-save conversion for installed files when a new release requires it; read-only editor previews and local drafts still do not write data. Preserve exact archived history, and preflight compatibility before restoration.

Non-goals: upgrading Home Assistant, accessing production installations, publishing now, eliminating all arbitrary raw-card incompatibilities, rewriting unrelated configuration, running full upgrade scenarios during normal iteration, or implementing pending feature proposals as part of this planning turn. All test actions use safe fixtures on `192.168.0.28`; credentials and backup/report contents remain private.

The user-approved 2026-10-13 verification revision keeps all seven historical
preservation/recovery baselines, runs shared behavior and one full mobile layout
matrix on the actual latest-release upgrade, and uses targeted browser checks
for other distinct formats. Failure screenshots and representative visual review
replace exhaustive success capture review. Exact candidate browser evidence may
be reused by publication after full report and restored-install validation.
This harness/documentation revision has an empty affected-card set and changes
no saved dashboard format, generated contract or product behavior.
