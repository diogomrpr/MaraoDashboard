# Tasks

## 1. Remove the unwanted shared press paint

- [x] 1.1 Record the implementation starting commit, task snapshot, affected shared-navbar consumers and acceptance cases. Reproduce the reported square with a held press in the existing local/native disposable harness, distinguishing default tap paint, button appearance and icon-owned paint; retain the observation or explicitly document a browser-specific reproduction limit.
- [x] 1.2 Apply the smallest scoped styling fix in `MaraoNavigation.js`, preserving the selected circular fill, existing press animation, haptics, semantic controls and geometry. Verify held and released active/inactive icons, surrounding control padding, overflow toggle and overflow destination show no rectangular overlay; use the shared path rather than per-wrapper/global HA resets.
- [x] 1.3 Update the existing navbar gallery coverage and realistic-page inspection case, plus press-appearance guidance where needed; verify the fixtures still use the same dashboard/routes and no new saved option, generated structure or translation is introduced.

## 2. Inspect the current result and preserve interaction

- [x] 2.1 Preview task-delta scope with `test:affected --since <snapshot> --tier visual --component navbar-startup --plan`, resolving shared consumers without selecting unrelated suites. If event handling or geometry changed, select the appropriate behavior/focused tier and smallest covering existing assertion instead; verify that declared scope matches the actual diff.
- [x] 2.2 Inspect current assets after the last edit on the disposable instance, reusing one compatible visit for representative Android Chromium/iPhone WebKit held/released states, narrow layout and light/dark appearance. Verify ordinary navigation occurs once, selected circular styling remains, overflow works/scrolls, keyboard activation remains usable and hold/early-release/cancel behavior still follows the existing contract. Preserve raw diagnostics, restore temporary safe state and leave successful current assets installed; report any physical-browser/Companion limits without claiming those were tested.

## Workflow follow-up

- This request creates planning artifacts only. Continue with `$openspec-apply-change remove-navbar-square-tap-highlight` when implementation is requested.
- Before later push/tag/release, run scoped `verify:publish` and applicable exact-commit validation. Do not run the full suite, historical upgrades or a full mobile matrix for this presentation-only scope without a separate applicable requirement.
- Archive only after the reported appearance and preserved interactions are verified; proposal validation is not a completed UI fix.
