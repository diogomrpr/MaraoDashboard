> Withdrawn on 2026-11-05 at the user’s request: retain the previous top alignment and name size; the later 36px enlargement was also reverted. Retained as proposal history; do not apply the centered-header, adaptive-size or icon-consolidation tasks below.

# Tasks

## 1. Shared dimensions and compact composition

- [ ] 1.1 Record apply-time starting commit, dirty snapshot and acceptance cases; review the design's family/host inventory against the actual task diff. Verify pre-existing cover/media/navbar/editor changes and saved/generated contracts remain preserved; select only reviewed component coverage with `test:affected --since <snapshot> --tier visual --component slider-headers,control-grid --plan` (use reviewed file subsets when needed).
- [ ] 1.2 Introduce shared internal 48px surface/28px glyph tokens for generic circular card icons and consume them across the inventoried equivalent icons, removing competing generic 52px/40px and narrow glyph overrides. Verify compact/noncompact/hidden-icon markup with the smallest existing relevant frontend assertions and review that brand artwork, badges, navbar, slider thumbs and steppers keep their own dimensions. Document the common dimensions in the quality guide with this change.
- [ ] 1.3 Restructure the existing compact header so the name itself is vertically centered with its right-hand icon and useful secondary content is below that row. Preserve dedicated access-popup rows, hidden fields, state hiding, custom labels, in-bar cover state and unsupported-slider fallback. Extend the existing header/cover visibility assertions to cover representative light, fan, cover, standard access/hold and unaffected full-width-title roles; verify they pass. Update the affected card docs to describe shared centering and secondary placement.

## 2. Adaptive typography and lifecycle

- [ ] 2.1 Replace the cover-only font enlargement with shared large-single-line and compact wrapping tokens and one actual-metric selection routine. Verify one small targeted assertion set covers a fitting large name, compact one/two lines, three-line fallback, scaled-primary floor and zero-width deferral; ensure no fixed line clamp, ellipsis, transform or arbitrary font search is introduced. Update the quality guide's no-shrinking wording to permit only this bounded choice and document accessibility growth.
- [ ] 2.2 Wire width/name/icon-visibility/locale/typography/font-readiness changes through coalesced measurement on the existing card lifecycle. Verify targeted assertions for relevant-input invalidation, unchanged-report reuse and disconnect/reconnect cleanup; retain the mounted input and existing action bindings. Review font measurement visibility and semantics so no duplicate accessible label or measurement-driven service/haptic call is possible.
- [ ] 2.3 Keep existing gallery and realistic-page examples accurate for the shared behavior; add only a missing representative one-line/two-line/long-name case if required. Verify applicable fixture assertions only when fixtures change, regenerate source-owned bundles normally, and update `openspec/feature-coverage.md` plus relevant light/fan/cover/access documentation. Review changed links and retain the complete family inventory as the implementation scope.

## 3. Final installation and acceptance handoff

- [ ] 3.1 Compare the final diff and targeted evidence with every requested acceptance case: centered names, one common icon size, larger fitting single line, smaller readable two-line block, long/enlarged-text fallback, all eligible families/hosts, and preserved actions/state. Run only the small existing checks justified above. Hand routine mobile appearance review to the user with a short watch list; if an agent inspection is needed, use the existing preview for one targeted visit. Extend existing alignment assertions only when explicitly requested integration coverage needs them, without a new automatic browser matrix.
- [ ] 3.2 Install the final compatible frontend once on disposable `192.168.0.28` through `prepareFrontend()`; verify its served-asset/readiness result, preserve test configuration/helpers and leave current assets installed. Report the dashboard URL and reload requirement, or state not installed / not ready for test if blocked. Complete implementation tasks only when the requested behavior and actual evidence agree; validate this change strictly and report omitted visual/device coverage honestly.

## Workflow follow-up

- Synchronize accepted layout deltas alongside `inline-cover-state` when appropriate; reconcile overlapping earlier header wording without changing historical evidence. Archive only after implementation and selected verification are actually complete.
- Before a later push, tag or release, run the unit-only `npm run verify:publish` gate across the candidate. Additional integration/full tests require an explicit request; do not turn this proposal into publication or a test campaign.
