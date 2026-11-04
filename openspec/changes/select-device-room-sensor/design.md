# Design

## Context

See `proposal.md` for the requested outcome and acceptance examples. Planning baseline is `23c0d0e2c14eee774ac10a23ad50ae1449c31028`; the local `v0.28.1` tag resolves to `32f43f55d7480ba7ba9c3e9865082d111c15cf19`. Existing untracked duplicate-named `dist/` artifacts are unrelated and remain untouched. No HA connection, runtime edit, deployment, commit or release is part of this proposal.

The released `MaraoLocation.js` stores a raw `person.*` string under an origin/dashboard/account key. `resolveLocation` first resolves a person, requires usable person presence and lets non-home presence select `away_path`. `MaraoNavigation.js` owns the identity lookup and inserts the location entry before normal routes. Direct Area sensor selection is absent in both the reviewed current source and the release tag.

The completed `consolidate-current-room-settings` implementation embeds `mountLocationPreferences` in **Current room → This browser** with administrator/context guards, immediate local application and read-only draft feedback. `frontend_src/location-settings.js` owns shared person/room mapping rows; `dashboard-settings.js` owns shared validation/stale-save/recovery. These boundaries remain intact. The existing `navigation-popups` baseline has not incorporated all completed location deltas; later synchronization must apply the earlier current-room/consolidation contracts first, then qualify their automatic-person/Away rules as legacy-mode behavior. This proposal does not rewrite earlier artifacts or baseline specs.

## Goals / Non-Goals

**Goals:** an explicit client sensor independent of person identity/presence; durable and isolated browser-local choice; deterministic clear/compatibility behavior; one shared resolver for saved navigation and draft feedback.

**Non-Goals:** discovering hardware identity, synchronizing local preferences across devices, replacing the tracking integration, changing account roles, creating another settings popup, inferring Away in sensor mode, or moving device selections into shared dashboard JSON.

## Decisions

### 1. Browser storage is the practical client identity

Use the browser/WebView storage partition as client identity. Add a distinct versioned preference namespace with a key equivalent to:

```text
["marao-device-room", HA origin, dashboard root, signed-in HA user ID]
```

The user ID prevents another account in the same browser from inheriting the choice; it is not resolved to a person and is never consulted for location/presence. Two devices using the same account have different storage areas, so an identical key does not create a shared selection. Two tabs using the same storage area and scope deliberately share the preference. No random installation ID or hardware fingerprint is needed because there is no server-side device registry to address.

Wait for the signed-in account/scope to be known before reading a scoped record; initial missing user metadata is loading, not permission to read a key with an undefined account or reuse another account's memory choice.

Persist with localStorage, not sessionStorage, so normal reloads, browser/Companion app restarts and HA server restarts retain the choice while that storage survives. Safari, another browser/profile, another Companion installation and a different HA origin must each be configured separately. Changing scheme/host/port creates a different origin. Private browsing, cleared site data, app data removal/reinstallation and restored/copied profile data do not provide a globally stable physical-device guarantee. Explain that limit in product guidance without claiming the viewing hardware has been detected.

The browser platform defines [localStorage as origin-scoped persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Reconcile matching changes from other tabs through the native [storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event), updating the initiating owner directly because it does not receive its own event. Filter events to the active scoped key; no polling or cross-device synchronization service is needed.

### 2. Use an additive typed preference, preserving legacy data exactly

The new namespace stores a version-1 object, separate from the raw released person string:

| New record | Meaning |
| --- | --- |
| `{ "version": 1, "mode": "sensor", "area_sensor": "sensor.iphonix_area" }` | Resolve this explicit sensor; no person dependency |
| `{ "version": 1, "mode": "none" }` | Explicitly cleared/unconfigured; neutral and no legacy fallback |
| `{ "version": 1, "mode": "legacy" }` | Deliberately use the preserved released person behavior |
| No new record, legacy mapping/preference exists | Read released behavior without writing; identify it as legacy |
| No new record and no legacy source | Neutral unconfigured device source; offer the sensor selector |
| Malformed or unsupported new record | Neutral with repair/version guidance; never silently run legacy resolution |

This version belongs to the browser preference, independently of the dashboard format, shared `marao.version`, HA config-entry version and package version. Validate new records centrally: known integer version/mode, sensor mode requires an explicit syntactically valid `sensor.*` reference, and runtime availability/current-area capability is assessed separately. Retain unknown fields on deliberate edits of supported objects. An invalid sensor reference remains visible for correction; a newer unsupported object is preserved exactly and ordinary editing refuses to overwrite it.

Keep `locationPreferenceKey`, raw legacy person values, `current_room.people`, `current_room.rooms`, `away_path`, explicit empty maps and all opaque dashboard fields unchanged. No read-time write, eager migration or inference of `config.people[person].area_sensor` into a new device record occurs. A person may carry multiple devices, and the current browser could be a shared tablet; that association is not evidence about the viewing client.

Released Automatic has no per-client stored marker, so a new client cannot reliably be distinguished from an older Automatic client by key absence. Preserve that released path only as visibly labelled legacy compatibility where legacy shared mappings exist. The new direct sensor selector stays empty until deliberate selection, even when legacy resolution happens to use a sensor; do not prefill or persist that sensor as belonging to the viewing device. Direct-mode opt-in, clearing and invalid new records always suppress the legacy path as specified above.

Clearing the direct choice writes the scoped `none` record instead of removing the key, so an old person override cannot silently become active. **Reset this selection** has the same safe unconfigured outcome. A distinct **Use legacy person tracking** action writes `legacy`; it can be chosen directly and does not require a preliminary clear. This is a deliberate compatibility path, not a new Automatic source guess. Keeping older keys untouched also gives the prior package its exact original data on downgrade.

### 3. Resolve a direct sensor before any person logic

Centralize interpretation and resolution in `MaraoLocation.js`. Choose the effective source first. In sensor mode:

```text
this browser/WebView's scoped preference
  --> selected Area sensor in current readable HA state
  --> current attributes.area_id
  --> existing current_room.rooms[area_id].path
  --> validated existing view in the active dashboard
```

Require a current sensor entity with usable nonempty state and a usable nonempty area ID. Missing/unknown/unavailable sensor state, missing/invalid area ID, unmapped room, deleted view, malformed URL, cross-origin/dashboard destination, disconnection or initial loading produces the appropriate neutral non-actionable result. Reuse the current same-dashboard destination validation, page title/icon fallbacks and reserved location-slot behavior. Do not infer location from registry area, display-name matches, last-seen state, GPS coordinates or a different sensor.

Bypass `automaticPerson`, legacy overrides, `person/list`, person Home/Away and `away_path` entirely in sensor mode. A readable sensor reporting a valid current area is authoritative even when the signed-in account has no person or its linked person is away/unavailable. A lost sensor reading does not prove Away; this mode never automatically offers the legacy Away page. Keep Away configuration/rules available only to explicitly identified legacy tracking.

In `none` or invalid-preference state, stay neutral without entering the legacy resolver. Only a deliberate `legacy` record or the read-only released-compatibility condition may use the old resolver. Normalize old/new inputs at the preference boundary and update all resolver callers rather than creating a second UI-only resolution rule. Extract only the shared area-to-destination calculation needed by both paths.

`MaraoNavigation.js` must read the effective preference before launching identity requests. Source/account/dashboard/connection changes invalidate preceding lookup generations; a late person response cannot override a selected sensor, and direct mode must not keep starting person requests. Relevant sensor/mapping updates recompute the shortcut in place. They never call navigation/services. Explicit activation rechecks the latest source and same-dashboard target and navigates once; normal route order, More partitioning, current-page indication and shell ownership remain unchanged.

### 4. Extend the existing settings subsection without changing permissions

Use the existing **Current room → This browser** area for the native sensor selector, local persistence feedback, Clear/Reset and the explicitly labelled legacy compatibility choice. The normal direct setup flow is enable the shared feature, select this client's current Area sensor, and configure shared Rooms and pages; no People row is required. Preserve the current saved-enable boundary: enabling an unsaved shared draft still requires Save before active local controls appear.

Keep shared People and location sources accessible for existing configurations, clearly identified as legacy person tracking. Do not remove or rewrite those mappings. Explain that the optional shared Away page applies to legacy person tracking rather than the new direct sensor mode. Do not add a new top-level shortcut or nested popup.

Retain the existing administrator-only Marao settings entry point and mutation-time guards: current admin account, owning dashboard, connected owner, saved feature enablement and no native edit ownership. Reject delayed callbacks after role/account/dashboard/owner loss. There is no new user role setting or ability to configure another account's preference. Non-admin users can resolve a readable existing preference for their scope, as they already can, but this proposal does not grant preference editing to them. Selected entity IDs do not grant visibility to unavailable/unreadable HA state.

Local choice changes use current saved shared mappings immediately and remain independent of shared Save/Cancel. In `MaraoLocationPreferences.js`, replace the primary person-only form with the client-source form while preserving legacy controls under legacy mode. Sensor absence or unknown state produces feedback without erasing the selected ID or replacing active input. Keep native controls, current theme, full-size touch targets and English/Portuguese copy; no global theme change is required.

Diagnostics in direct mode show **This browser/WebView → selected Area sensor → current area ID → mapped page**, persistence state and the precise unresolved stage. Do not show person linkage/presence as prerequisites. Draft feedback calls the same resolver with the current client preference and draft shared room mappings, remains labelled/read-only, and does not affect live saved navigation before Save. Update through the existing host/navbar refresh lifecycle without polling, replacing active fields or logging account/location payloads.

### 5. Retain scoped recovery and handle storage failures honestly

Before a deliberate supported preference replacement, validate the active context/draft, reread the latest value and retain its exact raw prior value under a sibling scoped recovery key such as `marao-device-room-recovery`. Include whether the prior key was absent; do not copy the entire browser storage area. Retain recovery through failure. Only the owned current scope's record/recovery key is written; legacy person strings, authentication, other dashboards/accounts and shared dashboard JSON remain untouched.

If recovery retention fails, do not replace the durable preference. If setItem fails, the prior durable value remains intact. A deliberately selected source may still apply from an owner/module-held in-memory preference for the active document lifetime, with explicit **not saved; applies until reload** guidance. Do not claim persistence through reload or substitute a dashboard save. Keep any memory fallback scoped and invalidate stale UI callbacks when the account/dashboard changes; normal same-dashboard navbar remounts can reuse the deliberate document-lifetime choice.

If the new preference cannot be read and there is no deliberate scoped memory choice, fail neutral: treating unreadable storage as an absent record could wrongly activate legacy tracking. Preserve malformed supported raw data before an intentional repair; ordinary reads never rewrite it. Unsupported newer records remain unchanged and read-only with upgrade/recovery guidance. Cross-tab writes affect only this client scope, with the latest deliberate stored choice winning; failure cleanup must not restore an older backup over a newer concurrent choice.

There is no shared-dashboard migration to stage. Continue using the existing exact recovery/stale-save guard for actual shared mapping edits, while local-only changes and draft previews send no `lovelace/config/save` and trigger no dashboard recovery download. For downgrade/recovery, retain the prior matching package plus exact shared/local state; do not feed the new preference object into the released raw-person key. Older packages ignore the new namespace and see their untouched legacy state, so their person/Away behavior must not be represented as supporting device sensor mode.

## Risks / Trade-offs

- A physical phone has several independent browsers/WebViews → name the local storage scope honestly and require deliberate setup in each; no device fingerprint or cloud synchronization.
- Clearing a record reactivates an unrelated person sensor → persist `mode: none` on Clear/Reset and require explicit legacy restoration.
- A delayed person lookup or stale Away result overrides a direct choice → resolve source mode before person work, invalidate lookup generations and assert direct-source precedence.
- Storage is denied or corrupt → neutral read failure, explicit document-lifetime fallback after deliberate input, exact prior-value recovery and no fabricated persistence.
- Shared and local controls commit differently → retain current immediate-local versus shared-Save semantics and labelled draft feedback.
- Same-account local scoping might be mistaken for account-based location → document that the account only partitions preferences; independent storage areas can hold different sensors and require no person.
- Legacy compatibility could look like automatic device migration → label the path legacy, keep raw values untouched and never populate a device record from person configuration.

## Migration Plan

1. Preserve the inspected v0.28.1 data: shared `enabled/people/rooms/away_path`, raw scoped `person.*` strings and absent-key Automatic behavior. Add independent synthetic expected cases for absent new record, explicit legacy, direct sensor, cleared, malformed and newer records in the current test files; do not rewrite historical artifacts or fixtures. Shared schema/defaults/generator behavior remain unchanged because the new selection is local only.
2. Implement the additive local preference codec and read-only source choice before connecting settings writes. Preflight/retain exact prior new-namespace state before intentional replacement. Keep old person data unchanged and make interrupted/failed local writes recoverable without modifying shared source, generated output or HA settings.
3. Update `MaraoLocation.js`, `MaraoLocationPreferences.js`, `MaraoNavigation.js`, settings source and its preview together. Keep `dashboard-settings.js`, `authoring-schema.js` and retained configuration paths compatible without injecting new shared fields or changing format versions. Rebuild editable settings assets through `npm run build:editor`; no generated bundle is patched manually.
4. Update `docs/src/content/docs/features/navigation.md`, relevant navbar/setup/troubleshooting guidance and the coverage map. Reuse fictional navigation examples in the existing docs playground and `ha-test/` when useful, demonstrating a sensor with no person and two independent local contexts without adding a dashboard or live fixture campaign. Correct old claims that a person is mandatory for the direct mode.
5. During later implementation, capture the task snapshot and review the actual diff using the existing `location-shortcut` focused plan for the concrete preference-recovery and authorization risks. Run only targeted existing navbar/settings Node assertions: two separate storage Maps with the same scope, recreated owners for reload, no-person resolution, person-Away independence, neutral failures, clear/recovery, role/context loss and unchanged shared documents. No backend/full/browser matrix is implied; real Companion persistence checks remain a concise user manual watch item.
6. This proposal performs no deployment. When implementation is later authorized, install final compatible frontend assets once on disposable `192.168.0.28` with `prepareFrontend()` and its served-asset/readiness checks, preserving current dashboard/helper state; use full sync only if the final diff actually changes backend/fixtures. Never access another instance or its credentials/mounts. Publication remains separate and unit-only by default.

On rollback restore the matching package and any exact affected local/shared state needed for the intended prior behavior; never replace other clients' selections or unrelated concurrent writes. Retain recovery if restoration fails and report that failure. All implementation and device verification remain future unchecked work.
