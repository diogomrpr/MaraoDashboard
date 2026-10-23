# Proposal

## Why

The shared light card currently exposes toggle and brightness controls but no Marao color picker. Color and white-temperature controls should be reachable without adding rows or enlarging cards.

## What Changes

- On capable lights, make the existing icon circle open a color popup, with a small palette indicator inside its unchanged bounds.
- Add a 600 ms card hold as a second entry point, preserving explicit hold actions, body taps and brightness behavior; scrolling cancels the hold.
- Use the existing Marao sheet for a capability-aware color wheel, white-temperature slider, shared brightness control and concise off indication.
- Preview dragging locally and send one final native light update on release, including turning an off light on. Opening or cancelling sends nothing.
- Lazy-load picker code. Preserve group-list scroll and focus through a detail view with Back.
- Non-goals: effects, saved presets, new dashboard rows, new configuration fields, migration, third-party cards or release publication.

## Capabilities

### New Capabilities

None; this extends existing shared card, popup and value-control capabilities.

### Modified Capabilities

- `card-behaviors`: capability-aware light color entry points without changing card size or configured actions.
- `navigation-popups`: light detail sheets and restoration of their enclosing group list.
- `value-numeric-controls`: local color previews, bounded temperature requests and one final dispatch.

## Impact

Affected cards are shared `hc_light_card` instances, including generated, native, dashboard and popup consumers. Runtime work belongs in `MaraoCards.js` and a lazily loaded picker module; existing popup, slider, theme, translation and service-error paths remain shared. Relevant light documentation and focused frontend checks must reflect the behavior. Safe disposable fixtures may be extended only if existing fixtures cannot demonstrate supported capabilities.

Saved released configurations, generated structures, custom tap/hold actions, hidden icons and seasonal state-based backgrounds are preserved. There is no persisted schema/API change and no migration. Ordinary dimmable and on/off lights retain their current behavior. The approved interaction assumes that completing a color/temperature adjustment may turn an off light on; mere opening must not.
