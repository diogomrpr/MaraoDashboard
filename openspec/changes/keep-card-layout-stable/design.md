## Baseline and acceptance

Start: `d85209ce066b6a8039905e3c23395b0f36b54a18`, clean tree.
Snapshot: `/private/tmp/marao-stable-card-layout.json`.
At a constant viewport/configuration, a card's outer dimensions must survive
loading → ready → changed state → unavailable/error → recovery. No newly appended
feedback rows. Loading placeholders occupy the useful layout, not a taller
worst-case error layout. Long secondary text is concise with full detail on tap.
User confirmed both dashboard and popup scope, and compact tappable details.

## Shared owners and review

| Families | Existing source of movement | Intended composition |
| --- | --- | --- |
| Base, sensor, battery, switch, navigation, groups | Missing state/details; appended problems | Stable reading slot; feedback replaces content |
| Room, title, header, glance | Availability row; variable reading text | Configured title/readings remain; compact feedback |
| Light, fan, cover, access, numeric, Wallbox | Missing capabilities/value removes controls | Persistent disabled control shell, no stale readings |
| Climate | Missing temperature/setpoint; appended pending | Reserved measured/target slots; pending replaces mode detail |
| Media, apps | Metadata only while playing; error row | Reserved secondary line; aspect-ratio app tile |
| Weather, dishwasher, washing machine, vacuum | Conditional forecast/warnings/actions | Configured slots; warnings replace normal detail |
| Alarm controls and standalone access slide | Added error paragraph | Feedback inside existing state/track footprint |
| Graph, timeline, energy, power/history details | Plot/summary/legend removed during loading/errors | Persistent plot, statistics and configured device slots |
| Camera live/events | Loading/list/error swaps; variable media geometry | Bounded scrollable event viewport, aspect-ratio media and stable feedback |
| Native wrappers, popup and section hosts | Short loading paragraph before async mount | Family-shaped loading content and retained mounted cards |

Keep authoritative state and all existing safety/dispatch guards. Retain only
presentation metadata when an unavailable entity drops attributes, never stale
readings. Use the existing popup for full reported messages and secondary text.
Geometry derives from configuration, responsive typography and useful control
slots, not a page-wide maximum or an ever-growing measured-height cache.

## Verification

Use existing unit harnesses for changed rendering/availability/history behavior,
plus a small geometry regression for state transitions where useful. This is a
full source review, not permission for the full historical test suite. Build and
install final frontend assets once on disposable `192.168.0.28`, preserving its
configuration and safe helper state. Do not exercise real devices.

## Approved compact controls

Climate choices use the existing themed dropdown; weather uses one forecast row.
The camera event viewer keeps a useful viewport instead of reserving a large
blank list for the maximum event count. Error details use the shared modal.
Configuration keys, defaults, service targets and stored dashboards are unchanged.

## Completion evidence

- Reviewed all shared card owners listed above; live camera already uses a fixed
  aspect-ratio stage, and title/navigation-only cards have no asynchronous rows.
- 290 scoped Node tests passed across card rendering, climate, native adapters,
  security guards, control grids, camera-event handling and history/power behavior.
- A single 390px synthetic browser regression passed 28 geometry cases: 23 card
  families, three chart layouts and two native wrappers. It also verified that
  long error details stay within the sheet and preserve the parent popup.
- The generated frontend build and strict OpenSpec validation passed.
- Installed on disposable `192.168.0.28`; helper verified all 44 current assets and
  readiness, frontend identity `c3f6f262bf4887be`.
- No physical-phone, full mobile matrix, stream/HLS, migration or publication
  tests were run. Those were outside this frontend-only development scope. The
  user should watch card positions while helpers update, dropdown use and error
  recovery in dashboard/popups, and the compact camera event viewport.
