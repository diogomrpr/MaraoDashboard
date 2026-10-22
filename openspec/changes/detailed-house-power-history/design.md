# Design

## Context

House Power uses hc_graph_card with history_popup. Both canonical/native popup generation and the legacy energy popup currently insert another graph summary. Marao already has Chart.js line rendering, extrema-preserving reduction, authenticated Recorder requests, calendar boundary handling and energy-unit conversion. Existing daily/monthly energy consumption popups remain independent.

## Goals / Non-Goals

**Goals:** Direct detailed power history, calendar navigation, shared device comparison and coherent authoring without new dependencies.

**Non-Goals:** No cost calculation, inferred power from kWh, new discovery defaults, unlimited history retention, device actuation or unrelated graph redesign.

## Decisions

- Add a project-owned power-history popup card and a lazy controller in the existing history-chart bundle. Route known power graph popups and explicit device comparisons to it; preserve generic non-power graph behavior. House Power's visible History action follows its configured popup rather than creating an intermediate sheet.
- Keep controls and chart DOM mounted. Use a sticky theme-styled button/menu with native radio-menuitem buttons plus period label/arrows offset by the shared popup header measurement. Day defaults to today, week is ISO Monday–Sunday, and month is calendar-based in HA's configured zone. Changing granularity resets to its current period; navigation has no future offsets. Options use theme colors, 48px touch targets, a selected checkmark and retained DOM. Opening focuses the selected option; arrow/Home/End keys move focus, selection restores the trigger, and Escape/outside input closes the menu without dismissing the parent sheet.
- Request full-resolution Recorder states with significant_changes_only=0 and recorded attributes. Fetch calendar-day chunks sequentially, checking cancellation between chunks. Retain bounded extrema-preserving views for drawing/caching; never use hourly averages as if they were instantaneous readings. After the selected period renders, yield past its paint and prefetch up to four periods in each direction, nearest first, skipping future periods. Warm the current day/week/month first, then the selected unit's neighboring periods. Retain those three first pages plus the selected period and its eight neighbors (at most eleven distinct entries), reuse in-flight requests when navigation selects one, and invalidate stale chunk work on navigation/source changes/removal. Refresh the accumulating current period on return after one minute. Background failures remain retryable when selected; they do not alter the visible chart or restart in a loop. Day/week/month use the same controller and bounded daily loader.
- Normalize power from each sample's recorded unit to watts, then derive display units. Keep unknown/unavailable gaps and no future live readings in historical periods. Device readouts query a one-millisecond Recorder window (including its native baseline) at the selected house timestamp; this preserves exact reported states even when plotted histories are reduced. Only one probe is active, with later selections replacing pending ones, and stale probes cannot update another period. Future samples are never substituted. Reuse the shared chart for multiple straight/step traces and a compact named/color legend with selected values and readable per-source problems. Axis units appear once above the plot.
- Add variables.power_devices rows containing entity_id/name, through the existing repeatable editor pattern, catalog, schema and shared validation paths. Preserve optional fields and explicit emptiness. Reject duplicate/main-source bindings and known non-power units; missing metadata remains preservable and runtime failures readable.

## Risks / Trade-offs

- [Recorder retention limits] → Show only actual available history with empty states and gaps. Week/month detail cannot recover data HA has purged. No fabricated long-term spikes.
- [Large histories] → Sequential daily requests, bounded reduced drawing/cache views, one background period worker, and stale-request guards prevent background request cascades after navigation/removal.
- [Existing saved configurations] → All new fields are optional. Existing source formats and unknown fields remain unchanged; generated popup contents change through normal backed-up atomic generation. Old raw cards and protected YAML remain accepted and untouched.
- [Device readings are asynchronous] → Report recorded states at the selected timestamp rather than assigning a later reading to it. Do not claim configured devices exhaust the house total.

## Migration Plan

No persisted-source migration or version bump. Add a safe example using existing disposable power sensors only if needed for the feature demonstration. Run targeted period/data/renderer/editor/generator checks, then install all final current changes on 192.168.0.28 in one preparation/restart, preserving source configuration and helper states. Existing generation backups and package-plus-generated-output rollback remain authoritative; archived history is never rewritten.
