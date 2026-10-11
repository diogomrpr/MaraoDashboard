# Proposal

## Why

An exhaust damper reported as a shutter currently receives blind controls, while Marao's fan card accepts only fans and assumes fan speed attributes/services. Users need one ventilation presentation that can control their existing cover or fan entity without creating a replacement Home Assistant entity.

## What Changes

- Extend the existing `hc_fan_card` and catalog entry to **Fan / exhaust valve**, accepting native `fan` entities and non-access `cover` entities. Selecting this card explicitly supports a valve reported as a shutter; recognized HA `damper` covers receive this default when no template is configured.
- For cover-backed exhaust valves, show supported explicit Open/Close actions and an optional opening-percentage slider using native cover capabilities and commands. For fans, retain on/off and optional speed-percentage behavior. Localize the distinction between opening and speed.
- Respect `enable_slider`, render reported position/speed rather than inventing values, preserve confirmed-fill/target-thumb behavior, and disable actions for unknown/unavailable/missing/disconnected targets.
- Preserve the saved card choice through Visual/JSON editing, generation and regeneration. Exclude exhaust-valve covers from the Blinds summary/popup; retain access-cover safety and keep ventilation accessible through room/custom-page cards without adding a new overview category or navbar entry.
- Update documentation, safe Cases, realistic room examples and focused checks for both entity domains, capability combinations, state transitions, gesture cancellation and compatibility.

## Capabilities

### New Capabilities

None; extend the existing fan card and shared controls.

### Modified Capabilities

- `card-behaviors`: ventilation presentation for fan and cover entities, domain-correct actions and access-cover safeguards.
- `value-numeric-controls`: capability-aware opening/speed sliders with native service routing and truthful reported values.
- `visual-builder`: discoverable exhaust-valve selection, compatible entities, automatic damper defaults and lossless editing.
- `dashboard-generation`: consistent ventilation defaults/overrides and exclusion from Blinds summaries/popups.

## Impact

**Observed in source:** `editor.py` restricts `hc_fan_card` to `fan`; `editor-model.js` defaults all covers to `hc_cover_card`; generator `_domain_template` does likewise after access classification. `MaraoCards.js` selects current values, capability bits and slider services by template, so simply permitting covers in the selector would read the wrong attribute and call the wrong service. `_entity_popup` forces every cover to `hc_cover_card`. Existing slider browser checks also assume template identifies the service domain.

**Research:** Home Assistant explicitly models airflow dampers as `cover` with `device_class: damper`, uses 0 for closed and 100 for fully open, and exposes separate open/close/set-position capabilities. Fans expose on/off and optional speed percentages. Reusing the UI while preserving the original domain fits both contracts. See [cover documentation](https://www.home-assistant.io/integrations/cover/), [cover entity contract](https://developers.home-assistant.io/docs/core/entity/cover/) and [fan entity contract](https://developers.home-assistant.io/docs/core/entity/fan/). Native `valve` entities are a separate HA model, commonly water/gas; adding that domain is outside this cover/fan request.

Implementation reaches `editor.py`, `frontend_src/editor-model.js` and the existing options form/schema, `generator.py`, shared `MaraoCards.js` and localization, fan/cover usage docs, focused frontend/Python/browser checks, and `ha-test/` fixture/Cases/product-page definitions. No new dependency, API endpoint, template identifier or JSON key is intended. Existing explicit templates/options/order remain intact; record this additive compatibility decision alongside upgrade fixtures.

**Affected-card set for implementation:** fan cards (fan-backed and new cover-backed uses), ordinary cover cards consuming shared position logic, light cards consuming the same slider lifecycle/geometry, Blinds overview summaries/popups and room/custom-page consumers; access-cover cards/actions are safety regressions to inspect. Expand this inventory to every consumer if a broader shared helper is changed. This proposal itself changes no runtime cards.

Coordinate with `independent-room-entities` so both planned Add tabs use the same compatible-card selection; automatic recognition proposes a card, never re-adds a deleted entity. Compose with `unify-card-title-and-state-presentation`: meaningful percentage/motion and action labels remain, redundant binary state text follows that policy when implemented. Follow `ensure-safe-dashboard-upgrades` when its release gate becomes available; do not invent another schema version or run a release-only upgrade during iteration.

Assumption: the reported device is an ordinary ventilation damper exposed as `cover`, not an access point. Its private entity, firmware behavior and physical direction were not inspected. Use HA's normalized position semantics without an inversion/calibration option. Non-goals include changing entity device classes in HA, template-fan wrappers, native water/gas valve support, fan presets/oscillation/direction, combined fan-plus-damper synchronization, a new page/summary, deployment or publication during planning.
