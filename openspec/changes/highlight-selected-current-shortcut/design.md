# Design

## Context

See [the proposal](proposal.md) for motivation and
[the numeric-controls delta](specs/value-numeric-controls/spec.md) for behavior.
This design records how to reuse authoritative selection and scope the style
change around shared button rules.

`MaraoCards.js` renders the shortcut row only for `md_wallbox_current_card`.
The editor catalog permits both `number` and `input_number` bindings. Each
button already receives `aria-pressed` by comparing its numeric value with the
reported state, subject to loading and availability. Current CSS colors all
buttons blue, then assigns teal and gold by position; only the selected outline
is conditional. Some neutral button styling is shared with exhaust controls.

## Goals / Non-Goals

**Goals:** use the existing selection attribute as the single styling signal and
preserve shared control behavior, geometry and theme tokens.

**Non-Goals:** additional selection state, new numeric matching rules, preset
support on generic number cards, new settings or action-handler changes.

## Decisions

### Gate accents on the existing pressed state

Keep neutral surfaces and normal readable text as the default. Restrict all
three positional accent rules to selected, enabled shortcut buttons; preserve
the selected outline and current accent foreground. Ensure disabled treatment
continues to take precedence. Keep the change scoped to `.wallbox-shortcuts`
so the shared exhaust-action base retains its behavior.

The alternative of adding a new selected class or click-tracked value would
duplicate existing state and could indicate a value Home Assistant has not
confirmed. No renderer or service change is needed to achieve the requested
appearance. In particular, keep the existing exact numeric comparison instead
of selecting the nearest shortcut or introducing a pending selection.

### Preserve the positional palette and existing configuration

Use existing blue, teal and gold tokens for the selected position, together with
the current outline and semantic pressed state. This changes when an accent is
visible without inventing a palette setting or altering stored shortcut order.
Both themes continue to use the existing surface, text and accent tokens; no
theme definitions or translations need changes.

The builder, validation, JSON schema, generator, storage and public card options
remain unchanged. Released v0.23.3 configurations, including missing or empty
shortcut arrays and unknown fields, need no conversion. No entity action,
private data or new dependency is introduced.

### Align documentation and reuse the existing checks

Update `docs/docs/usage/cards/md_number_card.md`, whose current description says
all shortcuts are colored, and clarify the Wallbox shortcut-color wording in
`docs/docs/development/dashboard-quality.md`.

The existing Wallbox test in `tests/frontend/marao-card-visibility.test.js`
already covers reported selection, nonmatching values, unavailable/disconnected
states and dispatch. Keep it as the regression reference; do not add tests that
merely copy CSS selectors. Code review and a short user visual watch list are
sufficient for this styling change. Existing safe Wallbox examples in `ha-test`
already provide a three-shortcut row, so no new fixtures are needed.

## Risks / Trade-offs

- An unconditional positional rule leaves unselected buttons colored → review
  every shortcut background and foreground rule together.
- Selected styles override disabled appearance → gate accents on enabled
  selection and preserve the final disabled rule.
- Shared button styling changes exhaust controls → scope the override to
  Wallbox shortcut buttons and retain the shared neutral base.
- A tap is mistaken for confirmed selection → continue styling only the existing
  reported-state attribute, retaining separate immediate press feedback.

## Migration Plan

No data migration or editor build is required for a runtime style-only change.
After the final implementation and documentation edits, install the current
frontend once on disposable Home Assistant `192.168.0.28` using the existing
`prepareFrontend()` helper and verify its served-asset/readiness checks.
Leave a short manual watch list for selected, unselected and nonmatching values.
Rollback restores the previous frontend asset without rewriting configuration.
This planning workflow does not change installed assets.
