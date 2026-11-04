# Design

## Context

See `proposal.md` for the agreed concept and scope. Starting commit: `0d5267902da0b2ab595db77af149a7a4b2f64da6`. Other untracked changes are independent proposals; preserve them. No application code or HA configuration is changed during planning.

### Completed card inventory

Reviewed the 38 entries in `marao-catalog.json`/`editor.py`, public types from `card-composition.js`, shared state/reading rendering in `MaraoCards.js`, collection/scene composition, standalone timeline/history/event components and schedules. This is a source audit, not a claim of browsing every card on HA.

There are two distinct metadata paths. `md_sensor_card` explicitly adds `sensor.updated` from `last_updated` and a placeholder row. Separately, `entityStateLabel()` delegates to HA's state formatter: a button/input-button state is its last press, and a scene state is its last activation. Searching only timestamp property names would miss the latter. Access cards do not have a separate hardcoded last-activity row; the shared state path explains the stateless-opener case.

| Catalog role | Existing time content / disposition |
| --- | --- |
| `md_title_card` | Heading only; no activity metadata. |
| `md_weather_card` | Forecast dates are content; preserve them. |
| `md_room_card` | Room/navigation and lighting summary; no automatic activity timestamp. Preserve authored labels. |
| `md_scene_collection_card` | Parent has no state; inspect each composed scene child and replace its activation timestamp. |
| `md_security_card` | Current alarm state and operating popup; no automatic activity timestamp. |
| `md_access_slide_action_card` | Add Activity icon; replace a timestamp if a stateless opener supplies the displayed state; keep strict slide. |
| `md_access_hold_action_card` | Add Activity icon; composed action may already hide state, while raw variants can display it; retain hold. |
| `md_base_card` | Replace semantic activation timestamps in existing compatible bindings; preserve substantive sensor/date data. |
| `md_energy_period_card` | Period labels and selected sample times are content; preserve. |
| `md_media_app_card` | Artwork/action; no automatic activity metadata. |
| `md_camera_card` | Live/events content; event dates stay in their existing feed. |
| `md_light_card` | State/brightness/color; no automatic activity timestamp. Keep color icon action. |
| `md_cover_card` | Position/movement; no automatic activity timestamp. Access-classified covers inherit access behavior. |
| `md_climate_card` | Mode/temperature/targets and numeric history; preserve chart times and icon behavior. |
| `md_fan_card` | Speed/position/state; no automatic activity timestamp. Retain access classification rules. |
| `md_media_card` | Playback position/duration and content metadata; preserve. |
| `md_access_card` | Add Activity independently of operating details; replace stateless last-activation display, retain actual lock/gate state. |
| `md_sensor_card` | Remove automatic Updated metadata/placeholder for sensor and binary-sensor instances; add Activity icon. A primary timestamp-sensor measurement remains data. |
| `md_switch_card` | A scene binding can display last activation; replace it. Ordinary switches have no automatic timestamp; keep their power graph behavior. |
| `md_number_card` | Numeric value/control; no automatic activity timestamp. |
| `md_wallbox_current_card` | Current/presets; no automatic activity timestamp. |
| `md_vacuum_card` | Current operation/segments; no automatic last-clean timestamp in this renderer. |
| `md_battery_card` | Percentage/threshold state; no automatic activity timestamp. |
| `md_dishwasher_card` | Progress/remaining duration/program are content; no automatic activity timestamp. |
| `md_washing_machine_card` | Running/idle state; no automatic activity timestamp. |
| `md_graph_card` | Trace/sample timestamps are content; preserve numeric details. |
| `md_toggle_graph_card` | Trace/sample timestamps are content; preserve numeric details and toggle. |
| `md_timeline_card` | Existing state-duration timeline and time axis are content; retain its contract. |
| `md_navigation_card` | Ordinary destination/summary has no activity timestamp; semantic replacement still applies to any supported legacy direct timestamp-activity binding through the shared state path. |
| `md_entity_group_card` | Counts/aggregate state; no automatic activity timestamp. Eligible member cards inherit the shared fix. |
| `md_alarm_controls_card` | Operating state/modes/PIN; no automatic activity timestamp. |
| `md_header_card` | Current date and configured person/air-quality readings are content; retain them. Shared reading classification still applies to any compatible activity-timestamp source actually rendered. |
| `md_glance_card` | Explicit values remain data; a button/scene reading uses its own Activity icon instead of a last-activation timestamp. |
| `md_scene_card` | Select/input-select option picker, not scene activation metadata; preserve. |
| `md_access_action_card` | Add independent Activity while preserving safe Close/Lock tap and actual operational state. |
| `md_floor_plan_card` | Image/light controls; no automatic activity timestamp. |
| `md_people_card` | Presence/place; no automatic last-seen timestamp in this renderer. |
| `md_schedules_card` | Authored times/weekdays and schedule state are content; preserve. |

Additional surfaces reviewed: `marao-navbar-card` has navigation/local preferences, not activity metadata; `marao-camera-events-card`/`marao-frigate-events-card` retain event timestamps and existing filters; `marao-state-timeline-card`, `marao-power-history-card` and `marao-energy-period-card` retain axes, periods and selected-record times. Popup, control-grid, summary-action and slide components own layout/actions rather than last-activity metadata. Raw embedded HA cards, editor/history backup dates and immutable released assets are not rewritten.

The classifier must live at the shared display boundary, not rely on a short role allowlist: native wrappers, `md_*`/`hc_*` aliases, popup members and composed children must receive the same result whenever they actually render semantic activity timestamps. This does not add unsupported entity domains to the catalog or treat every ISO-looking sensor string as metadata.

### Source evidence and compatibility references

- [HA Button](https://www.home-assistant.io/integrations/button/), [Input button](https://www.home-assistant.io/integrations/input_button/) and [Scene](https://www.home-assistant.io/integrations/scene/) define last-press/activation state semantics.
- [Activity](https://www.home-assistant.io/integrations/logbook/) depends on Recorder and omits many numeric sensors. [History/Logbook APIs](https://contributors.home-assistant.io/core/internals/rest-api/#history-and-logbook) support entity- and period-scoped reads.
- [Upstream activity types](https://github.com/home-assistant/frontend/blob/dev/src/data/logbook.ts) expose optional user/origin/context; they do not guarantee attribution on every installed integration. [Recorder](https://www.home-assistant.io/integrations/recorder/) controls retained coverage.

These references guide the adapter; implementation must verify the supported disposable HA response shapes without importing private HA frontend modules. No production inspection is permitted.

## Goals / Non-Goals

**Goals:** one shared read-only activity interaction; complete timestamp-metadata coverage; meaningful evidence from explicitly associated sources; mobile filtering and safe lossless authoring.

**Non-Goals:** a new audit database, automatic source discovery, inferred physical identity, security command replay, changing unrelated color/graph interactions, or a generic history feature on every timestamp-free card.

## Decisions

### 1. One semantic presentation decision

Introduce a shared activity-presentation classification used by primary state, secondary metadata and reading-icon composition. Its inputs are the actual source entity/domain, the presentation role and declared field semantics. It distinguishes automatic update metadata, button/scene last activation, operational state, and substantive date/time data. Preserve explicit custom labels independently; do not clear an entire label merely because its normal timestamp suffix is omitted.

Remove the sensor's automatic Updated row rather than leaving an invisible fixed-height placeholder. Suppress activation timestamps in collapsed states/readings without inventing on/off/open/closed status for stateless sources. Access families receive Activity consistently even when a lock has a real current state or an action variant already hides timestamp text.

Keep the original state-aware symbol in the circular button and add the same compact secondary-detail affordance used elsewhere, with a localized semantic name such as Activity for Main gate. Reserve at least 48px. Stop activation propagation and keep primary card dispatch and security gesture owners separate. Do not add an automatic hold shortcut to security controls. Explicit hidden icons remain hidden; previews remain inert.

For a rare affected card already exposing numeric history, use the existing detail shell with Activity selected and an explicit Chart view retaining the original graph source/options. Unaffected switch/climate graph icons and light color icons keep their behavior; do not create an icon-level Color/History chooser. When Activity is opened from an operating popup, use the shared in-sheet detail/Back mechanism, retaining parent scroll/focus, rather than nesting modals.

### 2. Explicit sources with a small additive option

Use `variables.activity_entities: [binary_sensor.gate_contact, binary_sensor.gate_obstruction]` for additional sources. The primary source is already the card entity and must not be copied into the option. Empty or absent means no additional sources. Validate unique textual entity IDs through the shared source/runtime boundary; retain missing references visibly for repair, without replacing them. Deduplicate query targets without rewriting authored lists or order.

Expose a native multi-entity selector for affected access, sensor/status, activation-capable switch/scene and multi-reading paths, and align generated catalog/authoring schema/CLI documentation. Reuse catalog `_field(..., kind='entity', multiple=True)` and existing HA selectors rather than adding an editor framework. Filter/query choices remain transient.

For a multi-reading card, the clicked reading supplies the initial source plus explicitly configured related entities. The Source filter may expose other already configured readings on that card; selecting them expands the explicit query scope. The popup names the selected reading/card and every related source so combined results are understandable. No per-reading service action is introduced.

Inspect all propagation paths. In particular, `card-composition.js`'s current `sceneCard()` does not copy variables into scene children; carry the relevant complete authored options through that shared boundary rather than fixing only the parent wrapper. Access operating children must also retain related-source options. Keep current actions, external popup references and per-occurrence ownership.

### 3. Recorded facts and permitted context

Use a small pure activity model for source identity, classification, normalization, deduplication and filtering, with an on-demand sheet/query module owned by the existing card/popup lifecycle. Proposed module names are `MaraoActivityModel.js` and `MaraoActivity.js`; no new dependency is needed.

Read authenticated Activity/Logbook for semantic events/context and state history for actual transitions, including numeric sensors. Prefer history as the transition stream and use matching reliable context to enrich it; keep recorded requests/custom events distinct. Where only one channel exists, use its available evidence and report coverage. Avoid duplicate state-change rows from the two channels; use source/context/native identities, not guessed proximity between unrelated events.

Normalize only an allowlist: source identity, occurrence time, event kind, reported prior/new state and safe display values/units, optional permitted initiator/origin and stable internal record identity. Never retain or render raw service data, PINs, tokens or arbitrary payloads. No privileged user-directory fetch to resolve actors. Unknown attribution stays unknown; a null user ID does not prove manual/local operation. State/value comparison and source-reported events define meaning; do not invent numeric thresholds or generate synthetic past events from the current timestamp.

Opening/closing transitions can be expanded as recorded details; stable outcomes and problems lead the list. Repeated equal reports and irrelevant attribute updates are excluded, but distinct presses/activations remain distinct. A starting state seeds comparisons without creating a midnight event. Do not infer missing durations or success from absent feedback.

### 4. Date queries, filters and truthful bounds

Default to Today in the HA time zone. Yesterday is the preceding calendar day; Last 7 days means today and the preceding six calendar days. Custom ranges use explicit date/time bounds, rejecting invalid or ambiguous civil times with localized feedback. Reuse applicable civil-time helpers from `MaraoEventModel.js`, without inheriting the camera feed's recent-loaded-only filtering semantics.

Proposed query bound: at most 31 calendar days per custom selection, fetched in bounded calendar-day/source chunks with cancellation and explicit progress. Fetch only on opening or a deliberate range/source change, reuse already loaded coverage, and render an initial 50 matching rows with Load earlier. If a bound stops query coverage, say so and offer continuation/narrowing. Never call a partially queried count the total. Retention and exclusions may make old data unavailable; do not pretend to know the retention cutoff from an empty response.

Apply combined filters to all fetched metadata before display batching:

| Control | Proposed values / rule |
| --- | --- |
| Date | Today, Yesterday, Last 7 days, Custom; previous/next period when valid; no future-only period. |
| Event type | All plus observed domain-appropriate kinds: pressed/activated, opened/closed, locked/unlocked, value changed, recognized problems, availability. |
| Source | Primary and explicitly related sources; show when more than one applies. |
| Origin | Person, automation/script, other identified origin, unknown; classify only from reliable recorded metadata. |
| Specific initiator | Permitted names actually represented in metadata; omit when unsupported. |

Date and event type occupy the compact header. Filters expands remaining controls inside the same sheet with a selected-count indicator and Reset. Do not add duration/after-hours inference in this version. Source failures and inaccessible actor metadata do not remove healthy events. Preserve a clear distinction between no matches, no recorded history, incomplete coverage and a failed read.

### 5. Timeline appearance and lifecycle

Use the existing Marao modal, safe areas, 8px outer gap, rounded corners, column-width centering and close/focus/inert behavior. A stationary title/close area sits above a wrapping two-row filter header; the list alone scrolls. Essential names/events wrap at 320px and supported text/zoom sizes. Keep controls at least 48px and use the existing theme tokens in both themes.

Group newest-first rows under Today/Yesterday/localized dates. Use a subtle divider-color connector, circular event symbols, a strong event label, exact local time and secondary origin/evidence text. Warning/error colors represent actual problems, and state meaning never depends on color alone. Expand details inline with before/after state and permitted context. No unlock/repeat/run controls belong in history. New records must not jump an older scrolled list; offer an explicit new-events affordance if live refresh is provided.

```text
+----------------------------------------+
| Main gate - Activity              [x] |
| [<]          [Today v]             [>] |
| [All events v]             [Filters 0] |
+----------------------------------------+
| Today                                 |
|  * Closed                      09:12  |
|  | Contact reported closed            |
|  * Opened                      09:08  |
|  | Contact reported open              |
|  * Open requested              09:08  |
|    Recorded automation context         |
|             [Load earlier]             |
+----------------------------------------+
```

Attach queries, caches and optional subscriptions to account/dashboard/source/period identity. On close, editing, removal, route/account change or disconnection, cancel or invalidate late work and release listeners. Keep retained parent popup/input/scroll state intact. Errors remain readable with explicit retry; no automatic retry storm. Follow existing unavailable/disconnected-action guards; history must never dispatch a physical action.

### 6. Traceability, examples and verification

Shared runtime: `MaraoCards.js`, `MaraoRuntime.js` localization and existing popup/detail owners. Authoring: `editor.py`, `MaraoSource.js`, native card/editor/composition, authoring schema/metadata and applicable generator passthrough. Theme: reuse tokens; no parallel stylesheet palette. Documentation: add a concise Activity feature page and revise sensor/access/status/switch/scene/glance text where applicable; existing forecast/schedule/chart/camera time content remains documented.

Reuse safe `ha-test/` entities and existing gallery/realistic pages for a button gate with feedback, lock state, sensor update, scene child and conditional reading. Add only a missing helper needed for a concrete case, never fixtures in shipped code. Website previews use fictional activity data and disclose that real history requires HA. Extend `tests/verification-map.js` with one reviewed activity scope rather than selecting every shared-file consumer.

Use small pure-model tests for timestamp semantics, numeric/discrete events, source identity, initial-state exclusion, date/DST boundaries, filters and coverage. Add targeted icon/safety/lifecycle and native-editor/composition preservation assertions to existing suites. The concrete risks are accidental access actuation, leaked action payloads and overwritten options; use focused checks on those paths. No full/mobile matrix or camera playback tests are implied. User handles routine visual review; one targeted safe browser visit is optional if needed to establish icon isolation/modal behavior.

## Risks / Trade-offs

- Timestamp semantics vary by source → classify declared domain/role, preserve substantive times and test button/scene versus timestamp-sensor cases.
- History lacks actor/context or was excluded/purged → preserve unknown attribution and incomplete/empty/error distinctions, without introducing a recorder or promising a complete audit trail.
- Numeric sensors are absent from Activity → include state-history transitions with bounded queries; no invented significance thresholds.
- Explicit linked sources can be unrelated or inaccessible → identify each source and preserve references, without discovery or guessed correlations.
- Icon handlers overlap access actions → stop propagation, retain strict gesture owners and assert zero service calls on every activity interaction.
- The existing sensor specification requires inline last-updated metadata → this delta intentionally replaces that clause. Existing secondary-trigger work excluded access/sensor history; this accepted change expands that scope while preserving its safety and existing chart/color behavior.
- Concurrent glance/close-icon proposals touch shared presentation → preserve their accepted contracts and batch final installation only when those implementations are also authorized.

## Migration Plan

The new optional list is additive to version-1 dashboard settings and current source/config-entry versions; omission requires no rewrite. Inspect supported released configurations, including ordinary v0.23.4 provenance and retained `hc_*` inputs, with independently specified expected round trips. Preserve unknown/raw fields, explicit emptiness, order, action options and user popup layouts. Do not regenerate dashboards or modify immutable archives as a styling/history shortcut. Malformed newly authored values are errors; existing source remains recoverable and untouched until an authorized save.

Use existing exact backup/preflight/stale-save/recovery mechanisms for actual authored configuration writes; the activity query itself is read-only. No backend history proxy or new storage is planned. Rebuild generated catalog/editor/authoring assets from their sources. After final checks, use `prepareFrontend()` on disposable `192.168.0.28` if compatible; use one `ha:sync` only if changed backend/catalog compatibility or required fixtures demand full preparation. Preserve user test configuration/helper state and leave final assets installed.

Rollback restores matching prior package and exact affected configuration only when needed, retaining new option data/recovery and protecting concurrent user edits. Never downgrade a package by stripping the new option or replace a dashboard with starter defaults. Installation failure means not installed / not ready for test. Publication remains a separate unit-only gate when explicitly requested.
