# Proposal

## Why

The climate card wastes vertical space, especially at full width, and gives the
measured temperature too little emphasis. Its automatic popup repeats the same
card and mode dropdown instead of providing a clear readings-and-controls layout.

## What Changes

- Use the agreed Readings first layout: a larger unitless current temperature,
  optional humidity, readable actual activity, and a rounded vertical target
  selector at the right. Keep 8px above and below the selector. Normal compact
  presentation is approximately 150px tall, with growth for supported content
  and typography rather than a fixed height cap.
- Remove the climate family's unconditional four-row native sizing reservation;
  preserve authored grid sizing and shared section equal-height behavior.
- Add an optional humidity sensor picker, stored as `variables.humidity_entity`.
  The selected sensor supplies the same reading to the card and its climate
  details. Unset hides humidity; an unavailable reading remains visibly neutral.
- Add an Enable climate popup toggle, stored as `variables.enable_popup`.
  Omission means enabled, preserving existing automatic popup availability.
  Disabling it exposes supported mode choices inline, subject to an existing
  explicit `show_mode_buttons: false`, and keeps the target selector on the card.
- Present climate-owned details as current temperature/humidity at the top,
  supported HVAC mode controls next, and the identical target selector at the
  lower right. Leave the lower-left area unused for a separately requested future
  feature; add no placeholder UI or new feature there.
- Use 48-by-48 mode buttons with 28px icons and no visible button labels. Prefer
  one row when every supported mode fits; reflow without shrinking or hiding
  choices. A localized heading such as `Mode - Heat` identifies the selection.
- Retain explicit actions, custom popup layouts/links, graph and setpoint options,
  supported range behavior, shared pending requests, and authoritative readings.

The affected set is `custom:marao-climate-card` and its shared
`custom:marao-card`/`md_climate_card` renderer in native cards, generated pages,
climate groups, automatic details and managed climate popup layouts. Shared
numeric-control consumers are reviewed for compatibility, not redesigned.

Non-goals are the future lower-left feature, humidity control, extra fan-speed,
swing or preset controls, changes to other card families, new dependencies,
thermostat service semantics, and a broad verification campaign.

## Capabilities

### New Capabilities

None; extend the existing card and layout capabilities.

### Modified Capabilities

- `card-behaviors`: compact climate presentation, optional humidity, popup
  configuration and icon-only supported-mode selection.
- `mobile-theme-layout`: the climate title/selector composition, intrinsic
  sizing, and responsive mode layout replace the existing climate-specific
  full-width-title and dropdown presentation requirements.

## Impact

Runtime changes belong in `MaraoCards.js`, with the native wrapper/composition,
popup owners and editor sources in `frontend_src/` kept aligned. Catalog and
historical generation changes belong in `editor.py`, shared model validation and
`generator.py`; generated frontend catalog/editor assets must come from their
existing build steps. English/Portuguese strings, climate documentation, focused
tests and existing safe climate examples need corresponding updates.

The options are additive. Existing card types, entity spelling, saved layout,
explicit false/empty values, custom actions, unknown fields and popup view
ownership remain preserved. No dashboard-format, config-entry or managed-popup
version bump is proposed. Historical conversion must retain authored data while
emitting aligned climate presentation; source fixtures and history are immutable.

Planning starts at `7b500719b6318261bd33a2bda13ce6a5e09c6341` with unrelated dirty
work present. This change currently contains planning only. The conversation's
latest standard-button preview is a visual reference, not evidence that the
Home Assistant implementation has changed or passed verification.
