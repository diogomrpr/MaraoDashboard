## Why

Releasing currently repeats version edits, building, a serial unit gate, exact-candidate installation, GitHub checks, complete asset upload, merge/publication and documentation confirmation manually. The user requested one command for those steps, matching the approved preview-application workflow.

## What Changes

- Add `npm run release -- --version X.Y.Z --notes-file PATH`, a read-only `--plan` and automatic resumption of the same candidate from a private journal.
- Reuse the existing package builder, converter, unit publication gate, disposable frontend installer and GitHub workflows.
- Refuse dirty/unreviewed input, changed candidates/notes, unsafe HA targets, failed checks, mismatched tags/assets and unseen main changes. Preserve published state rather than silently rolling it back.
- Require the command in agent/testing instructions for future explicit release requests and document prerequisites/recovery.

## Capabilities

### Modified Capabilities
- `gallery-release-verification`: automated versioned publication with existing gates.

## Impact

Developer tooling, instructions, documentation and targeted unit registry/tests. Affected card-family set is empty. No HA configuration, runtime card behavior, saved format, dependencies, fixture or migration changes. Existing source/package/version contracts remain intact; new progress metadata stays private in the Git common directory. Implementing this command does not itself publish a release.
