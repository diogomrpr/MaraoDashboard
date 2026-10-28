# Design

## Context

See proposal.md for motivation and specs/visual-builder/spec.md for acceptance cases. The shared vanilla custom-element panel creates the toolbar in `_renderShell()`, maintains labels and disabled states in `_updateHeader()`, switches modes in `_switchTab()` and delegates actions to existing handlers. `panel.css` owns the sticky layout. The menu currently holds import/export/discard/open and owns close/focus listeners. Its pointer listener also records `_pressedPath`, which `_revealFocusedControl()` consumes; that unrelated behavior must survive removal.

## Goals / Non-Goals

**Goals:** Keep one mounted control per action, preserve action semantics, and make header updates safe for icon children. JSON-only visibility must follow the accepted active tab, including asynchronous preparation and invalid-source rejection.

**Non-Goals:** No new state machine, dependency, source-format change, generator work, runtime-card change or Monaco customization.

## Decisions

1. Reuse existing HA icon controls/semantic buttons with decorative `ha-icon` children. Use recognizable icons: `mdi:arrow-left`, `mdi:content-save`, `mdi:import`, `mdi:export`. Keep Open first and Save second; remove the Discard control. Use the filled circular Save presentation for every header icon. Retain the current action IDs and handlers where practical. An icon-only open link may retain its real dashboard URL and existing guarded navigation. A new dropdown would conflict with the requested simplification; the user explicitly removed the Discard control in the follow-up.
2. Update localized accessible names on action hosts rather than assigning their `textContent`. Preserve English/Portuguese TEXT keys and the existing native-session strategy's Apply name. Leave Retry and other text controls textual. Optional tooltips must not carry the only action name. Preserve visible busy/error feedback and current disabled guards. Extend existing strong icon haptics to these actions without duplicate feedback.
3. Place a compact transfer-action group in the JSON surrounding toolbar, outside the Monaco surface. Hide it when Visual is active; reconcile visibility after accepted mode transitions and header updates. Do not drive visibility solely from `_requestedTab`, because preparation or validation can reject the switch. Keep the existing shared draft and Monaco model mounted through ordinary updates. A single conditionally visible group avoids duplicated handlers and transfer controls in Visual.
4. Remove details/summary/menu markup, CSS and menu-only close/Escape/focus-restoration logic. Preserve independent pointer-path tracking used for focus reveal. Keep the header opaque and sticky with adjacent Save/Open controls as one wrapping unit; other groups may reflow. Use existing theme tokens, explicit visible 48px control geometry and internal localized names without new focus-only styling.
5. Reuse `_save()`, `_openDashboard()`, `_importSource()` and `_exportSource()` without changing their validation, privacy review or confirmation contracts. Validation/generator/templates/runtime and saved source remain unchanged. No Python integration edits or migration fixtures are needed. Update the toolbar instructions in `docs/docs/installation/configuration.md`; no new gallery fixtures are useful for editor chrome. Rebuild shipped assets using `npm run build:editor`, never edit generated bundles directly.

## Risks / Trade-offs

- Header updates could erase icon children → keep naming and presentation separate and cover refresh in the smallest existing panel test.
- Removing menu listeners could break pointer focus reveal → preserve `_pressedPath` recording independently.
- Tab requests can fail → assert transfer visibility against the accepted mode, including a rejected transition.
- Icon meaning is less explicit than visible text → distinct familiar icons and localized internal action names, optional titles and concise documentation.
- More direct controls consume header width → group Save/Open together and let surrounding groups reflow at the mobile target without shrinking controls or customizing Monaco.

## Migration Plan

No data migration: supported released source, explicit emptiness, unknown fields, raw cards, generated output and API contracts are preserved. During apply, capture the then-current starting commit and dirty snapshot, review only this task's changes, run the smallest relevant existing panel assertions, build once and sync final compatible frontend changes using `prepareFrontend()` to disposable `192.168.0.28`. Served-asset/readiness checks suffice; browser inspection is optional and routine visual testing belongs to the user. Rollback restores matching prior editor source and rebuilt assets without touching dashboard data. Planning itself makes no runtime change and requires no installation. Any future push/tag/release requires unit-only `verify:publish`; additional integration/full tests need explicit authorization.
