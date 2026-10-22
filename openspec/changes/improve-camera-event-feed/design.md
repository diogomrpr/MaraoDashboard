# Design

## Context

See proposal.md for motivation. Both event-card names share a vanilla JavaScript custom element. Today Frigate and Protect loaders eagerly sign/resolve every thumbnail before rendering a tile grid. The generated popup combines a separate live camera card and the event card; its scrollable sheet exposes a measured header-height CSS property. Protect's native browser supplies lightweight metadata and completed clips from its recent 24-hour folder, without a general paginated structured-event API.

## Goals / Non-Goals

**Goals:** Keep media requests off the opening path, keep list DOM and scroll stable during preview completion, and share behavior across both providers and legacy/current card names.

**Non-Goals:** No live-video changes, provider credentials, backend APIs, configuration additions, unlimited archive browsing, or third-party dependencies.

## Decisions

1. **Bounded metadata, incremental media.** Keep the existing provider metadata call and event limit (default 12, maximum 100). Filter the entire returned list, then reveal three rows initially and three more near the end. An intersection observer on the actual popup scroller loads nearby preview URLs and advances the feed. This avoids incompatible pagination across providers and filters that miss unrevealed events. Metadata can be fetched upfront; expensive media is deferred. A visible Load more control is a fallback and explicit alternative to scrolling.
2. **Provider metadata stays authoritative.** Frigate uses its label and localized epoch timestamp. Protect's native title format is split conservatively into its supplied timestamp text and known event description; unrecognized titles remain intact rather than guessing dates. Filters use the normalized event type, while original provider information remains available in the heading. No private Protect API or ambiguous locale-date conversion is introduced.
3. **Stable surfaces.** Retain the card/feed DOM across thumbnail completion and appends. Reserve 16:9 previews, show localized loading/failure states and bound concurrent preview resolution. Keep the list mounted while detail is shown and restore the owning scroller on Back. Filter changes reset only the feed, keeping the selected control mounted.
4. **Sticky filters reuse popup geometry.** Offset the event toolbar by the shared measured popup header height; use horizontal overflow and 48px semantic buttons with pressed state. Outside a popup its sticky offset is zero. English and Portuguese strings use the existing runtime catalog.
5. **Existing lifecycle and security.** Resolve/sign through HA only, deduplicate attempts per feed and invalidate callbacks on refresh, provider/entity changes, unavailability and disconnect. An explicit Refresh retries failures. No persisted configuration or generator/editor changes are needed.

## Risks / Trade-offs

- [Provider metadata limits] → Filtering covers only the configured recent maximum; document that limit and Protect's native time window. No promise of an unlimited archive.
- [Protect titles are presentation metadata] → Recognize only its known native suffix/duration format, retain unknown titles verbatim, and test both formats without interpreting locale-dependent dates.
- [Nested popup scrolling and late work] → Find the owning scroller across shadow roots, disconnect observers on lifecycle changes, retain DOM, and cover bounded/stale media work and Back restoration with targeted tests.

## Migration Plan

No migration: saved configuration, default/maximum limits, aliases, generator output and provider access remain compatible. Install final frontend assets on disposable 192.168.0.28 after targeted checks. Rollback replaces frontend assets only; no saved data changes.
