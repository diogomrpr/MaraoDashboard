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
| Light | State colors, brightness slider, tap control, explicit no-slider presentation, and native on/off-only capability detection |
| Cover and access | Position slider, open/closed state, locking/unlocking/opening/closing presentations, lock popup, slide-to-open, direct open-only action |
| Climate | Heat, cool, heat/cool, auto, dry, fan-only, off; single-mode tap; multi-mode popup; single and dual target steppers; current temperature |
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
| Navigation, room, and popup cards | Self-contained page navigation; compact two-column navigation with the Portuguese overview titles across the full width and icons below; accurate multi-entity summaries including active secondary, unavailable primary, and entirely unavailable groups; room controls, all-lights-off action over available and mixed-availability groups, auto-height and fixed-height centered popovers, internal scrolling at 200% zoom, close/focus behavior |
| Energy period cards | Month/day value cards, graph popovers, previous-period navigation, neutral states, empty/loading/error history |
| Security hold actions | Independent alarm states, a continuous 1.2-second border gesture, no idle stroke, early-release/departure/cancellation checks, and exactly one completed dispatch |

The state-simulator controls in Cases expose the selectable weather, alarm,
vacuum, dishwasher, light (including multiple room lights), switch, lock,
appliance, slider, temperature, and battery states without needing Developer
Tools. Fixed fake entities keep
special neutral, threshold, and transition appearances visible side by side.
Every action targets a template, input, or in-memory fake entity in the
disposable instance; the simulated Apple TV and remote never contact hardware.
Stable states have separate examples so they can be inspected side by side.
Popup checks verify that touch activation identifies its opening control and
that closing restores the current control after native card rendering or HA
state updates replace it.
Loading and service errors have repeatable manual examples. The three named
history fixtures return empty data, delay a response by five seconds, or return
deliberately malformed JSON to exercise the normal parsing-error boundary.
Only authenticated requests for those exact fixture IDs are intercepted;
ordinary Recorder history is unchanged. The `Reported action error` card calls
a fixture service that rejects the action without changing a device. Reload
Cases to repeat loading states. Disconnection is exercised through the browser
connection by the automated runner.

Fixture integrations under `ha-test/custom_components/` provide synthetic
camera media, media-player/remote behavior, and the standard provider interfaces
used by the real camera-event cards. Preparation refuses to overwrite a real
provider integration. None of these fixtures or media are part of HACS installs.
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
