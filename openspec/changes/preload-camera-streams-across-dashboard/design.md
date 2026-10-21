# Design

## Context

See [proposal.md](proposal.md) for motivation. `CameraPlayback` in `MaraoCamera.js` currently gates startup on card connection, intersection, ancestor visibility and document visibility. `MaraoCards.js` owns and disposes that player with the card. An invisible camera page therefore cannot initiate playback, and removing its card during navigation stops it.

`MaraoNavigation.js` already finds the active `hui-root`, reads `lovelace.config` / `rawConfig` and manages dashboard-scoped navigation records. Its early navbar path must remain independent of content startup. The camera catalog lives in `editor.py`; builder/native models and labels expose existing dashboard/popup stream choices. `CameraPlayback` is already shared by generated and native camera cards, popup video and fullscreen.

The baseline camera spec still contains older snapshot wording. `enable-native-camera-live-view` and `adapt-camera-quality-to-bandwidth` describe the implemented native live player and explicit Dashboard/Popup streams. This change builds on that code and narrowly supersedes their off-page teardown rule only for opted-in dashboard streams. Reconcile those deltas in that order when eventually syncing specs; do not restore snapshot-only behavior or discard existing popup/fullscreen requirements.

## Goals / Non-Goals

**Goals:** background startup before a camera view mounts, useful warm playback when navigating there, default-off compatibility, bounded ownership and no navbar startup dependency on a camera.

**Non-Goals:** quality adaptation, preloading a distinct popup resolution or events, changing Protect/HA camera settings, backend server preloading, playback while the browser document is hidden, a new video library or guaranteed zero startup delay.

## Decisions

### Add one optional boolean

Use `variables.preload_stream`, labelled **Preload stream in background**, with matching EN/PT help about background bandwidth/resource use. Missing is false at read time; do not materialize new defaults into saved sources. Validate booleans consistently in backend, builder and native paths, preserve explicit false and unknown options, and pass the option through generation. Existing `entity_id` / native `entity` remains the preloaded Dashboard stream; `popup_stream_entity` is unchanged.

### Discover enabled cameras at dashboard scope

Extend the existing dashboard lifecycle with a lazily imported camera preload owner after the navbar is usable. Inspect the active dashboard's complete loaded view configuration, including supported nested card containers, without navigating to other pages. Exclude generated popup-only content, editor previews and other dashboard roots. Observe configuration/HA availability through existing lifecycle/state sources. No new management endpoint, camera credentials, polling loop or saved global camera list is needed.

One session entry per dashboard/entity deduplicates background initialization, with references from enabled card configurations and a presentation lease for the visible occurrence. Additional independently visible cards retain their existing ownership rather than sharing teardown accidentally. Disabled cards do not create background demand; an enabled duplicate is still allowed to own a shared background session for its entity.

### Separate session ownership from card visibility

Refactor the shared playback lifetime so an enabled session belongs to the active dashboard, not the disposable view card. A visible card binds the already-running session; leaving that view releases presentation ownership while background ownership remains. Ordinary cards and popup sessions keep existing visibility/disposal rules.

Use a persistent connected native-player surface owned by the dashboard. Bind its presentation to the active card's media slot without destroying or reconnecting `ha-camera-stream`; preserve media clipping, scroll placement, theme, pointer handling and popup layering. Keep the surface noninteractive and visually absent when it has no visible owner. This avoids assuming that a detached hidden element, resource preload, warmed URL or new player is equivalent to ready video. Reuse the existing fullscreen stage and retain popup inert/scroll behavior. Confirm this narrow native ownership path first during implementation; do not silently downgrade acceptance to a freshly started player on every navigation.

An offscreen card's ordinary intersection/hidden checks no longer own an opted-in session's lifetime. Browser document visibility, active dashboard identity, connectivity, camera availability and current configuration still do. Stop obsolete work with generation invalidation and release native signaling, timers/listeners and presentation bindings. Resume once per qualifying lifecycle transition, without retry storms or autoplay audio. A failed warm session uses the existing readable recovery path when displayed.

### Keep verification proportional

Extend existing camera/editor/generation unit checks for the optional boolean, default-off preservation and session ownership transitions. Use one disposable-instance interaction: open a non-camera page directly, let one safe opted-in stream play, navigate to it and away, confirm reuse and cleanup. Seeing live playback and verifying that navigation reuses its owner is sufficient; no speed benchmark, browser matrix or repeated camera campaign. Install the final applicable changes once on `192.168.0.28`, then hand routine phone checks to the user. Releases run affected unit tests only and reuse development integration results.

## Risks / Trade-offs

- **Bandwidth, battery and decoder cost:** every enabled camera can consume resources on other dashboard pages. Default off, explain the cost, deduplicate background ownership and suspend hidden documents. Do not silently ignore enabled cards through an arbitrary camera cap.
- **Native player lifecycle and surface placement:** ordinary DOM removal/recreation can undo preloading. Keep the player connected, separate session/presentation ownership, and exercise one real view transition early. Preserve clipping, layering and fullscreen at the shared root rather than patching a single generated card.
- **Autoplay or slow source startup:** a browser or camera can prevent readiness. Keep native muted playback and existing loading/recovery feedback; warm-up is best effort, not a promise that every page visit is instantaneous.
- **Compatibility:** saved cards stay on demand until explicitly enabled; no new default stream selection, popup preload or action is introduced.

## Migration Plan

No dashboard-format or HA config-entry migration. Preserve supported released camera configurations, custom actions, raw cards, unknown variables and unrelated settings. Use existing backup/atomic-write paths for later builder saves and generation; there is no eager rewrite at startup. If a later save or generation writes data during implementation/testing, retain its exact source/generated backups for recovery. Rollback restores matching saved data with package assets if those writes require it; disabling the new option restores normal on-demand behavior. This planning task makes no runtime or installation changes.
