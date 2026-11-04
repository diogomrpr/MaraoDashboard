# Proposal

## Why

Room-card background icons are cropped so heavily that recognizable artwork is mostly hidden, as shown in the supplied Suite example. Room cards also expose only lighting state, leaving the room's climate operation invisible until another page is opened.

## What Changes

- Raise the decorative room icon and reduce excessive clipping while retaining its lower-right placement, subtle appearance and noninteractive role.
- Add one optional, explicitly selected `variables.climate_entity` to the room-card editor and supported card configuration. Existing cards without it retain their lighting behavior and actions.
- Place a circular climate-state button beside the lights-off button. Its icon reflects reported climate activity/mode, and a tap directly switches the configured climate entity off with one supported native command. It never opens a popup or turns the unit on.
- Combine normal lighting and climate colors diagonally: lighting at bottom-left, climate at top-right. Both inactive use the neutral room surface; one active contribution fills the card with its single color; two active contributions blend into the diagonal gradient.
- Smooth background-color changes over approximately 300 ms while retaining mounted controls and stable card geometry; respect reduced-motion preferences.
- Keep authoritative state, neutral availability/error feedback, localized action/state names, independent room navigation and separate light/climate action guards.
- Align the catalog, native editor, schema/validation, retained conversion/generation paths, documentation and representative safe examples.

Observed in code: room artwork uses a clipped container with negative bottom offsets, room lighting uses one flat background, the catalog exposes only `light_entities`, and climate colors/icons already exist in shared runtime helpers. The user confirmed that the new climate button switches the unit off directly. Proposed defaults: one optional climate entity per card; reported activity takes precedence for the icon/color, while enabled-but-idle equipment retains its selected-mode tint with a distinct idle indication. Missing activity falls back to the reported mode without claiming actual heating/cooling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: optional explicit room climate association, reported state and direct off action; combined light/climate background rules and independent room navigation.
- `mobile-theme-layout`: more visible room decoration, adjacent full-size child actions, diagonal color composition and smooth state transitions.

## Impact

Affected card set: `custom:marao-room-card` and `custom:marao-card` using `md_room_card`, including native, retained generated and preview/example consumers. Shared climate helpers and card-surface updates remain shared owners; ordinary standalone climate-card presentation is unchanged.

Primary code paths are `frontend/MaraoCards.js`, `editor.py`, `page_model.py`, `frontend_src/editor-model.js`, catalog-derived native forms/schema and card composition. Reuse existing theme tokens, translation catalogs, runtime/editor tests and safe room/climate fixtures. No runtime dependency or presence-discovery service is needed.

Compatibility: the climate association is additive and optional. Preserve existing light lists, explicit emptiness, names, icons, page routes, unknown variables and raw/native content through supported readers, editors and generators. No dashboard-format, settings-version or config-entry-version migration is planned. Existing saved room cards receive the requested artwork adjustment; omitting the climate field preserves their flat lighting palette. Historical fixtures and archives remain immutable.

Non-goals: climate on/toggle actions, room-level mode/temperature controls, new climate popups, multiple climate entities or automatic room discovery, physical-device identification, changing the existing lights-off command, recoloring unrelated card families or implementing the other open settings/media/cover changes.
