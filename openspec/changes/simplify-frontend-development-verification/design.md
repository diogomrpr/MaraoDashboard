# Design

## Context

See proposal.md. The existing affected selector adds all dirty paths to its range; component declarations do not filter ordinary mappings. The current preview runs broad preparation and gallery traversal. Reuse the existing map, Playwright library, gallery and development authentication.

Starting commit: `68a9deb96ffd5164949ac6c20f040beed57d654d`. Product affected-card set: empty. Pre-existing work was captured privately before implementation; preserve it. The new tools expose existing cards without changing their shipped behavior.

## Goals / Non-Goals

**Goals:** a short, truthful development completion path and a persistent real-HA frontend feedback loop, with task-specific scope and intact publication proof.

**Non-Goals:** a new component framework, synthetic replacement dashboard, full-suite execution, product migrations, publication or a measured speed promise before measurement.

## Decisions

1. Extend `test:affected` with `--snapshot <absolute path>`, `--since <snapshot>`, optional reviewed `--file`, and `--tier visual|behavior|focused`. Keep existing invocations focused for compatibility. Snapshots hash tracked/nonignored untracked bytes, bind the repository, and detect deletes and edits to already dirty files. Concurrent changes require review; file identity cannot attribute a hunk to an agent.
2. Visual selection runs no automatic suites and reports inspection still required. Behavior selects lowest-layer offline checks; the agent adds an existing exact interaction assertion when the changed contract requires it. Focused retains existing coverage for sensitive changes. Development scope/reports are explicitly rejected by publication and evidence reuse. No path classification guesses whether JavaScript is cosmetic.
3. Add `ha:preview -- --component <ids> [--watch] [--scenario <profile>] [--theme <mode>]`. Open the smallest representative existing view containing the selected visible runtime families, ignoring popup/conditional branches for route matching and falling back to Cases. The dashboard editor keeps its fixed route. Reuse current mobile helpers and authentication. The browser uses the actual installed frontend on real disposable HA with native controls and icons. Full page refresh handles custom-element definitions reliably. Keep selected scope and avoid traversing unrelated gallery cases. Serialize/debounce edits through sync then browser refresh. Diagnostic failures remain visible.
4. Verify the target, existing Marao ownership, current backend compatibility and active preparation guards, then build local editor assets when needed and synchronize only frontend files. Reload the Marao config entry when files changed and verify served identities. The sync does not reset helpers, explicitly invoke dashboard generation or restart HA; normal entry lifecycle can update generated output/history. Missing or incompatible setup requires explicit `ha:sync`, never an automatic broad fallback. Keep the test instance on the latest applicable project changes before completion. Successful assets remain installed after inspection, preview errors or browser close; do not revert the package for cleanup unless the project is reverted. Safe helper restoration and genuinely failed-operation recovery remain required. Watch updates only while running. Development preview does not replace publication/upgrade checks.
5. Replace old blanket automated-plus-final-inspection requirements in agent guidance and canonical docs. One current inspection can satisfy development completion. Relevant behavior, safety and data assertions remain necessary; broad regression is explicitly requested before release.

## Risks / Trade-offs

- Visual inspection cannot establish dispatch or preservation: classify the actual diff and retain targeted assertions for those contracts.
- Shared dirty checkouts contain concurrent work: snapshots disclose scope; reviewed file subsets and component declarations are development-only and do not narrow release coverage.
- Interrupted or conflicting asset writes can leave an incomplete installation: retain guarded preparation, verify served identities and report failures; recover genuinely failed operations without reverting a successful latest version merely for cleanup.
- Live preview depends on an already compatible disposable installation: fail safely rather than regenerating it. Local unit tests can prove orchestration but cannot be labeled live visual inspection.
- Watch mode rebuilds, syncs and refreshes complete dependent frontend assets, not arbitrary partial ES modules; correctness of the installed/loaded version takes precedence over speculative hot replacement. Closing preview stops watch but leaves the last successful assets installed.

## Migration Plan

No saved application format or public card API changes. Existing focused commands and published report validators remain compatible; normal entry reload retains its existing setup/repair/history behavior. New snapshot/development evidence has its own marker and cannot replace release proof. Removing the preview tooling does not roll back installed assets. If the project itself is reverted, synchronize that project state deliberately; ordinary preview completion or closure keeps the latest successful state installed.
