# Design

## Context

See [proposal.md](proposal.md) for motivation and [the layout delta](specs/mobile-theme-layout/spec.md) for acceptance behavior. A design is useful because the shared CSS, existing title assertions, generated popup children and native hosts must agree on the exception.

The end-to-end path is:

- `editor.py` and `frontend_src/editor-model.js` retain the existing family, name, icon, visibility and slider options. No new editor setting or validation rule is needed.
- `generator.py` emits `custom:marao-card` children for pages, light/cover groups and access sheets. Native hosts in `frontend_src/MaraoNativeCards.js` also import the shared renderer. Keep their output contracts unchanged.
- `frontend/MaraoCards.js` resolves an effective `kind`, normalizing open/unlock access-action configurations to `hc_access_slide_action_card`. `_range()` renders light/fan/cover value sliders and the strict opener; climate, number and Wallbox use steppers. Current media controls use buttons.
- `cardStyles()` supplies the general grid, a binary-card layout when redundant state is absent, and a `max-width:120px` container override that currently stacks title and icon. All require coordinated scoping.
- Existing theme tokens and localized names/state/error text remain sufficient. No palette, typography token, translation key or shipped dependency is needed.
- `tests/test-ha-dashboard-e2e.js:titleLayoutIssues()` currently rejects anything alongside a title; the accessibility runner reuses it. `tests/test-ha-card-alignment.js` has existing geometry checks, while `tests/verification-map.js` currently maps that file primarily to JSON-editor checks.
- `ha-test/cases.json` already includes slider-enabled/disabled light and fan cases, cover states and strict access actions. `ha-test/marao_dashboard_test_dashboard.json` provides realistic Lighting/Rooms/Security compositions. Extend the canonical sources and regenerate their disposable outputs through existing preparation.

## Goals / Non-Goals

**Goals:** Make the family decision once in the shared renderer, preserve native control lifetime, and give existing checks an independent, observable distinction between the two accepted header layouts.

**Non-Goals:** Altering public configuration, generated structures, service dispatch, gesture implementations, card availability semantics, or numeric-stepper presentation. No generalized layout framework or per-card setting is needed.

## Decisions

### 1. Choose a family layout using the effective runtime kind

Apply one narrowly scoped presentation class to light, fan, cover and strict access-opener bodies when their title is visible. Derive it independently of `_range()` output, capabilities, availability and `enable_slider`. Existing access normalization therefore includes legacy opening/unlocking action cards automatically. Non-opening access summaries and close/lock/hold-only cards retain their existing composition.

Alternative: use `:has(input[type=range])` or the presence of `marao-slide-to-open`. This fails the explicitly requested slider-absent variants and risks layout changes as controls become unavailable.

### 2. Keep the existing markup and scope the grid exception

Use title-left/icon-right areas in one header row; reserve later rows for state, useful labels, slider and problems. Preserve the current icon size and use a flexible, zero-minimum title column so long localized names wrap and increase row/card height. Cover the binary-state-omitted and narrow-container rules explicitly. Do not move the icon below a wrapping title, shrink essential text or reduce control targets.

Honor `show_name`, `show_icon`, `variables.show_icon` and icon-only detection. With a hidden icon, reclaim its space while preserving any required binary marker. Preserve circular surfaces and meaningful DOM/semantic order. Leave native inputs, pointer handling and the strict opener mounted through their established update paths.

Alternatives: change the general grid for every family, or add wrappers and separate renderers per card. Both expand unrelated impact without helping this request.

### 3. Change the assertions at the same shared boundary

Update `titleLayoutIssues()` to assert the expected header for affected effective families, rather than excluding them. Use explicit fixture expectations for family/legacy cases so a missing runtime class cannot silently bypass the check. Check horizontal separation, common header row, title wrapping/containment and lower controls/problem content; keep full-width-title assertions elsewhere.

Add a focused slider-header mode to the existing alignment path and register it in the source/component/check map with the four families, applicable ordinary-slider and safe access-action checks. Select normal, 320px, representative iPhone/Android portrait/landscape, bold, 200% text, 200% browser zoom and bold-plus-200% text cases for these families, in both themes. This is a selected layout gate, not the exhaustive gallery/mobile suite. Exercise distinct interactions once per relevant theme; repeat device gestures only where needed for native geometry/drag behavior.

Keep unit assertions in the existing card visibility tests for optional/hidden fields and normalized access kinds. Reuse slider/security dispatch and cancellation tests early; header geometry alone cannot prove gesture safety. Test representative unaffected navigation, room, switch, numeric/climate and media compositions through retained assertions.

### 4. Align examples and documentation in one implementation batch

Reuse canonical gallery cases where equivalent coverage already exists. Add only missing capability-absent, long-title/narrow-header or hidden-field examples and safe fixture data; show the behavior in a realistic page as well. Update the light/fan/cover and editable access-card guidance, the quality guide and feature-coverage wording that currently describe universal full-width titles. Keep baseline requirement synchronization for the completed, verified change.

## Risks / Trade-offs

- Less title width beside a fixed icon → Let titles wrap and cards grow; measure at 320px, narrow columns, enlarged text and browser zoom.
- Binary or container selectors restore stacked icons → Include state-less binary and narrow-container cases in the same geometry check.
- A global CSS or assertion change affects unrelated cards → Scope the exception to effective slider-capable kinds and preserve representative negative controls.
- Access header changes interfere with the strict gesture or native input lifetime → Keep event/control markup unchanged and require existing safe completion/cancellation/dispatch proof.
- Fixture or alignment edits trigger unrelated checks → Update `verification-map.js` with the focused path; unresolved selection remains an error.

## Migration Plan

This is a runtime presentation change; supported saved sources and historical fixtures require an identity transformation. JSON/defaults/API versions, generated YAML structures, protected custom regions and ownership remain unchanged. No migration, history rewrite, backup/recovery implementation or preserved-install upgrade run is required for that unchanged path. If implementation discovers a need to change a persisted/generated contract, revise this plan before making that change and select its migration/recovery proof.

For UI verification, use the existing dry-run/preflight and safe preparation workflow, retaining its exact disposable backups and cleanup behavior. Previews and dry runs remain read-only. Deploy the compatible batch only to `192.168.0.28`, verify the loaded asset identity, then inspect representative affected layouts as the final step. Keep credentials and diagnostic captures private. Roll back the UI package/assets together; if fixture preparation changed saved test data, restore its matching backed-up data as well. Preserve unrelated edits throughout. Publication is separate and requires the scoped `verify:publish` gate.
