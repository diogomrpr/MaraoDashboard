# Proposal

> Superseded by [support-navbar-overflow](../support-navbar-overflow/proposal.md) at the user's request. This earlier unimplemented six-entry/multi-row plan is retained for context; implement the single-row overflow change instead. Supersession is not implementation completion.

## Why

Marao currently rejects a sixth navbar entry across its renderer, builder, JSON validation and native-card compiler. Administrators need six directly accessible destinations while retaining the compact floating bar and mobile touch targets.

## What Changes

- Raise the configured navbar capacity from five to six consistently across builder pins/creation, JSON schema, Python validation/generation, direct navbar cards and native HA navbar adapters/editors.
- Keep configured order, names, icons, destinations, explicit emptiness and unpinned pages. A seventh configured entry remains invalid and is never silently truncated.
- Let the builder pin a sixth entry; once six are pinned, creating another page keeps it unpinned and gives the existing capacity feedback. Navigation capacity is not a page-count limit.
- Render six 48-by-48 targets in one row when they fit; use balanced rows when they do not, including three-by-two at normal 320px. Preserve safe-area placement, active circles, preview behavior, popup layering and final-card clearance at enlarged text/zoom.
- Keep existing automatic starter/navigation defaults unchanged: capacity expansion does not discover or pin an extra destination on upgrade. A sixth entry is added only through an explicit navigation choice or ordinary user page creation/pinning.
- Update English/Portuguese messages, examples, scoped checks and project guidance to six. Native dashboard administrator Edit remains a separate control and does not consume a route slot.

The user's request explicitly supersedes the five-entry limit in AGENTS.md, the quality guide and existing specifications. Align those rules during implementation; this proposal does not modify application code or project policy files. Non-goals: more than six entries, overflow menus, swipe-only navigation, shrinking touch targets, automatic existing-dashboard conversion, page limits or other queued editor features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: six-route floating navbar with responsive full-size targets and correct shared clearance.
- `visual-builder`: six-entry selection, pinning, creation feedback and schema/validation behavior.
- `dashboard-generation`: six-entry explicit composition and route preservation across generated/native usage, retaining existing automatic defaults.

## Impact

Starting commit: `7f4241b0f36620bc82b28fe73373cec77ed54faf` (v0.8.0). Preserve unrelated edits and the independent drag-and-drop/Monaco proposals.

Observed paths: `frontend_src/editor-model.js` and `MaraoDashboardPanel.js` enforce five in pinning, creation, validation and JSON schema. `page_model.py`, `generator.py` and `native.py` enforce five server-side. `frontend/MaraoCards.js` rejects a sixth route and renders fixed 48px links with a fixed host spacer; shared shell clearance already measures navbar height on lifecycle/navigation updates and a periodic refresh. Native navbar aliases compile into that renderer; `MaraoNativeCards.js` separately owns native admin editing. Labels and documentation repeat the old limit.

Six links need 288px before gaps/padding. The current 320px layout leaves too little room for one row; merely increasing validators would create an awkward wrap and risk obscured final controls. Solve layout/clearance in the shared navbar path rather than only a generated or native instance.

Affected-card set: generic/native navbar cards and generated navbar/footer consumers on every view; all final page controls and popup sheets consume shared clearance. Representative popup/final-control regressions are required, without retesting unrelated card actions.

Compatibility: retain format 2, config-entry version and route/card keys. Existing zero-through-five configurations, legacy automatic defaults, explicit order/emptiness, unknown fields, unpinned pages, protected YAML, native ownership and history are preserved without migration. New six-entry sources require a supporting package; downgrade restores matching package and pre-change data together. Because backend navigation constraints/generated output change, release preparation requires scoped preserved-install proof for the affected navigation/generation/native paths, not an implicit full historical matrix.
