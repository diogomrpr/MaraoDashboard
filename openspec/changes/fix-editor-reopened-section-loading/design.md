# Design

## Context

See `proposal.md` for the reported symptom and scope. Native editor hosts cache panel instances per connection/user/dashboard, so reattaching an existing panel is normal. A clean editor-card mount can reload source, while a dirty draft and the unchanged strategy-settings path retain the loaded panel and page entries. The fix must work without forcing a source reload.

`_renderPageBody()` couples a persistent boolean (`entry.pending`) with a promise belonging to a particular lifecycle. Disconnect invalidates the promise's authority and clears shared request handles, but not that boolean. `connectedCallback()` retains an already mounted Visual body. `_scheduleMetadataRefresh()` can later apply fresh metadata without rerendering an orphaned page body. Collapse clears its body and section cache but also leaves pending ownership untouched. The error continuation checks connectivity/model but not the same lifecycle, expansion and entry ownership as success.

### Inspection evidence

A temporary offline harness executed the actual `MaraoDashboardPanel.js` class with the existing model helpers and a minimal DOM boundary. It rendered a nonlanding page needing context, disconnected before the read completed, resolved the obsolete response and invoked body rendering after reconnection. The result was `requests: 1`, `pending: true`, `contextReady: false` with the unchanged loading message. This confirms a local loader-lifecycle defect; it is not a browser reproduction of the user's exact route. Existing editor-panel tests cover late metadata and draft reconnection separately, leaving this combined path untested.

## Goals / Non-Goals

**Goals:** every visible loading body belongs to current work; reopening resumes usable content while retaining the current draft; stale work cannot overwrite current UI or reset newer work.

**Non-Goals:** rebuilding all pages on reconnect, clearing unsaved work, fetching context on every HA update, changing page expansion defaults, or introducing a general request/state framework.

## Decisions

1. **Give page-body work explicit ownership.** Use a small page-entry attempt token tied to lifecycle, document and mounted entry, replacing the unowned boolean or making it derived from current work. Success, failure and final cleanup must verify that token before changing entry state or UI. Invalidate it on disconnect, collapse, entry replacement/removal and source replacement. An obsolete completion cannot clear a newer pending attempt. Clearing a boolean only in the old promise's `finally` was rejected because it still lets old work settle a newer attempt.

2. **Resume retained expanded bodies on reconnect.** After invalidating old body work, revisit only current expanded entries. Render immediately if metadata is already sufficient; otherwise join the current `_ensureEditorContext()` attempt and display localized progress. Keep shared request deduplication. Reset body-owned section/add-control caches whenever replacing their DOM so detached nodes are not reused. Do not rely on optional JSON preparation, a registry-change event, or a user collapse/reopen to recover. Do not call `_load(true)` merely to clear loading: that can replace a dirty draft.

3. **Keep failures explicit and current.** Apply the same connected/lifecycle/document/entry/expanded guards to success and error. A current failed read shows the existing English/Portuguese metadata error and deliberate Retry; an obsolete rejection neither poisons current document error state nor overwrites a later successful body. Keep `_requestEditorContext()` and `_ensureEditorContext()` caches scoped to the active document/lifecycle where required by the regression. Avoid automatic retry loops and preserve one shared current request.

4. **Prove the reported path at the panel layer.** Extend `tests/frontend/editor-panel.test.js` using its existing VM harness: pending nonlanding body → disconnect → reconnect; old success/rejection arriving after new work; collapse/reopen during loading; and an already-ready metadata path. Assert visible progress settles, current cards render, failure has an operable retry, and full draft/dirty state remain unchanged. Use representative existing safe descriptors; no new gallery fixtures or browser framework.

## Risks / Trade-offs

- [Late success/error alters a reconnected page] → Uniform attempt ownership guards, including cleanup and shared context error assignment.
- [A reconnect fix silently drops unsaved work] → Retain model/JSON source and expansion identity; assert exact draft and dirty-state preservation rather than force reload.
- [Recovery causes duplicate context reads or hidden-page mounts] → Join the shared current request and visit expanded entries only.
- [Replacing loading markup leaves cached DOM detached] → Clear page-body caches together with DOM replacement and test rendered controls, not only flags.

## Migration Plan

No migration or persistence change. Builder source and rebuilt shipped assets change; validation, compiler/generator, runtime cards, theme, templates and gallery data do not. Existing localization strings should suffice. Existing configuration documentation already promises retained drafts and deferred loading; amend it only if a user-facing instruction is actually inaccurate, without documenting collapse/reopen as a workaround.

After targeted regression checks, build and install once on disposable `192.168.0.28` through the compatible frontend helper. Reuse existing safe realistic/gallery pages for a short manual reopen watch list. No publication is authorized. Reverting this code requires no source/data downgrade; retain saved dashboard and local test configuration.
