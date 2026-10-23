# Design

## Context
See proposal.md. Existing versioned asset routes reject stale/partial packages, chart owners bound period caches, and navbar already observes view mutations, resize and navigation.

## Goals / Non-Goals
Reduce redundant bytes, requests and computation. Preserve current values, timezone/DST boundaries, extrema/gaps, prefetch-after-paint, early recovery navigation and native shell restoration. No saved-format, action, visual or camera-playback changes.

## Decisions
- Use aiohttp response compression for JS/CSS/SVG/JSON after integrity verification; offload large compression and vary by Accept-Encoding. Do not add another asset cache or weaken fingerprint checks.
- Start independent imports together. Register core cards before awaiting optional camera-event registration; retain observable errors and startup recovery.
- Keep a popup-owned daily power-response cache bounded to 64 entries and 131072 normalized points shared by period loads, keyed by timezone, source IDs and calendar day. Share in-flight requests; expire accumulating data after one minute, remove rejected entries, and clear on source invalidation/destruction. Keep exact probes separate so full-day reduction cannot hide readings. Batch energy fallback IDs with per-entity result mapping.
- Cache immutable numeric calendar boundaries with bounded maps; return fresh Dates to callers. Share monthly bucket boundaries; cache per-card consumption against series/range/state metadata, and invalidate with period cache resets.
- Replace the fullscreen interval with a coalesced update from resize, navigation, root/view mutation and hass changes. Guard unchanged style writes to avoid observer cycles. Preserve restoration and teardown.

## Risks / Trade-offs
Stale live chunks → minute expiry plus existing live observations and source invalidation. Rejected shared request → eviction and retry. Cached Dates mutated by callers → fresh wrappers. Event-driven navbar missing shell changes → existing root/view observers plus hass/resize hooks and targeted navigation check. Compressed variants → content negotiation, Vary and decoded-body/integrity tests.

## Migration Plan
No data migration. Build, run targeted units, install backend/frontend once with test configuration preserved, verify served compressed assets and normal navigation. Rollback uses previous package; dashboard data remains untouched.


## Verification
Targeted asset tests passed (compression/identity and stale/partial-package rejection), as did history/calendar/energy/navbar units and registration assertions. Existing local navbar browser checks passed in Chromium and WebKit, including recovery with blocked runtime, edit-mode header restoration, view replacement and shell cleanup. Camera transport/playback checks and the full suite were not run.

Installed fingerprint `0795d3ba6d0a75af` on disposable HA. Dashboard and configuration bytes and 195 helper values were preserved. A cold/warm browser sample confirmed 186296 encoded bytes for 583108 decoded bytes of Marao scripts, zero script transfer on warm reload, successful Rooms navigation and no page exceptions. This is desktop Chromium evidence, not real-phone timing. Local empty-month bucket microbenchmark improved from roughly 4.8 ms to 0.04 ms per call after cache reuse; it does not predict total popup latency.
