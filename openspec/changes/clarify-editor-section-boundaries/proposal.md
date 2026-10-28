# Proposal

## Why

Sections inside an expanded Visual editor page currently share one surface and are distinguished mainly by a heading and a 24px gap. Users cannot easily see where one section ends or which section owns an Add card button.

## What Changes

- Enclose each editor section in a subtle rounded outline and distinct themed surface with consistent inner padding.
- Give its heading and existing section tools a distinct header row with a thin divider above the card content.
- Keep the existing filled circular Add card plus inside its owning section; keep the page-level Add section action outside all section containers.
- Use lighter inner card outlines so page, section and card remain distinct without heavy nested boxes or excessive mobile spacing.
- Preserve current controls, layout settings, draft behavior, text selection and drag/drop semantics.

Observed: `panel.css` gives `.page-section` only minimum width and sibling spacing, while `_renderPageBody()` already places each section heading, list and Add card control together. Add section is a separate page-body child. The agreed design makes this existing ownership visible. Assumption: a flat page's existing single editor section receives the same presentation without converting its saved format or introducing new sections.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: require clear page/section/card hierarchy and visible ownership of section and page actions.

## Impact

- Primary code: `frontend_src/panel.css`; adjust shared section markup in `frontend_src/MaraoDashboardPanel.js` only if needed for styling. Rebuild shipped editor assets.
- Shared consumers: every expanded Visual editor page, flat and sectioned, empty and populated, automatic and fixed-column lists, in both native editor hosts. Runtime card set: empty; runtime dashboard sections are outside scope.
- Supported released configurations, unknown/raw fields, ordering, explicit emptiness, source version, public APIs and generated output remain unchanged. No migration, persistence, generator, template or backend changes are needed.
- Existing theme tokens and localized labels suffice. Configuration documentation receives a brief description of the hierarchy; existing safe example pages suffice without gallery additions.
- Non-goals: new section names, counters, collapse behavior, drag animations, new toolbars, changes to card content/actions, navbar work, or restoring removed help text or the Discard control.

Planning baseline: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`, with existing uncommitted editor changes retained. This change is planning only.
