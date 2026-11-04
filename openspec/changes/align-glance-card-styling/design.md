# Design

## Context

See `proposal.md` for motivation and proposed appearance. Planning starts from `0d5267902da0b2ab595db77af149a7a4b2f64da6`; the two existing settings proposals are unrelated untracked work to preserve. This workflow changes planning artifacts only.

`MaraoCards.js` owns glance markup, shared `readingMarkup`, `cardStyles`, availability composition and state-icon binding. The helper is also consumed by header person/air-quality rows and dishwasher details; weather forecasts share the `.reading` selectors. Native `marao-glance-card` composition uses the same runtime role, so a separate native renderer would duplicate the fix.

Current glance uses the generic centered readings grid and bare symbols. The later forecast-oriented `.reading dt` clamp and single-line `.reading dd` rules also affect it. During partial warnings, `.body.has-problem > .readings` can hide the list even though tests find healthy values in the generated markup. Correcting this is necessary to satisfy the existing usable-secondary-reading contract; retaining markup alone does not demonstrate visibility.

## Goals / Non-Goals

**Goals:** one shared glance presentation across native and aliased templates, recognizable Marao surfaces/icons, readable independent measurements and local availability feedback.

**Non-Goals:** a general reading component rewrite, a new style option, changes to other reading families, new actions or any saved-data conversion.

## Decisions

### 1. Use compact reading rows within the existing surface

Use a single vertical list in configured order. Each row has a start-aligned label/value block and a trailing 48px circular icon area with the existing 28px symbol. Prefer the current compact-control spacing: 12px outer padding, 8px between rows and 4px between label and value, using shared variables where they exist. Use the existing primary typography token/bold weight for the value and secondary typography/color for the reading label. These are proposed visual defaults rather than new configuration fields.

Retain the normal Marao card border radius/background and an optional full-width title. Avoid nested card backgrounds, dividers and additional badges. No title or reading should be fabricated to fill an unused position.

A fixed three-column treatment makes names and values compete at mobile widths. A new layout selector adds an unnecessary persisted choice. The row layout provides a predictable mobile default and preserves logical reading order.

### 2. Scope presentation to the glance owner

Prefer `.glance-card`-scoped layout and symbol styles over replacing `readingMarkup` or rewriting global `.reading` styles. Existing markup already has a semantic definition-list relationship and per-entity native-icon binding. Add only the minimal grouping/status metadata needed for the glance layout or availability composition; keep header, forecast and dishwasher output equivalent.

Remove label clamping and fixed single-line value height only inside glance. Let names, values and units wrap without shrinking fonts, adding a nested scroller or overlapping icons. When horizontal adjacency cannot fit, reflow the row content vertically while preserving full-size controls and its name/value association. Reserve symbol dimensions before icons load. Keep configured-row geometry through loading/availability transitions as far as its authored content permits, using each value slot for its status rather than appending a second warning list.

### 3. Keep availability readable at the correct level

For reading-only partial loss, present localized missing/unknown/unavailable feedback in the affected row with neutral text/icon treatment. Keep healthy values visible. Retain existing aggregate warning semantics, including neutral problem-surface treatment where required by `entity-state-actions`, but compose the cue without the generic overlay hiding the list or covering a reading's icon. Reuse existing problem-detail access when additional information needs inspection; never discard an actual error or action-target warning to achieve the appearance.

Keep complete loss/disconnection behavior and actual action guards in the shared path. Preserve any explicitly configured card-level action and informational default behavior; rendering or tapping a decorative reading icon must not invent a service action. Each row continues using its own entity, configured label/icon and HA's authoritative localized state/unit.

### 4. Preserve the authoring and historical contracts

No editor option, catalog schema, generator output, public type, source version or HA config-entry version changes. `frontend_src/native-cards.js` and `card-composition.js` remain adapters to inspect, not a second place to implement the appearance. Historical `hc_glance_card` input, current `md_glance_card` and native `custom:marao-glance-card` retain their configurations, order, explicit omissions, actions, opaque fields and host-owned sizing/visibility.

Existing provenance includes the v0.5.1 released glance example and the ordinary v0.23.4 fixture manifest. They establish old inputs to preserve, not files to regenerate for a styling change. No migration or historical-fixture rewrite is expected.

Use existing Marao theme and localized state strings; do not add a separate palette or unit formatter. Update `docs/src/content/docs/cards/glance.mdx` and its existing playground scenarios. Reuse the three safe gallery examples in `ha-test/dashboard/views/00-card-test.yaml` and existing realistic-page glance uses. Change example descriptions/configuration only if needed to demonstrate the final behavior; add no test entities or gallery matrix.

## Risks / Trade-offs

- Shared selectors/helper changes could alter headers, forecasts or appliance rows → keep selectors scoped and compare representative equivalent consumers before broadening code changes.
- A generic warning can still visually hide healthy readings → review the actual composition/CSS rather than treating a text-in-markup assertion as proof; retain the warning and its diagnostic access.
- Rows use more vertical space than short three-column readings → keep them compact and let the page scroll normally; readability takes precedence over squeezing three measurements into one line.
- Long labels/units can increase height → allow deliberate wrapping and row reflow, reserving icon space and preserving the surrounding HA layout settings.

## Migration Plan

There is no data transformation, automatic dashboard write or new storage. Rollback restores the previous matching frontend assets while preserving user configuration and preferences.

Implementation captures its own task baseline, reviews the actual diff and selects the affected `labels` scope. Style review and a small existing glance-focused Node selection cover the changed markup/status composition; extend to representative helper consumers only if shared helper behavior changes. Browser inspection is optional; the observed partial-warning composition can justify one targeted view on disposable HA if offline evidence cannot resolve visibility. Do not add browser tooling or make a broad matrix a prerequisite.

Build generated assets only if their source/owned asset set changes, then install the final compatible frontend once through `prepareFrontend()` on disposable `192.168.0.28`. Use its compatibility and served-asset/readiness checks and preserve existing configuration/helpers. Hand off `/marao-dashboard` with a short manual watch list for one/three readings, long labels at narrow/enlarged text sizes, both themes and partial availability. No production access, real device actions, release or full-suite testing is authorized by this proposal.
