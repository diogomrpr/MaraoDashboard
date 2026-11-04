# Design

## Context

See `proposal.md` for the requested behavior. `MaraoActivity.js` owns the activity UI for all supported card consumers. Its `addSelect` helper creates native selects for Date and the other list filters. Custom From/Through fields are separate date inputs. Date changes query recorded activity; other filters apply to loaded records. Origin and Initiator controls are rebuilt from each query's results.

`MaraoDropdown.js` already supplies themed styles, selected-item semantics, press feedback, keyboard dismissal, viewport-constrained popover positioning, and a controller with `sync`, `close`, and `destroy`. Existing scene, climate, history-layout, and camera-event consumers demonstrate its use. This design adds an activity adapter rather than another dropdown component.

Planning baseline: commit `23c0d0e2c14eee774ac10a23ad50ae1449c31028`. There are pre-existing uncommitted edits in `MaraoActivity.js` for loading/list layout and filter ordering, plus unrelated untracked artifacts. Re-read the actual diff at implementation start and preserve that work. The existing completed `add-filterable-card-activity` change supplies the activity contract that has not yet been synchronized into the capability baseline; do not rewrite its historical artifacts.

## Goals / Non-Goals

**Goals:** keep one shared activity control adapter, make its value explicit, and tie dropdown resources to their actual controls and popup lifetime.

**Non-Goals:** change the activity model, query coverage, provider APIs, source permissions, card operating actions, or shared dropdown behavior without an observed integration defect. No new calendar or persisted filter state is introduced.

## Decisions

### Reuse the shared dropdown at the existing filter helper

Import `bindDropdown` and `dropdownStyles` using the existing versioned module-import convention. Replace the helper's select markup with a field wrapper, visible label, semantic trigger showing the selected label and chevron, and the shared menu/checkmark markup. Associate the trigger with its field label; avoid placing compound button/menu controls inside a native label.

Pass the existing haptic callback and the correct shadow-root/document active-element accessor to the binder. Keep at least 48px visible targets and the existing English/Portuguese text. Narrow the activity input/button CSS where needed so it does not override shared dropdown presentation. Preserve the wrapping header, expandable filter panel, stationary controls, and internally scrolling timeline.

Using a native select with restyled chrome would retain platform menus rather than the requested Marao dropdown. A separate Date-only widget would duplicate filter construction and leave inconsistent controls in the same popup. The shared helper therefore covers all existing list filters; From/Through remain native date inputs.

### Keep filter state authoritative and synchronize controls explicitly

Use `period` and `filter` as the source of truth for each dropdown's current-value getter. A small activity-local adapter owns the wrapper, selected-label update, binder synchronization, and disposal. Maintain a registry of live controllers for reset and cleanup rather than querying native selects or inventing synthetic change events.

On selecting a different value, update the existing state, synchronize label/checkmark, and invoke the existing callback once. An already-current choice closes the menu without another query or render. Preserve one heavy selection haptic, with the shared trigger feedback; do not add duplicate handlers. Reset updates all filter state and visible controls together, hides custom dates, and invokes the existing Today query once.

Keep date arithmetic and validation in `MaraoActivityModel.js`: Today, Yesterday, Last 7 days, custom HA-local boundaries, and the maximum 31-day range do not change. Preserve progressive rendering, stale-query rejection, permission/partial/empty/error distinctions, and existing loading behavior. Ordinary HA updates must not recreate dropdowns unnecessarily.

### Dispose data-derived controls and floating menus with their owners

Before replacing Origin or Initiator controls after a successful current query, destroy their controllers and remove them from the live registry. Rebuild supported choices, prune an invalid filter using the existing rules, and synchronize the effective selection. Preserve filter ordering before Reset.

When hiding the expanded filters, close its child dropdowns. Date remains in the header. On timeline destruction, invalidate pending activity work, destroy every remaining controller, then clear the host. Use the binder's existing floating-menu and Escape/outside-press behavior, including focus return. Do not attach another global dismissal listener. Preserve the parent popup's focus trap, background inertness, and close behavior; Escape handled by an open dropdown must not also close the sheet.

### Keep the change frontend-only and verify the adapter narrowly

The builder, validation, generator, fixtures, Python APIs, and saved schemas do not change. Existing released configurations and generated cards continue to use the same activity entry point. Theme tokens and shared styles remain authoritative; translations stay in the existing activity localization path. Update the Card activity section of `docs/docs/development/dashboard-quality.md` with the shared dropdown rule.

For implementation, capture the starting dirty state with `test:affected -- --snapshot /private/tmp/use-marao-timeline-dropdowns.json`, then review a behavior-tier plan for `activity` and the actual task hunks. Reuse the existing activity/card-visibility test harness for a focused adapter assertion covering changed selection once, reset/custom visibility, dynamic-choice synchronization, and disposal. Reuse the existing shared-dropdown cleanup test if its implementation changes. Existing activity-model checks protect period semantics; do not expand to a broad browser or device matrix.

Manual handoff watch list: Date menu matches other Marao dropdowns; current label/checkmark and Reset agree; custom date inputs still work; menu choices remain visible near the sheet edge and close cleanly. One optional targeted preview is sufficient if needed to investigate a concrete layout issue.

## Risks / Trade-offs

- Activity's broad button styles can override dropdown styling → narrow only the conflicting rules and reuse shared tokens/markup.
- Rebuilt Origin/Initiator controls can retain listeners or show stale labels → destroy before replacement and derive display from effective filter state.
- A floating menu can conflict with modal Escape/focus handling → retain the shared binder's event handling and check the activity popup integration.
- Concurrent edits already touch the shared owner → review current hunks and preserve unrelated loading/layout changes before selecting verification scope.

## Migration Plan

No data migration, config version, generated format, or backend restart is needed. After implementation and essential local checks, install the final frontend once on disposable Home Assistant `192.168.0.28` using the existing `prepareFrontend()` helper. Preserve test configuration and helper state. Served-asset/readiness checks confirm installation; hand off `/marao-dashboard` with a page reload if required. Rollback is a compatible frontend asset revert preserving unrelated current changes; no saved data rollback is involved.
