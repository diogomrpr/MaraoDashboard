# Proposal

## Why

Light, cover and door lock/unlock cards currently render at different heights, leaving visible holes below shorter card surfaces. A consistent control grid needs shared card sizing, equal rows and deliberate spacing while retaining readable wrapping and the configured card order.

## What Changes

- Give light, cover, access-summary and opening/closing/locking/unlocking control cards a shared **174 CSS pixel minimum outer height**, matching the tallest measured normal variant. This is a starting size, not a clipping limit.
- Use consistent title/icon headers, state and lower-control regions, extending the existing header composition to standard access summaries and close/lock controls. A missing slider or hidden field does not shrink the card; visibility options and icon-only semantics remain respected.
- Make every row in a standard control grid share its tallest required height, including rows that do not contain the tallest card. Card surfaces fill their cells, with one consistent gap.
- Reuse fixed-column sections for a continuous mixed control grid in saved order. Keep the selected column count as the preferred maximum; reduce the entire grid's columns when controls or enlarged text need more width. An odd final card keeps the standard width.
- Preserve explicitly selected automatic domain grouping, section boundaries, raw cards and configured large-panel widths. Explain how to compose full-width cameras, charts or detailed climate panels separately from standard controls; do not silently move existing cards.
- Apply the shared card size in generated pages, popups, native hosts and manual Marao cards. Uniform rows belong to the Marao-owned control-grid container; independent arbitrary Home Assistant containers do not share a page-wide measured maximum.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: Add uniform control-card sizing, equal rows throughout a control grid, contained content and responsive whole-grid reflow.
- `dashboard-generation`: Extend **Room and custom-page card layouts** with uniform eligible control grids while preserving mixed fixed-column order, explicit automatic grouping and existing section/ownership boundaries.

## Impact

- **Planning baseline:** `c72b0d40dce4f70acd95e59b291ab7745bdb6c01` (published v0.10.1 candidate). This change edits planning artifacts only; the current affected-card set is empty. Preserve the pre-existing untracked `optimize-browser-verification` change.
- **Implementation affected set:** `hc_light_card`, `hc_cover_card`, `hc_access_card`, `hc_access_slide_action_card`, close/lock `hc_access_action_card`, and lock/cover-targeted `hc_access_hold_action_card`; their generated, popup, native, preview and manually authored instances; eligible grid wrappers. Generic alarm/service holds, fans, other families and raw cards are regression representatives, not sizing targets.
- **Observed:** Normal safe gallery variants measured 112px without a light slider, 136px with brightness, 156px for a cover slider and up to 174px for an ordinary opener. The shared renderer uses content-driven heights; fixed sections already preserve mixed order, whereas automatic sections group by domain. Header alignment is already implemented separately.
- **Proposed implementation:** Shared runtime sizing plus a small Marao-owned CSS grid at eligible generated-grid boundaries. Reuse the existing editor's section/column controls and native child-card behavior; no third-party card or page-wide measurement service.
- **Compatibility:** Preserve source format 2, released source conversion, entity selections/options, public `hc_*` keys, unknown/raw/protected content and generated file ownership. Eligible generated grid containers change, requiring independently specified generation/preservation checks and scoped preserved-install proof before a versioned publication; no saved-format migration or reset is proposed.
- **Non-goals:** One immutable height at every font size; forcing every dashboard family into this size; merging explicitly separate sections; automatic relocation of large panels; changing gestures, services, state semantics or editor performance; implementation or publication during this proposal.
- **Verification:** Focused sizing/generation/preservation and safe gesture checks, selected mobile typography/layout profiles in both themes, then representative final inspection on disposable `192.168.0.28`. Planning validation is not an application test pass.
