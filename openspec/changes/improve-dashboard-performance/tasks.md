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
