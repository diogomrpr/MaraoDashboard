# Tasks

This is an unexecuted follow-up. Keep boxes unchecked until their stated evidence
exists. Existing behavior requirements are unchanged (`skip_specs: true`).

## 1. Confirm a released fix and prepare the disposable update

- [ ] 1.1 Verify official Core/frontend/WebSocket release and dependency evidence includes commit `4c5674c36cc898bbd38abc54b4d89777e37a8496` or its equivalent fix; record the versions and source links in a sanitized result. If no stable build includes it, leave the remaining tasks open and report that dated finding.
- [ ] 1.2 When this change is requested for execution, confirm API and SSH both target disposable `192.168.0.28`, take a backup, and verify it completed; keep its identifier and rollback details in ignored private evidence.
- [ ] 1.3 Update only that disposable instance to the verified stable build, wait for API and browser readiness, and record the actually installed Core/frontend versions alongside the delivery-chain evidence.

## 2. Prove native and Marao recovery

- [ ] 2.1 Reproduce three independent native `/profile` outage/recovery cycles without opening a Marao dashboard: warm/dismiss the native toast online, close the real WebSocket, block retries during the outage and restore transport; verify native warning appearance/removal and zero unexpected page errors or structured unhandled rejections. Reuse pinned Playwright and shared private authentication; retain any needed focused diagnostic and sanitized reproduction steps without assuming old temporary scripts exist.
- [ ] 2.2 Run `npm run test:ha:e2e -- --disconnect-only` in three independent cycles; verify safe fixture controls disable, offline actions dispatch zero services, authoritative server changes render after recovery, and existing error assertions pass unchanged. Restore the safe switch's original state and record results privately.
- [ ] 2.3 Record a sanitized comparison with the 2026.10.0 failure, actual versions, reproduction method and result. Keep the issue unresolved if any recovery exception remains; revise this plan and the affected-card set before any required application repair.

## 3. Confirm the existing release contract

- [ ] 3.1 With `.venv` active, run `npm run verify:publish` against the disposable instance and retain the complete result; every existing layer must pass without exception suppression. This checks overall compatibility after the environment update and does not publish.
- [ ] 3.2 Update the dated reconnect context only to the outcome the evidence supports, and verify the sanitized result contains no credential/private entity/media data. Leave future publication gates and the historical v0.5.1 exception accurately described.
- [ ] 3.3 After the final focused/full checks and any edits, visually inspect the exercised safe fixture cards on the disposable dashboard during recovered operation: Switch + graph, Light + slider, Number, Arm away · hold, and Open-only door; confirm state, disabled/enabled controls, warnings, alignment and popup usability. If application edits became necessary, inspect every card in the revised affected-card set as the final validation step.

## Workflow follow-up

- Archive only after all tasks have their evidence and the reconnect outcome is confirmed; a planning-complete status is not task completion.
- Any later push, tag or release requires an immediate clean `verify:publish` run and exact-commit GitHub Tests, hassfest and HACS results.
