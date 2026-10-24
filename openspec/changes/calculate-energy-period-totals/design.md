# Design

## Context

See `proposal.md` for motivation. `MaraoEnergyPeriodCard` in
`custom_components/marao_dashboard/frontend/MaraoRuntime.js` already obtains
Recorder sum metadata and interval `change` statistics for popups, falling back to
counter history. `_consumption()` uses shared `statisticsBuckets`, `energyBuckets`
and `energyTotal` from `frontend_src/history-data.js`. The summary path skips that
history and formats raw state, including raw energy multiplied by price.

Existing tests explicitly assume summaries do not request consumption history;
that assumption must change. The baseline's formatting scenario also equates a
source reading with period usage, so the delta updates it explicitly. A design is
needed because summary loading adds refresh/lifecycle work and must preserve
resetting sensors, missing-data semantics and existing consumers.

## Goals / Non-Goals

**Goals:** Use one consumption path for cumulative-energy tiles and popups; retain
the existing HA-local calendar arithmetic and formatting; bound summary reads.

**Non-Goals:** New source modes, persisted baselines, helper creation, dashboard
discovery changes, chart redesign, deriving energy from power, or reconstructing
historical tariffs. Existing dedicated period-cost sensors remain authoritative.

## Decisions

### Derive summary values using the existing consumption owner

Remove the summary-only exclusion from selected-period consumption loading for
energy sources. Use the same `_consumption()` result for the tile, whole-period
popup total and estimated cost. Prefer Recorder statistics when sum metadata is
available; preserve current reset-aware counter-history fallback. Reuse metadata,
unit conversion and caching instead of duplicating arithmetic or adding a new
service. Summary loads include only the primary source and needed price, not
popup contributor history or neighboring periods. Chart modules remain lazy.

Raw-state display is rejected for cumulative energy because it cannot identify
usage since a calendar boundary. Requiring separate Utility Meters is rejected
because existing Recorder statistics already supply the required interval changes.
HA's [Statistic card](https://www.home-assistant.io/dashboards/statistic/) supports
this same one-source, calendar-period `change` model.

### Preserve recorded coverage and refresh within the existing lifecycle

Retain HA's `time_zone` boundaries, source units, signed `total` deltas and
`total_increasing` reset handling. A missing statistics baseline or fallback
history remains missing; never fall back to lifetime state or assume midnight
zero. Keep approximation markers for partial coverage and existing localized
empty/error/retry/availability states. Recorded statistics may lag the live meter;
do not invent a live tail or silently count an interval twice to hide that lag.

Reuse the existing one-minute current-period freshness policy for a bounded
refresh while a visible, connected card remains mounted, including boundary
rollover. Do not fetch for every `hass` update. Keep one in-flight read per period
per card, invalidation on source/timezone/availability changes, explicit retry on
failure and cleanup on removal. No timers or reads in editor previews. Popup
navigation remains independent of the tile's current period. A cross-dashboard
cache or general subscription framework is unnecessary for this scope.

### Preserve configuration and update guidance at its existing owners

- `custom_components/marao_dashboard/editor.py`,
  `frontend_src/MaraoDashboardPanel.js`, `MaraoNativeCardEditor.js` and
  `editor-model.js`: retain `entity` and `period` plus current option validation;
  adjust existing help where needed to explain cumulative-source statistics.
- `custom_components/marao_dashboard/generator.py` (`_energy_period_card`,
  `_energy_popups` and editable page generation), `native.py` and `page_model.py`:
  preserve source/period forwarding, independent popup settings and supported
  released/raw configurations. No added required option or format migration.
- `MaraoCards.js` and `frontend_src/history-data.js`: reuse the existing exports
  and conversion/arithmetic; change them only if a concrete shared defect is found.
- Reuse theme, typography, loading geometry and localization. Add any necessary
  explanatory text through existing English/Portuguese translations; no new CSS
  presentation system is needed.
- Update `docs/docs/usage/cards/editable-page-cards.md` with the same-source
  day/month example, source metadata requirements and historical coverage limit.
  Reuse the existing safe cumulative energy demo in `ha-test/` for one paired
  day/month example in the existing gallery/product dashboard.

## Risks / Trade-offs

- Extra summary reads -> load only needed data, refresh at bounded cadence, reuse
  in-flight work and stop background activity outside an eligible mounted card.
- A previously plausible raw tile becomes empty with insufficient history ->
  document this intentional correction; never claim the lifetime value is period
  usage. Resetting sources remain supported through valid recorded consumption.
- Tile/popup snapshots can differ during refresh -> apply identical arithmetic,
  freshness and coverage rules, and require agreement for equivalent data.
- Existing cost summaries multiply raw energy -> regress the derived-cost path
  while retaining explicit cost precedence and tariff ambiguity handling.

## Migration Plan

No saved source, Recorder data, generated schema or archived history is rewritten.
Compare affected supported released configurations and existing expected fixtures
during implementation; retain entity choices, unknown fields, explicit empty
lists, names, order and protected YAML. Install the final applicable changes once
on disposable `192.168.0.28` after minimal serial checks, using frontend sync when
compatible or full sync only if backend/fixture changes require it. Existing
installation recovery remains the owner of any writes; rollback restores matching
package and saved data if installation changed both.

Use the existing energy/history Node tests for numerical examples, resetting
sources, no/partial history, calculated costs, refresh and stale responses. Review
configuration forwarding with a narrow existing check if changed. Routine visual
inspection is left to the user after installation; no browser matrix or camera
playback testing is part of this change. Publication is separate and uses the
unit-only `verify:publish` gate if later requested.
