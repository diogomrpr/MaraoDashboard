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
No spec-level product behavior changes. Existing integration-lifecycle, camera-history-content and navigation-popups contracts remain authoritative; this is a performance refactor.

## Impact
Shared assets (including editor), dashboard bootstrap, cards, energy/power popups and navbar. No dependencies, persisted fields, generated structures or migrations. v0.16.2 configurations remain unchanged. Camera playback, design changes and broad test campaigns are out of scope.

Baseline: dcd524269dae575850215e8bed9fcd755962d3c3, clean tree; snapshot /private/tmp/marao-performance-start.json.
Acceptance: negotiate compression with exact decoded bytes and cache safety; recovery navbar and cards register independently of optional event code; overlapping periods reuse reads and errors remain retryable; DST boundaries, peaks and live refresh remain correct; navigation/resize/editor transitions preserve clearance without a one-second poll; final candidate installed on disposable HA.
