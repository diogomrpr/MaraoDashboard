# Tasks

## 1. Asset delivery and startup
- [x] 1.1 Compress text assets and verify decoded bytes, negotiation, immutable caching and stale/partial-package rejection with asset tests.
- [x] 1.2 Parallelize independent imports and decouple core card registration from optional events; verify startup registration/recovery tests.

## 2. History computation and requests
- [x] 2.1 Reuse bounded daily power chunks across periods and batch energy fallback requests; verify overlap, expiry, cancellation, errors and peaks with existing history tests.
- [x] 2.2 Cache calendar boundaries and derived consumption safely; verify DST, mutation isolation and state/config invalidation with history tests.

## 3. Navbar and installation
- [x] 3.1 Remove periodic layout polling, coalesce event-driven updates and skip unchanged styles; verify navbar lifecycle tests.
- [x] 3.2 Rebuild assets, review selected affected scope, install on disposable HA preserving configuration, and confirm compression and navigation with a focused check.

## Native frontend first-visit follow-up

The [first-visit audit](first-visit.md) records the paired cold and warm measurements, shared resource review, rendering changes and compatibility checks for the 0.37.6 frontend.

The [HACS startup follow-up](first-visit-hacs.md) compares the installed first-pass package and subsequent request-graph changes with the same JavaScript compression on each arm.

The [cache fixes and warm startup measurements](cache-behavior.md) cover energy rollover, the release check, cross-release font and image reuse, and shared pending graph reads.

The [WebSocket startup trace](websocket-startup.md) measures the saved dashboard transfer, the lossless provenance reduction and the cold slow-4G icon downloads.

The [first-card dependency review and recovery measurements](essential-startup.md) cover archive access, editing, settings, optional renderers and the remaining Home Assistant startup traffic.

## Native first-card dependencies and archived recovery

- [x] Keep converted dashboards intact and verify on-demand archive storage, recovery and export.
- [x] Separate editing, settings, hidden popup contents and specialty code from the ordinary card path. Preserve direct specialty loading and input priority.
- [x] Install the package, measure three cold and warm pairs on each shaped link, and compare the full first-card requests and HA configuration frame.
- [x] Check all 16 captured direct links, native editing, popup actions and a single-dispatch disposable helper.
