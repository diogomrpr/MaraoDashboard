## ADDED Requirements

### Requirement: Single-command release orchestration

Explicit release requests SHALL use a single project command to version/build/commit a clean reviewed source, run the existing serial affected unit publication gate against the latest stable release, install/verify the exact candidate on disposable `192.168.0.28`, publish a complete hash-verified release after applicable exact-commit GitHub checks, and confirm tagged documentation deployment. Additional integration/full tests SHALL remain explicit opt-ins outside this command.

#### Scenario: Authorized stable release
- **WHEN** the user requests publication and the reviewed checkout, explicit next version and reviewed notes are supplied
- **THEN** the command handles version/build/commit, required units, exact installation, branch/PR/tag, complete assets, GitHub checks, merge/publication and documentation confirmation
- **AND** no source is pushed before the required unit gate succeeds and no release is published before installation and metadata/check/asset gates succeed

#### Scenario: Read-only plan
- **WHEN** the command is run with `--plan`
- **THEN** it reports the proposed stages and local readiness without source writes or HA/GitHub calls

#### Scenario: Failure and resumption
- **WHEN** a build/check/install/upload/publishing/deployment stage fails or is interrupted
- **THEN** the command stops with a private progress journal, preserves recovery state, and permits resuming the unchanged candidate
- **AND** changed source, notes, tags or asset hashes are refused; an immutable tag is never moved and a published asset is never overwritten

#### Scenario: Documentation fails after publishing
- **WHEN** publication succeeds but matching documentation deployment fails or the publication response is lost
- **THEN** the command reports the actual public/incomplete state and reconciles it on retry without republishing or claiming deployment success

#### Scenario: Unsafe or concurrent release
- **WHEN** source is dirty, the release target differs from the allowed disposable HA, or another release holds the shared lock
- **THEN** the unsafe operation is blocked without installing to another target or starting a competing publication
