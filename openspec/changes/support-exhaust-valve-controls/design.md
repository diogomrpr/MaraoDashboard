# Design

## Context

See `proposal.md` for motivation and the four capability deltas for observable contracts. Discovery traced catalog → compatible entity selection/schema → generator template resolution/overview membership → shared renderer/value dispatch → safe fixtures and slider browser assertions. The existing renderer already has native service errors, actual-target availability guards, semantic child buttons, heavy haptics and stable native/vector ranges; reuse them.

Current limits are concrete: fan catalog domains contain only `fan`; `_sliderCurrent`, `_range` and `_setRange` select attributes/capability bits/services by template. `_sliderCurrent` also converts missing/null values to zero. The generated overview cover popup overrides templates with `hc_cover_card`. Access classification is currently based on HA device class plus conservative door/garage/gate name heuristics and must remain authoritative for safety.

## Goals / Non-Goals

**Goals:** Extend one existing card end to end; make cover commands depend on cover capabilities and fan commands depend on fan capabilities; make exhaust selection survive generation; preserve old fans/covers and shared slider behavior. Keep controls on the existing room/custom-page surfaces.

**Non-Goals:** No new `hc_exhaust_*` template, HA wrapper entity, registry mutation, third-party card, dependency, generic device adapter framework, extra configuration mode, native `valve` domain, fan advanced features, inversion setting or combined-device automation. Automatic layout still groups by native entity domain; do not change all room grouping to implement this feature.

## Decisions

### 1. Reuse `hc_fan_card`, retaining entity identity

Broaden the catalog label to **Fan / exhaust valve**, domains to fan/cover and metadata/default mapping to recognize cover device class `damper`. Domain alone determines control semantics: fan means speed; cover means opening. Existing template selection supplies the explicit ventilation choice for a misclassified shutter, so no new JSON field is needed. Use a ventilation icon default for cover-backed cards, preserve configured icons and native fan defaults. Update the existing options form so `enable_slider` reads Opening slider for covers and Speed slider for fans.

Select default ventilation only when no explicit template exists and the cover is not recognized as access. Keep ordinary shutter defaults and explicit `hc_cover_card` on dampers intact. Align `cardForEntity` with generator `_domain_template`; automatic recognition is a card suggestion/default for already selected entities, not a registry-membership sync. If `independent-room-entities` lands first, reuse this mapping in both Add tabs rather than creating another entity picker.

**Alternatives:** A new card duplicates the fan family; a template fan wrapper duplicates entities and requires user HA configuration; changing HA device class does not itself repair Marao's template-bound services. HA's [damper cover model](https://www.home-assistant.io/integrations/cover/) directly matches the reported device. [Native valves](https://developers.home-assistant.io/docs/core/entity/valve/) have separate semantics and are not needed for this request.

### 2. Bind controls to native domain and supported actions

Keep fan-backed cards' existing on/off behavior and optional percentage range. For cover-backed fan cards, do not create the default full-card toggle overlay: render supported explicit Open/Close child buttons through existing semantic button/action patterns. Stop propagation so a child action cannot also activate the card. Preserve supported explicit configuration and navigation where compatible with these guards. Use heavy haptics and the existing native error notification.

| Target | Reported value | Percentage capability | Percentage action | Discrete actions |
| --- | --- | --- | --- | --- |
| `cover.*` | `current_position` | `CoverEntityFeature.SET_POSITION` | `cover.set_cover_position`, numeric `position` | `cover.open_cover` / `cover.close_cover`, gated separately by OPEN/CLOSE |
| `fan.*` | `percentage` | `FanEntityFeature.SET_SPEED` | `fan.set_percentage`, numeric `percentage` | Existing native fan on/off, respecting TURN_ON/TURN_OFF |

Use HA's normalized 0–100 positions: 0 closed, 100 fully open. Do not invert shutter hardware values or mistake cover movement speed for opening percentage. Cover speed/tilt and fan presets/direction/oscillation are unrelated to this request. Follow the primary [cover](https://developers.home-assistant.io/docs/core/entity/cover/) and [fan](https://developers.home-assistant.io/docs/core/entity/fan/) contracts rather than assuming their capability bits coincide.

Update every `_sliderCurrent` caller, including in-place gesture refresh, so a cover-backed fan uses cover position throughout its drag. Preserve vector geometry and mounted input lifetime. Resolve capability and availability at dispatch, not only render time. Accept genuine reported zero; omit numeric readings/ranges for missing, null, nonnumeric or out-of-range attributes instead of coercing them to zero. Keep supported discrete controls usable. Existing ordinary cover consumers use the same truthful position handling. Light behavior stays intact and receives a focused regression because it shares range lifecycle/geometry.

### 3. Keep ventilation state accurate and access controls protected

Cover-backed fan colors, motion labels, percentage labels and semantics follow cover state, with the ventilation presentation/icon. HA's state remains authoritative; the existing independent target thumb acknowledges a drag without claiming the physical damper reached that position. Reuse disabled-neutral availability and actual-target guards; preserve readable service errors.

Do not let `template: hc_fan_card` override recognized access classification. Reject this combination during catalog validation/generation before writes, and block it with a readable configuration reason in directly configured runtime cards. A shared state/action helper is justified only if it is needed to keep generator/runtime classification consistent; do not build a general capability abstraction. Cover valve selection cannot expose an ordinary position slider or tap/toggle opening on recognized doors, garages or gates. Access fixtures retain strict-slide cancellation/completion checks.

When `unify-card-title-and-state-presentation` is implemented, inherit its full-width titles, non-color state cues and concise binary state policy. Opening percentage, motion, unavailable/error reasons and Open/Close action labels are meaningful and remain. No duplicate state policy or global optimistic state machine is introduced here.

### 4. Use the same resolved membership for Blinds summary and popup

Exclude non-access cover entities whose effective selected template is `hc_fan_card` from both overview Blinds paths. Resolve explicit template first, then the native default, so a damper deliberately kept as `hc_cover_card` preserves its existing behavior. Do not alter underlying `entities_by_domain`, entity IDs, Security derivation or fixed-column order. No new overview ventilation category is added: fans and exhaust valves remain accessible through their room/custom-page cards. This avoids increasing unrelated layout and navigation scope.

### 5. Extend existing evidence, not the test framework

Add safe template/helper exhaust fixtures in `ha-test/` for position-capable, binary-only and open-only covers. Extend canonical Cases with cover-backed fan closed/open/opening/closing/unknown/unavailable/missing states; slider enabled/disabled, 0/intermediate/100, absent/null/invalid position and unsupported capability variants. Keep equivalent permutations compact. Retain single-/variable-speed fan cases and representative fans/valves in a realistic generated room, including a manually selected shutter and automatic damper.

Extend existing model/catalog/schema round-trip and generator tests for default/explicit selection, compatible-domain errors, summary/popup agreement, access rejection and unchanged legacy configurations. Extend frontend action/value tests for correct domain/data, capability changes, exact dispatch, child propagation, authoritative updates and cancellation. `tests/test-ha-value-sliders.js` currently derives service/attribute from template; derive expectations from the fixture entity's native domain for this new combination, checking domain and service together. Reuse gallery coverage assertions and existing browser runners.

Focused automation precedes deployment and final affected-card visual/interactive inspection on **192.168.0.28**, using safe fixtures only. Cover 320px, iPhone/Android portrait/landscape, both themes and normal/bold/200% text/200% zoom/bold-plus-200% text using the existing profiles, checking ≥48px controls, wrapping, clipping, child alignment, slider geometry and gestures. Use `test:ha:alignment` if any icon-only action/shared layout is changed. Do not claim physical iPhone testing or run publication/upgrade gates during proposal or routine iteration.

## Risks / Trade-offs

- **Misclassified shutters need an explicit choice** → Default ordinary shutters remain covers; selecting Fan / exhaust valve supplies the override without modifying HA.
- **A cover's reported position may be absent or delayed** → Keep native discrete controls, omit invented numeric state and preserve the confirmed-versus-target distinction.
- **Safety bypass through raw configuration or changed metadata** → Guard generator and runtime, recheck target/capabilities at dispatch, and test recognized access fixtures without operating physical devices.
- **Broader slider helpers can regress fan/light/cover gestures** → Preserve geometry/lifetime and inspect all affected families after focused checks; expand the inventory if implementation touches a wider foundation.
- **Valves disappear from the previous Blinds shortcut** → Document their room/custom-page location and check that they remain reachable; no replacement shortcut is promised.
- **Related proposals may change editor serialization or state layout first** → Read current change state at apply time and retain their contracts without implementing unrelated proposals as a dependency.

## Migration Plan

This is additive use of existing `hc_fan_card`, entity IDs and `enable_slider`; no persisted-format conversion or schema-version bump is planned. Preserve explicit historical fan/cover templates and unknown configuration fields. Default untemplated HA dampers intentionally gain ventilation presentation on regeneration; this is the only planned reclassification. Record that default change and add saved-config compatibility fixtures. If implementation requires a new persisted representation, revisit the proposal and use the shared upgrade design rather than creating a private migration.

Deploy only to the disposable instance after focused checks. Preserve its previous fixture/configuration through the existing backup/preparation workflow. Roll back code and restore prior disposable configuration/generated output if validation fails. A later downgrade cannot understand cover-backed `hc_fan_card`; the documented fallback is changing those selected cards to `hc_cover_card` or restoring the pre-change configuration. Real-device calibration and operation are outside agent testing. Future publication still needs the existing gate and, once implemented, the separate release-only upgrade scenario.
