---
title: Test gallery coverage
layout: page
parent: Development
nav_order: 5
---

# Test gallery coverage

The disposable Home Assistant exposes one Marao dashboard at
`/marao-dashboard`. Its normal Home, Rooms, Security, Energy, Wallbox, Media,
Appliances, and room-detail views exercise realistic generated layouts. The
Cases view at `/marao-dashboard/card-test` is the exhaustive visual contract.
All routes and popups stay within that dashboard.

The two-column access examples reuse the safe lock and open-only helpers. Narrow
slide labels balance wrapped words above the thumb, retain the normal contrasting border when
focused, and preserve the same gesture and cancellation rules. Retry buttons on
history, graph and media cards follow the shared secondary text size and weight,
including enlarged and bold text.
Energy and Timeline Retry sheets use the same safe history-error source as their
inline examples and expose popup scrolling, focus and text scaling.

The room fixtures use format 1 with explicit selections and stable
`marao_fixture_*` suggestion areas. Living Room has an unused safe light candidate;
Utility Room supplies an off-room battery with a specialized card; Empty Room
retains an empty list with an associated area. Cases shows the candidate light's
state. Preparation assigns only `marao_dashboard_test_*` registry entities to
these fixture areas. `node tests/test-ha-editor.js --rooms --matrix` checks both
Add tabs, search, prefill, cancellation, duplicate blocking and deliberate
metadata loading/error/retry while preserving the unsaved draft.

The canonical configuration lives in
`ha-test/marao_dashboard_test_dashboard.json`; safe entities and state controls
live in `ha-test/marao_dashboard_card_test_helpers.yaml`. The Cases layout lives
in `ha-test/dashboard/views/00-card-test.yaml`. `ha-test/cases.json` records stable
state coverage, and `ha-test/cases.js` expands it into independent examples and
safe entities during preparation. A new or changed card
must update this directory in the same change. Cover every materially distinct
appearance, state, action, option count, and popup/layout behavior, rather than
duplicating equivalent custom values in a Cartesian matrix.

| Card or component | Behaviors covered |
| --- | --- |
| Header, title, weather, glance, base | Primary, secondary, multi-entity, and neutral presentation |
| Shared title layout | Long titles above icons, light sliders, climate modes/steppers, numeric and Wallbox controls, media apps, weather, glance and camera previews; separate timeline, energy and event headers; realistic room lighting and readings; browser measurements of full content width and title-first order |
| Light | State colors, brightness slider, tap control, explicit no-slider presentation, and native on/off-only capability detection |
| Cover and access | Position slider, open/closed state, locking/unlocking/opening/closing presentations, lock popup, slide-to-open, direct open-only action |
| Climate | Heat, cool, heat/cool, auto, dry, fan-only, off; single-mode tap; multi-mode popup; single and fractional dual target steppers; current temperature |
| Fan | Percentage slider, plain toggle behavior, and single-speed capability detection |
| Shared value slider | Independent minimum, middle, and maximum examples for light, fan, and cover; soft blue cards, pale tracks, white controls, shared vector curves with thin outlines, and neutral disabled fills in both themes; inspect endpoints at native 2×/3× resolution; real mouse/touch drags across HA updates and cancellation use the independent middle fixtures; the fixed-height Value slider touch tests popup reuses those safe middle fixtures to check native touch defaults and iOS thumb shadow resets while scrolling internally |
| Camera | Synthetic local live feed, Frigate/UniFi events, loading/empty/provider/detail errors, and disabled neutral event cards |
| Media / Apple TV | Generic player, Apple TV summary, two-column app shortcuts, icon-only remote controls, bounded relative seek, short/long remote commands with cancellation, haptics; hold progress is invisible at rest and visible only during the gesture |
| Sensor and battery | Measurement, unit, last-updated metadata, configured icons, low/medium/full battery thresholds, unknown and unavailable controls |
| Switch and graph | Project-owned 24-hour background trace, live numeric reading, optional line/fill, related toggle, graph-with-control layouts, and empty/loading/failed history |
| Timeline | State-transition history, neutral states, empty results, delayed and malformed responses |
| Scene and number | One through five actual selectable scene options and shared numeric up/down control |
| Wallbox current | Large current value, up/down control, and zero/one/two/three shortcut layouts |
| Vacuum | Docked, cleaning, paused, returning, and error states; native start/pause/return controls; three segment commands against an in-memory fixture, including a realistic utility-room example |
| Dishwasher | Progress, remaining time, program, salt, rinse-aid, and operation states |
| Washing machine | Running and idle states |
| Navigation, room, and popup cards | Self-contained page navigation; compact two-column navigation with the Portuguese overview titles across the full width and icons below; accurate multi-entity summaries including active secondary, unavailable primary, and entirely unavailable groups; normal room lighting through background only with localized accessible status, preserved custom labels, room-wide active-secondary/all-off/empty and partial/all-unavailable lighting, compact icon-only lights-off controls over safe groups, independent navigation during connection loss, full-width long room titles and deliberately cropped bed/door/garage decoration, auto-height and fixed-height centered popovers, internal scrolling at 200% zoom, close/focus behavior |
| Energy period cards | Month/day value cards, graph popovers, previous-period navigation, neutral states, empty/loading/error history; summary availability reasons and Retry controls are checked against the shared scalable typography in every mobile profile |
| Entity Group | Light, cover, battery and climate; All/Active filters; independent membership and repeated same-type groups; empty/inactive/one/multiple active members; partial/full unknown or unavailable states; invalid and 20/80% battery readings; dimmable/on-off lights, blinds and strict access covers, thermostat modes and single/dual targets. Empty, loading and failed popup messages use the shared scalable size and weight; native popup checks verify their computed typography and wrapping. Explicit examples also appear on Overview and Living Room. |
| Security hold actions | Independent alarm states, a continuous 1.2-second border gesture, no idle stroke, early-release/departure/cancellation checks, and exactly one completed dispatch |

The state-simulator controls in Cases expose the selectable weather, alarm,
vacuum, dishwasher, light (including multiple room lights), switch, lock,
appliance, slider, temperature, and battery states without needing Developer
Tools. Fixed fake entities keep
special neutral, threshold, and transition appearances visible side by side.
Every action targets a template, input, or in-memory fake entity in the
disposable instance; the simulated Apple TV and remote never contact hardware.

The `editablePageCases` collection adds ordinary editable descriptors to Cases:
native scene activation alongside a safe input toggle, an explicitly empty
scene collection, independent daily and monthly readings of the same sensor,
and a Media app button. The realistic Home page includes the same native scene;
Energy and Media retain their period/app counterparts. The scene changes only
`input_boolean.marao_dashboard_test_one`; preparation activates it once and
returns that helper to off. All realistic and Cases views use the canonical
ordered format-2 pages on `/marao-dashboard`.
The unpinned Studio page mixes a heading, two-column energy/lighting controls,
television and retained raw content. Its Home shortcut, renamed controls and
reduced app list exercise saved customization. Media and Energy reuse the same
safe entities with independent Studio popups. The release mobile check uses
`--pages` to inspect every realistic view and popup in each profile and theme.
Stable states have separate examples so they can be inspected side by side.
Popup checks verify that touch activation identifies its opening control and
that closing restores the current control after native card rendering or HA
state updates replace it.
Loading and service errors have repeatable manual examples. The three named
history fixtures return empty data, delay a response by five seconds, or return
deliberately malformed JSON to exercise the normal parsing-error boundary.
Only authenticated requests for those exact fixture IDs are intercepted;
ordinary Recorder history is unchanged. The `Reported action error` card calls
a fixture service that rejects the action without changing a device. Turn off `Simulate safe action failure` and retry that card to verify its error clears after one successful response. Reload
Cases to repeat loading states. Disconnection is exercised through the browser
connection by the automated runner.

Fixture integrations under `ha-test/custom_components/` provide synthetic
camera media, media-player/remote behavior, a native open-only cover, and the standard provider interfaces
used by the real camera-event cards. Preparation refuses to overwrite a real
provider integration. None of these fixtures or media are part of HACS installs.
The open-only door advertises only Home Assistant's OPEN capability and changes
its own input-boolean helper. Reset that helper to repeat opening; the cover has
no close or position service. Preparation retires only its exact former template
registry identity so existing gallery and realistic-page references remain stable.
The production runtime uses the same Frigate and UniFi interfaces for both
real integrations and these disposable fixtures.

Preparation composes Cases as an ordinary `pages.custom` entry and lets the
generator supply its navigation. Keep gallery YAML free of separate navbar
includes, and keep every absolute route inside `/marao-dashboard`.

Static validation checks that the editor catalog remains represented, the
realistic page set stays populated, no gallery asset enters the HACS archive,
and every absolute or popup route resolves inside `/marao-dashboard`. Browser
validation visits every view and rejects a second Marao Lovelace dashboard.
Run `npm run test:ha:e2e -- --screenshots` only when a full visual pass is
needed; it captures each view in an isolated mobile browser context under
`tests/.artifacts/dashboard-e2e` so navigation cannot leak Home Assistant history
subscriptions between screenshots.

The binary presentation cases cover static and hidden icon pairs, prefix removal, useful labels with power readings, known all-off summaries, numeric toggle graphs and binary composites with independent readings. Isolated motion and running/idle appliance helpers include neutral and error states. The realistic living-room light also retains a substantive configured label.

Whole-card problem cases include hidden normal state/icon fields, custom colors, a usable player with an unavailable remote, partial room members, configured dishwasher warnings and an ordinary selector whose `error` option is not a fault. Safe camera and artwork examples use malformed synthetic SVG data to exercise native image decode errors without failed HTTP requests or console suppression. `Simulate media failure` controls recovery; camera event media also has a repeatable resource failure. Representative camera feedback appears on Entrance and action feedback on Appliances.

### Energy reading format cases

The canonical Cases gallery includes source defaults and independent converted
copies, Auto and 0/2/6 decimals, signed export, true zero, currency precision,
secondary switch power, a separately bound graph source, unavailable readings,
and missing/incompatible unit metadata. Three period summaries open their matching
sheets with the same options. These use only safe template sensors; the isolated
History fixture returns unit-bearing Wh/J and W/kW records without changing
Recorder data. Missing and incompatible historical units deliberately show a
readable formatting error while retaining the live reading. The missing-unit example starts with valid Wh metadata; its safe fixture action
removes/restores that unit after generation. The Visual builder rejects an
explicit conversion without source metadata before saving. Fixture reset restores
the unit before generation.

The generated Energy, Wallbox and Living Room pages include representative
configured readings. The room has two occurrences of one source with distinct
unit/precision choices. Existing source-default and legacy label-only examples
remain visible. All examples stay under `/marao-dashboard`.
