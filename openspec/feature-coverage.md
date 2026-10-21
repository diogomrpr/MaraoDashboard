# Baseline feature coverage

The initial inventory was reviewed against v0.5.1 on 2026-10-09. Updated on
2026-10-11 for the 0.6.0 implementation candidate: ordered editable pages,
explicit room membership, Entity Groups, energy formatting and shared problem
presentation. Linked checks identify coverage; they do not establish a release
or preserved-install pass. This documentation change affects no cards.

The alarm sheet and explicit service-opener work is tracked in [add-alarm-controls-and-service-access-openers](changes/add-alarm-controls-and-service-access-openers/proposal.md). Its focused security checks also cover original appliance warning/command compatibility.

## Shared card catalog

These shared entity cards are entries in [the editor catalog](../custom_components/marao_dashboard/editor.py).
The additional page roles and security controls are covered below.
Each also inherits [mobile layout](specs/mobile-theme-layout/spec.md) and
[state/action rules](specs/entity-state-actions/spec.md). Public options below
are configuration keys, not a second schema; read the catalog, card documentation
and affected runtime before changing their shape.

| Card | Existing behavior/options | Contract |
| --- | --- | --- |
| `hc_camera_card` | HA picture preview, generated events sheet; `popup_hash`, `event_provider`, Frigate camera/instance, Protect media source, `event_limit` | [Camera/history](specs/camera-history-content/spec.md) |
| `hc_light_card` | Toggle, supported brightness, `enable_slider`, `card_color`, `custom_label` | [Values](specs/value-numeric-controls/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_cover_card` | State and position with confirmed fill/target thumb, `card_color`; separate access classification | [Values](specs/value-numeric-controls/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_climate_card` | Mode/current/target, single mode or generated mode sheet, single/range target stepping; graph entity/color, `show_graph`, `show_mode_buttons`, `setpoint_label`, `mode_selector_hash` | [Cards](specs/card-behaviors/spec.md), [values](specs/value-numeric-controls/spec.md), [history](specs/camera-history-content/spec.md) |
| `hc_fan_card` | Toggle and supported percentage, `enable_slider`, `card_color`, `custom_label` | [Values](specs/value-numeric-controls/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_media_card` | State/title/artist, generic/Apple TV popup; artwork, background color, `popup_hash` | [Cards](specs/card-behaviors/spec.md) |
| `hc_access_card` | Locks and door/garage/gate covers, `popup_hash`; strict opening/unlocking and explicit safe closing/locking | [Actions](specs/entity-state-actions/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_sensor_card` | Numeric/binary states, updated date, `hc_card_color`, `on_icon`, `off_icon` | [Cards](specs/card-behaviors/spec.md) |
| `hc_switch_card` | Toggle, `power_entity`, `power_unit`, power graph, active/graph colors and line/fill visibility | [Cards](specs/card-behaviors/spec.md), [history](specs/camera-history-content/spec.md) |
| `hc_number_card` | Native number/input-number min/max/step up/down input | [Values](specs/value-numeric-controls/spec.md) |
| `hc_wallbox_current_card` | Shared current input, up to three `shortcuts` | [Values](specs/value-numeric-controls/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_vacuum_card` | Native start/pause/return capabilities; icon and `action_1`–`action_3` with explicit segment, optional name/icon/service/native data; documented segment command default | [Cards](specs/card-behaviors/spec.md), [command compatibility](../tests/frontend/marao-security.test.js) |
| `hc_battery_card` | Battery thresholds, `on_icon`, `hc_card_color`, neutral unavailable state | [Cards](specs/card-behaviors/spec.md) |
| `hc_dishwasher_card` | Operation, progress, remaining time, program, salt and rinse-aid entities | [Cards](specs/card-behaviors/spec.md) |
| `hc_washing_machine_card` | Running/idle state and domain treatment | [Cards](specs/card-behaviors/spec.md) |
| `hc_graph_card` | Live metric and 24-hour trace; line/fill/icon visibility, graph color/background | [History](specs/camera-history-content/spec.md) |
| `hc_toggle_graph_card` | Metric trace plus independently guarded `toggle_entity`; active/inactive background, content and icon options | [History](specs/camera-history-content/spec.md), [cards](specs/card-behaviors/spec.md) |
| `hc_timeline_card` | Project-owned timeline, optional `timeline_name` | [History](specs/camera-history-content/spec.md) |
| `hc_entity_group_card` | Light, cover, climate and battery summaries with explicit membership, independent popup identity and supported member filters/options | [Cards](specs/card-behaviors/spec.md), [groups](../docs/docs/usage/cards/hc_entity_group_card.md) |
| `hc_navigation_card` | Entity-free page shortcut, label prefix and icon/card colors | [Generation](specs/dashboard-generation/spec.md), [cards](specs/card-behaviors/spec.md) |

Most cards render through [MaraoCards.js](../custom_components/marao_dashboard/frontend/MaraoCards.js).
Generation lives in [generator.py](../custom_components/marao_dashboard/generator.py),
and options are explained in [card documentation](../docs/docs/usage/cards/index.md).
The broad existing action/card regression file is
[marao-climate-card.test.js](../tests/frontend/marao-climate-card.test.js), despite
its name; camera/history/visibility and focused browser checks cover their own paths.

## Additional templates and runtime components

These roles complement the shared entity catalog. The unified page editor exposes
page roles through ordinary section/card descriptors; raw cards remain preserved.

| Public name/component | Existing role | Contract and source/check |
| --- | --- | --- |
| `hc_base_card`, `hc_title_card` | Generic presentation and noninteractive section headings | [Cards](specs/card-behaviors/spec.md); [visibility checks](../tests/frontend/marao-card-visibility.test.js) |
| `hc_header_card`, `hc_weather_card`, `hc_glance_card` | Date/person/air-quality header; condition/temperature/available forecasts; one–three independent named/icon readings | [Cards](specs/card-behaviors/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js) |
| `hc_room_card` | Room navigation, explicit readings and lighting membership; guarded multi-light All off action; approved room-only background state | [Cards](specs/card-behaviors/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js) |
| `hc_scene_card` | Native input-select/select options and authoritative selected state; separate from overview `scene.turn_on` buttons | [Cards](specs/card-behaviors/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js) |
| `hc_security_card`, internal `hc_alarm_controls_card` | Authoritative alarm state, generated capability-aware sheet, transient masked numeric/text code, tap arming and held disarm/bypass | [Alarm change](changes/add-alarm-controls-and-service-access-openers/specs/card-behaviors/spec.md); [security checks](../tests/frontend/marao-security.test.js), [native safe checks](../tests/test-ha-security.js) |
| `hc_media_app_card` | Apple TV source shortcut | [Cards](specs/card-behaviors/spec.md); [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| `hc_access_action_card`, `hc_access_hold_action_card`, `hc_access_slide_action_card` | Explicit service actions, 1.2-second security hold, strict access slide for lock/cover and explicitly selected button/switch/script openers | [Actions](specs/entity-state-actions/spec.md), [opener change](changes/add-alarm-controls-and-service-access-openers/specs/entity-state-actions/spec.md); [security checks](../tests/frontend/marao-security.test.js), [card checks](../tests/frontend/marao-climate-card.test.js) |
| `custom:marao-card`, `custom:marao-navbar-card`, `custom:marao-popup-card` | Shared renderer, floating routes, modal sheet | [Navigation/popups](specs/navigation-popups/spec.md); [MaraoCards.js](../custom_components/marao_dashboard/frontend/MaraoCards.js), [navbar checks](../tests/frontend/marao-navbar-card.test.js) |
| Native card surface lifecycle | Connected surfaces preserve page/sheet scroll during HA updates, including WebKit | [Scroll regression](../tests/test-ha-scroll.js), [surface checks](../tests/frontend/marao-card-visibility.test.js); `--component scroll` |
| `marao-slide-to-open` | Embedded strict-slide element and gesture lifecycle | [Actions](specs/entity-state-actions/spec.md); [MaraoDashboard.js](../custom_components/marao_dashboard/frontend/MaraoDashboard.js) |
| `custom:marao-state-timeline-card`, `custom:marao-energy-period-card` | 24-hour state transitions and day/month period sheets | [History](specs/camera-history-content/spec.md); [history checks](../tests/frontend/marao-history-cards.test.js) |
| `custom:marao-camera-events-card`, `custom:marao-frigate-events-card` | Current event card and compatibility registration; provider selection, list/refresh/back/detail | [Camera/history](specs/camera-history-content/spec.md); [event source](../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js), [event checks](../tests/frontend/marao-frigate-events-card.test.js) |

## Configuration and product operations

Stock Monaco search/replace, contextual completion, native diagnostics/folding
and session continuity use [`json-editor.test.js`](../tests/frontend/json-editor.test.js)
and the focused [`json-editor-checks.js`](../tests/json-editor-checks.js) scenarios.
The safe [JSON draft](../ha-test/json-editor-example.json) uses existing Studio and
Cases entities; runtime card behavior is unchanged.

| Existing surface | Baseline contract | Source/check |
| --- | --- | --- |
| Single-entry integration/config flow, admin editor/WS, generation service/dry run, fingerprinted assets and unload | [Integration lifecycle](specs/integration-lifecycle/spec.md) | [Setup](../custom_components/marao_dashboard/__init__.py), [flow](../custom_components/marao_dashboard/config_flow.py), [setup checks](../tests/components/marao_dashboard/test_init.py) |
| Enabled/visible supported registry discovery, entity/device areas, Home fallback, empty/legacy starter repair | [Integration lifecycle](specs/integration-lifecycle/spec.md) | [Generator](../custom_components/marao_dashboard/generator.py), [generator checks](../tests/components/marao_dashboard/test_generator.py), [setup checks](../tests/components/marao_dashboard/test_init.py) |
| Shared Visual/JSON draft, format/schema/entity help, save/discard/open/history, confirmations | [Builder](specs/visual-builder/spec.md) | [Panel](../frontend_src/MaraoDashboardPanel.js), [model](../frontend_src/editor-model.js), [model checks](../tests/frontend/editor-model.test.js) |
| General name/slug/theme/icon; ordered pages/sections/cards; landing selection; independent navbar pin/order; named page deletion and immediate individual-card deletion | [Builder](specs/visual-builder/spec.md) | [Panel](../frontend_src/MaraoDashboardPanel.js), [model checks](../tests/frontend/editor-model.test.js) |
| Explicit room membership and opt-in area suggestions; versioned legacy snapshots; entity metadata/raw cards; per-section automatic or 1–6 columns; mixed shortcuts | [Builder](specs/visual-builder/spec.md), [generation](specs/dashboard-generation/spec.md) | [Model](../frontend_src/editor-model.js), [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| Editable Home, Rooms/room detail and custom pages; ordinary group/room/navigation/heading cards, independent generated popups and unpinned shortcuts | [Generation](specs/dashboard-generation/spec.md), [cards](specs/card-behaviors/spec.md) | [Generator](../custom_components/marao_dashboard/generator.py), [visibility checks](../tests/frontend/marao-card-visibility.test.js) |
| Security starter cards: alarm, explicit access lists and action entities | [Generation](specs/dashboard-generation/spec.md), [actions](specs/entity-state-actions/spec.md) | [Catalog](../custom_components/marao_dashboard/editor.py), [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| Energy starter cards: house power, month/today energy/cost, configurable unit/precision, loads/toggles, appliances and independent period popups | [Generation](specs/dashboard-generation/spec.md), [history](specs/camera-history-content/spec.md) | [Generator](../custom_components/marao_dashboard/generator.py), [history checks](../tests/frontend/marao-history-cards.test.js) |
| Wallbox starter cards: status, charging power/max current, current input/presets and pause/resume | [Generation](specs/dashboard-generation/spec.md), [values](specs/value-numeric-controls/spec.md) | [Catalog](../custom_components/marao_dashboard/editor.py), [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| Media starter cards: explicit players, editable generic/Apple TV controls/apps, bounded seek and short/long commands | [Builder](specs/visual-builder/spec.md), [cards](specs/card-behaviors/spec.md) | [Panel](../frontend_src/MaraoDashboardPanel.js), [generator checks](../tests/components/marao_dashboard/test_generator.py), [card checks](../tests/frontend/marao-climate-card.test.js) |
| JSON/YAML preservation, custom markers, per-file atomic writes, owned manifest cleanup, save recovery, 20-version history/restore | [Generation](specs/dashboard-generation/spec.md), [integration](specs/integration-lifecycle/spec.md) | [History](../custom_components/marao_dashboard/history.py), [history checks](../tests/components/marao_dashboard/test_history.py), [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| Owned dashboard/theme patches, exact legacy migration, manual Repair, unrelated configuration preservation | [Integration lifecycle](specs/integration-lifecycle/spec.md) | [Patches](../custom_components/marao_dashboard/config_patch.py), [migration](../custom_components/marao_dashboard/legacy_migration.py), [patch checks](../tests/components/marao_dashboard/test_config_patch.py), [update guide](../docs/docs/installation/update.md) |

The realistic unpinned **Studio** fixture combines a title section, a two-column
energy/light section with duplicate light occurrences, an empty drop section, independently configured Media and Energy popups and a raw
card. Home links to it through an entity-free shortcut. The release mobile runner’s
`--pages` option checks every generated view in addition to Cases and popups;
[fixture tests](../tests/frontend/gallery-cases.test.js) retain its composition.

## Cross-cutting decisions and verification

| Decision/contract | Baseline and evidence path |
| --- | --- |
| Blue/navy light/dark palette, Montserrat scaling, full-width summary titles; shared icon/title headers for light/fan/cover/strict openers (including slider-absent variants); touch sizes, contrast and localized states | [Mobile theme/layout](specs/mobile-theme-layout/spec.md), [slider header change](changes/align-slider-card-headers/proposal.md), [prior decisions](project-context.md); [theme](../custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml), [text checks](../tests/frontend/marao-text-scale.test.js), [focused geometry](../tests/test-ha-card-alignment.js) |
| Distinct vector slider surfaces, native input lifetime, iOS shadow reset, independent confirmed/target values, numeric/climate stepping | [Values](specs/value-numeric-controls/spec.md); [slider runner](../tests/test-ha-value-sliders.js) |
| Scoped native header hiding, single-row safe-area navbar with vertical overflow, modal focus/inert/restore and internal scroll/zoom clearance | [Navigation/popups](specs/navigation-popups/spec.md); [dashboard runner](../tests/test-ha-dashboard-e2e.js), [alignment runner](../tests/test-ha-card-alignment.js) |
| Authoritative state, actual-target guards, immediate single dispatch/errors, native offline warning, strong haptics, horizontal-intent slides/cancellation and security holds | [Actions](specs/entity-state-actions/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js), [dashboard runner](../tests/test-ha-dashboard-e2e.js) |
| Loading/empty/error/unavailable history/media, deduplicated on-demand requests, stale-result and removal cleanup | [Camera/history](specs/camera-history-content/spec.md); [history checks](../tests/frontend/marao-history-cards.test.js), [event checks](../tests/frontend/marao-frigate-events-card.test.js) |
| Per-card energy conversion/precision, mixed source units and past nonnumeric states without false conversion errors; numeric metadata failures remain explicit | [Cards](specs/card-behaviors/spec.md), [history](specs/camera-history-content/spec.md); [format checks](../tests/frontend/marao-energy-format.test.js), [safe history fixtures](../ha-test/custom_components/history/__init__.py), [energy browser checks](../tests/test-ha-energy-format.js) |
| One disposable dashboard, exhaustive Cases and realistic counterparts, safe entities/providers, private credentials/artifacts, current-workspace preparation | [Gallery/release](specs/gallery-release-verification/spec.md); [preparation](../ha-test/prepare.js), [dashboard JSON](../ha-test/marao_dashboard_test_dashboard.json), [Cases YAML](../ha-test/dashboard/views/00-card-test.yaml), [coverage](../ha-test/cases.json), [gallery checks](../tests/frontend/gallery-cases.test.js) |
| Mobile/text/theme matrix, final affected-card visual gate, meaningful focused tests, HACS boundary, exact-commit CI and honest limits | [Workflow](specs/repository-workflow/spec.md), [gallery/release](specs/gallery-release-verification/spec.md); [commands](../package.json), [mobile runner](../tests/test-ha-dashboard-accessibility.js), [package checks](../tests/frontend/package-boundary.test.js) |
| Native HA reconnect race and approved temporary exception | [Dated context](project-context.md), [pending change](changes/confirm-home-assistant-reconnect-fix/proposal.md); unresolved; the user-approved exception retains raw native failure/subscription evidence and expires when the fix is stable; other gates still apply |

## Upgrade coverage responsibility

Saved JSON, defaults, generated contracts and APIs require preservation decisions,
historical provenance, independent expected JSON and feature-to-assertion coverage.
The candidate includes [the executable inventory](../ha-test/upgrade/coverage.json),
[historical fixtures](../ha-test/upgrade/fixtures/inventory.json),
[the preserved-install runner](../tests/test-ha-upgrade.js) and
[the release verifier](../tests/verify-release.js). The pending
[upgrade change](changes/ensure-safe-dashboard-upgrades/proposal.md) retains its
first live release tasks until real final-candidate evidence passes.

Every public family and material behavior remains mapped for optional complete
verification. Default release checks cover changed contracts and consumers only.
Required preserved-install checks back up exact installed state, verify affected
expected JSON/recovery and restore the disposable installation. Fresh fixtures
and mocked gates cannot establish a required live upgrade pass. Unaffected
historical formats and all mobile profiles are not implicit release requirements.

## Review outcome and maintenance

The review filled missing builder operations, layouts, guided pages, generation
validation/cleanup/recovery, scene/access distinctions and camera/history detail.
It corrected theme-copy preservation, legacy unmarked YAML migration limits,
climate range stepping, vacuum command defaults and the preview-versus-video
distinction. The 0.6.0 candidate subsequently added the unified page manager
and the changes described above. The upstream reconnect change remains open.

For future tasks, read the linked contracts and source rather than copying every
option into a new spec. Update this map when adding/removing a public family or
surface, update the affected requirements and safe gallery together, and archive
only completed verified changes. Existing documentation is supporting material;
the binding contract wins over stale screenshots/examples. Counts and prior
release results are dated evidence, never substitutes for the next task's checks.

Use `npm run test:affected` (preview with `--plan`) as the default for
implementation, hooks, CI and publication. Include changed features and shared
consumers only. Full-suite and parallel execution require explicit requests;
`npm run test:full -- --parallel` is the comprehensive option. Live upgrade
checks apply only to changed persistence, migration, generated ownership or
installation paths, with affected baselines, expected data, recovery and cleanup.
Reuse validated unchanged scoped evidence and report omitted coverage honestly.
See [focused testing](../docs/docs/development/focused-testing.md).

Visual card movement uses the shared [`movePageCard`](../frontend_src/editor-model.js)
operation and [`editor-drag.js`](../frontend_src/editor-drag.js) Pointer Events handles.
[`canonical-page-model.test.js`](../tests/frontend/canonical-page-model.test.js),
[`editor-drag.test.js`](../tests/frontend/editor-drag.test.js) and the focused
[`editor-drag-checks.js`](../tests/editor-drag-checks.js) scenarios cover boundaries,
section transfers, cancellation, native input, layout and explicit moves.
[`test_page_generation.py`](../tests/components/marao_dashboard/test_page_generation.py)
checks stable sheets/raw/protected content. Source format and save/history APIs
are unchanged; live persistence probes retain exact backups and verify cleanup.

Navbar overflow keeps complete saved navigation lists and uses the shared renderer in generated, native and bounded-preview hosts. [The implementation checklist](changes/support-navbar-overflow/tasks.md), [independent route expectations](../tests/frontend/navbar-overflow.fixture.json), [configuration/history checks](../tests/components/marao_dashboard/test_navbar_overflow.py) and [mobile overflow checks](../tests/test-ha-navbar-overflow.js) cover partitioning, dismissal, focus, read-only interaction and preserved order. Release preparation requires scoped navigation/native/generator preserved-install proof.

- Battery group severity: `entityGroupState.minimumReading`, shared battery palette and problem composition; focused `battery-groups` scope covers boundaries, recovery, safe live helpers and popup reachability.
- Access label geometry: shared `MaraoSlideToOpen`, focused `access-label` scope covers actual same-row text/thumb geometry at narrow/wide widths, both languages and the selected mobile text profiles.
- Visual editor rendering: focused `editor-rendering` scope covers section-local mutation, landing-only initial mounting, independent page expansion, complete unopened source preservation, current coordinates and JSON/drag continuity. Paired timing is private and bound to installed asset hashes.

- Uniform controls: the `control-grid` scope covers shared 174px minimum surfaces,
  equal rows, responsive preferred columns, native/group hosts and preserved
  raw/automatic generation. Publication requires affected-format preserved-install
  proof when generated container types change.
- Factored verification retains reviewed geometry/behavior in one reference theme
  and appearance/state coverage in both themes. Compatible visits share assertions
  and editor alignment aliases canonical geometry. Explicit version-4 reuse
  independently selects current requirements and validates original dependencies,
  environment, captures and cleanup. Full/parallel execution remains explicit;
  final inspection is current. Historical reports/fixtures remain immutable.

## Selected implementation batch: 2026-10-18

- Compact section ownership extends `control-grid` to all owned content families,
  timeline/energy/events and native primary surfaces. Source section boundaries,
  automatic group starts/columns, structural rows and untouched raw dictionaries
  are covered by `test_control_grid.py` and `control-grid-checks.js`; released
  source identity and recovery remain in the existing preservation checks.
- Numeric history details use editable `frontend_src/history-data.js` and
  `history-chart.js`, local generated assets and exact dependency notices.
  `chart-details` selects independent data/renderer tests, local actual Chart.js
  and shared-popup browser checks, energy/history/native and action regressions.
- `editor-preload` covers scoped initial/context/History reads, shared idle JSON
  initialization, foreground promotion, draft preservation and explicit retry.
  `editor-drag` covers steady pickup, deliberate 16px edge approach and 8px
  reversal/cancellation through unit and native-input geometry checks.
- `camera` includes explicit dashboard/popup stream selection and native fullscreen, decoded-frame progress,
  retained video during buffering, native slow-link checks in Chromium/WebKit,
  `MaraoCamera.js`, advancing safe media fixtures, native-loader
  binding, per-offer native signaling ownership, early-authentication/local-ICE
  cancellation and synthetic Chromium/WebKit lifecycle checks. Those local checks do
  not establish actual HA transport, physical Safari or production NVR behavior.

This source/check inventory describes selected work; completion and executed
proof are recorded in each change's implementation record, not inferred here.

- Navbar frontend refresh uses the shared `MaraoNavbarCard` gesture and versioned
  `MaraoFrontendRefresh.js` recovery module. The early `MaraoNavigation.js` and
  lean native navbar register before the deferred `MaraoRuntime.js` content graph.
  `test-navbar-startup-local.js` checks blocked/failed content, zero native navbar
  compilation, all horizontal hold target families, view continuity and teardown.
  The `frontend-refresh` scope covers
  generated/native ownership, cancellation, native no-op fallback, Android
  current-entry reload, missing APIs, deadlines, dirty/offline preservation and
  actual stale-service-worker recovery. Safe examples remain under the one
  `/marao-dashboard` root; no entity actions or persisted-format changes occur.

- Narrow-phone section sizing: `control-grid` checks explicitly require two
  columns at 282px/322px/346px section widths and actual 320px/360px/384px
  normal/bold Rooms pages. Opt-in 384px profiles do not expand unrelated matrices. Existing narrow,
  enlarged-text, zoom, landscape, alignment and safe-gesture checks remain.
- Minimal camera presentation: `camera` plus shared native/model checks cover
  the optional wrapping top title, exact `show_name` preservation, quiet healthy
  playback and conditional in-media recovery without replacing the native player.
