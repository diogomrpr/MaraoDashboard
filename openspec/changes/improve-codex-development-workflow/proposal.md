# Proposal

## Why

Codex spends too much time loading repeated instructions and sometimes finishes
checks without delivering the requested outcome. The repository already has
scoped verification, but baseline specs retain older testing guidance and the
read-first chain is disproportionate for small fixes.

## What Changes

- Add three project-local, community-informed skills for HA integration,
  Marao's vanilla JavaScript frontend, and existing scoped verification.
- Route documentation by task, allow a short path for small fixes restoring
  documented behavior, and compare delivered results with acceptance cases.
- Update OpenSpec 1.14.1 to 1.14.3 and regenerate its six official core skills.
- Reconcile implemented browser-verification policy and repair strict spec
  warnings without weakening obligations or archiving unrelated work.

## Capabilities

### New Capabilities

None; these changes belong to the existing repository workflow.

### Modified Capabilities

- `repository-workflow`: proportionate task routing, local skills, and explicit
  outcome verification; reconcile implemented scoped verification guidance.
- `gallery-release-verification`: synchronize existing browser factoring and
  reuse policy, preserving every required logical check.
- `navigation-popups`: preserve scroll-containment obligations while expressing
  long requirement detail as scenarios compatible with strict validation.

## Impact

Starting commit: `fd01c4d87b3b5992d56010a638bbb6fd7e075f73`; worktree initially
clean. Affected-card set: **empty**. Scope is skills, development documentation,
OpenSpec artifacts and the existing global development CLI.

Application code, package dependencies, public APIs, persisted JSON, generated
output and installation/upgrade behavior are unchanged; saved-release
compatibility is preserved without migration. No test-runner rewrite, framework
adoption, global skill/profile changes, live HA operation, full test campaign,
publication or blanket archive is included. Speed benefits must be measured,
not inferred from installing skills.
