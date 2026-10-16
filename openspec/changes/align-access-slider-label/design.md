# Design

## Context

See [proposal.md](proposal.md) for motivation and scope, and [the layout delta](specs/mobile-theme-layout/spec.md) for acceptance. A design is included because changes to a security control's visible geometry must agree with gesture hit areas and the shared mobile checks.

The shared `MaraoSlideToOpen` component in `frontend/MaraoDashboard.js` normally centers a 54px circular thumb in a track at least 64px tall and reserves left padding for it in the label. Its `@container marao-access (max-width:240px)` override instead reserves 72px below the label and puts the thumb at the bottom. This produces the reported stacked appearance.

`MaraoCards.js` mounts the component from `_range()` for the effective strict-opener kind, including normalized access-action aliases and open-only access members. Generated page/popover/group content and native hosts use the shared runtime. Builder catalog/model, Python validation/generation, current translations and theme tokens already carry the required configuration; their contracts do not need to change.

`test-ha-dashboard-accessibility.js:layoutIssues()` checks text/thumb intersection using text ranges, but a label above a thumb passes that check. Alignment checks already inspect strict-slide contrast and other controls. Security unit and browser checks exercise native opener routing, completion and cancellation. The separate in-progress `align-slider-card-headers` change edits parent header styles and some shared check files; preserve and review those changes when applying this change.

## Goals / Non-Goals

**Goals:** Correct the layout once at its shared source and prove the actual text, thumb and gesture target agree across narrow and enlarged layouts.

**Non-Goals:** New wrappers, a replacement slider, a generic layout abstraction, changes to action/state labels or pointer/service logic, new settings and ordinary value-slider redesign.

## Decisions

### 1. Use the existing horizontal layout at narrow widths

Remove or replace only the narrow stacking overrides. Preserve a left text inset sufficient for the 54px thumb, its 4px resting offset, border and a readable gap; keep the text's right padding bounded. Keep the thumb vertically centered in the entire track and permit multiline labels to increase track height with symmetric vertical padding. Use current typography, colors, rounded track, progress fill and semantic markup.

The preferred first implementation is deletion of the stacking override. Adjust the narrow text inset only if measured containment requires it; do not add another breakpoint layout or shrink the label/thumb. Retain `overflow-wrap` for unusually long words instead of forcing every label into a one-line box. The label's lines form one block beside the thumb, rather than a row above it.

Alternative: fix the selected Security card or add a parent-specific override. That would leave group/popover/native instances inconsistent. A new grid/wrapper or changed gesture geometry is unnecessary when the normal shared layout already provides the intended composition.

### 2. Keep the strict gesture geometry and lifecycle intact

Preserve the 54px thumb, existing travel calculation, start zone, horizontal-intent recognition, completion/release checks, cancellation, haptic milestones and single-dispatch behavior. No tap/keyboard/hold alternative is added. Wrapped text changes track height only; gesture testing starts from the visible thumb's measured center, not a hardcoded page coordinate.

Alignment is an at-rest condition. During travel, retain the existing thumb/progress motion rather than adding label movement/hiding or claiming text/thumb separation throughout the sweep. State updates and cancellation must not switch the layout to a stacked mode. Unknown/unavailable/disconnected controls keep neutral disabled presentation and do not dispatch.

### 3. Assert the text geometry positively

Extend the existing access-slider layout checks with a positive same-row assertion. Measure the union of actual nonempty text-line rectangles, not the padded `.label` box: the old bottom-padding layout could otherwise pass a center test. At rest, the thumb center and text-block center should agree within a small documented CSS-pixel tolerance accounting for font metrics; every text line must lie to the right of the thumb with a positive gap, and text/track/thumb must be contained. Keep existing non-overlap, target size, contrast, typography and overflow checks.

Cover widths immediately below and above 240px plus a realistically narrow column. Use English/Portuguese action/state text, one wrapped enlarged-text label, available and neutral-disabled states. Exercise page and popup/group compositions with a representative native host because all consume the same component; do not repeat every equivalent service domain in every layout.

Register a focused access-label alignment selection in the existing source/component/check map, preserving concurrent header mapping edits. Reuse strict-slide unit tests early and safe native gesture checks for valid completion, tap/incomplete/vertical/reversed/outside/cancelled gestures, availability changes and cleanup. Run distinct actions once per relevant theme and repeat phone gestures only for native geometry differences; use additional narrow/landscape/text/zoom profiles for geometry alone.

### 4. Reuse safe examples and preserve source compatibility

Use the existing safe open-only door on the realistic Security page and its Cases/group/popup counterpart. Add only missing materially different narrow/wrapped/neutral examples to canonical `ha-test/` sources, then regenerate disposable outputs through the existing workflow. Update quality/usage guidance and the feature-coverage map with the same-row contract. No real access device or camera data is needed.

Supported saved configurations, including historical/converted access aliases, require an identity transformation: no JSON/default/API/generated-output changes. Use existing independent expected fixtures to confirm their effective opener kind and serialized options remain unchanged; do not rewrite archived sources or generate replacement expectations from the code under test.

## Risks / Trade-offs

- Long labels have less usable width -> allow wrapping and track growth; measure actual text at 320px and enlarged text/zoom without reducing touch targets.
- A padded-label measurement falsely accepts stacking -> assert actual text-line geometry and prove the regression fails on the old narrow rule.
- A changed vertical center invalidates hardcoded gesture tests -> use the visible thumb's current bounds and retain real completion/cancellation assertions.
- Shared tests are being edited by the header change -> review current diffs, merge focused checks additively and serialize compatible build/deployment writes.

## Migration Plan

No migration, package/config-entry version change, generated ownership change or new backup/recovery implementation is needed. Reuse existing source and expected compatibility fixtures; the intended persisted transformation is none.

During later implementation, preview affected checks and the read-only deployment dry run before deploying compatible assets only to `192.168.0.28`. Keep existing exact private backups/preflight/recovery and verified cleanup when safe fixture preparation writes source/generated/owned state. Layout-only probes remain read-only and use fake targets. Verify the loaded asset identity, then inspect representative affected controls as the final UI step.

A UI-only rollback restores the prior compatible assets; if preparation changed saved test data, restore the matching package and exact saved source/generated/owned-state backup together. Preserve unrelated concurrent edits and report rollback failures. Live preserved-install proof is conditional on an actual persistence/ownership/upgrade change; publication and comprehensive testing remain separate requests.
