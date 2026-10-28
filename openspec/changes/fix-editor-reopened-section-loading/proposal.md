# Proposal

## Why

The user reports that a previously open editor section can remain on loading when the editor is reopened. Inspection and a small offline execution of the actual panel code confirm an interrupted-metadata path that leaves a retained page entry marked pending without a current loading attempt.

## What Changes

- Repair the shared page-body loading lifecycle so retained expanded pages resume loading or render available data after editor reconnection.
- Invalidate page-local pending work when its panel lifecycle, document, mounted entry or expansion changes; allow the current entry to join a current shared context request.
- Ensure only the current attempt can render success or failure, with localized explicit Retry for real metadata failures.
- Preserve expanded-page choices, local unsaved Visual/JSON drafts, dirty state and deferred page rendering.
- Non-goals: changing which page opens by default, persisting expansion across fresh panels, eager mounting of every page, automatic retry loops, a new loader framework, native HA unsubscribe work, toolbar/card duplication features or source migrations.

Observed: `disconnectedCallback()` clears shared request handles and advances `_lifecycle` but leaves `_pageEntries` and `entry.pending` intact. `_renderPageBody()` starts work only when `entry.pending` is false; its old success continuation skips an obsolete lifecycle without settling that page flag. Re-entering the method in the new lifecycle leaves the loading body unchanged and starts no new request. Collapse also clears body content without invalidating pending ownership. The success and error continuations have inconsistent freshness guards.

Assumption: the reported section is an expanded page body in the shared Visual editor. The offline reproduction establishes this specific failure path; the exact user navigation/timing sequence has not been inspected in a browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This restores the existing `visual-builder` contracts for Recoverable editor loading, Deferred Visual page contents, Visual presentation continuity, Complete drafts independent of mounted page controls and Progressive editor data loading. `skip_specs: true` avoids inventing a requirement change for a defect repair.

## Impact

- Shared implementation: `frontend_src/MaraoDashboardPanel.js` page-entry loading, collapse/removal cleanup, and connection lifecycle; rebuild shipped panel assets through existing scripts.
- Consumers: retained panels in both `MaraoEditorCard` and `MaraoStrategyEditor` in `frontend_src/native-strategy.js`; flat and sectioned page bodies needing deferred context. Runtime card set: empty.
- Tests: narrow regressions in `tests/frontend/editor-panel.test.js`; existing tests cover metadata freshness and reconnection but do not exercise a retained pending page body.
- Compatibility: no saved-source, generated dashboard, API, default, version or storage change. All supported released configurations, unknown fields, explicit empty values and existing pending drafts remain intact. No migration is needed.
- Planning baseline: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`. Preserve unrelated untracked duplicate source/helper files and the card-duplication/toolbar proposals.
