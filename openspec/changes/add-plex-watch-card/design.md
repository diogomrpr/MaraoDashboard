# Design

## Context

See [proposal.md](proposal.md) for the user outcome. Planning started at `7b500719b6318261bd33a2bda13ce6a5e09c6341`, with unreleased tap-only remote, app wake/haptic and HBO artwork changes already present. Preserve that work. This proposal changes no runtime code and is separate from the pending release.

The current native media adapter calls `createMediaContent` in `frontend_src/card-composition.js` for both automatic popups and inline panels. `appleTVOptions` in `MaraoSource.js` derives its remote, volume target and apps. `native-card-editor.js` reuses `_openMediaOptions` from `card-form-tools.js`; `editor-model.js` owns validation/schema. The adapter can read the complete ordinary dashboard through `MaraoNativeContext.js`, including cards outside the mounted view. Current app shortcuts use `_launchMediaApp` and shared service/error/haptic helpers in `MaraoCards.js`, but do not wait for a Plex client or browse libraries.

Marao is now a native frontend package. The retained Python generator and integration are historical compatibility code, not a place to add new Plex endpoints. Relevant durable contracts are `card-behaviors`, `visual-builder`, `entity-state-actions` and `navigation-popups`; the native frontend and Home Assistant editor changes supersede their older builder implementation details. `inline-media-controls` also supersedes the historical automatic remote-hold default; this feature keeps the current tap behavior and authored custom actions.

Upstream sources inspected on 2026-11-04:

- [HA Plex integration](https://www.home-assistant.io/integrations/plex/): app launch, scan-clients button, playback, resume and Apple TV client support.
- [HA Apple TV integration](https://www.home-assistant.io/integrations/apple_tv/): app source selection and power control.
- [Plex media browser](https://github.com/home-assistant/core/blob/dev/homeassistant/components/plex/media_browser.py): server/library trees, recommendation hubs, stable Plex content identifiers and resume flags. It returns titles/artwork, not a complete watch-progress model.
- [Media-player browsing](https://github.com/home-assistant/core/blob/dev/homeassistant/components/media_player/__init__.py) and [Plex player](https://github.com/home-assistant/core/blob/dev/homeassistant/components/plex/media_player.py): entity-scoped browsing and playback. Browse dispatch does not require an active playback session, whereas playback must target a ready client.

These are feasibility references, not proof of the installed HA version or real Apple TV behavior. Implementation confirms the small API boundary against supported/installed HA before relying on it; it does not connect to a production Plex server or television.

## Goals / Non-Goals

**Goals:** Make the parent Apple TV card the single configuration owner, distinguish the Apple TV device from its Plex playback client, browse before waking the TV, and handle a single launch as a bounded, cancellable operation.

**Non-Goals:** A second TV registry, independent standalone Plex-target configuration, profile switching, an external Plex API service, a general media-provider framework, new migration machinery or a global optimistic action system.

## Decisions

### 1. The existing Apple TV card owns Plex

Add optional `apple_tv.plex`, accepting `false` or an object. Omitted/false means disabled. An enabled object contains:

| Field | Meaning |
| --- | --- |
| `client_entity` | Required existing HA Plex `media_player` for this physical Apple TV. |
| `scan_clients_entity` | Required HA Plex scan-clients `button`, belonging to the same server. |
| `app_source` | Exact Plex source accepted by the parent Apple TV. Offer the existing configured app/source first when unambiguous; preserve the chosen value verbatim. |
| `library_root` | Selected server folder, containing `media_content_type` and `media_content_id` returned by HA. Select automatically only when the choice is unambiguous and the user confirms enabling Plex. |
| `continue_watching` | Optional returned hub/folder reference with the same two fields, used when discovery cannot unambiguously identify the server's Continue Watching folder. |

The Apple TV device is always the parent's `entity_id`; do not add another power, remote or television field inside `plex`. The Plex profile is HA's connected Plex account context. Require the Apple TV Plex app to use that same single profile; do not claim to switch or infer profiles from HA users. Setup explains this prerequisite and that Plex must have been opened at least once for HA to register its client.

The existing Apple TV options form gains a localized Plex section with entity selectors and a read-only HA folder picker. The picker offers returned server/recommendation references, never a token or server-address field. Incomplete choices stay local until valid; errors retain the draft. Validate domain, shape, nonempty source and same-server content references; use available registry metadata to reject a known wrong integration/server without treating unloaded metadata as an absent entity. Preserve unknown nested fields and do not inject defaults on open. No remote guess or app-list replacement is needed.

Alternative considered: a top-level Plex card with its own TV dropdown and copied mappings. Rejected because the user explicitly wants association with existing Apple TV cards, and duplicate configuration would drift.

### 2. Parent selection is automatic; switching uses configured cards

Compose an owned Plex Watch child in `createMediaContent`, with Continue Watching and a Browse library entry. It is not an independently configured top-level card. Automatic Popup and On dashboard use the same child and context. Existing explicit custom popup layouts remain authored; do not inject content into them. For the initial implementation, show a readable setup incompatibility and block enabling this automatic child while `popup_view` or an explicit external popup override owns the details. Preserve those fields and allow users to cancel or explicitly choose an automatic supported presentation.

Opening the browser always selects the parent occurrence. In the full browser, derive other eligible Apple TV targets from the current dashboard configuration through the existing native context, including supported nested stacks/sections. Offer only media cards with enabled, valid Plex mappings for the same library root/account context. Use configured card names, with view context to distinguish duplicates; deduplicate only identical complete target mappings. With one target, show its name instead of an unnecessary dropdown. Without dashboard context, retain the parent as the sole target.

Occurrence paths are ephemeral selector keys, not persisted IDs or cross-card references. Changing another card, removing it or reconfiguring the dashboard revalidates the selection and cancels an outstanding launch; never fall back to a different TV. Reopening from another parent selects that parent, not a remembered TV from a previous card. Switching targets is read-only until a title is activated and does not modify either card.

Alternative considered: select arbitrary discovered media players by friendly name. Rejected because the Apple TV and Plex entities are distinct, and a name match does not establish a safe playback mapping.

### 3. Browse through HA with one account context

Use `media_player/browse_media` on the configured Plex client to obtain the selected server, libraries and descendants. Do not route Plex identifiers to the Apple TV entity's app/media browser, and do not resolve them into an AirPlay stream. A registered Plex client may be unavailable while its app is closed; this alone must not prevent read-only server browsing or a launch through an available parent TV. An unavailable HA connection/server remains a real browse error.

Load only the requested folder/recommendation hubs. Continue Watching includes supplied Continue/In Progress/On Deck entries and preserves HA's `resume` content flag. Discover known hubs by returned identifiers, not translated title matching. If HA's payload cannot identify a hub unambiguously, use the setup folder choice. Missing and genuinely empty hubs have different localized explanations; do not fabricate history or promise a recommendation the server does not expose. Recently Added is available when the server supplies that folder. Movie and episode posters play; show and season tiles navigate to descendants. No queue, restart-choice dialog or full-text server search is added.

Use returned content IDs/types as playback identity; duplicate titles must not lead to a title search selecting a different edition or episode. Retain returned folder order. Render posters lazily in bounded batches, making every item reachable without mounting an entire large library or prefetching all seasons. Do not invent percentage bars, runtime or episode metadata absent from the browse response.

Use small owner-scoped in-memory request reuse. Unrelated state updates do not reload the library; explicit Refresh and returning after a playback session can refresh the displayed hubs. Scope results by account, connection, selected server, config and folder; discard them on owner/account changes. No local storage of library records, long-lived browsing cache or background polling.

Alternative considered: direct browser requests with a Plex token. Rejected because HA already provides authenticated browsing and actions, and keeping credentials in card YAML or browser configuration would add a privacy boundary.

### 4. One tap owns a bounded wake/open/play sequence

The Plex component owns one request at a time, with a 30-second total readiness deadline. Completed poster activation emits one heavy haptic and immediate localized Starting Plex feedback. Further play activations are disabled until the attempt settles. Folder navigation and TV selection do not start a device action.

```text
Tap title
   |
   v
Validate selected parent and Plex mapping
   |
   v
Wake Apple TV if off --> Open exact Plex app source
   |
   v
Scan clients once if needed --> Wait for mapped Plex client readiness
   |
   v
Send one Plex play_media request, retaining content ID and resume semantics
```

Reuse/extract the smallest existing wake/source and service-outcome primitives without changing normal app-shortcut behavior or double-emitting haptics. Use actual HA state/capabilities for readiness, not a fixed sleep or service acknowledgement. Skip a redundant wake, app launch or scan when current reports establish that step is already satisfied. The scan button and all service targets have their own connection/availability guards. Never call playback against an unavailable/unknown client; the expected app-closed state allows only the earlier wake/open steps while waiting.

Subscribe to existing HA updates for bounded readiness. Before each later step, recheck request identity, selected complete mapping, parent configuration, HA user/connection, preview/edit status and lifecycle. TV selection changes, removal, reconfiguration, disconnection or deadline expiry stop further dispatch, remove listeners/timers and show the appropriate current state. Closing the browser cancels a launch that has not sent playback. Requests already sent to HA cannot be recalled; cancellation prevents subsequent dispatch and does not undo earlier wake/app requests. No automatic retry, fallback TV, blind command sequence or new command after cancellation. A retry is an explicit new tap.

A successful `play_media` response means the request was accepted, not that playback started. Leave Now playing and playback controls on HA-reported state. A reported failure uses the initiating card's existing readable error treatment. The existing ordinary media controls remain usable where their own targets are valid.

### 5. Reuse the mobile UI and protect artwork

Add a lazily loaded project-owned `MaraoPlex.js` custom element and a small data/action helper only if needed to keep UI and assertions clear. Reuse `MaraoDropdown`, popup management, theme tokens, Montserrat, press feedback and existing action errors. Keep poster controls semantic and at least 48 CSS pixels; text wraps and availability is not color-only. The full library uses one shared sheet with internal browsing/back navigation, not nested modal sheets; preserve focus, inert background, navbar clearance and return to the opener. Reuse or transition the existing media sheet so only one owns modality.

HA can return a direct Plex thumbnail URL containing authentication in its query. Do not insert that raw URL into card configuration, exported data, logs or the rendered image source. Derive HA's Plex image-proxy path from the selected server and returned item identifier, using HA's supported authentication/signing path when necessary. Allow only the expected HA proxy route; do not accept arbitrary image/fetch hosts or forward tokens. Keep transient signed URLs in memory, clear obsolete results and use a neutral poster fallback when artwork is absent or fails. Plex library titles/artwork never enter committed fixtures or public screenshots; use fictional safe responses.

Alternative considered: embed HA's internal media-browser components. Rejected as a runtime dependency on unstable internal UI; Marao can use the supported HA command boundary with its own shared controls.

## Risks / Trade-offs

- Plex app startup/client discovery can be delayed. Use a bounded authoritative-state wait and explicit failure; service acknowledgement is insufficient proof. Physical Apple TV wake-to-play remains a user check, not a claim from mocked tests.
- Recommendation identifiers and browse shapes differ across HA/Plex versions. Verify the supported boundary, permit explicit returned hub selection and show unavailable-feature feedback rather than guessing a localized title.
- One Plex account does not imply automatic managed-profile switching. Document the same-profile prerequisite and expose no profile picker or silent user substitution.
- Large libraries can return many items in one HA response. Limit DOM/image work and load only the selected folder; server-side pagination/search is not promised.
- Other Apple TV cards may share names or disappear while a launch awaits readiness. Use occurrence/mapping identity, disambiguated labels and cancellation; do not infer a replacement target.
- Custom popup layouts are independently owned. Block the unsupported automatic-Plex combination before save; never rewrite or overwrite an authored popup to make the feature appear.

## Migration Plan

No existing card or source format is migrated. Preserve v0.17.0, v0.20.0, v0.21.1 and current released inputs through the existing normal conversion; missing `apple_tv.plex`, `apple_tv: false`, explicit empty apps and custom options remain exact. The new field only appears after the user explicitly enables/configures Plex. Use independently specified preservation assertions; do not regenerate historical source/released fixtures or rewrite archive history.

Native card editing retains the current local draft and save boundary. Keep the existing backup/export and atomic native-save behavior; do not introduce cross-card writes. If live setup or a save fails, retain the prior saved configuration and unsaved choices. Rolling back a future installed package after saving new options requires restoring the matching owned dashboard/card backup with that package; an older editor must not silently strip the new settings. No package or HA config-entry version is changed while planning.

## Verification and delivery

Implementation baseline on 2026-11-05 is `7b500719b6318261bd33a2bda13ce6a5e09c6341`; the dirty-state snapshot is `/private/tmp/marao-plex-card-20261105.json`. Read-only `/api/config` confirmed disposable HA 2026.10.0. Tagged 2026.10.0 and 2025.12.0 sources confirm entity-scoped Plex browsing without an availability guard, `plex://` item IDs carrying `resume=1`, and authenticated `/api/plex_image_proxy/{server}/{item}` artwork. The user configured one Plex server on the test instance and authorized read-only inspection, explicitly requiring the server remain unchanged. At the first readiness read no Plex client entity had been registered; device playback remains restricted to safe fixtures, and no server settings/library writes are permitted.

Use the `marao-ha-frontend` and `marao-testing` guidance for implementation. Extend the existing editor-model/native-card-editor and native-card/composition assertions for optional settings, mappings, duplicate parents, both presentations, external-popup rejection and legacy preservation. Add focused Plex behavior assertions for returned browse/resume identity, authenticated artwork handling, one haptic, ordered single dispatch, delayed readiness, timeout/error and owner/TV/connection cancellation. Use fictional browse responses and gallery helpers; no real Plex playback is authorized for agents.

Update `docs/src/content/docs/cards/media.mdx`, the applicable quality/coverage notes, English/Portuguese labels and one safe existing Apple TV example. Rebuild editor/native assets and their owned-file manifest through existing tools. Install final compatible frontend assets once on disposable `192.168.0.28` using `prepareFrontend()` and verify served assets/readiness. User checks poster layout, profile-specific Continue Watching and physical wake-to-play manually. Do not add an automatic browser campaign. Any later publication uses unit-only `verify:publish` and applicable metadata checks.

### Implementation evidence — 2026-11-05

The optional parent settings, owned browser and guarded launch are implemented. Selected checks passed: seven Plex model/composition tests, four native editor/app-artwork tests, five visibility/app-launch/component tests, two existing media-composition tests, two selector-policy tests and one fictional-fixture pytest (21 total). Editor build/check and strict OpenSpec validation passed. The current flat package built successfully and its Plex runtime imports resolved in an explicit ES-module context. The selector plan was reviewed at `/private/tmp/marao-plex-card-plan.json`; broad unrelated editor/navbar/upgrade/browser suites were not run.

One publication-specific test was also invoked: the HACS staging test failed its checkout `dist` comparison because that directory still contains the preceding release graph and pre-existing duplicate files. That result remains a failure, not a passed packaging check. The current runtime graph was built separately for installation; no release, tag, push or modification of those unrelated duplicate files was performed. Rebuild the publication graph and rerun publication gates before a later release.

The safe media fixtures now expose a fictional Plex library, two clients/TVs and a simulated scan button. Their browse/play implementation accepts only `plex://marao-fixture/` and makes no server requests. Fixture installation required one HA restart; the installer encountered a transient fetch failure during that restart. Recovery confirmed all new fixtures ready, then the final compatible frontend was synced with `prepareFrontend()` and its served-asset/readiness checks passed. Exact existing dashboard backups and safe helper snapshots remain private in `/private/tmp`; existing content was retained while adding simulated examples to the existing Marao views. Read-only HA calls verified the fictional library root and a Continue Watching item carrying `resume=1`. No agent playback or management action targeted the real Plex server or a physical Apple TV. The user chose simulated clients; real profile/history and physical wake-to-play remain manual checks.

## Rivulet extension — controlling decisions (2026-11-05)

This extension supersedes Plex-only assumptions above for `playback_app: rivulet`; omitted `playback_app` retains the existing Plex path and required client/scan/source fields. The starting commit remains `7b500719b6318261bd33a2bda13ce6a5e09c6341`; baseline `/private/tmp/marao-rivulet-start.json` captures earlier dirty work. Acceptance: native Apple TV editor offers Plex/Rivulet; real-server library and Continue Watching keep the one-profile context; selecting a movie/episode wakes only its chosen TV if needed and dispatches one `media_player.play_media` URL to that TV; there are no Plex select-source/scan/client-play calls in Rivulet mode. Existing Plex, absent/false options, app shortcuts, unknown fields and duplicate-card independence survive. Shared consumers are native editor/schema/source, both media compositions, library runtime and target selector.

HA 2026.10 requires `media_player/browse_media.entity_id`. Its Plex implementation delegates to the configured server even for inactive session entities. Rivulet therefore permits optional `browse_entity` (any registered Plex player for that server) or discovers an enabled registered Plex entity by its server-prefixed unique ID. It never chooses from another server or guesses by friendly name. Discover once per owner/account/connection context and reset on explicit Refresh/Retry. Server selection uses HA's Plex server device identifier; no config-entry secret is read. If no entity exists, explain that a Rivulet session must first be discovered and keep the selected real server. The user will perform that session discovery later. No synthetic entity or Python bridge is added to the shipped package.

[Rivulet v1.2.0-122 URL handling](https://github.com/l984-451/Rivulet/blob/v1.2.0-122/Rivulet/Models/Shared/RivuletLink.swift) accepts `rivulet://play/<ratingKey>` (path form survives Apple TV Companion query stripping). `play` resumes at saved progress. The `server` query parameter is informational for Plex, so never imply that it selects a server or profile. Require Rivulet signed in to the same selected server/profile. Use the title's validated numeric rating key, never title search, tokens, arbitrary URL or AirPlay. Only movie/episode leaves are supported; folders retain navigation.

Rivulet launch shares existing haptics, bounded request cancellation and service errors. It checks Apple TV PLAY_MEDIA capability, wakes and waits for authoritative power when necessary, then sends one URL; no separate app launch is needed. Now playing stays HA-authoritative. No software/data-format migration: new fields are additive and omitted options retain the old behavior. Historical/released fixtures remain immutable. Verify scoped model/editor/component assertions, read-only HA registry/browse availability, build and install; physical launch and profile/Continue Watching correctness remain manual.

### Rivulet implementation evidence

Implemented the optional native playback choice, read-only server selection, automatic same-server browsing bridge, credential-free movie/episode links and shared guarded launch. Existing Plex configuration remains the default. Nineteen scoped checks passed: 12 Plex/Rivulet model/action tests, four native setup/editor assertions, two existing component lifecycle/navigation assertions and one safe fixture test. Editor build/check, example validation, strict OpenSpec validation and whitespace checks passed. The selector plan was reviewed; unrelated pre-existing navbar/authoring behavior was excluded from task checks.

Installed current frontend assets and the updated safe receiver on disposable HA. Served-asset/readiness checks passed; the native dashboard, Plex integration metadata and safe helper states were preserved. The Media example now selects the configured real server and Rivulet while retaining a safe test TV; the fictional Bedroom example demonstrates Rivulet links without network access. No real playback command or Plex server configuration/history write was issued. HA still has no real Plex session entity: live library/Continue Watching inspection and physical TV launch remain pending the user's deferred Rivulet session discovery. The installed card explains this prerequisite and supports explicit Retry; no simulated library is substituted for the real server.
