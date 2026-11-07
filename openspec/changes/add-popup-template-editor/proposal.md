# Proposal

## Why

Marao currently creates editable popup content in a separate Home Assistant Sections view, splitting the opening card's settings from its contents. Administrators want to choose a built-in starting layout and customize its child cards together in one editor.

## What Changes

- Add a localized built-in popup template catalog, including Empty, seeded from the existing automatic popup families and their compatible explicit entity selections.
- Add a Popup content section to the native opening-card editor: use one family-filtered template dropdown above an always-editable native canvas, then add, edit, duplicate, remove and reorder child cards and arrange sections. Bind templates to the current card entities.
- Save opening-card settings and customized popup content in the same native card configuration and Save/Cancel flow, including new unsaved cards. No source view is created for this flow.
- Treat template application as a one-time starting snapshot. Customized children own their settings; parent edits, registry changes and template updates must not regenerate or retarget them. Selecting a template changes only the local draft. Display the matching template name by content equality, or Custom after actual differences; exact restoration recovers the name.
- Keep existing automatic, hash-backed and linked/managed popup layouts working. Offer an explicit preserved copy into the new content editor when the source can be represented losslessly; never silently flatten, delete or change shared source views.
- Scope: the ten existing popup roles (Entity Group, Scene Collection, Climate, Media, Camera, Energy Period, Graph history, Security, Access and Floor Plan lighting), their generated children, and supported Marao/native HA cards added to customized content. Internal activity/history/light-picker drill-ins keep their current behavior.
- Non-goals: personal templates, template import/export or sharing, third-party dependencies, a new dashboard builder, backend changes, automatic conversion of saved dashboards, or runtime popup redesign.

## Capabilities

### New Capabilities

None; reuse existing authoring and popup capability boundaries.

### Modified Capabilities

- `visual-builder`: Built-in popup templates, nested native child editing, draft-only preview/replacement, and one native Save/Cancel boundary.
- `navigation-popups`: Versioned embedded customized content, authoritative child ownership, legacy source coexistence and explicit lossless copying.

## Impact

Observed sources are `frontend_src/native-card-editor.js`, `card-composition.js`, `popup-management.js` and `popup-coordinator.js`, with shared runtime in `MaraoCards.js`, `MaraoPopupLayout.js`, `MaraoPopupManaged.js` and `MaraoPopupView.js`. Native card registration/validation, ordinary conversion, EN/PT labels, editor bundles, popup/collection documentation and targeted frontend tests also need alignment. The current native dashboard package has no installed Python backend; the historical generator stays frozen.

Introduce an additive, versioned `popup_content` field independent of package and dashboard versions. Absence preserves released behavior; explicit empty content remains empty; unsupported versions fail visibly without rewriting data. Existing `popup_view`, hash definitions, managed version-1 metadata, raw cards and archived fixtures remain intact. No bulk migration is planned. Explicit legacy copying must preserve source state and use the existing transaction/recovery safeguards where a dashboard write is actually required; the normal embedded flow uses HA's native card save only.

This intentionally replaces parent-managed functional synchronization only for newly customized embedded content. Existing managed sources retain the behavior documented in `manage-editable-popup-layouts`. Baseline authoring specs still contain historical builder wording superseded by `use-home-assistant-dashboard-editor`; this proposal extends current native authoring rather than reviving the retired builder.

## Confirmed implementation refinement — 2026-11-07

The latest approved refinement uses the native Sections canvas and native editing dialogs. The full native picker retains Home Assistant's cards and suggests public Marao cards first. Remove the custom child/section inspector, action toolbar and picker. Native child Save applies only to the parent card's temporary popup draft; outer Save persists everything and outer Cancel discards it. Layout editing directly reuses HA components and their normal layout callbacks with a draft-only save owner; do not substitute an iframe, separate layout engine or separately persisted page. Popup settings remains collapsed by default.
