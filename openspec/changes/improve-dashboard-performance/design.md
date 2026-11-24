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

## Native cache follow-up

The starting point is `d92de6c6`. The affected consumers are daily and monthly energy cards, cards showing 24-hour graphs, HACS startup and update detection, and owned font and image references in the package. The acceptance cases cover period rollover during an in-flight read, concurrent graph mounts, same-size package replacement, older loaders and installs, and reuse of the same media bytes across releases.

- Cache each energy period's request start as well as its completion. An open interval needs a final read when revisited after its end. A read crossing that boundary cannot overwrite the final result.
- Coalesce overlapping Recorder reads for equivalent graph requests on the same authenticated connection. Keep rendered histories and live observations local to each card.
- Put a small JSON release record on the first line of the stable HACS JavaScript entry. A loader fetches that entry fresh as text and reads the record. Every supported native package has this entry, including packages installed by a rollback. Entries predating the record resolve through their full release manifest. The public inventory and old cached loaders keep their existing contract.
- Address each owned font and image by its SHA-256 and flat path. The stable aliases referenced by saved picture cards continue to ship. Executable modules still belong to one release graph.

## Saved migration provenance on the startup path

Home Assistant retrieves the complete ordinary dashboard over its authenticated WebSocket. The package can reduce that message while retaining native editing by removing exact repetition inside Marao's inert migration record. The starting commit for this change was `5b387479`. It affects new conversions, the offline converter's handling of previously converted dashboards and the interpretation of historical recovery exports.

The active dashboard, settings version, compiler contract and recovery export version remain compatible. Version 2 applies only to the record at `marao.migration`. A strategy record can reference the verbatim source already in its saved original document. A direct-source record can reference the parsed source when it reproduces the original document exactly. Generated accounting rows can be reconstructed from the retained source only when every row in the complete generated prefix matches. Store every remaining row verbatim. Preserve unknown fields, original text, explicit emptiness, key and array order, authored YAML and all live views. Use v1 if compaction provides no benefit. Leave unrecognized versions alone.

Ordinary page visits never migrate storage. New conversions produce the smaller representation where applicable. An administrator can explicitly compact an older ordinary dashboard through the same offline converter and keep the original recovery export. A packed dashboard can still match an older conversion receipt if the entire proposed document agrees after lossless compaction. The disposable application path checks exact expansion, backs up the storage file, rereads the active document before writing, and verifies both memory and disk after saving. Native saves have Home Assistant's usual last-writer semantics.

## Native saved dashboards and first-card transfers

Keep every active view and opaque user field in Home Assistant's normal storage dashboard. Older conversions carry their recovery material inside that same document. Administrators can move it into native shared frontend storage after downloading a backup. A new conversion stages the archive before publishing the reference. The reference identifies the exact saved record by SHA-256 and byte length. Recovery and export validate both. Ordinary viewing, editing a card and opening dashboard settings do not read the archive. Portable recovery includes the original record. Submitted dashboard edits are checked against a new read of the current saved state.

Derive the small registration data required by Home Assistant's synchronous card picker and card validation from the authoritative catalog at build time. Load the native editor and dashboard settings through their open actions. Keep the protection on direct managed popup views active while their inspection code loads. Observe confirmed saves immediately so that deferring the maintenance code cannot lose the first save. A rendered card reports its surface to the initial viewport observer. A direct request for an energy, floor-plan, schedules or camera-events card can start its own renderer before background registration. Hidden popup children are considered on opening. Honor an explicitly configured camera preload after initial presentation.

The stable HACS entry uses its embedded identity when Resource Timing confirms a full network response for that very module. An HTTP cache hit, service worker response or unavailable timing still checks the installed release. The current identity determines all module preload URLs. Each document has one owner for registration across the old bridge and the HACS entry.

The installed Home Assistant Lovelace WebSocket command accepts a dashboard path and a force flag, and returns the whole saved configuration. It has no view selector. Native edit mode and storage saves operate on that document. This change preserves that contract.
