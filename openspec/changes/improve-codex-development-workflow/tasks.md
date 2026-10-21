# Tasks

## 1. Tool and skill setup

- [x] 1.1 Upgrade the existing OpenSpec CLI to 1.14.3, regenerate the same six official workflows, document ownership/update commands, and verify CLI/generated versions and preserved workflow selection.
- [x] 1.2 Create three concise project-local skills with community provenance, applicable licenses, official references and discovery metadata; validate frontmatter, local links and commands with the bundled skill validator and focused review.

## 2. Workflow and specification alignment

- [x] 2.1 Route reading by task and document the short path, skill selection, scoped test usage and acceptance-outcome check in AGENTS and existing development guides; review the diff for preserved safety/compatibility/UI obligations and consistent entry points.
- [x] 2.2 Reconcile implemented browser-verification deltas, preserve requirement/scenario names, repair strict validation warnings and synchronize this workflow change; validate affected capabilities and check no unrelated archive/history changes.

## 3. Integrated verification

- [x] 3.1 Independently evaluate realistic documentation, backend, shared-UI, persisted-feature, unresolved-scope and incomplete-outcome requests; check useful skill routing, acceptance criteria, scoped serial verification and safe-target boundaries, correcting demonstrated gaps.
- [x] 3.2 Run strict OpenSpec validation and the affected plan/check for this batch, recording starting commit fd01c4d87b3b5992d56010a638bbb6fd7e075f73 and excluding independently committed concurrent work; verify documentation-only application scope, unchanged product/package files and surviving custom skills after the tool update, recording actual results and omissions.

## Verification results — 2026-10-19

- OpenSpec CLI and all six generated skills: 1.14.3, core profile retained.
  Forced regeneration preserved all 12 custom skill files byte-for-byte.
- All three skill validators pass; all 63 local links in changed Markdown resolve.
  Community revisions and exact MIT notices are retained in the skill sources.
- Strict serial OpenSpec validation: 37 items passed, zero failures. Original
  requirement/scenario names remain; no change was archived or history rewritten.
- Independent read-only evaluation covered all six task prompts. Clarifications
  fixed shared-source selection versus missing mappings, documentation validation,
  duplicate deployment guidance and retained service errors; reviewers confirmed
  the corrections. These evaluations did not implement hypothetical app tasks.
- A concurrent camera commit, `68a9deb96ffd5164949ac6c20f040beed57d654d`, landed
  after the recorded start. The initial starting-base plan exposed its camera jobs
  and was not executed. This batch remained uncommitted; the current-HEAD working
  tree plan and `npm run test:affected` selected only docs, zero application checks,
  serial execution. No product/package/test-runner files changed in this batch.
- OpenSpec's injected project context decreased from 2,854 to 866 characters
  (70%). This measures context size, not end-to-end task-time improvement.
- No HA contact/deployment, browser or application tests, historical upgrades,
  full suite, publication or physical-device inspection was performed.

## Workflow follow-up

- Leave this change available for review; no archive or publication is requested.
- Any later push, tag or release still requires verify:publish and applicable exact-commit checks.
