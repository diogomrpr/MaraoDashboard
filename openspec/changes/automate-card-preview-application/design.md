## Context and scope

Starting commit: `fa71c7a33798b32480eab41bfad6f038e8b1ebf9`; existing dirty work is recorded in `/private/tmp/marao-card-apply-start.json` and remains outside this task. Consumers are the card-design agent workflow, isolated preview creator, package command and documentation; no card renderer/editor/generator/theme/translation/configuration/fixture behavior changes.

The documentation gallery already renders real shared runtime owners. `design-workspace.mjs` creates an independent baseline and `proposal.json` hashes. `ha-test/prepare-frontend.js` already builds, validates the allowed disposable target and verifies installation/readiness while preserving configured dashboards. Reuse both rather than creating another deployer.

## Decisions

- The agent finishes authoring wiring and reviews consumer scope, then records an explicit source/test selection. `--plan` calculates a digest binding that selection, its exact patch, revision and scope. Apply requires matching recorded review plus existing design/apply authorization; approval for an unchanged revision/scope is reused without another user question.
- A private temporary Git index captures tracked, added and deleted source files without touching user staging. Only supported source paths are eligible. Traversal, symlinks, private filenames and arbitrary test commands are refused. Generated bundles/caches are excluded from the agent's selected source patch and rebuilt through the existing helper.
- Destination files must match their captured baseline or already-applied contents; other drift stops before source writes. A shared exclusive lock serializes applications. Preflight all pending hunks, back up exact files under the ignored task directory, then apply without staging. Retain source and recovery files on failed build/check/install; never claim completion. Retry recognizes already-applied contents.
- Build once through the existing cached builder, run selected Node unit files serially, and call the existing lightweight installer for runtime changes. Do not automatically fall back to full HA preparation. Documentation/test-only changes skip build/install. Receipts whitelist identity and target information, never configuration credentials.
- No commit, push, tag or release is implicit. No additional UI or deployment dashboard is introduced.

## Acceptance and evidence

The command must promote approved edits/additions/deletions while preserving unrelated staged and unstaged work; bind approval to content/scope; refuse drift, unsafe paths and concurrent application; stop before installation on failed checks; retain recovery evidence on install failure; and report verified identity only after successful installation. Targeted temporary-repository Node tests inject the existing installer boundary to exercise these paths without modifying HA. This tooling-only change has no runtime installation effect and does not require redeployment.
