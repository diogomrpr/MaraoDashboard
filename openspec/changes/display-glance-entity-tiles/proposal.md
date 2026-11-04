# Proposal

## Why

The current glance card puts independent entity readings into vertical rows inside one surface. The user selected separate value-focused tiles and explicitly requested three tiles in the same row so each entity has its own identity without making the group tall.

## What Changes

- Replace the glance reading rows with one rounded tile per configured reading: centered circular icon above a prominent value/unit and a quieter wrapping name.
- Show three equal-width tiles in one row on full-width phone layouts, including 320px viewports with ordinary dashboard margins and normal/bold typography. Use 8px gaps and no visible enclosing card background, border or shadow.
- Keep the optional group title above the tiles. One or two configured readings use one or two equal columns across the available width; omitted positions create no placeholders. This is a proposed default for the unspecified reduced-reading cases.
- Reflow to fewer columns when enlarged text/zoom or a narrower host cannot contain the content and 48px controls. Preserve all names, values, units and configured order without shrinking fonts or horizontal scrolling.
- Add a default-on **Show reading labels** option (`variables.show_reading_names`) in the card editor. Hiding labels keeps saved names, the separate group title and accessible names intact.
- Preserve independent availability feedback, readable healthy measurements, existing Activity triggers, explicit card actions and hidden title/icon options.
- Update existing glance documentation/examples to explain the tile presentation. Introduce no new layout setting, entity model or card type.

Observed in source: `MaraoCards.js` currently applies a single-column `.readings` layout, left name/value blocks and trailing 48px circular icons. The native glance card delegates to this shared renderer. These are source findings; this proposal does not claim browser or real-device inspection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: replace glance row presentation with independent tiles, define three-across normal-phone acceptance and content-driven reflow, retaining existing state/action contracts.

This supersedes the row-only presentation decisions in the completed `align-glance-card-styling` change. Its glance requirements have not yet been synchronized into the main capability. Apply that change's spec delta before this change's modifications during future spec synchronization; do not rewrite the earlier completed artifacts or baseline during planning.

## Impact

Affected cards: `custom:marao-glance-card`, `custom:marao-card` with `md_glance_card`, and supported historical glance aliases. The shared owner is `custom_components/marao_dashboard/frontend/MaraoCards.js`. Header, weather forecast and dishwasher readings share reading markup/styles and must retain their established appearance. Native wrappers, outer control grids and Activity dispatch must retain their current contracts.

Compatibility is presentation-only. Keep the existing three entity slots, order/omissions, names/icons, units, visibility, optional title, explicit actions, unknown fields and HA-owned layout configuration. Supported released configurations remain readable without a migration, dashboard write, format/version bump or fixture conversion. The previous glance design records v0.5.1 and v0.23.4 provenance; implementation must preserve those inputs.

Non-goals: more than three readings, separate HA-editable child cards, a column/layout selector, new services/history/thresholds, other card-family redesigns, backend changes, new dependencies or publication.

Implementation verification remains proportional: scoped style review and the smallest existing glance assertions if markup or responsive logic changes; no browser matrix or full suite. Install the final frontend on disposable HA `192.168.0.28` before implementation handoff. Planning itself changes no runtime files and requires no installation.
