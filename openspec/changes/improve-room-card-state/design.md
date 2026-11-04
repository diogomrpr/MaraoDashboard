# Design

## Context

See `proposal.md` for the requested result. Planning baseline: `0d5267902da0b2ab595db77af149a7a4b2f64da6`; five unrelated OpenSpec change directories were already untracked and remain outside this change. No runtime code or installed instance changes are part of proposal creation.

`MaraoCards.js` owns room lighting membership, `stateAppearance`, the `.room-bottom` action row, clipped `.room-artwork`, shared climate icons, action dispatch and card-surface updates. Room decoration currently uses a box smaller than its glyph with a negative bottom offset, including a stronger narrow-card offset. Room state is deliberately derived from the explicit light list rather than the primary entity. The new climate association must not enter that lighting summary.

The room catalog in `editor.py` and `frontend/marao-catalog.json` exposes only `light_entities`. Native forms use that catalog through `frontend_src/native-card-editor.js`; `authoring-schema.js` derives public metadata/schema from it. `editor-model.js`, `page_model.py`, card composition and the retained generator own supported source round trips. Existing room runtime regressions live in `tests/frontend/marao-card-visibility.test.js`; native editor/model and Python page tests cover configuration preservation.

The baseline `Room-wide lighting presentation` requires a flat lighting background, and `Decorative room icon composition` requests deliberate cropping. The deltas refine those contracts for optional climate and recognizable raised artwork while keeping the existing room-only exception that normal lighting needs no visible count/status row.

## Goals / Non-Goals

**Goals:** add a small optional association, reuse shared state palettes and dispatch, keep lighting/climate/navigation independent, and update two background colors without remounting active controls.

**Non-Goals:** an area discovery system, a room-wide climate group, a new popup/control mode, thermostat target editing, a general renderer rewrite, additional runtime libraries or unrelated card restyling. One optional climate entity matches the singular association discussed with the user; multiple units are outside this proposal.

## Decisions

### 1. An optional explicit association preserves existing room configuration

Add a normal native entity-selector field labelled Climate entity to the room catalog, limited to `climate`. Persist it as `variables.climate_entity` alongside `light_entities`:

```yaml
type: custom:marao-room-card
name: Living room
icon: mdi:sofa
page: living-room
variables:
  light_entities:
    - light.living_room
    - light.living_room_accent
  climate_entity: climate.living_room
```

Omitted, null or empty values mean no climate binding. A nonempty value must be a syntactically valid `climate.*` entity ID; availability is a runtime concern, not a reason to delete an authored reference. Reuse catalog-derived forms and schema generation, update JS/Python validation and runtime `setConfig` coherently, and retain all other variables/fields. Preserve explicit empty light lists. Do not infer climate from a card's primary entity, a destination page, an HA area or discovered equipment.

`native-model.js` reads the shipped JSON catalog, so update that catalog consistently with Python `EDITOR_CATALOG` before rebuilding authoring/editor assets. Native and retained composition/generation already pass variables through; verify preservation at those boundaries and change them only where necessary. Do not rewrite historical dashboards or rerun source migration merely to introduce this optional field.

### 2. The child button is a direct off action

Keep the existing lights-off command and add one matching climate control immediately after it. If there are no selected lights, climate occupies the first action position. Keep the configured climate control mounted through off/loading/unavailable states; disable it when already off, disconnected, unusable or lacking an off operation. No configured climate means no climate control or empty slot.

Choose exactly one native off operation from the current entity's capabilities: prefer `climate.turn_off` when native TURN_OFF support is advertised; otherwise use `climate.set_hvac_mode` with `hvac_mode: off` only when off is explicitly present in `hvac_modes`. If neither operation is supported, show the disabled unsupported state. This avoids using toggle/on behavior and accommodates the existing fixture/API pattern without issuing two requests or retrying another service after an error.

Reuse the existing action/service outcome owner, connection/target guards, preview/edit protection, strong haptics and readable errors. Stop child propagation. Read the latest configured climate target, state and capabilities at activation; never dispatch using a closure retaining a preceding entity. Keep actions independent: unavailable lights disable lights-off, unavailable climate disables climate-off, and configured room navigation remains usable. A usable climate off request does not act on lights, the primary entity or an entire HA area/device.

The source of truth for the icon and background remains HA's reported mode/activity after a request. Immediate acknowledgement comes from existing press/haptic feedback and service feedback; acknowledgement is not an off report. No new optimistic room-state machine, timeout or request persistence is required.

The off-service capability distinction was checked against [HA 2026.10.4 climate services](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/climate/services.py) and [climate feature/action constants](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/climate/const.py). Implementation must continue using the installed supported entity contract rather than assuming an operation from the entity name.

### 3. Keep configured mode distinct from reported equipment activity

Derive the climate contribution in one small room-state calculation using shared `climateModeIcon`/`stateAppearance` palette mappings where they fit. Authoritative mode off overrides stale action attributes. Otherwise use a recognized reported `hvac_action` to indicate equipment activity; if none is reported, use mode presentation and say mode rather than claiming actual activity.

| Report | Icon/state treatment | Climate hue |
| --- | --- | --- |
| Heating / preheating | Appropriate heat activity icon and localized label | Existing heat orange |
| Cooling | Snowflake and Cooling | Existing cool blue |
| Drying | Humidity icon and Drying | Existing dry yellow |
| Fan | Fan icon and Fan | Existing fan teal |
| Defrosting | Appropriate defrost icon and Defrosting | Existing heat hue |
| Idle with an enabled mode | Thermostat/idle indication, with selected mode retained in semantic state | Selected-mode hue |
| No usable activity report | Selected-mode icon and mode label | Selected-mode hue |
| Mode off | Power/off indication, disabled off action | None |
| Missing / unknown / unavailable / loading | Distinct localized neutral feedback, disabled action | No healthy contribution |

An enabled idle thermostat is still something the user can turn off. Treating idle as off would hide that distinction and conflict with the requested off-only behavior. Preserve idle explicitly without pretending the equipment is actively heating/cooling. Mode fallback uses existing heat/cool, auto, dry, fan and heat/cool-range colors. Do not change ordinary standalone climate-card styling or add animated/spinning icons.

Use the existing English/Portuguese catalogs in `MaraoRuntime.js` for action, activity, idle and unsupported labels. The control's accessible name identifies the room/target, its off action and reported state; visible activity icons supply the normal non-color cue. Keep light status accessible without reintroducing a normal lighting row. Add the selected climate reference to the room's availability assessment while keeping it out of lighting membership/counts.

### 4. Compute two color endpoints with explicit inactive rules

Let L be the existing active room-light color when any explicitly selected light is on, otherwise no contribution. Let C be the derived climate color while its reported mode is enabled, otherwise no contribution. Resolve healthy endpoints as follows:

| L | C | Bottom-left | Top-right |
| --- | --- | --- | --- |
| None | None | Existing neutral room surface | Same neutral surface |
| Color | None | L | L |
| None | Color | C | C |
| Color | Color | L | C |

Use a diagonal equivalent to `to top right`. Off does not mean a transparent/neutral endpoint beside an active source: copy the remaining source color into both endpoints so it fills the entire card. Reuse `--room-card-active-background` and shared climate palette tokens. Keep old lighting-only foreground treatment when climate is absent/off. For mixed colors, select a readable foreground across the content region; use theme-derived surface tints of the same state hues where necessary rather than assuming one foreground works on both current palette endpoints. Child controls retain their contrasting themed circular surfaces/boundaries.

`cardProblem` currently considers room lights only. Include configured climate in availability feedback, preserving visible neutral problem precedence and the lighting summary's known state. Unknown/unavailable inputs must not collapse into the normal off/off combination. A problem neutralizes normal color blending while each child action still checks its own actual target. Restore derived colors on recovery; do not retain an old climate tint or infer fresh state from elapsed time.

### 5. Animate stable background endpoints, not gradient strings

Use short browser-native color interpolation, approximately 300 ms, for healthy endpoint changes. Prefer two registered color custom properties consumed by the room gradient; register unique Marao names once through a browser-native mechanism compatible with the supported shadow-root runtime. Preserve the current transform/press transition. A retained-layer opacity cross-fade is an implementation alternative only if the installed browser cannot interpolate these properties; no animation library is needed. The final state must remain correct if interpolation is unavailable.

The reason to animate endpoint colors is that replacing an entire gradient string does not by itself establish a smooth transition. [Native custom-property registration](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property) provides typed values that can participate in interpolation. Respect the existing reduced-motion rule and apply the final endpoint values immediately for reduced motion and neutral problem presentation.

`updateCardSurface` preserves the `ha-card` element but reconciles away attributes absent from fresh markup, including runtime-set styles; `_setMarkup` ordinarily replaces child content. Retain the room-owned endpoint values and action nodes during relevant state updates instead of clearing/reapplying their styles or recreating the controls on every report. Keep this adjustment narrow to the affected shared owner. A later relevant report retargets interpolation from the current appearance; unchanged endpoint values and unrelated HA updates do not restart it. Release any fallback transition resources with the card lifecycle, and never render old completion callbacks over newer configuration.

### 6. Raise recognizable artwork without competing with actions

Raise the shared room decoration by roughly 12–16 CSS pixels as an initial visual adjustment, and enlarge its visible window so both the glyph and its container are not independently overcropping it. Keep restrained right/bottom crop, low opacity, `aria-hidden` and `pointer-events: none`. Correct the normal and narrow-container rules together; do not add a special case only for the Suite/bed icon.

Maintain the full-width wrapping title and place the two 48px circular controls with an 8px gap in the existing lower action row. Artwork remains behind content and outside real hit targets. At supported two-column phone widths, the controls must fit without being shrunk. Longer titles, enlarged text and explicit viewport changes may reflow naturally; reported state changes do not resize the card or move neighbours. No new artwork-offset setting is required.

## Risks / Trade-offs

- A second 48px control competes with decoration in narrow cards → adjust the shared artwork window and action-row spacing, preserve title width and keep decoration noninteractive.
- An enabled thermostat can be idle or omit activity → retain mode tint and explicit idle/mode wording rather than fabricating heating/cooling or off.
- Off-service support differs by entity → select one advertised native off path, assert its exact target/payload, and disable unsupported actions.
- Two palette endpoints may need different foregrounds → preserve existing single-source treatment and use readable theme-derived mixed-state tints/foregrounds; keep button surfaces independent of the gradient.
- A render clears endpoint styles or replaces an active button → preserve the room surface/action nodes and endpoint continuity through the existing owner; assert current state and node retention where the harness observes it.
- The new field could be dropped during native/retained round trips → independently specified preservation checks at the existing validation/composition boundaries; no source discovery or migration rewrite.

## Migration Plan

No versioned transformation is required. Reviewed historical inputs include `ha-test/upgrade/fixtures/v0.5.1-dashboard.json` and `v0.23.4-ordinary-expected.json`: neither supplies the new room climate option, and their source/native structure and opaque fields must remain unchanged. Existing room fixtures and docs provide explicit light-only cards. Add independently specified expectations for absent, cleared and populated climate associations without modifying historical evidence.

Before implementation, record the current commit, dirty state and acceptance cases and capture a task snapshot. Preserve the five unrelated planning changes and review any concurrent hunks in shared runtime/catalog files. Update the existing room-specific runtime/editor assertions, selected JS/Python round-trip checks and catalog parity. Use the affected selector's reviewed `rooms` plan as a scope aid; its current unit mapping points to climate tests, so align it with the actual room test owner where needed. Routine presentation review remains manual; no implicit browser matrix, full suite or preserved-install campaign.

Update `docs/src/content/docs/cards/room.mdx`, relevant theme/interaction guidance and `dashboard-quality.md` where the room contract changes. Keep representative fictional examples in the existing docs playground and `ha-test/gallery-pages.js`/current realistic Rooms view. Reuse the safe climate fixture under `ha-test/custom_components/marao_test_climate/` and existing room lights. Add only a compact combined-state example and necessary action support; do not add live hardware, a separate dashboard or a gallery matrix.

Rebuild editor/authoring assets through `npm run build:editor` after catalog/source changes and verify the generated assets. Because the planned catalog and Python validation changes affect installed backend code, normally batch the final implementation into one `npm run ha:sync` on disposable `192.168.0.28`, preserving current user dashboard configuration and helper state and batching any necessary restart. If implementation proves entirely frontend-only, use compatible `prepareFrontend()` instead. Installer compatibility/served-asset/readiness checks confirm installation; leave the final changes installed for user inspection at `/marao-dashboard`.

User-requested dashboard saves continue using the existing preflight, exact recovery and native persistence protections. A failed save does not trigger discovery or overwrite unrelated configuration. For rollback, restore the matching package; there is no automatic data migration to reverse. If configuration must also be restored, pair it with its exact saved source and protect concurrent edits rather than restoring a package against mismatched data. Preserve recovery material through failure and report restoration failures honestly.

The manual handoff watches recognizable artwork, adjacent buttons, direct climate-off behavior, the four background combinations and live smooth transitions. No real-device or live playback proof is claimed by this proposal. Publication, if separately requested, uses unit-only `verify:publish` and applicable metadata gates.
