# Design

## Context

See [proposal.md](proposal.md) for motivation and affected consumers. The user selected **Compact** from the conversation mockups. This document records the reference independently of that preview's temporary location; fictional readings and preview controls are not shipped product behavior.

`custom_components/marao_dashboard/frontend/MaraoCards.js` owns the Glance rendering and `.glance-card` styles. Its shared `readingMarkup()` emits icons/Activity controls, semantic reading names and reported values; other families also use this helper. Current Glance CSS explicitly puts the icon in row one, value in row two and name in row three. Its iconless and hidden-name overrides also depend on those positions.

The existing catalog in `frontend/marao-catalog.json` exposes `show_reading_names` with default true; `frontend_src/editor-model.js` and runtime validation already reject nonbooleans. `frontend_src/card-composition.js`, the native wrapper and Python generation route existing options to the same runtime. Existing editor labels include English and Portuguese. No new fields or translations are needed.

The quality guide and completed `display-glance-entity-tiles` change describe the old vertical order. Implement the new accepted order in the quality guide and current documentation. Retain completed change history; when synchronizing specs, apply this delta after the earlier Glance changes so they cannot restore the old order. The separate withdrawn `shared-adaptive-card-headers` proposal is not a dependency.

## Goals / Non-Goals

**Goals:** make the selected Compact composition the shared Glance presentation; retain native editor/YAML control over reading names; align long labels without fixed card heights or shrunken touch targets.

**Non-Goals:** a configurable design selector, new card type, duplicated reading renderer, runtime checkbox, new subscriptions, custom icon library or changes to non-Glance reading families.

## Decisions

### Compact composition and sizing

At ordinary text settings, the selected reference is:

```text
                  At a glance               optional group title

  Bedroom temperature    Humidity    House power
          icon             icon         icon
        22.4 °C           48 %        1.2 kW
```

Each column is its own opaque rounded Marao surface; the group remains transparent. Preserve existing theme surfaces, neutral statuses, roundness and the 8px inter-tile gap. Use approximately 10px vertical/8px horizontal tile padding and 6px internal gaps, matching the Compact preview.

Names are centered, quieter secondary text at about 12px at the normal scale; derive this from scalable Marao typography tokens rather than fixed pixels. Values retain the normal 18px primary emphasis, with their unit on the same line when it fits and wrapping when needed. Keep the native 48px icon/Activity circle and existing 28px glyph; the preview's placeholder symbols are not an asset or dependency choice. The optional group title retains its existing styling and independent visibility.

Use intrinsic row heights. Align icon and value rows across tiles in the same row even when one name wraps; a scoped CSS subgrid is suitable without adding a measurement loop. Keep responsive local column reduction and equal tile sizing. Do not turn the reference spacing into a fixed total height, retain unused label space when names are hidden, or preserve the current value's excess minimum height merely to simulate the older layout. Preserve useful stable slots for availability feedback and the existing reserved icon area.

### Change the shared owner with Glance-scoped rules

Adjust the Glance grid row assignments and its iconless/hidden-name rules together. Name shown + icon shown yields name/icon/value; hidden name yields icon/value; hidden icon yields name/value; both hidden yield value plus necessary problem feedback. Omitted entity slots create no cells.

Keep reusable markup and action wiring intact unless an actual semantic-order correction requires a small Glance-specific parameter. Do not globally reorder `.reading` or rebuild Activity handlers to implement visual ordering. Review equivalent shared-helper consumers to ensure the selector scope leaves their geometry unchanged. A separate renderer or generated-card workaround would unnecessarily duplicate existing behavior.

### Reuse visibility, values and safety contracts

Continue using `variables.show_reading_names !== false`. Preserve the existing localized editor boolean and hidden semantic names, custom names/fallbacks, separate group title and entity-specific Activity accessible labels. The preview's Show names control represents that editor setting; it does not become a dashboard-card control.

Values, units and neutral availability reasons remain provided by current HA state formatting. Retain Activity target guards, propagation stopping, exactly-once activation, preview inertness, disabled unavailable/disconnected actions, existing haptics and readable diagnostics. No new operating actions, service payloads or private-data handling are introduced.

### Preserve every configuration path

There is no change to persisted or generated structure: existing native/manual/template/generated cards receive the same runtime CSS. Inspection of the supported v0.21.1 native compiled expectation confirms the same `md_glance_card` path exists without requiring a new display setting. Its input and expected JSON remain unchanged; no historical fixture rewrite, migration or recovery mechanism is required for this presentation change.

Keep editor source, catalog, composition and generator unchanged unless implementation reveals a concrete routing defect. If an editor-source change becomes necessary, regenerate its owned bundles through the existing build rather than editing generated files. Review the current shared runtime hunks carefully because unrelated changes already exist.

### Documentation, examples and verification

Update the Glance section of `docs/docs/development/dashboard-quality.md`, `docs/src/content/docs/cards/glance.mdx` and the relevant `openspec/feature-coverage.md` description during implementation. Existing `ha-test/dashboard/views/00-card-test.yaml` examples already cover long names, three readings, one reading and partial availability. Reuse them; add or adapt one names-hidden example only if needed, using safe fixtures inside the same `/marao-dashboard` dashboard. Keep documentation playground examples accurate without adding runtime fixtures to the shipped integration.

This is a visual change with an existing behavioral toggle. Code/diff review and a short manual watch list are sufficient routine verification; browser inspection is optional. If changed markup or branches affect behavior, reuse the existing glance-focused cases in `tests/frontend/marao-card-visibility.test.js`; the existing native-editor label round-trip test remains the reference for option preservation, not an automatic additional suite. Do not add CSS-string assertions, a browser matrix or new test tooling for spacing alone.

## Risks / Trade-offs

- **A wrapped name shifts its icon relative to neighboring tiles** → share intrinsic rows within each tile row and allow row growth.
- **Old fallback rules restore the old order or leave blank rows** → review all four name/icon visibility combinations together.
- **The compact label is hard-coded and ignores text scaling** → derive the approved smaller secondary size from scalable typography tokens.
- **Shared helper changes affect header/weather or other readings** → prefer Glance-scoped CSS and inspect representative shared consumers.
- **Earlier Glance artifacts contradict the new order** → document supersession and apply this delta last at eventual spec synchronization, without rewriting historical verification.

## Migration Plan

No saved-data migration is needed. During implementation, capture a fresh dirty-state snapshot, batch the scoped runtime/documentation/example edits and review the actual task diff. For compatible frontend-only runtime changes, install once using `prepareFrontend()` from `ha-test/prepare-frontend.js` on disposable `192.168.0.28`; if fixture/backend changes require full preparation, use `npm run ha:sync` instead. Successful served-asset/readiness checks confirm installation without a browser campaign.

Leave final assets installed and hand off the `/marao-dashboard/card-test` view with a short watch list for label ordering, hidden names, long-label alignment and partial availability. Roll back only this change's runtime hunks if needed; no saved data was rewritten, and unrelated work must remain intact. A later publication runs the required unit-only `verify:publish` gate; publication is outside this proposal.
