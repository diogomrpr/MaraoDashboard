# Design

## Context

See `proposal.md` for scope and the user's decision: selecting a unit converts the value. Current `entityStateLabel` in `MaraoCards.js` delegates to HA formatting, while switch power detail concatenates state and a unit label. `MaraoEnergyPeriodCard` in `MaraoDashboard.js` stringifies live state and history bounds. Its `_values` and the shared background graph currently discard record attributes; both Recorder queries request `no_attributes` and `minimal_response`. Conversion cannot safely assume every historical value used today's unit.

The existing editor has graph variable forms, a switch `power_unit` field, guided energy entity selectors and a load editor. Period generation drops object variables. `_registry_entities` in `__init__.py` collects selected live attributes for validation but currently omits `unit_of_measurement`; the private management payload already carries this entity metadata. Runtime startup already imports `MaraoCards.js` into `MaraoDashboard.js`, so one shared exported numeric helper needs no extra module or dependency. Focused tests exist for editor model/panel, generator, shared cards and period history; fixture history is isolated under `ha-test/custom_components/history/`.

## Goals / Non-Goals

**Goals:** consistent per-reading display choices on existing energy surfaces, correct compatible conversion, localized fixed decimal places and unchanged numeric/source/control semantics. Reach current guided JSON and future generic page cards without tying options to a page role.

**Non-Goals:** global sensor formatting, unitless climate changes, charging-control units or preset values, currency exchange, tariffs, statistics recalculation, cumulative-counter/reset interpretation or new history aggregation.

## Decisions

### 1. Add two opt-in card-owned options

Use `display_unit` and `display_precision` under entity/card `variables` for `hc_graph_card`, `hc_toggle_graph_card`, numeric energy `hc_sensor_card`/`hc_base_card` and the secondary `power_entity` reading of `hc_switch_card`. On a switch they never format the primary on/off state. Existing direct `custom:marao-energy-period-card` configurations use the same keys at component configuration level; generation maps the source entity object's variables to those keys for both summary and sheet.

Unit is absent/source-automatic or an explicit compatible identifier. Precision is absent/automatic or integer 0–6, rejecting booleans/strings/fractions. Resetting Auto removes its override, not every unrelated variable; both absent use the exact old rendering path. If either option is active, automatic units use the actual source unit. Automatic precision trims trailing zeros with at most six fractional digits; explicit precision uses exactly that many digits. Use HA's selected numeric locale when available, then its language/browser fallback; do not hard-code punctuation. Explicit zero remains an override rather than disappearing through truthiness checks.

Keep legacy `power_unit` as its documented label-only option for old configurations. When new formatting is enabled, actual HA source metadata and the new target take precedence; do not reinterpret a legacy label as a source or convert it silently. Explain precedence in the switch documentation. No new source-unit override is added, because it would conceal invalid metadata.

### 2. Small dimension-aware conversion and presentation helpers

Reuse the shared runtime file for one numeric conversion/formatting contract imported by the period renderer. Separate unrounded converted value/unit from text formatting so charts do not parse localized labels or round samples. Check nonempty finite numeric state explicitly; `Number("")`, booleans, unknown/unavailable and infinity must not become valid measurements. Preserve signed export values and real zero; suppress negative-zero text only after rounding.

Use a finite table with power factors relative to W (`mW`, `W`, `kW`, `MW`, `GW`) and energy factors relative to Wh (`Wh`, `kWh`, `MWh`, `GWh`, `J`, `Ws`, `kJ`, `MJ`, `GJ`; 3600 J = 1 Wh). Keep unit identifiers case-sensitive, particularly `mW` versus `MW`. The same table/dimension validation contract must agree in catalog, Python validation and runtime tests; no dependency-heavy unit library. Precision-only formatting can keep a cost or other source unit unchanged; no cross-currency conversion or power-to-energy conversion.

Add only `unit_of_measurement` to the existing live-state metadata collection and carry it through normal resolution for validation; do not store a guessed source unit in saved JSON or expose additional private state. Editor/generation reject invalid keys and verifiably incompatible source metadata. If explicit conversion metadata is missing, preserve the draft and explain that a source unit is required rather than allowing misleading generation. At runtime, a previously valid source can change: keep its original readable value/unit with a localized formatting error, never a falsely converted label. Precision-only readings need no inferred dimension. Status/availability and service target guards stay unchanged; do not call the helper indiscriminately for climate, percentage, textual or control values.

Alternatives rejected: replacing only labels contradicts the user's answer; converting HA entity state changes unrelated clients; deriving from a displayed string corrupts locale/precision; globally modifying `entityStateLabel` without an explicit option changes every card.

### 3. Keep raw history with unit metadata and derive views

Energy/power numeric-history consumers must retain each record's actual unit. Request unit-bearing Recorder records in the existing entity/time-window request, omitting the attribute-suppression/minimal flags where they would lose unit changes; do not add a second polling/request service. For energy-format-capable sources, retain this metadata from the initial request even when overrides are absent so subsequent unit/precision choices can reuse raw data. Unrelated history families keep their existing query. If a required historical unit is absent, do not guess it from today's unit; report the affected formatted history as incompatible while leaving the live reading usable. Update the isolated fixture provider to return meaningful unit attributes for new numeric cases.

Derive full-precision converted samples from raw records on render and calculate bounds in the chosen unit. The period card's summary and its existing scale labels use the same helper and options; accessible descriptions of numeric content use the same equivalent value/unit. Apply options to live and separately configured graph sources using each source's own unit. Existing background traces have no numeric axes; keep their shape rather than inventing new labels/tooltips. Explicit nonnumeric and incompatible samples must not make a misleading continuous numeric line; keep readable failure/no-data presentation and existing cleanup.

Formatting-only updates must not invoke a full `setConfig` reset that clears the selected period/history key or requests data again. Distinguish identity changes (entity/period) from presentation changes and rerender cached raw samples. Keep request deduplication, stale completion protection, disconnected neutral states and current-period navigation limits. Do not retain converted samples in a cache that will be converted again after a unit change.

### 4. Connect existing and future configuration paths

Extend catalog/schema/forms and matching validation using the existing field controls. Show compatible unit choices from the selected reading, an Auto choice and a 0–6 precision selector with short localized help and a sample equivalent value where existing form patterns support it. Keep switches bound to their secondary sensor. Use the shared options editor for existing Energy entity-object slots and loads; avoid a second special formatting schema. Retained selector options, unknown fields, duplication and Visual/JSON round trips must preserve both keys.

Pass these variables through `_energy_graph_card`, load cards and `_energy_period_card`/`_energy_popups`; room/custom cards use the same shared variables contract. Update direct component examples and docs. If `unify-editable-page-templates` lands first, attach the controls to its generic card editor and preserve them in its conversion; if it lands later, include the new options in its preservation fixtures. Neither change requires the other to ship this additive feature. Reuse EN/PT catalogs, Montserrat and shared theme; no layout/token changes beyond making long value/unit text wrap correctly.

## Risks / Trade-offs

- Old label-only settings could be mistaken for conversions → separate opt-in keys and documented precedence; no automatic reinterpretation.
- Rounding could flatten charts or change action inputs → calculate with raw/full-precision numbers, format text last, assert unchanged state/history/service data.
- Historical metadata increases response size → one existing bounded time-window request, retained raw cache, unchanged point sampling and no formatting-triggered retries; inspect request behavior.
- Missing/mixed unit metadata could mislabel history → unit-bearing fixtures, strict dimension checks and readable failure instead of assuming today's units.
- Shared formatting could leak into other cards → explicit eligible paths and regression checks for unchanged default, climate, controls and nonnumeric displays.

## Migration Plan

This change is additive: absent options preserve legacy displays and persisted source bytes, so it requires no configuration format step. Do not reset/stamp historical JSON or reinterpret `power_unit`. Preserve unknown/raw/custom fields, generated public names and immutable archives through existing save/preflight/recovery. Previews and dry runs remain read-only.

Add provenance-backed historical fixtures/assertions for unchanged released energy/load/switch configurations, plus independently specified expected JSON with retained new options through save/generation and any accepted page conversion. Update the existing upgrade feature-to-assertion inventory; no live upgrade scenario runs during normal implementation. A future versioned release must include the final-candidate preserved-install gate and verified cleanup, alongside publication checks. Downgrade uses the matching prior package and exact saved source/output/owned-state baseline together.

Update safe Cases and realistic Energy/Wallbox/room examples for source/converted units, explicit zero/two/six precision, localized positive/negative/zero readings, cost precision, unavailable and incompatible metadata, summaries and period sheets. Keep meaningful distinct cases rather than every unit/precision permutation. Run focused formatter/model/generator/history checks, dry-run/sync only to `192.168.0.28`, then inspect every affected card and popup after the last edit/check across the required mobile/text/theme profiles. Record physical-device limits honestly; no implementation, deployment or release is performed while authoring this plan.
