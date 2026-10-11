# Spec Delta

## ADDED Requirements

### Requirement: Upgrade impact is part of every change
Contributors SHALL assess compatibility with saved released configurations before
changing persisted JSON, defaults, generated structures, component keys or public
contracts. Each relevant change SHALL record either preserved compatibility or
an explicit versioned migration with preservation, recovery and focused checks.
Resetting a user dashboard or requiring unexplained manual JSON repair SHALL NOT
substitute for migration.

#### Scenario: A task changes a saved option or room-membership rule
- **WHEN** its proposal/design and implementation are prepared
- **THEN** they identify prior formats, intended transformations, preserved user choices and recovery behavior
- **AND** the migration step and historical expectations are updated in the same change

#### Scenario: A presentation-only change keeps old configuration valid
- **WHEN** upgrade impact is assessed
- **THEN** the change records why no schema migration is necessary without bumping format versions merely for a new package release

### Requirement: Binding upgrade guidance and release timing
The project agent contract and development/OpenSpec guidance SHALL require safe
upgrade handling and maintenance of historical fixtures and feature coverage.
They SHALL distinguish focused migration checks during development from the
complete upgrade scenario, which SHALL run only for explicit release preparation
immediately before versioned publication. Normal push/PR checks SHALL NOT run
that scenario automatically; existing publication checks SHALL remain required.

#### Scenario: An agent performs routine development or pushes a branch
- **WHEN** relevant focused checks or the existing push gate run
- **THEN** the full preserved-install upgrade scenario is not invoked
- **AND** migration branches still receive appropriate small unit/regression checks

#### Scenario: An agent prepares a versioned release
- **WHEN** tagging or publishing the candidate is the next step
- **THEN** the release-only upgrade gate and existing publication/CI requirements must pass for that candidate
- **AND** failures, missing coverage or stale evidence prevent publication
