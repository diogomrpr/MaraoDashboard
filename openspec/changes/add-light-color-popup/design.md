# Design

## Context

See `proposal.md` for motivation and scope. `MaraoCard` currently owns light state treatment, a full-card action target, icon circle, capability-aware vector/native brightness range and guarded service dispatch. `MaraoPopupCard` already owns modal lifecycle and a history detail view that hides its parent list, adds Back and restores scroll/focus. Those shared paths also serve native wrappers and generated cards.

Starting commit: `7b3627745fa7cc30dfc1de1934413daa2b0222f1`. The task starts with approved seasonal-color edits in `MaraoCards.js`, the Marao theme, `docs/docs/development/theme.md`, `tests/frontend/brand-assets.test.js` and `tests/frontend/marao-climate-card.test.js`; preserve those hunks. The parent task captured `/private/tmp/marao-light-color-start.json` before implementation.

## Goals / Non-Goals

**Goals:** keep card geometry stable; share gestures, brightness, modal lifecycle, localization and error handling; defer picker code until needed; use supported native light data and services.

**Non-Goals:** no new persisted fields, builder options, generator structures, effects, presets, dashboard rows, dependencies or optimistic state machine.

## Decisions

1. **Capability-driven shared-card entry points.** Recognize reported color modes (`hs`, `xy`, `rgb`, `rgbw`, `rgbww`) and temperature support. Replace only a supported visible light icon's presentation with a semantic button using the same circle bounds and a small palette indicator. Keep the body action separate. A default 600 ms hold is available only when no hold action is explicitly configured. Ordinary lights and explicit actions keep their existing behavior. Adding a new row was rejected because it changes card height.

2. **Independent default hold cancellation.** Use the existing action gesture infrastructure with a light-specific duration and cancellation for scrolling/movement. Do not change the 1.2-second security hold contract. Suppress the release click after picker activation or scroll cancellation; normal short activation still follows the existing body action.

3. **Lazy picker inside the existing sheet.** Follow the current versioned dynamic-import pattern, including retry after a failed import. Use a browser-drawn color wheel and the shared brightness control; keep the picker mounted across HA updates during interaction. A standalone dashboard light gets a transient Marao sheet. A light inside an open group gets a detail view in that sheet, preserving the parent DOM, scroll and focus restoration. A separate nested native dialog was rejected because it would duplicate or break modal ownership.

4. **One completed native update.** Maintain temporary selection only during a drag. Send one `light.turn_on` request containing the final color or `color_temp_kelvin`, clamped to reported Kelvin limits; HA performs native color-mode conversion. Brightness uses the existing brightness action. Opening/cancellation dispatches nothing. Recheck connection and entity availability before dispatch, cancel on loss, and return to authoritative reported values after the gesture. Existing service errors stay visible and are not automatically retried.

5. **No saved-contract changes.** Builders, validation, native adapters and generators continue producing their current shared light cards. Existing tap/hold objects, hidden icons, slider settings, custom names/colors and seasonal backgrounds survive unchanged. Add localized picker strings through existing translation machinery and document entry points beside Brightness in `docs/docs/usage/cards/hc_light_card.md`.

## Risks / Trade-offs

- Long press can conflict with scrolling or the toggle overlay → cancel on scroll intent/pointer cancellation and assert no accidental toggle or duplicate dispatch.
- HA updates can replace controls mid-drag → preserve mounted shared controls and refresh authoritative values in place.
- Group members can update or rerender while detail is open → reuse popup ownership validation and restore the current matching opener plus saved list position.
- Bulbs expose different color modes and Kelvin bounds → select controls from reported capabilities and test color-only, temperature-only, combined and ordinary lights.
- Native phone gesture feel cannot be established by unit checks → leave iPhone/Android hold, scroll cancellation and wheel feel as a concise manual watch list.

## Verification and Installation

Use focused checks for capability selection, unchanged card geometry, hold/scroll cancellation, one-call completion, explicit action/hidden-icon preservation and popup Back restoration. Reuse safe fixture lights, extending `ha-test/` only if needed to expose missing color capabilities. Review affected light and popup consumers and the actual task diff; preserve unrelated edits. Do not run full-suite or camera transport checks.

Install the final frontend on disposable `192.168.0.28` with the existing frontend preparation helper, or use full preparation only if safe fixtures require it. Leave the successful assets installed. No production connection, configuration migration or release is part of this change.
