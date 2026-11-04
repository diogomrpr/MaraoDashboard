# Design

## Context

See `proposal.md` for the requested outcome and the user's administrator-only decision. Planning started at `0d5267902da0b2ab595db77af149a7a4b2f64da6`. This revision retains that commit; the existing change directory was the only untracked work at review. No application code is changed by this proposal.

`MaraoNavigation.js` creates the main-page `.location-preferences` button and lazy-loads `MaraoLocationPreferences.js`. That module owns a separate dialog, an immediate person/Automatic update and storage feedback. `MaraoLocation.js` owns scoped local storage and runtime identity resolution.

The existing administrator maintenance menu opens `frontend_src/dashboard-settings-dialog.js`. This popup already mounts shared room mappings through `location-settings.js`, and `dashboard-settings.js` protects version-1 settings with validation, stale-source checks and administrator-only saves. The popup is attached to the stable dashboard root. `build-editor.cjs` generates its shipped `MaraoDashboardSettings.js` bundle.

The navbar editor already has expandable `.route-heading` rows with an icon, summary, chevron, native forms and a row menu. Current-room mappings instead use always-expanded `.route.fields` forms without subsection headings. Existing-row invalid edits are tracked, but add-form callbacks return on incomplete or duplicate pairs without making Save invalid. This is a concrete draft-validation gap. The user's reported runtime detection failure has not been reproduced; current Node cases already cover automatic lookup and basic room/Away resolution, so do not claim that algorithm is wholly absent or that a hardware-specific cause is established.

The baseline `navigation-popups` spec is not yet synchronized with the completed `add-current-room-navbar-shortcut` change. That change describes all-user local preference access. This proposal intentionally supersedes that access decision and the dedicated popup presentation; preserve its resolver and storage guarantees. When synchronizing later, apply the earlier current-room contracts before this change and reconcile the earlier Local person override wording to administrator-only editing. Do not rewrite historical artifacts or claim baseline synchronization during proposal creation.

## Goals / Non-Goals

**Goals:** reuse settings rows and the existing resolver, make the identity/source/page chain understandable and consistent, keep one modal owner, preserve saved data and immediately acknowledge local choices, and enforce administrator access at interaction time.

**Non-Goals:** a new settings route, replacement shortcut, new persistence layer, shared/local transaction system, physical-device fingerprinting, new tracking providers, automatic edits to HA People/account links, backend work or an unrelated popup redesign. Correcting the existing shared location-resolution path is in scope; replacing Bermuda's room-detection algorithm is not.

## Decisions

### Structure the existing settings surface and reuse route rows

Keep top-level Navigation bar, Current room and Dashboard shortcuts sections. Current room contains four visibly labelled subsections in this order:

| Subsection | Content | Commit behavior |
| --- | --- | --- |
| General | Enable current room; optional Away page | Shared draft, applied by Save |
| People and location sources | Person selector, linked-account context, Area entity selector and known device context | Shared draft, applied by Save |
| Rooms and pages | HA area paired with an existing page in expandable summary rows | Shared draft, applied by Save |
| This browser | Current account/resolved person, Automatic or explicit local person, resolution/persistence feedback | Local choice applies immediately |

Reuse the navbar editor's row markup/style and native selectors, extracting only the small row presentation helper needed by both lists if it avoids duplication. Room rows show the area name/icon and matching native page title/path; the chevron expands their fields, and the row menu exposes relevant actions such as Remove. Person/source rows use the same compact presentation where useful. Lists can expand rows independently without recreating active forms or losing their drafts.

Navbar drag/up/down actions represent route order. Room mappings remain an area-keyed object and do not need reorder controls or a new persisted ordering field. Do not convert maps to arrays to imitate a drag handle. Preserve existing insertion order and opaque entry fields during deliberate edits. Retain missing area/entity/view references with a visible repair warning rather than deleting them during rendering. New mappings use explicit Add/Remove affordances and track an attempted row once either required value is entered; a fully untouched add form is not an error.

Reuse existing Montserrat/theme tokens and semantic controls with 48px targets, wrapping essential labels and one internal popup scroller. Keep controls in the current popup rather than adding nested sheets, a new route or another main-page shortcut. No theme-file or global typography change is necessary.

### Detect the authenticated user and configure the location source explicitly

Use the existing identity priority: browser-local explicit person, otherwise `hass.user.id` matched to exactly one HA-linked person. When the live person attributes omit the account link, keep the existing `person/list` lookup and stable person-ID matching; names and entity slugs are not account links. This is already supported in `MaraoLocation.js`/`MaraoNavigation.js` and should be shared with settings, not implemented a second time.

Home Assistant exposes the authenticated user to its frontend, and its Person model provides account associations. That makes user-based selection the simplest portable default for this dashboard. A browser/app installation is not itself the carried tracking device: a user can open the dashboard on a tablet while tracking a watch, or use one account on multiple clients. Native-device identifiers would add platform-specific coupling and would still need an explicit association with a room sensor.

Present a native Person selector beside a clearly labelled Bermuda current Area entity selector. Show the linked account status, the current signed-in account, and the selected entity's device name from already available HA metadata when known. Missing device metadata must not block entity selection or erase a saved association. Show the friendly source label with its entity reference available for repair. Explain that HA's person Home/Away trackers and the device's room Area entity have different roles. Offer guidance to HA People settings to repair an absent account link; do not create a second Marao user-to-person mapping or change HA users from this form.

Continue storing the existing shape:

```yaml
current_room:
  enabled: true
  people:
    person.alex:
      area_sensor: sensor.alex_watch_area
  rooms:
    kitchen:
      path: /marao-dashboard/kitchen
```

`area_sensor` is the explicit current Bermuda Area source. Resolve its current `area_id`; do not replace it with the person's chosen GPS tracker, a device's registry area, a display-name match or Area Last Seen. Unknown/unavailable sources remain selectable as saved references and produce an accurate unavailable diagnostic instead of being treated as a malformed persisted format. Existing `away_path` and presence precedence remain unchanged.

Primary references checked for this decision: [HA Person/account linking](https://www.home-assistant.io/integrations/person/), [HA frontend Person data and lookup](https://github.com/home-assistant/frontend/blob/dev/src/data/person.ts), and [Bermuda current Area sensor](https://github.com/agittins/bermuda/blob/main/custom_components/bermuda/sensor.py). Upstream development code informs the model; the existing supported Marao path and focused checks establish compatibility, not an assumption that every upstream API is installed.

### Share resolution feedback with the runtime

Expose the existing resolver's derived identity, configured source, current area and destination, together with a reason when a stage cannot resolve. Extend its small result or extract a narrow shared calculation rather than inventing a second state machine. Keep route rendering, settings feedback and activation validation consistent. The chain is:

```text
signed-in user or explicit local person
  -> unique visible person and authoritative presence
  -> configured current Area entity
  -> current area_id
  -> mapped existing dashboard view
```

Feedback distinguishes unresolved/ambiguous identity, person-record lookup failure, unknown/unavailable presence, missing/unavailable source, absent current area, and unmapped/deleted destination. Show concise localized correction guidance at the relevant row and the current-browser summary. A source can correctly provide a room while the person's Home/Away state is unknown; explain the missing presence configuration and keep navigation disabled under the existing contract. Confirmed non-home presence uses the optional Away page even if a sensor still reports its prior room. A missing room while home never proves Away.

Use current HA state/configuration and the existing bounded identity request ownership. Automatic or explicit Retry invalidates the current failed/cached lookup as needed and reevaluates the active account, while ordinary renders do not poll or repeatedly fetch person records. Account/dashboard/connection changes discard old records and late results. After a shared Save, use the newly installed settings rather than cached source/page associations. Local person changes and area state updates reevaluate both surfaces; explicit activation rechecks the current target and navigates once. State updates never redirect the page or send entity actions.

Where settings show a draft-derived destination, label it Preview and use the same pure calculation without writes. The live navbar continues to use saved shared settings until Save. An immediate local person choice uses those saved mappings; explain this separately from the draft preview. Refresh diagnostic text through the existing HA host/navbar update lifecycle, without remounting fields, changing selection/focus, retaining room history or logging account/location payloads. No new polling timer, API endpoint or telemetry is needed.

### Embed the existing preference controls

Refactor the controls/update logic out of the standalone dialog into a mountable section consumed by `dashboard-settings-dialog.js`. Pass the active navbar owner from the existing maintenance settings action so choices update the same preference state and shortcut immediately. Use the stable dashboard popup host and reject stale owner/account contexts. Remove the old dialog creation, lazy opener and lifecycle hooks that become unused; retain a module only if it still owns reusable controls.

Place these controls in This browser below the shared mapping subsections. Expose local controls only while the saved dashboard has Current room enabled; enabling it in an unsaved shared draft takes effect after Save. Keep the subsection's explanatory heading/guidance available during draft setup. Label the choice as applying to this browser or WebView and account. Reuse native HA person selectors, semantic controls, existing theme tokens, strong haptics and English/Portuguese strings.

A button that opens the old popup from inside settings would retain the separate popup the user wants removed. A new settings shortcut would retain an extra main-page button. Neither is needed.

### Keep the existing administrator entry point

Remove `.location-preferences` creation and the `showLocation` condition that keeps the main-page shortcut row alive. Remaining editing/cache buttons retain their existing flags and row lifecycle. Keep the Current room navbar destination itself.

Use the existing administrator navbar hold → Marao settings action; ordinary-user holds continue their existing refresh behavior. Check administrator identity, active dashboard, enabled saved feature, edit state and owner validity before local writes, including after asynchronous control loading. Invalidate the popup on role/account/dashboard loss, edit-mode entry or owner removal. A redraw must not create a second popup or invalidate mounted inputs unnecessarily.

Update identity and lookup-error guidance in `MaraoLocation.js`: administrators are directed to Marao settings; ordinary users are directed to an administrator. Existing non-admin overrides remain readable; this is a restriction on UI editing, not deletion of saved choices or a new HA authorization mechanism.

### Preserve local and shared write behavior

Keep `locationPreferenceKey`, stored person values and Automatic's scoped key removal unchanged. A local selection applies immediately, including session-only behavior with readable storage failure. Closing the popup discards unsaved shared edits while retaining an already applied local choice; explain this distinction in the section.

Keep `saveDashboardSettings` and its validation, stale-save refusal and recovery behavior for shared edits. A local-only change sends no `lovelace/config/save`, entity service or navigation action. Do not migrate an override into `marao.navbar.current_room` or copy one account's choice to another account.

Track raw attempted values for both edited and newly added mappings. A half-filled or duplicate add row must produce the same localized inline error and no-write outcome as an invalid existing row. Preserve the attempted draft for correction; do not silently commit the last valid value or overwrite a different keyed entry. A row becomes valid after completion, a unique key change or explicit removal. Untouched empty add forms and intentionally empty saved maps remain valid. Keep structural validation independent of live entity availability so an unrelated edit does not destroy temporarily unavailable references.

### Keep downstream work narrow

`native-bootstrap.js` continues passing the existing navbar configuration; no generator, historical converter, configuration schema, default, theme file or backend change is expected. Rebuild the settings bundle through `npm run build:editor`.

Update `docs/src/content/docs/features/navigation.md`, `help/troubleshooting.md`, affected setup/navbar guidance and the coverage map. Document the four subsections, current-user identity choice, distinct presence/Area sources, shared/local save behavior and corrective feedback. Reuse existing safe realistic-page/gallery navigation examples; correct old-entry-point guidance and demonstrate the existing person/source/room mappings without new physical entities. No gallery matrix or test dashboard is required.

Adapt `tests/frontend/marao-navbar-card.test.js` and `dashboard-settings.test.js` to assert removed shortcut/row behavior, embedded updates, administrator/stale-context rejection, unchanged local storage scope and independence from shared Save/Cancel. Add small regressions for partially completed/duplicate new mappings, account-to-person fallback/retry, selected-source changes and shared preview/runtime resolution outcomes. Replace the obsolete standalone-dialog test with the equivalent stable-host ownership assertion. Use independently specified expected keys/documents rather than deriving expectations from the changed implementation. If the reported runtime failure is not reproduced by the specified cases, report that limit; do not invent a hardware diagnosis or claim a live reproduction.

## Risks / Trade-offs

- Existing ordinary users lose preference editing → this is the user's explicit choice; preserve their stored override and update guidance/documentation honestly.
- A role or account changes during popup loading → recheck authorization and ownership on every mutation and reject late callbacks. This concrete permission risk warrants narrowly focused offline assertions.
- Local changes and shared drafts have different commit behavior → retain current semantics and label immediate local application clearly.
- Removing the last main-page button leaves blank space → remove the location-only row eligibility condition and assert the remaining flag combinations.
- Two historical requirement sets describe different access → reconcile them when specs are later synchronized, retaining the earlier scenarios for storage isolation and Automatic.
- Room feedback accidentally invents a different resolution rule → use the runtime's calculation for feedback/preview and assert matching outcomes for a complete mapping, failed stage and confirmed Away.
- An administrator selects an entity that provides general presence rather than a current Area → label the required entity contract and show the missing area stage; retain existing references without guessing a replacement.
- Partial or duplicate add forms disappear on Save → retain attempted row state and reject the write until corrected or removed.

## Migration Plan

There is no persisted transformation: supported version-1 ordinary settings, omitted/disabled room settings and existing local override strings remain unchanged. The reviewed `ha-test/upgrade/fixtures/v0.23.4-ordinary-expected.json` has version-1 Marao settings and routes with opaque fields, but no `current_room`; its behavior must remain unchanged without injecting feature defaults. Existing current-room input examples and Node fixtures retain their person-keyed `area_sensor`, area-keyed `path` and scoped override formats. Historical source/generated contracts and immutable release fixtures remain untouched. Retain existing exact shared-dashboard recovery before requested shared writes; opening settings, previews or making a local choice does not trigger recovery/export or rewrite the dashboard.

During implementation, capture the task snapshot and review the actual diff. Use `location-shortcut` with the affected selector's focused plan for the permission path, then run only the small navbar/settings Node selection serially and the necessary bundle check. Routine layout review belongs to the user; no browser, camera, upgrade or full-suite campaign is required.

After final edits/checks, install once on disposable `192.168.0.28` through `prepareFrontend()` from `ha-test/prepare-frontend.js`, preserving existing configuration/helper state. Its compatibility and served-asset/readiness checks confirm installation. Hand off `/marao-dashboard` with a short watch list for subsections/room-row expansion, person/source selection and detection feedback, shared/local save behavior, and removed button/spacing. Additional real-device movement checks belong to the user.

Rollback restores the prior matching frontend assets. No settings or browser-storage rollback is needed because formats are unchanged; preserve deliberate choices made since installation and use retained exact recovery only for an actual failed shared save. Any subsequently discovered format conversion requires an updated plan and explicit migration coverage before implementation continues.
