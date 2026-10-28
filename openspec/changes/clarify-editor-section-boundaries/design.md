# Design

## Context

See proposal.md for motivation and the visual-builder delta for acceptance. The shared `_renderPageBody()` already mounts one `.page-section` per logical section, including the single editor section of a flat page. Its direct children are the `.card-heading`, optional layout guidance, `.entity-list`, optional raw-card note and Add card icon. The separate page-level `entry.add` control follows the section elements. Current `.page-section` styling supplies only `min-width: 0` and 24px sibling spacing; `.room-body` supplies the shared page surface.

## Goals / Non-Goals

**Goals:** express existing ownership through scoped presentation, retain usable width on narrow phones, and avoid changes to mounted controls or drag geometry contracts.

**Non-Goals:** new components, persisted presentation options, DOM restructuring without a demonstrated need, global changes to every card heading or runtime card, or expanding verification into a browser campaign.

## Decisions

1. **Style the existing section container.** Prefer scoped rules in `frontend_src/panel.css` for `.page-section` and its direct children. Use approximately 12px corner rounding, a 1px outline and existing light/dark theme surfaces. Distinguish the header with a subtly different surface and thin bottom divider. Compared with increasing whitespace alone, the continuous boundary makes empty sections and ownership legible. Avoid heavy shadows and new accent colors that compete with state colors.
2. **Preserve markup and targeting.** Keep `.card-heading`, `.entity-list`, action attributes and the Add card plus in their existing positions. Scope the header treatment to `.page-section > .card-heading`, rather than changing all headings. Use direct-child padding for the content if necessary so the header spans the section; leave Add section as a sibling outside. No new wrapper is expected: the existing incremental renderer and drag selector depend on direct children and stable mounted controls.
3. **Balance inner and outer boundaries.** Give the section the stronger outline and make only its inner `.entity-row` borders lighter using existing theme colors, keeping individual cards distinguishable. Use compact content padding around 8–12px, reduced at narrow widths where necessary, and retain a clear gap between sections. Keep action groups wrapping and all visible controls at 48px; do not solve width pressure by shrinking controls or overriding configured columns.
4. **Preserve current interactions.** Do not apply clipping such as `overflow: hidden` merely to round the container: it can cut off controls or feedback. Respect heading/content min-width and wrapping. Keep text selectable, preserve the existing disabled styling, leave empty drop targets usable, and do not introduce section collapse, sticky section headers or drag animations.
5. **Keep the change local.** Validation, source normalization, generator/compiler, templates, runtime cards and fixtures need no changes. Existing section labels and controls require no new translations. Add a short explanation of the section boundaries and action placement to `docs/docs/installation/configuration.md`. Use existing safe empty/populated and flat/sectioned examples; no new gallery cases or fake entities are required.

## Risks / Trade-offs

- [Padding reduces narrow grid width] → Use small responsive padding and preserve existing min-width, wrapping and column rules; include this in the manual watch list.
- [Nested surfaces become visually heavy] → Keep section outlines subtle, inner row borders lighter and avoid shadows or added decoration.
- [A general heading rule alters unrelated cards] → Scope new rules to the existing section container and direct header/content children.
- [Markup or overflow changes interfere with drag or incremental rendering] → Prefer CSS-only treatment, retain direct-child contracts and avoid clipping.

## Migration Plan

No migration or data writes are introduced. Supported released JSON and generated structures remain unchanged. During apply, capture the current dirty baseline, review the scoped style changes and build with `npm run build:editor`; do not edit generated assets manually. Routine visual work needs code review and a short manual watch list, with browser inspection optional and no new automated tests for trivial CSS. If a necessary markup change introduces nontrivial logic, use the smallest existing panel assertion for that path.

Install final compatible assets once with `prepareFrontend()` on disposable `192.168.0.28`, preserving configuration and helpers. Served-asset/readiness checks confirm installation; leave successful assets installed. A blocked installation means not installed / not ready for test. Reverting the styling and rebuilding needs no dashboard-data rollback. Future push/tag/release requires unit-only `verify:publish`; additional integration/full tests require an explicit request.
