# Native camera lifecycle

`hc_camera_card` keeps its existing configuration and generated event popup.
`MaraoCards.js` creates a camera-local `CameraPlayback` from `MaraoCamera.js` only
for a connected runtime card. The player's slot is a retained direct child of
the same `ha-card`; surrounding content may update without disconnecting either
the surface or the native player. Ordinary metadata, language, theme and
unrelated HA updates forward fresh `stateObj`/`hass` without starting a stream.
Entities without HA's advertised `CameraEntityFeature.STREAM` bit keep the
labelled Marao snapshot directly, without creating a native MJPEG/image session.
This matches the native capability gate; stream-capability changes reconcile
the current camera once.

The HA still is independent from initialization. It stays above the connected,
visible native host in a reserved 16:9 stage while playback loads. Only standard
video events with advancing `currentTime` remove the poster and show `Live`.
A late/failed/missing still cannot stall or overwrite live video. Retry and
eligible lifecycle recovery repeat this path. No pixels, credentials, transport
URLs or private player methods are inspected.

Native registration uses `loadCardHelpers()` and `importMoreInfoControl('camera')`
where exposed, otherwise a detached picture-entity card used solely to register
elements. It receives no HA object and is never mounted. Registration is bounded
to 10 seconds; playback has a 30-second attempt. Failure is latched for explicit
retry, without wrapper polling. Visibility, ancestry, document state and removal
release the native host and invalidate asynchronous completions independently
for each card. Editor previews never initialize native media.

The compatibility bridge follows open shadow roots under `ha-camera-stream` to
the active standard `video` element, rebinding when native transport changes.
It keeps audio muted and inline flags set before connection, hides native small
controls, and uses standard `play()` once after media readiness if still paused.
The public `posterUrl` input on native HLS/WebRTC transports receives an empty
string as soon as the transport appears. HA's parent later assigns its asynchronously
resolved thumbnail to that input; clearing it after video rendering starts and
cancels a duplicate request. A per-instance public accessor delegates all writes
as empty strings through the original native reactive setter and retains its
getter. Marao owns the single current still until video advances. No native
prototype, private field, transport method or unrelated instance is patched.
An incompatible non-extensible transport or non-configurable public input produces
the bounded compatibility error instead of an observer exception.
Recognized `NotAllowedError` exposes the 48px **Start live view** action; that
button calls the existing video's `play()` synchronously in the user gesture.
Other failures retain a labelled snapshot/reason and applicable **Retry**.
Native image/MJPEG fallback is a preview, never proof of advancing video.
Playback/retry buttons stop propagation; the configured card event action stays
separate and dispatches once.

Upstream contracts rechecked on 2026-10-18:

- [ha-camera-stream.ts](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-camera-stream.ts): stateObj, muted/controls/fit properties, current HA contexts and transport hosts.
- [ha-hls-player.ts](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-hls-player.ts): open standard video, autoplay/playsinline, stream alerts and disconnect cleanup.
- [ha-web-rtc-player.ts](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-web-rtc-player.ts): native WebRTC ownership and media host.

The older `hass` property receives the same current HA data with camera-local
signaling for backward compatibility. Current native `hassConnection`,
`hassApi` and legacy `connection` context requests are supplied only within the
owned player subtree; other contexts continue through the real dashboard ancestry.
The open-shadow DOM bridge is an upstream compatibility dependency. A player
that does not expose compatible video receives a bounded visible error.

## Focused offline evidence

Run `node --test tests/frontend/marao-camera-live.test.js` and
`node tests/test-camera-live-local.js` through the camera affected selection.
The latter serves repository assets on loopback only, uses clearly identified
native-host contract doubles and plays the separate synthetic `live.mp4` in
Chromium and Playwright WebKit. It never reads private HA configuration or calls
preparation, services or remote endpoints. `ha-test/generate-camera-live.js`
regenerates that moving block clip locally; the original SVG and recorded-event
clip remain dedicated to their previous tests. The disposable native camera uses
`marao_test_camera/live.py` to remux the clip continuously as clocked MPEG-TS with
monotonic timestamps, through Home Assistant's existing PyAV stream dependency.
Its unauthenticated source accepts only physical loopback sockets, admits at
most four safe source/recovery connections and bounds each output queue. Native
client disconnection cancels the producer and closes its remux/input contexts;
a finite MP4 is never supplied directly to HA's live stream worker.

The harness records actual media-time advancement, poster handoff, host identity,
retry/lifecycle recovery, inert previews, independent event action and selected
mobile/text layouts. Representative success captures and private evidence live
under ignored `ha-test/.artifacts/camera-live-local/`.

The feedback row owns its touch area even when automatic recovery removes its
button during a gesture. Its reserved height and pointer handling prevent that
tap from falling through to the camera's event action. The local mobile touch
regression removes the button on pointer-down and verifies that the page hash
stays unchanged in Chromium and WebKit; the normal event action still works.

Local contract doubles do not prove native Home Assistant transport. The selected
native camera checks run separately against disposable `192.168.0.28` with safe
synthetic media, including Chromium mobile profiles and Playwright WebKit.
WebKit is not actual Safari or iPhone hardware, and synthetic event/Protect
contracts do not establish real UniFi Protect interoperability. No real camera
or production target is part of these checks.

Native media assertions capture terminal state and progress atomically. A native
HLS-to-WebRTC selection can change the video clock; advancement must occur on one
video within the original deadline while its Marao host and generation remain
unchanged. Ordinary metadata checks freeze the owned candidate inventory at the
browser-task boundary, require the exact current video synchronously through the
writes, and then require actual advancement of that video or a candidate already
present at that boundary. Native host, generation, surface, configuration, current
HA data and stream-request count remain invariant; a fresh video/transport cannot
be accepted by rebasing the inventory. Native negotiation need not finish before
metadata is tested.

The original native acceptance blocker was a reproduced Home Assistant signaling race.
The sanitized `run-d3ZKWU` trace records successful unsubscribe acknowledgement
for safe WebRTC subscription 93, followed 34–78 ms later by nine events for that
retired subscription and the corresponding native warnings. A separate
`run-g2OB0h` native-editor session reproduced the same ordering for subscription
112, 29–72 ms after acknowledgement. These warnings remain failures; this is
different from the permitted reconnect exception. Successful later visits do not
establish a fix. Those historical failures remain intact.

The instance reports Home Assistant 2026.10.0. The matching official source
forwards camera events without a retired-subscription check, acknowledges
unsubscribe after invoking its synchronous callback, and schedules go2rtc session
closure asynchronously: [camera signaling](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/camera/webrtc.py#L243),
[unsubscribe](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/websocket_api/commands.py#L239),
[go2rtc cleanup](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/go2rtc/__init__.py#L298).
The deployed backend bytes were not independently verified. The observed ordering
and matching source support an upstream cleanup race; Marao has no public native
API to drain that signaling work before release.

## Camera-owned signaling connections

`CameraSignaling` gives each native WebRTC offer its own authenticated connection,
using the installed native connection class and its public `options.createSocket`,
`subscribeMessage`, `sendMessagePromise` and `close` interfaces. Authentication
remains HA-owned; Marao neither reads nor stores tokens. The connection opens only
when the native player requests an offer, so HLS-only and still-only cameras add
no connection. Native transport selection, media negotiation and playback remain
unchanged; no native prototype or private player method is patched.

The unsubscribe returned to the native player closes that offer's whole socket.
HA then retires the session through connection teardown, so a late provider event
cannot target an ID removed from the shared dashboard connection. Hiding,
removing or invalidating a card also closes every owned socket immediately;
authentication completing after disposal closes before sending an offer. Duplicate
cards and new native offers have independent connections. No grace timer,
retired-subscription sink, warning filter or transport override is used.

Local ICE candidates use the same owned connection as their session. Native
cleanup cancels queued local candidates for the exact retired session; unrelated
or unknown sessions remain errors. An already-sent candidate is canceled only
for native connection-lost code 3 after explicit teardown; active connection
loss and server errors remain failures. Unexpected channel loss ends
the offer and exposes the existing readable Retry path instead of reconnecting a
retired offer. Other camera/API calls retain HA's normal API. Unsupported native
connection APIs produce the bounded compatibility/error path.

The ownership repair passed its focused gate on 2026-10-19: 14 serial offline
checks, 11 native HA visits covering the selected phone/text/zoom profiles,
representative themes and WebKit, plus two final recovery-control inspections.
Saved dashboard sections, source, generated files, History and settings stayed
unchanged. Physical phones, actual Safari and real Protect remain untested.

The stock `picture-entity` card delegates through `hui-image` to the same
`ha-camera-stream` ([stock card](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/cards/hui-picture-entity-card.ts),
[image host](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/components/hui-image.ts)).
Its ordinary/early-removal comparison was clean. A separate controlled replay
held actual native candidate messages until after unsubscribe acknowledgement:
the unmodified stock card produced eight unknown-subscription warnings. The
final Marao module closed its owned channel with eight candidates held and
produced zero warnings/errors. This is an explicit replay of the original
failure's ordering, not a claim that an unmodified stock card spontaneously
reproduced it or that Home Assistant's backend was fixed. Historical failures
remain intact; the Marao release blocker is resolved without an exception.

The test-only request ledger retains every failed request. Cancellation proof
requires exact document, native XHR, safe stream session, native abort caller and
a commanded release or independently proved lifecycle transition. Its HLS grammar
covers playlists, numeric media segments and the exact initialization fragment.
A native transport handoff additionally proves retained ownership and advancing
media, including the exact already-existing selected WebRTC sibling where relevant.
Images, modules, unrelated media and unproved cancellations remain failures.
`MARAO_CAMERA_SUBSCRIPTION_DIAGNOSTIC=1` adds sanitized command IDs/types,
unsubscribe targets, result codes, native callers and lifecycle boundaries; it
never records SDP, media payloads or authentication data. Warnings still fail.
