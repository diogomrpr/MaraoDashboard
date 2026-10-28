# Design

## Context

Existing `.page-section` elements already contain a header, card list and Add card button. Incremental rendering preserves the container and updates its header/content. Add section is an outer sibling. Native disclosure can hide content without a second renderer or persisted field.

## Goals / Non-Goals

Goals: independent disclosure, number badges, stable source and existing action targeting. Non-goals: source migrations, new frameworks, unmounting card data, cross-session expansion persistence or automatic expansion during drag.

## Decisions

- Create native `details.page-section` with a `summary.card-heading`, preserving all list and action attributes. A collapsed native details hides its body while allowing normal pointer/keyboard disclosure; interactive section-tool descendants retain their independent activation.
- Default sections to open and track collapsed draft objects in a panel-local WeakSet. Reused nodes retain open state; recreated page bodies read the same section object. New source objects default expanded. Ignore detached toggle events and cancel active drag work when disclosure changes.
- Replace visible Section N with a numbered heading badge using the existing localized Section text as its accessible name. Add a CSS chevron and open/closed header geometry. Keep controls 48px, keep labels selectable and do not add focus-only styling.
- Keep source model, validation, generator, runtime, theme definitions and fixtures unchanged; reuse theme tokens and translations. Update the configuration guide and existing VM panel tests. No migration or security action is involved. Preserve direct-child card-list selectors so hidden details are excluded by existing visible-geometry hit testing.

## Risks / Trade-offs

- Summary tools could toggle the section → use native semantic buttons and verify disclosure/action separation in source and the manual watch list.
- Late toggle events could alter remounted presentation → ignore detached containers.
- New markup could exceed the existing eager-panel budget → reuse native disclosure and shared styling; the normal build gate remains unchanged.

## Migration Plan

No persisted fields change. Capture the dirty baseline, run the smallest relevant panel regressions, build and install final compatible assets once through `prepareFrontend()` on disposable `192.168.0.28`. Leave configuration/helper state and all pre-existing work intact. Served-asset/readiness checks suffice; manual review covers native disclosure and badge appearance. Future publication requires unit-only verify:publish; no publication or full suite is authorized.
