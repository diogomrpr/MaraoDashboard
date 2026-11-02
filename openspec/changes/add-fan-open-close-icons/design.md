# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. A short design records the icon pairing and containment decision before implementation. `MaraoCards.js` owns both the exhaust action markup and its styles. Buttons already have localized target-specific names, capability filtering and guarded cover dispatch. Their surface style is shared with Wallbox shortcuts, so layout changes must be scoped to exhaust actions.

## Goals / Non-Goals

**Goals:** consistent action recognition across every host using the shared fan renderer, without changing dispatch or persisted configuration.

**Non-Goals:** new action schemas, configurable icons, changes to fan speed or cover positioning, or changes to the header icon.

## Decisions

- Use native `ha-icon` inside each existing button, proposing `mdi:arrow-expand-vertical` for Open and `mdi:arrow-collapse-vertical` for Close. Expansion/contraction conveys opening/closing without implying motor speed. Retain visible localized labels rather than requiring users to infer the action from a symbol alone. Mark the icon decorative (`aria-hidden`) and keep the button's current accessible name.
- Keep `data-exhaust-action` on the button and preserve existing propagation handling, strong haptics and `_coverAction` checks. An icon tap bubbles to that one button; add no icon listeners or focus targets.
- Scope flex/grid alignment, gap and label wrapping to `.exhaust-actions` descendants. Preserve the 48px minimum control size and existing theme colors. Allow content-driven growth for enlarged labels; avoid fixed heights and styling shared Wallbox buttons differently.
- Apply only at the runtime owner. The builder/native editor, validation, generator, translations and themes require no configuration change. Existing localized Open/Close labels and target names are reused; both native and composed cards reach the same markup. No asset bundle regeneration is needed unless implementation actually changes editor sources.
- Update `docs/docs/usage/cards/md_fan_card.md`. Existing safe exhaust and open-only examples, including `cover.marao_dashboard_test_exhaust_open_only`, demonstrate the result; no additional fixtures are necessary. Use code review plus a manual watch list for this visual change. Existing ventilation tests in `tests/frontend/marao-security.test.js` remain relevant if dispatch code changes unexpectedly; do not add trivial icon-markup tests or run broad suites.

## Risks / Trade-offs

- Icons plus labels consume width → wrap or stack content within the existing button while retaining target size and readable text.
- Nested icons can receive taps → preserve button-level event handling and propagation guards; introduce no separate action.
- Shared surface styles can affect Wallbox → use exhaust-only layout selectors and review that equivalent consumer.

## Migration Plan

No data migration, ownership transaction, backend deployment or saved-source rewrite is required. Existing released settings and generated structures remain unchanged. Install the final frontend once using direct `prepareFrontend()` on disposable `192.168.0.28`, verify served assets/readiness and leave them installed. Roll back only task-owned runtime edits if needed while preserving unrelated work; no persisted data needs restoration. Do not connect to production or actuate real devices. Planning performs no installation.
