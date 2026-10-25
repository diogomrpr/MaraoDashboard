# Design

## Context

See `proposal.md` for motivation and the two spec deltas for acceptance behavior. The confirmed threshold direction is inclusive lower bounds.

Observed implementation paths:
- `custom_components/marao_dashboard/editor.py` defines `md_sensor_card` and its `md_card_color`, `on_icon` and `off_icon` fields. It serves both the builder catalog and schema consumers.
- `frontend_src/MaraoDashboardPanel.js` renders generic fields and dedicated ordered-list editors (energy contributors/power devices); it already delegates numbers and colors to shared controls.
- `frontend_src/editor-model.js` owns normalization, draft validation and catalog-derived JSON schema. `custom_components/marao_dashboard/page_model.py` and `generator.py` validate and generate the saved card model; direct card configuration also reaches the runtime.
- `custom_components/marao_dashboard/frontend/MaraoCards.js` owns shared `stateAppearance` and card rendering, including discrete sensor colors, availability precedence and numeric formatting. It currently selects foreground using theme-token cases, which alone does not guarantee contrast against arbitrary literal colors.
- Sensor documentation is `docs/docs/usage/cards/md_sensor_card.md`. Existing card-visibility, editor-model/JSON/editor-panel and generator/page-model tests cover the affected layers. `ha-test/cases.json` and `ha-test/upgrade/coverage.json` must stay aligned when options/examples change.

## Goals / Non-Goals

**Goals:** One optional sensor setting shared by supported builder, generated and direct-card paths, exact deterministic matching, safe fallback and readable custom backgrounds.

**Non-Goals:** No new card type, external dependency, subscription, polling, alert classification, automatic service action, graph-color contract or restoration of retired standalone native editors. Group summary aggregation is unchanged; a sensor member uses its own configured source.

## Decisions

### 1. Store lower bounds as a small optional row list

Use `variables.background_thresholds: [{value: 40, color: "#75C89B"}, {value: 60, color: "#BD4242"}]` on `md_sensor_card`. Store finite JSON numbers, including zero, negatives and decimals, in strictly increasing order. Omission and `[]` both disable matching, but remain distinct persisted representations. Preserve unknown row fields and unrelated options.

Use the same list in generated card variables and direct supported configuration, including canonical legacy aliases. Reject duplicate or descending bounds rather than silently sorting the user's saved rows. A fixed low/medium/high set would prevent the requested arbitrary thresholds; a generalized expression/rule language would add unnecessary complexity.

### 2. Compare source values before formatting

Choose the last bound not greater than the finite raw reading. Only complete numeric readings qualify: empty strings, whitespace, invalid strings, nonfinite values and binary states do not become zero. The scope is domain `sensor`; nonempty lists on binary sensors are invalid. Do not reject a sensor merely because its current state is temporarily nonnumeric or unavailable.

Threshold units are the entity's reported source units, stated next to the controls/help. Display precision or supported display conversion never changes the rule semantics. Matching the rounded display would make changing precision alter the selected background and create ambiguous boundaries. Source-unit changes require the user to review their configured bounds; there is no automatic rescaling.

### 3. Keep matching inside the shared sensor appearance path

Apply matched backgrounds only for numeric `md_sensor_card` readings, reusing normal authoritative `hass` updates and existing problem/availability precedence. Do not add a separate renderer or timers. Preserve normal appearance below the first bound, on nonnumeric states, and when disabled. Preserve existing on/off icons, reading/unit, names, metadata, actions and other families.

Use the existing color-selector control with opaque six-digit hex values, giving cross-language validation and contrast calculation a small deterministic contract. Accept either hex letter case and preserve the user's value. CSS expressions, alpha colors and theme-variable references are outside this new option; existing unrelated color fields keep their current syntax. Reuse any suitable existing contrast helper; otherwise select black or white foreground from the matched literal's relative luminance/contrast. Keep that calculation local to the new sensor threshold appearance, including icon and metadata text, instead of changing all custom card colors.

### 4. Validate and edit at the existing boundaries

Add a catalog list field and a small row editor following existing list controls, with shared numeric up/down and color selection, localized add/remove labels, numeric ordering errors and source-unit help. Preserve draft and row values when invalid so corrections are possible. Add the row object shape and bound/color constraints to JSON assistance, with full validation still authoritative for ordering and uniqueness.

Share Python validation between page-model/save and generator entry paths. Mirror the same small contract in the existing frontend model and direct runtime configuration validation. Do not filter unknown fields or reinterpret historical archives. Generated sensor occurrences and group member options must carry the list without converting protected raw Home Assistant cards.

### 5. Keep persistence and installation behavior unchanged

The setting is additive to released v0.20.0 sensor variables. No default insertion, format bump or migration is needed. Use independently specified assertions that an old sensor card remains unchanged and a new list survives edit/generation, including unknown row fields and explicit emptiness. Normal save/generation continues to use existing preflight, exact backups, atomic writes and recovery; this feature introduces no new write mechanism and does not mutate archived history.

If rollback is necessary after saved settings are used, retain exact pre-change source/output/owned-state backups and restore matching package and data together using existing recovery procedures. Never replace user source with discovery defaults. Before implementation handoff, install the final package on disposable `192.168.0.28`, preserving current configuration and safe helper state.

## Risks / Trade-offs

- Arbitrary colors can make a reading illegible → restrict the new row color to opaque hex and select contrasting foreground; keep the existing reading/unit as non-color information.
- Source/display conversion confusion → label thresholds as source-unit values and document unrounded comparison with a boundary example.
- Malformed direct configuration could bypass the builder → validate the same contract in runtime `setConfig` as well as frontend/backend acceptance.
- Shared appearance edits could change binary/battery behavior → scope the branch to numeric sensor thresholds and retain representative unchanged-family assertions.
- New catalog options or gallery cases could stale the upgrade inventory → update the reviewed inventory and run its small consistency test alongside targeted behavior checks.

## Verification

Use the smallest existing assertions for matching boundaries, unavailable/nonnumeric fallback, foreground contrast, row validation and preserved option propagation. Include independently specified zero/negative/decimal and old-card examples. Add one safe humidity example to Cases and a realistic page; reuse existing safe helpers if suitable. No browser or device campaign is required. Build/check edited editor assets and review the final diff. User manual watch list: boundary colors, text/icon readability and row editing on mobile. Run unit-only `verify:publish` only if a later push/tag/release is requested; this proposal does not authorize publication.
