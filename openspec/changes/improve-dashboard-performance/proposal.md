# Proposal

## Why
The read-only audit found uncompressed frontend responses, serialized module imports, overlapping history downloads, repeated timezone calculations and idle navbar layout work. Improve cold loading and responsiveness without changing dashboard behavior.

## What Changes
- Compress frontend text assets without weakening version or integrity checks.
- Parallelize independent startup dependencies and separate optional event registration from basic cards.
- Reuse bounded daily power-history chunks across periods and batch energy fallback requests.
- Cache calendar boundaries and derived energy results with explicit invalidation.
- Replace periodic navbar layout polling with existing events/observers and unchanged-value guards.

## Capabilities
The original compression and caching pass retained existing behavior. Existing integration-lifecycle, camera-history-content and navigation-popups contracts remain authoritative; this is a performance refactor.

## Impact
Shared assets (including editor), dashboard bootstrap, cards, energy/power popups and navbar. The original pass introduced no dependencies, persisted fields, generated structures or migrations. v0.16.2 configurations remain unchanged. Camera playback, design changes and broad test campaigns are out of scope.

Baseline: dcd524269dae575850215e8bed9fcd755962d3c3, clean tree; snapshot /private/tmp/marao-performance-start.json.
Acceptance: negotiate compression with exact decoded bytes and cache safety; recovery navbar and cards register independently of optional event code; overlapping periods reuse reads and errors remain retryable; DST boundaries, peaks and live refresh remain correct; navigation/resize/editor transitions preserve clearance without a one-second poll; final candidate installed on disposable HA.

## On-demand recovery and native startup follow-up

This follow-up extends the native-dashboard-editing capability with a versioned reference to independently stored recovery history. New conversions use it immediately. Existing dashboards may opt in after saving a portable backup. The change retains HA ownership of all active views and supports exports that include the original conversion data. Editor forms, settings and detailed feature code load at their point of use. The acceptance evidence is in [the first-card dependency review](essential-startup.md).
