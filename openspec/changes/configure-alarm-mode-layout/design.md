# Design

## Context

See proposal.md for motivation and scope. Starting commit is `77fd032fcfd5bf59df54c23dd8b9d8ffe2d2bed9`. Existing unrelated OpenSpec edits and duplicate local files remain outside this change.

Observed implementation: `editor.py` exposes the Alarm catalog entry with only popup identity; `generator.py::_alarm_popup` emits an internal `md_alarm_controls_card` without forwarding presentation options. `MaraoCards.js::alarmActions` derives modes from advertised features, `_renderAlarm` renders a horizontal row and reserved masked-code slot, and `_sendAlarm` validates codes, availability and guarded dispatch. Existing tests cover held disarm/bypass and code cleanup. Native cards compile through the shared backend and use the same controls.

Existing baseline specs and the quality guide prescribe a row and held disarm. The user's requested grid slider and subsequent explicit no-hold dropdown decision supersede those rules for these configured layouts only. Legacy alarms and other risky security actions retain their current behavior.

## Goals / Non-Goals

**Goals:** One additive setting and one shared alarm implementation; retain authoritative state, transient-code privacy, strict cancellation and stable state-dependent geometry.

**Non-Goals:** New card families, general security-confirmation settings, provider-specific modes, new dependencies, inline summary controls, PIN persistence or unrelated access fixes.

## Decisions

### Configuration and compatibility

Use `variables.alarm_layout: dropdown | grid` on both alarm templates. Absence means the existing row; reject other explicit values through Python page validation, frontend editor validation and runtime configuration. New-card creation/stub/starter defaults explicitly write `dropdown`; never inject that default when loading or round-tripping an existing card. An unset legacy card's editor displays a localized legacy-value hint without silently selecting a different layout.

This avoids an unsolicited change to existing security interactions. Replacing all existing rows with dropdowns was rejected because it removes a hold during upgrade without an explicit card-setting decision. Only the two new layouts are offered for deliberate selection; retaining omission does not require a persisted third enum value.

Add the catalog field in `custom_components/marao_dashboard/editor.py`, shared labels in `frontend_src/editor-labels.js` / `native-labels.js` as applicable, validation in `page_model.py` and `frontend_src/editor-model.js`, and runtime validation in `MaraoCards.js`. Rebuild derived editor/native catalog assets rather than hand-editing them. `_alarm_popup` forwards only the owned layout setting to child controls. Ensure the native compilation path and raw internal controls honor the same contract. Explicit external popup references remain externally owned.

### Dropdown actions

Reuse `bindDropdown` and its themed presentation. Include supported arming modes and Disarm, marking authoritative current mode; transitional states keep their reported label. Opening, keyboard navigation and dismissal do not execute anything. Explicit committed selection calls the existing alarm validation/dispatch owner once; selecting the current mode does nothing. Preserve the code slot and menu/focus across unrelated updates.

Per the user's latest instruction, dropdown selection alone confirms all offered alarm actions, including disarm and bypass. This exception belongs in alarm action policy, not in the generic hold helper. Missing required codes still prevent dispatch and show the existing validation error. Do not add a second confirmation button.

### Grid and strict disarm slide

Render supported arming actions with `repeat(2,minmax(0,1fr))`; labels wrap and equal row height accommodates text. Ordinary modes retain tap binding and bypass retains the existing hold. Disarm is a separate sibling below the grid, spanning the full control width; no empty grid gap when there are no arming modes. Retain state/code/error slots and established capability placeholders across availability loss. Configuration or text/width changes may reflow, ordinary state/error changes must not resize the card.

Reuse the current classic access slide appearance and pointer/gesture implementation with a narrowly scoped alarm completion callback. The existing access-service allowlist cannot accept arbitrary alarm actions: extract only reusable gesture mechanics if required, leaving access service authorization intact. Whole round handle start area, horizontal intent, release completion, cancellation/reset and boundary/completion haptics remain identical. No progress background fill. Alarm completion rechecks the latest target, active configuration, availability, already-disarmed state, busy status and required code before calling `_sendAlarm` once. Represent confirmation internally by its actual kind rather than pretending a slide or dropdown completed a hold.

### Shared consumers and documentation

Generated and native summary tiles retain their current dimensions and authored tap actions. Their automatic detail sheets receive the configured layout. Direct `md_alarm_controls_card` instances use the same renderer. Use existing theme tokens and English/Portuguese translations for layout choices, actions and status. Update `docs/docs/usage/cards/md_security_card.md`, affected quality-guide alarm rules and `openspec/feature-coverage.md` at implementation; baseline spec synchronization remains separate from writing this proposal.

### Verification boundary

Extend `tests/frontend/marao-security.test.js` for layout policy, single-call selection, incomplete/vertical/cancelled slides, required-code rejection, disconnect and preview guards. Extend the smallest existing editor/generation checks for both option values, invalid values, legacy omission, explicit external popup preservation and exact child forwarding. Keep legacy hold tests and access-slide authorization regressions intact. Add safe Dropdown/Grid examples using existing fake alarm helpers and retain one old unset fixture. No physical alarm is operated.

The implementation must install final assets on disposable `192.168.0.28` while preserving test configuration and safe helper state. A manual watch list covers two-column wrapping, full-width slide and dropdown behavior; no full suite, browser matrix, camera checks or production inspection is implied. Publication is outside this proposal; if later requested, its gate is unit-only `verify:publish`.

## Risks / Trade-offs

- Dropdown disarm can execute immediately after an option is committed → clearly name actions; retain mandatory PINs and all live guards. This is the user's explicit interaction choice, not a claim that a dropdown offers equivalent gesture protection.
- Reusing slide code could broaden access authorization → reuse mechanics only; assert that unrelated services and generic access bypasses remain rejected.
- Defaults could alter saved alarms → set dropdown only at creation, preserve absence and unknown fields during edits and generation.
- Alarm updates could replace an active control → preserve mounted input/gesture owners and cancel safely on relevant target/configuration changes.

## Migration Plan

No format conversion or version bump: supported released sources without the new field remain unchanged, including legacy template aliases. Add independent assertions for unchanged old source and expected generated child options for new source. Do not alter archived historical inputs or expectations merely to adopt a new layout. Use existing save/generation backup, preflight, atomic-write and recovery paths without adding new migration writes. Deployment rollback restores the matching package plus exact backed-up owned data/configuration where a user has saved new options; never regenerate over protected custom YAML or replace user selections with starter defaults.
