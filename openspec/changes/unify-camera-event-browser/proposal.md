# Proposal

## Why

The existing camera events card accepts one camera, so viewing events from several cameras together requires separate feeds. Extend that component into one reusable event browser for a dashboard page and individual camera popups, with the same filtering, previews and detail navigation maintained in one place.

## What Changes

- Extend `custom:marao-camera-events-card`, starting from its current shared implementation in `MaraoFrigateEventsCard.js`; retain `custom:marao-frigate-events-card` as a compatibility alias. Do not create a separate dashboard-only feed.
- Accept an explicitly configured camera list, including each camera's existing provider overrides, and combine their available events into one feed. Identify the source camera above each preview; one failed or unavailable camera must not hide healthy sources.
- Add an **Event columns** card setting (`columns`, positive integer, default 1) for the events grid. Use the chosen count when space permits and reduce columns for narrow widths or enlarged text without changing the saved preference. Keep the filter header and event detail full width. Individual camera configuration exposes the same setting for its popup through `variables.event_columns`.
- Give the events header three localized dropdowns: **Camera** (All cameras or one configured camera), **Event type** (All types or an available authoritative type), and **Date/time** (All loaded events, Last hour, Last 24 hours, Today, Yesterday, or a custom start/end date and time). Keep the header reachable while scrolling and let controls wrap on phones.
- Combine filters before progressively displaying the bounded metadata. Use HA's configured time zone for dates, calendar boundaries and labels. State when a selected interval has limited coverage or when a source has no machine-readable timestamps.
- Reuse the same header/feed/detail in individual camera popups, restricted to that camera; its camera dropdown remains visible with the single camera selected. Preserve live video above the events component.
- Make the existing events card available as **Marao Camera Events** in HA's native picker, with visual camera-list/provider configuration and appropriate sizing for a dashboard section or Panel view.
- Preserve lazy previews, authenticated media resolution, explicit Refresh, and Back restoring all filters and feed position. Filtering does not start camera streams or actuate devices.

**Observed baseline:** the current card requires `entity`, supports Frigate, UniFi Protect and basic native Netatmo recordings, and has a sticky row of event-type buttons. Both public event-card names share the same implementation. `card-composition.js` and the historical Python generator already place this card below live video in a one-camera popup. The event card itself has no native visual editor/picker registration. Protect normalization retains supplied date text without an epoch; native Netatmo deliberately exposes no detection types.

**Planning assumptions:** “a single place” means one component and configuration contract, not a new global camera registry or synchronized filters across unrelated instances. A dashboard page is an existing HA view containing this card. Camera membership is explicit; the runtime camera filter selects All or one of those cameras. Date/time filtering covers the bounded metadata already available through the supported HA provider paths, rather than promising an unlimited recording archive.

**Non-goals:** a separate events dashboard root or editor, automatic insertion into saved views, persistent/global filter preferences, unlimited archive search, new providers, restored Netatmo typed metadata/Python bridges, direct NVR access, live-stream changes, notifications, exports or recording deletion.

## Capabilities

### New Capabilities

None; extend the existing camera/history and native editing boundaries.

### Modified Capabilities

- `camera-history-content`: shared single/multi-camera event browser, configurable event columns, three header dropdowns, bounded date/time semantics, source-aware ordering and detail routing, and partial availability.
- `native-dashboard-editing`: addable Camera Events card and lossless visual editing of its explicit camera sources, provider options and event-column preference, including the individual camera popup setting.

## Impact

Planning baseline: commit `cf4662333dd6223c761e698f4131a197d67e19a7`. Existing dirty native card/catalog/editor/composition files, untracked collection/group runtime files, duplicate `dist/` assets and other proposal directories predate this proposal and remain untouched.

Affected card set: `custom:marao-camera-events-card`, its legacy `custom:marao-frigate-events-card` alias, and the event portion of `md_camera_card` / `custom:marao-camera-card` popups. Shared consumers requiring preservation review are native picker/editor registration, `MaraoDropdown.js`, theme/localization, and native/legacy popup composition. Other card families retain their contracts.

Implementation reaches the existing event runtime, native editor source and registration, English/Portuguese labels, camera usage/native editing documentation, targeted frontend tests, and safe disposable examples. The completed `use-home-assistant-dashboard-editor` and `move-marao-to-native-frontend` changes define current native authoring and Netatmo behavior where older baseline specs differ. Do not revive the retired builder or custom camera metadata backend.

Compatibility is additive: local release `v0.24.1` and existing generated popup examples use `entity`, top-level provider overrides and `limit`. Those inputs and both public types keep working without rewriting saved cards or generated YAML. The new `cameras` list and column settings are optional; omitted columns retain the existing one-column feed without inserting saved defaults. Explicit `variables.event_columns` forwards to the popup event card's `columns`; existing generated output without that option stays unchanged. Single-camera limits retain their default of 12 and clamp of 1–100. Existing source formats, native ownership, popup hashes, stream selection, unknown fields and archived history remain unchanged; no migration or format/version bump is proposed. New multi-camera/column settings require the updated frontend package.

Acceptance is one mixed-camera dashboard feed plus the same browser scoped to one camera in its popup; configurable event columns in both contexts with readable reflow; three working combined dropdowns; honest date/type coverage; source-correct previews/detail; stable Back; isolated source failures; and lossless existing configuration. This change creates planning artifacts only.
