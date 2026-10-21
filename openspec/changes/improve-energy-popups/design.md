# Design

## Shared path and presentation

Extend the existing energy period card and sheet rather than introducing another
card type. Keep live summary values and HA-timezone previous/next navigation.
Month sheets show daily bars; day sheets show hourly bars, including 23/25-hour
daylight-saving days. Use minimal axes and a readable selected interval/value.
Names and numeric breakdown values remain visible outside the circular graphic;
color is supplementary. The circular comparison and its legend share a responsive
row using the existing control-grid styles (two columns, 136px minimum cells and
7.5 times primary text size). They stack when that rule cannot fit two columns.
Missing/zero/negative data without a donut retains a full-width list. Preserve
shared popup focus, scrolling and lifecycle.

Keep popup spacing compact with an 8px sheet inset and avoid repeating its title
inside the energy detail. Bar axes use whole numbers, with the measurement unit
above the plot once. Preserve precise selected readings, use compact arrow
navigation, and retain concise estimate and missing-history notices.

Monthly sheets open with a whole-month overview. Selecting a bar or navigating
days focuses both the selected reading and contributor breakdown on that daily
interval, using cached history and the same HA-local boundaries. The existing
total row shows the selected date followed by its value using the same typography;
selection never adds a second readout row above the chart. A Full month
button on the left of the day navigation clears the selection and restores
monthly totals. Ordinary state refreshes retain the selection; changing months
returns to the overview. This is transient UI state, with no saved-format change.

Configure `sub_entities` as an ordered list of objects with required `entity_id`
for energy and optional `name` and `cost_entity`. The builder, native editor,
validation/schema and generator carry the same optional settings. Preserve
unknown member fields on ordinary editing, and preserve explicit `[]`. No
configuration-format or migration version changes are required.

Shared sheets default to content-driven height with a 50px top gap, increased
when the safe top inset requires it. Replace generated per-family fixed heights
and the old 80dvh cap with auto/100% of the safe overlay content area. Explicit
raw/native fixed and maximum heights remain honored. Existing source JSON and
protected YAML stay intact; ordinary regeneration updates owned popup output.
A ResizeObserver publishes the actual popup header height as an inherited CSS
variable; energy period navigation sticks below it through text wrapping and
rotation. The shared title header has extra top padding and a padded bottom edge.
The period row uses opaque bottom padding rather than a transparent margin,
keeping scrolling chart text clear of the pinned controls. Its top spacing also
belongs to the pinned row, so there is no initial scroll travel before pinning.
Shared sheets retain the requested native overscroll bounce and browser-native
touch scrolling. Close disconnects the observer. Scrolling remains inside the sheet.

## Consumption data

Prefer Recorder statistics `change` values when the sensor supplies sum
statistics. Request hour/day aggregation for the selected range. Convert each
record using its own unit metadata before calculation or drawing.

Fallback Recorder counter history uses a baseline reading and consecutive
differences. `total_increasing` and legacy period counters restart from the new
reading after a decrease; `total` retains signed differences. Missing baselines,
unavailable readings and gaps across multiple buckets do not become zeros or
uniformly distributed usage. Partial recorded tails retain approximation markers;
energy sheets omit the incomplete-history and partial-recorded-period text labels.
Unrecorded future intervals remain empty. Preserve full precision until labels.

Every contributor uses the same selected period and aggregation rules. Requests
are batched/deduplicated where supported, retain the existing stale-response
guards, and remain read-only. A failed cost request cannot erase usable energy.

The shared day/month loader prefetches the nearest four navigable periods on
each side, nearest first, after the selected period finishes and the browser has
had a paint opportunity. No neighbouring requests run during initial loading. Background reads
are serial; a foreground request can join an in-flight read or load immediately
without waiting for unrelated prefetches. Cache raw chart/contributor data for
only the selected period and its neighbours. Reuse metadata and tariff requests
within the cache session. Cached selection renders without a loading frame;
background failures stay retryable when selected and never replace current data.
Source/availability/timezone changes and removal invalidate the cache and stop
further background scheduling. Formatting changes retain it. The current period
refreshes on return when its cached reading is older than one minute. This is
transient state only; summaries do not prefetch historical data.

## Price and cost semantics

An explicit `cost_entity` is authoritative. Otherwise energy can be multiplied by
the selected price per kWh, with an Estimated label. `cost_per_kwh` is a finite
nonnegative card override in Home Assistant's configured currency. Without an
override, use `energy/get_prefs` to match the energy source's grid-import entry,
or the sole unambiguous grid import. Multiple unmatched tariffs require an
explicit override; do not choose an arbitrary price. A missing/unavailable price
has a visible cost limitation while energy remains available.

`calculate_cost: true` displays an energy period source as calculated cost.
Explicit fixed rates and current dynamic rates applied to past usage are
estimates; this change does not reconstruct historical price changes. Existing
monetary sensors continue to display their own recorded cost.

## Compatibility, safety and verification

Retain the current energy page cards and saved options. New fields are opt-in;
no source/history files are rewritten for adoption. Existing exact-source backup,
staging and recovery behavior remains the installation owner's responsibility.
No device commands or production instance connections are added.

Use small existing Node/Python checks for interval arithmetic, raw gaps/reset
handling, configuration forwarding/preservation and tariff choice. Review the
actual concurrent diff against the starting snapshot. Build generated assets and
install the final batch once on disposable `192.168.0.28`; served-asset/readiness
checks establish installation. Routine visual/device inspection belongs to the
user. No full suite, browser matrix or release gate is part of this task.
