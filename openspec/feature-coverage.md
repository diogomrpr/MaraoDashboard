# Baseline feature coverage

The initial inventory was reviewed against v0.5.1 on 2026-10-09. Updated on
2026-10-11 for the 0.6.0 implementation candidate: ordered editable pages,
explicit room membership, Entity Groups, energy formatting and shared problem
presentation. Linked checks identify coverage; they do not establish a release
or preserved-install pass. This documentation change affects no cards.

## Shared card catalog

These are all 20 entries in [the editor catalog](../custom_components/marao_dashboard/editor.py).
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
| `hc_vacuum_card` | Native start/pause/return capabilities; icon and `action_1`–`action_3` with explicit segment, optional name/icon/service; documented segment command default | [Cards](specs/card-behaviors/spec.md) |
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
| `hc_security_card` | Alarm state presentation; no promise of a separate built-in alarm keypad | [Cards](specs/card-behaviors/spec.md), [actions](specs/entity-state-actions/spec.md) |
| `hc_media_app_card` | Apple TV source shortcut | [Cards](specs/card-behaviors/spec.md); [generator checks](../tests/components/marao_dashboard/test_generator.py) |
| `hc_access_action_card`, `hc_access_hold_action_card`, `hc_access_slide_action_card` | Explicit service actions, 1.2-second security hold, strict access slide | [Actions](specs/entity-state-actions/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js) |
| `custom:marao-card`, `custom:marao-navbar-card`, `custom:marao-popup-card` | Shared renderer, floating routes, modal sheet | [Navigation/popups](specs/navigation-popups/spec.md); [MaraoCards.js](../custom_components/marao_dashboard/frontend/MaraoCards.js), [navbar checks](../tests/frontend/marao-navbar-card.test.js) |
| `marao-slide-to-open` | Embedded strict-slide element and gesture lifecycle | [Actions](specs/entity-state-actions/spec.md); [MaraoDashboard.js](../custom_components/marao_dashboard/frontend/MaraoDashboard.js) |
| `custom:marao-state-timeline-card`, `custom:marao-energy-period-card` | 24-hour state transitions and day/month period sheets | [History](specs/camera-history-content/spec.md); [history checks](../tests/frontend/marao-history-cards.test.js) |
| `custom:marao-camera-events-card`, `custom:marao-frigate-events-card` | Current event card and compatibility registration; provider selection, list/refresh/back/detail | [Camera/history](specs/camera-history-content/spec.md); [event source](../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js), [event checks](../tests/frontend/marao-frigate-events-card.test.js) |

## Configuration and product operations

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
energy/light section, independently configured Media and Energy popups and a raw
card. Home links to it through an entity-free shortcut. The release mobile runner’s
`--pages` option checks every generated view in addition to Cases and popups;
[fixture tests](../tests/frontend/gallery-cases.test.js) retain its composition.

## Cross-cutting decisions and verification

| Decision/contract | Baseline and evidence path |
| --- | --- |
| Blue/navy light/dark palette, Montserrat scaling, full-width summary titles/icons below, touch sizes, contrast and localized states | [Mobile theme/layout](specs/mobile-theme-layout/spec.md), [prior decisions](project-context.md); [theme](../custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml), [text checks](../tests/frontend/marao-text-scale.test.js) |
| Distinct vector slider surfaces, native input lifetime, iOS shadow reset, independent confirmed/target values, numeric/climate stepping | [Values](specs/value-numeric-controls/spec.md); [slider runner](../tests/test-ha-value-sliders.js) |
| Scoped native header hiding, five-entry safe-area navbar, modal focus/inert/restore and internal scroll/zoom clearance | [Navigation/popups](specs/navigation-popups/spec.md); [dashboard runner](../tests/test-ha-dashboard-e2e.js), [alignment runner](../tests/test-ha-card-alignment.js) |
| Authoritative state, actual-target guards, immediate single dispatch/errors, native offline warning, strong haptics, horizontal-intent slides/cancellation and security holds | [Actions](specs/entity-state-actions/spec.md); [card checks](../tests/frontend/marao-climate-card.test.js), [dashboard runner](../tests/test-ha-dashboard-e2e.js) |
| Loading/empty/error/unavailable history/media, deduplicated on-demand requests, stale-result and removal cleanup | [Camera/history](specs/camera-history-content/spec.md); [history checks](../tests/frontend/marao-history-cards.test.js), [event checks](../tests/frontend/marao-frigate-events-card.test.js) |
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

Every public family and material behavior must remain mapped. The scenario backs
up the installed disposable state, verifies the prior package and supported
historical formats before explicit editor additions, checks preservation,
features/mobile layouts and failure recovery, then requires actual upgraded
visual review and verified cleanup. Fresh-fixture checks and mocked gate tests
cannot establish upgrade success. Run this scenario only during explicit release
preparation; missing, stale or incomplete evidence blocks versioned publication.

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

The user-approved 2026-10-13 verification policy uses one shared mobile layout
matrix per release, distinct interactions once (device repeats for gestures),
independent preservation/recovery for all seven baselines and targeted browser
checks for other distinct formats. Manual review covers representative changed
components and difficult layouts; failure screenshots remain mandatory.
Publication may reuse complete exact-candidate preserved-install browser evidence
only after private capture, coverage, cleanup and restored-install checks.
