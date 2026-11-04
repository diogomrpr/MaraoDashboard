# Proposal

## Why

The glance card's centered columns and bare icons do not match Marao's rounded icon treatment, aligned text and compact spacing. Bring its one-to-three readings into the same visual language while keeping their independent names, values, units and availability clear.

## What Changes

- Replace the centered icon/label/value columns with a compact vertical list of reading rows inside one Marao card: label and value at the start, a themed circular icon at the end.
- Use existing surface, spacing, Montserrat typography and light/dark color tokens. Give values clear emphasis, retain a quieter reading label and keep an optional card title across the full first row.
- Keep each reading's configured name/icon, native icon fallback and authoritative localized value/unit. Omit unused positions without empty cells or invented content.
- Make long names and meaningful values wrap in narrow/enlarged-text layouts rather than inherit the shared forecast label clamp or fixed single-line value clipping.
- Keep partial availability local to the affected reading so healthy values remain visibly readable, with explicit neutral status and existing diagnostic information preserved.
- Apply the same presentation through the native glance card and current/historical template aliases. Refresh the existing glance documentation and safe examples without adding configuration options or another card family.

Observed in source: `MaraoCards.js` uses a centered auto-fit `.readings` grid and bare 28px symbols; shared `.reading` rules clamp labels and values. Its generic problem styling can hide the whole readings list during partial warnings, while current tests primarily assert markup presence. These are source-review findings; no browser or real-device inspection was performed during planning.

The row layout, trailing circular icons and value-first hierarchy are proposed design decisions based on Marao's existing controls. The user requested aesthetic alignment without specifying exact pixel sizes or a new interaction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: define the glance reading presentation and responsive hierarchy while retaining the existing one-to-three independent readings and informational role.

## Impact

Affected card set: `custom:marao-glance-card`, `custom:marao-card` using `md_glance_card`, and retained `hc_glance_card` configurations. Shared runtime ownership is `custom_components/marao_dashboard/frontend/MaraoCards.js`; native card composition delegates to that renderer. The reading helper and `.reading` selectors also serve headers, forecasts and dishwasher details, so inspect those consumers and keep their established layouts intact.

Compatibility is presentation-only: retain entity order and omissions, names/icons, optional title visibility, explicit actions, unknown fields, native HA layout settings and saved dashboard content. No schema/default change, persisted conversion, generator contract change, endpoint, dependency or version bump is planned. Existing released configurations and immutable fixtures remain readable without rewriting them.

Non-goals: extra readings, per-reading service actions, new thresholds/history, a layout-mode setting, replacing HA containers or redesigning other card families. Existing action guards, localized errors, accessible semantics and theme ownership remain binding.

Implementation verification uses the smallest existing glance assertions if markup/availability logic changes, source review for scoped styles, and final frontend installation on disposable `192.168.0.28`. Routine visual checks remain with the user; no automatic browser matrix or full-suite campaign is included.
