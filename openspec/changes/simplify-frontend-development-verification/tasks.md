# Tasks

## 1. Development scope and completion policy

- [x] 1.1 Add private task snapshots, reviewed file scope and visual/behavior/focused tiers to the existing selector; verify dirty-file edits, deletions, untracked files, component scope and release rejection with focused Node tests.
- [x] 1.2 Replace conflicting agent, skill and development documentation with the selected-tier and stop rules; verify command examples and reconcile the affected capability specifications after implementation.

## 2. Frontend feedback loop

- [x] 2.1 Implement guarded frontend-only asset synchronization using existing authentication and reload behavior, without resetting fixture state or replacing dashboard source; verify compatibility refusals, asset freshness and failed replacement recovery with focused tests. Leave successfully synchronized code installed, including after preview cleanup.
- [x] 2.2 Implement persistent selected-component mobile preview with optional serialized watch/reload, current assets and visible diagnostics; verify argument/selection/watch behavior and one representative browser smoke without a profile matrix.
- [x] 2.3 Expose and document the snapshot/tier and preview commands, update the source/check map and confirm help and representative plans select the intended scope.

## 3. Integrated verification

- [x] 3.1 Run the serial checks covering only changed development tooling, validate this OpenSpec change, review the task diff against acceptance cases, and record selected/omitted coverage without claiming a runtime speedup.

## Verification

- 111 focused Node tests passed serially across the changed selector, snapshot,
  frontend preparation/preview, shared mobile helper, package boundary and existing
  publication-evidence boundaries. Transfer/recovery cases use isolated fixtures.
- Current workspace and safe fixtures synchronized successfully to disposable
  `192.168.0.28`; served frontend matched the workspace and remains installed.
- `ha:preview -- --component light --once` passed on one Chromium
  `iphone-normal` light profile. Its current light-card capture was visually
  inspected; no browser diagnostics occurred. Watch serialization and draining
  pending saves at shutdown have focused unit coverage.
- Help, visual/behavior scope plans, both updated skills, 50 local documentation
  links, OpenSpec guidance and the change's strict validation passed. Main specs
  validated; long requirement-body formatting warnings remain.
- Unchanged pre-existing work and concurrent navbar planning were excluded from
  this task's verification. No full suite, mobile matrix, physical-device test,
  release gate or live historical-upgrade replay ran. No runtime speedup is claimed.
