# Design

## Context

See [proposal.md](proposal.md) for motivation, scope and acceptance. The existing vanilla JavaScript `MaraoFrigateEventsCard.js` owns provider loading, type filtering, progressive rows, bounded preview resolution, authenticated detail media and Back/Refresh. `MaraoCameraEventsCard` is its public alias. Native `frontend_src/card-composition.js` and historical `generator.py::_camera_popup` already compose that event card beneath a separate camera stream.

The current owner has one `_config.entity`, provider identity, availability state and request generation. Multi-camera work must replace that assumption at the owner rather than stacking several event cards under a new toolbar. Keep the existing shell, shared dropdown behavior and native HA media paths.

The completed [native frontend change](../move-marao-to-native-frontend/specs/camera-history-content/spec.md) supersedes old Netatmo typed-metadata requirements. Its removal of backend detection metadata remains intentional. The completed [HA editing change](../use-home-assistant-dashboard-editor/specs/native-dashboard-editing/spec.md) defines current native authoring; historical builder text in baseline specs does not reopen it.

## Goals / Non-Goals

**Goals:** one shared browsing owner, explicit source identities, independently usable sources, stable mounted controls, and honest filtering over available metadata. Keep configuration separate from transient runtime filters.

**Non-Goals:** a global camera configuration service, shared cross-card filter state, a new runtime framework, backend/provider bridges, or archive crawling. Page authors decide where the card goes using HA's editor.

## Decisions

### 1. Extend the existing public component and normalize sources internally

Keep the shipped module and both registered public names. Introduce a canonical source array inside the current component; adapt the existing `entity` contract to one source in memory, without rewriting its saved shape. The new list contract uses object entries so every source can carry its own existing overrides:

```yaml
type: custom:marao-camera-events-card
title: Camera events
limit: 12
columns: 2
cameras:
  - entity: camera.front_entrance
    name: Front entrance
    event_provider: frigate
    frigate_instance_id: main
    frigate_camera: entrance
  - entity: camera.driveway
    name: Driveway
    event_provider: unifi_protect
    unifi_protect_media_source: media-source://unifiprotect/example:browse:driveway
```

The example is illustrative configuration, not a fixture or a real camera identity. Each entry accepts `entity`, optional local `name`, and the current `event_provider`/`provider`, `frigate_instance_id`, `frigate_camera` and `unifi_protect_media_source` options. Reuse the existing provider precedence and identifier validation. `title`, `limit` and the new `columns` are card-level options; `limit` is the recent metadata bound **per source**, default 12, rounded/clamped to 1–100. Thus the total loaded bound is source count multiplied by limit; filtering never truncates a camera because another camera is busier. `columns` accepts a positive safe integer and defaults to one in memory; invalid explicit values produce localized configuration feedback. It controls the event grid inside the card, independently of HA's outer `grid_options.columns`.

Validate source objects and `camera.*` references before requests. Reject duplicate configured entity references, malformed entries and simultaneous nonempty `entity` plus `cameras` input; do not silently select a mode. Keep distinct explicitly configured stream entities distinct even if they share a physical device. An absent source or `cameras: []` produces inert setup guidance. Never discover membership. Preserve unknown root/member fields through editor changes, including missing selected cameras.

This avoids a separate dashboard wrapper with another loader/filter implementation. A global registry would add persistence and ownership without being required by component reuse.

### 2. Give each source its provider and lifecycle identity

Refactor the current provider operations to take a normalized source context rather than read mutable card-wide provider state. Each source owns provider detection, overrides, availability, metadata result/error and generation. Bound metadata loading to two active source jobs; preserve the current two-job lazy preview bound across the component. Retain compatible successful results while other sources finish. Refresh invalidates pending work and explicitly retries the configured sources once; provider failures never retry on unrelated HA updates.

Normalize each row with its source key, provider/instance identity, native event ID, authoritative timestamp when available, original provider order, type metadata and native media references. Use that compound identity for DOM keys, pending previews and detail, rather than the current array index alone. Sorting, filtering and late completion cannot switch an event to another camera or Frigate instance. Keep the original event data for provider-specific playback.

Single-source feeds retain native order. Multi-source timestamped rows sort newest first using the existing effective provider time (Frigate's current end/start fallback, native Netatmo's validated epoch key). Equal times use configured source order then native row order. Rows without a validated numeric timestamp appear in a separate localized **Time unavailable** group after dated rows under All loaded events, in source/provider order. They are not assigned zero or parsed from localized titles.

Scope availability to each source. Clear an affected source's old media and pending work on unknown/unavailable/removal without hiding healthy siblings. If the currently open detail loses its source, replace only that detail with neutral feedback; Back still returns to healthy results. Whole-HA disconnection invalidates all current work, neutralizes controls/media and uses HA's native connection warning. Preview/edit mode must block `_maybeLoad` as well as clicks; the current event card's request path needs this explicit guard.

### 3. One header and filter model in both hosts

Replace the type-button strip with labeled Camera, Event type and Date/time dropdowns using `MaraoDropdown.js`'s existing themed semantic controls, focus restoration, Escape handling, haptics and floating menu placement. Retain `ha-card`, header, input and scroller nodes through HA updates. The title occupies its own full-width row; controls wrap below it, at least 48 by 48 CSS pixels, using the existing Montserrat/theme tokens and English/Portuguese catalogs.

Camera offers All cameras plus configured names in source order; default is All when multiple sources exist. With one source, show its name in the visible disabled camera dropdown. The single-camera popup passes only its owning source, never the aggregate page's camera list. Both contexts use the same event owner and filter model, with no host-specific copy of the toolbar or feed logic.

Event type defaults to All types, offers the authoritative types in the current camera scope, and retains a selected type as an unavailable choice if the new scope or a refresh lacks it. All types includes basic Netatmo recordings. A typed selection excludes untyped recordings with clear empty-result feedback; no title-to-detection inference or old Python endpoint is introduced.

Filters intersect over all loaded metadata before existing progressive batches. Reset the revealed batch and feed scroll for an explicit filter change; preserve the mounted trigger/focus. Keep an unavailable selected choice until the user changes it. Refresh preserves filter selections and recomputes relative date bounds. Back restores camera/type/time selections, revealed count and scroll. Filter changes remain occurrence-local and never emit saved config or entity actions.

Keep the header outside the existing bounded internal viewer; its controls remain reachable while the feed scrolls. Reuse the popup's measured header/scroll containment and focus behavior. In dashboard/Panel hosts, size the same viewer to the native allocated card area; do not introduce a second page scrollbar inside the feed's surrounding layout. Preserve fixed-aspect previews and reserve the status area through loading/empty/error states.

Replace the feed's fixed single-column CSS with an event grid using the configured `columns` as the preferred maximum. Reuse Marao's shared width/text-size capacity policy (120px floor and six times primary font size per cell), with the event grid's actual gap, so readable two-column layouts remain possible on narrow phones and enlarged text can reduce the count. Never shrink text or touch targets to force the count. Render the filtered sequence in row-major reading order; each preview fills its own cell with its heading above it. The filter/coverage header, undated-group heading, Load more and selected event detail span the full viewer width. Reflow changes presentation only: retain loaded records, source identity, filters, lazy previews and the saved column preference.

### 4. Implement date/time filtering without promising missing provider data

The Date/time menu offers All loaded events, Last hour, Last 24 hours, Today, Yesterday and Custom range. The default keeps all existing recent records visible. Relative windows are anchored at selection/explicit Refresh, with no polling timer. Today/Yesterday use calendar-midnight boundaries in `hass.config.time_zone`, including daylight-saving days; they do not mean a fixed 24-hour duration. Format event labels and the selected range in the same zone.

Custom range expands a labeled start/end date-and-time editor within the existing component content, with Apply and Cancel. Keep draft and applied values separate. Reuse `periodRange` in `frontend_src/history-data.js` (built as `MaraoHistoryData.js`) for HA-local day boundaries; add only the civil date/time conversion needed for custom bounds, since that existing helper handles days rather than arbitrary clock times. Do not treat a browser-local `datetime-local` value as an HA-zone instant. Reject missing, reversed, nonexistent or ambiguous clock-change bounds with localized correction guidance and retain the applied range. Filtering uses `[start, end)` on the row's authoritative effective timestamp.

Current Protect normalization exposes a `dateLabel` parsed conservatively from HA's display title and no epoch. The locally installed HA `unifiprotect/media_source.py::_build_event` confirms that its browse row exposes title/media identifiers without a structured event timestamp. Keep it undated unless an existing native response supplies a structured, validated timestamp that can be retained directly. A time filter excludes undated rows and shows how many records/sources cannot be evaluated. Native Netatmo's validated timestamp keys remain usable for dates; its missing event types remain unsupported.

Each source reports loaded count, configured cap, known provider window and timestamp capability. A compact localized coverage message states that filters apply to loaded recent events, identifies capped or unsupported sources, and distinguishes an empty intersection from complete archive coverage. Protect retains its recent completed-clip window. Selecting Yesterday or a custom range does not add unverified range-query parameters, fabricate chronology, backfill the archive or access the provider directly. Unlimited/date-range retrieval can be proposed separately if native provider contracts later support it.

### 5. Expose the same public event card through native editing

Add picker metadata and native custom-card hooks to the existing event class: a stub with `cameras: []`, visual editor, card-size and native grid sizing. Add only the canonical name to the picker; retain the legacy alias for saved cards. Extend the existing native editor dispatch to recognize these public event types and edit their contract directly. Do not route the card through a generic catalog wrapper that would attempt to register `marao-camera-events-card` a second time, or invent a separate runtime type just for the picker.

Reuse the source-list controls already present in `frontend_src/native-card-editor.js` for ordered selection, local naming, removal and per-entry options. Expose a localized **Event columns** numeric setting with minimum one on the event card. Validate with the same source normalization used at runtime. Keep a legacy `entity` shape for edits that do not change membership; an explicit move to multiple cameras converts its existing provider fields into the first source while preserving unrelated root fields. Patching a source must retain opaque member fields by identity, not rebuild all members from current registry metadata. Preserve an omitted column option during unrelated edits; do not save responsive reductions. HA owns draft cancellation, save, layout and visibility.

The native one-camera popup in `card-composition.js` already targets the canonical event type. Keep its existing one-source shape and forwarding of provider settings/`event_limit`, and keep live `popup_stream_entity` independent. Add **Event columns** to the individual camera card's native configuration as optional `variables.event_columns`; forward it to the popup event card's `columns`. Apply the same validation and forwarding in historical `generator.py`/source validation where those inputs remain supported. Inputs without the option retain their exact existing generated shape; no retired-builder UI or new Python API is needed. Raw event cards use `columns` directly. Popup and dashboard cards may have different preferences, rendered by the same component.

### 6. Focus documentation and evidence on this behavior

Update `docs/docs/usage/cards/md_camera_card.md`, native editing guidance, an events-card usage page and `openspec/feature-coverage.md`: demonstrate multi-source YAML and both column settings, explain per-source limits/HA time zone and provider limitations, and show that popup and dashboard use one component. Document that Event columns sizes the internal list and may reflow while HA's card layout is independent. Regenerate changed editor assets through `npm run build:editor`.

Extend `tests/frontend/marao-frigate-events-card.test.js` for independent source results, compound IDs, merged ordering, combined filters/date bounds, explicit refresh, Back and stale metadata/preview/detail completion. Extend native editor tests for source-specific overrides, unknown fields, ordering, emptiness, column validation/round trips and legacy-shape preservation; use the existing composition assertions for popup column forwarding and omission. Use a small independent expected dataset including a timestamped source, an undated Protect row and a basic untyped recording. Preserve the existing native Netatmo no-backend assertion. Review row-major order, full-width header/detail and width/text reflow without adding browser automation for this layout option. Inspect representative shared dropdown/native-card consumers when changing their shared code; select only assertions needed for changed behavior.

Reuse fictional media/helpers in `ha-test/` to add one realistic aggregate events view and one focused gallery example under the existing `/marao-dashboard` root; retain individual camera popups for the reuse example. Adapt the current safe camera fixture only if needed to distinguish source identities or reproduce partial failure. No real cameras, media, new dashboard root or gallery matrix. Automated checks cover metadata/configuration logic; camera playback/transport remains manual-only under the repository contract.

## Risks / Trade-offs

- **Recent metadata is not an archive** → label loaded bounds and provider coverage, especially for date filters; avoid silently promising complete historical results.
- **Protect currently lacks structured time in normalized rows** → retain native display text and an undated group; explicitly disclose exclusion from time-filtered results. Do not infer epochs from titles or undocumented IDs.
- **Mixed sources can collide or fail independently** → carry compound source identity through requests and DOM keys, and retain healthy siblings with per-source error/neutral status.
- **Large source lists multiply metadata bounds** → at most two source requests and two preview resolutions are active; progressive rendering still operates over the combined bounded list.
- **HA zone differs from browser zone or contains a clock change** → reuse HA-local helpers and independent timestamp assertions; require corrected ambiguous input rather than guessing an offset.
- **Editor reuse could register a conflicting element or discard saved options** → add hooks on the existing public class and patch the original config; assert legacy aliases, source overrides and opaque-field preservation.

## Migration Plan

No source-format, compiler-contract, config-entry or stored-data migration. Reviewed local `v0.24.1` event config and generated-popup tests use `entity`, existing provider overrides and `limit`; their expected transformation is none. Missing `columns`/`variables.event_columns` means one column without a saved rewrite, and old inputs generate no new column key. Keep provenance-backed historical fixtures immutable. New camera-list/column input is opt-in and requires the updated package. Existing native dashboards, explicit empty/deleted content, custom YAML, popup hashes and archives are not regenerated or rewritten.

Implementation starts with a fresh commit/dirty-state snapshot and acceptance review. Batch related edits and run the smallest targeted unit assertions after the final build. For changed disposable examples/fixtures use one `npm run ha:sync` on `192.168.0.28`, preserving exact affected configuration and safe helper state through the existing installer backup/preflight/recovery path. If only compatible frontend assets change, use `prepareFrontend()` directly. Confirm served assets/readiness once and leave them installed. Failed installation is not installed / not ready for test, with diagnostics and recovery retained.

Rollback of an installation or deliberate downgrade restores the prior package and matching saved dashboard/configuration together; a package-only rollback cannot render a newly authored multi-camera config. Preserve exact backups and unrelated concurrent edits rather than dropping new sources automatically. Runtime filter state requires no saved rollback. No redeployment is needed for this proposal-only change. Publication, if later requested, uses the unit-only `verify:publish` gate and final-candidate installation policy; it does not add a camera/browser/full-suite campaign.
