# What reaches the first usable card

The test opened the saved overview on disposable Home Assistant. The benchmark stops when an on-screen card has real content and an enabled control that the browser can hit. A navbar, a spinner or a Home Assistant error card cannot satisfy it. Both marks are confirmed after two animation frames.

## Dashboard data

The previous build kept the history of the dashboard conversion inside the active dashboard. Home Assistant returned it with every visit, including a warm one. On this installation, moving that history to HA's shared frontend storage reduced the saved dashboard from 1,775,298 to 570,100 UTF-8 JSON bytes. The history occupied 1,205,303 bytes. A 105-byte reference now identifies it by length and checksum. The migration tool verified the archive on disk before updating the ordinary dashboard. A standalone backup can reproduce the original document. No view, card, setting, or unknown field outside the history changed.

| Contents of the current saved dashboard | JSON bytes |
| --- | ---: |
| Open overview | 25,178 |
| Other 67 views | 543,392 |
| Complete views array, including separators | 568,571 |
| Navbar configuration | 1,293 |
| History reference | 105 |
| Remaining Marao settings | 63 |

These are independently serialized fields, so the rows do not sum to the size of the root document. The open view accounts for about 4.4% of that document. The released HA WebSocket implementation accepts a dashboard path and an optional fresh-read flag for `lovelace/config`. It returns the whole dashboard. Native view editing and direct navigation continue to use that same document. Implementing active-view-only downloads would require a different storage or presentation contract.

The server stores the record in HA's shared frontend data store. HA may load that store into server memory when another feature accesses it. The browser requests only individual keys. The startup trace specifically checks for archive reads, writes and subscriptions.

An ordinary visit leaves existing version 1 and 2 dashboards untouched. An administrator can download the original and explicitly move its history. New conversions use separate storage before the dashboard is saved. Opening settings on a version 3 dashboard does not read the archive. Export reads the latest saved dashboard and archive, checks their integrity, then produces a self-contained file. See [conversion and recovery](../../../docs/docs/installation/native-migration.md).

## Marao code and assets

| Needed for the first view | Loaded later |
| --- | --- |
| Versioned resource entry, resolver, basic navigation, current navbar configuration, active theme and host discovery | Settings panel, editable settings forms and native card editor on open |
| Ordinary card registration, labels required by HA's synchronous card-picker API, synchronous card validation, visible state and action handling | Full editor catalog, error translation dictionary, conversion tools and historical source |
| Protection when opening a managed popup view directly and an event listener for confirmed dashboard saves | Managed-view inspection on that route and reconciliation after a confirmed save |
| View layout, card shell, popup trigger, focus and gesture handling | Popup contents and detail renderers when opened, history queries and interactive charts when needed |
| A direct specialty card can request its own renderer | Remaining specialty modules after the first visible card, camera preloading only for an explicitly opted-in camera |

The package's ordinary-card adapter fell from 48,856 to 28,412 gzip bytes, the host bootstrap from 9,377 to 4,140, and the basic card renderer and its helper together from 87,218 to 81,912. These figures compare the actual fingerprinted files at gzip level 9. Browser totals below also include other resources. The energy renderer owns its calendar and consumption calculations. Opening a group or an embedded native popup loads its detailed renderer. Opening dishwasher controls loads the matching panel. Chart switching in the activity sheet uses the already requested activity module.

A native wrapper mounted below the fold waits for its placeholder to enter the viewport or for the first screen to be ready. The startup scheduler observes visible card surfaces. After paint it hit-tests enabled controls and gives HA time to uncover a blocked control before releasing background requests. A view containing only information can release after paint, and leaving or hiding a view releases the wait. This lets a directly opened specialty card load its own code immediately. When HA mounts raw custom cards without a Marao wrapper, the startup loader gives ordinary cards an opportunity to paint and then resolves the visible view's raw dependencies if needed. Closing or replacing a sheet during an import invalidates its pending render.

The HACS entry uses the delivered release identity when the browser confirms that the module came from a full network response. A cached or worker-provided entry checks the installed version. Ordinary renderers begin fetching together under one verified identity. Home Assistant's synchronous picker and validation calls retain their return types. The build derives their small data set from the same catalog and translations used by the full editor.

### Marao requests completed before the weather control

The final matched cold 3G trace completed the stable entry and the following 14 versioned modules. Sizes are encoded HTTP body bytes. The later warm visit reused all 14 from cache and checked the stable entry for updates.

| Files | Bytes | Reason for the first-view dependency |
| --- | ---: | --- |
| `MaraoFrontend.js`, `MaraoAssetURL.js`, `MaraoDashboard.js` | 1,287 + 1,820 + 2,117 | Resolve the installed graph and schedule registration |
| `MaraoNativeDashboard.js`, `MaraoNativeBootstrap.js` | 1,720 + 4,140 | Register HA's dashboard strategy entry and attach the active host |
| `MaraoCards.js`, `MaraoCardRendering.js`, `MaraoNativeCards.js` | 54,172 + 27,740 + 28,412 | Create the native wrappers and shared card surfaces, bind actions and validate configuration |
| `MaraoNavigation.js`, `MaraoLocation.js` | 12,775 + 3,283 | Build the navbar and resolve configured destinations and current-room behavior |
| `MaraoFrontendRefresh.js`, `MaraoFrontendUpdates.js` | 2,684 + 2,136 | Keep the recovery gesture and update handling available when a card module fails |
| `MaraoTheme.js`, `MaraoPressFeedback.js`, `MaraoLocale.js` | 2,274 + 2,035 + 337 | Apply the shared theme, touch feedback and language selection |

The stable entry plus those modules total 146,932 bytes, down from 177,511. Some shared renderer code supports multiple card families. Installing the HACS resource still registers the card collection and includes the small native editing entry point.

## Home Assistant startup traffic

The trace counts HTTP body bytes separately from WebSocket messages. On a matched cold 3G visit, Home Assistant downloaded 105 frontend scripts (1,231,819 encoded bytes), 14 MDI icon packs (216,980), three Roboto fonts (194,856), two translations (43,704), two static images (3,980) and one static JSON file (12,191). Another registered HACS script used 3,842 bytes. The local proxy denied an external stylesheet. These requests originate in Home Assistant's startup or global registrations. Marao's font is Montserrat WOFF2. Shared external card registrations keep their prior behavior across other dashboards and editors. The [earlier resource audit](first-visit.md) covers Firemote and Ultra Vehicle.

The earlier slow-4G comparison mixed cold visits that fetched nine additional HA icon packs with visits that fetched them on the warm revisit. Matching the cold resource groups explained that earlier timing difference. A separate 65,040-byte transfer in some trials was HA's 64,740-byte bold Roboto font plus Chromium's 300 bytes of response accounting. The table below compares the same mobile route and network conditions. See the [prior cold trace](websocket-startup.md).

On a warm visit with these assets cached, Home Assistant still authenticates and supplies live state and registry information. The entity snapshot, entity registry display and device registry together accounted for 469,619 bytes of decoded WebSocket data. Service information and HA translations were also requested. The saved dashboard response followed those exchanges. The native HA frontend initiated these requests before Marao could render an interactive card. The test never replayed stale values or skipped HA's authenticated startup.

## Timings

| Network and cache | Previous median usable | Final median usable | Time saved | Three final usable timings |
| --- | ---: | ---: | ---: | --- |
| Slow 4G cold | 12.43 s | 11.27 s | 1.16 s | 11.27, 11.44, 11.22 s |
| Slow 4G warm | 2.83 s | 2.22 s | 0.61 s | 2.20, 2.22, 2.24 s |
| 3G cold | 47.23 s | 44.04 s | 3.19 s | 44.05, 44.04, 43.99 s |
| 3G warm | 8.46 s | 6.35 s | 2.11 s | 6.35, 6.36, 6.34 s |

The first visible and first usable medians were equal except on warm slow 4G, where first visibility improved from 2.73 to 2.17 s. The weather card qualified first on every final visit. Final cold trials matched the baseline font and icon cohorts on each link. The previous package was `5372e3e3` and the measured installed package was `b8f985ee`. All 12 successful visits on each arm retained one continuous clock. On every measured final visit, the archive had zero reads, writes and subscriptions. All 14 versioned startup scripts were HTTP cache hits on every warm visit. The fresh release check transferred 1,587 HTTP bytes. No specialty response body completed before the usable mark.

On warm 3G, HA requested the dashboard at a median 4.13 s, received it at 5.84 s and presented a usable card about half a second later. The dashboard-containing WebSocket frame shrank from 169,652 to 64,745 bytes on the wire. The median wait for the response fell from 3.884 to 1.708 s. On slow 4G, it fell from 1.134 to 0.549 s, for a final 64,719-byte median frame. A frame can also include small neighboring HA replies. These wire counts are separate from the 570,100-byte JSON size.

Cold HTTP body medians fell from 1,884,883 to 1,854,304 bytes on 3G, and from 1,820,143 to 1,789,564 bytes on slow 4G. Removing conversion history accounts for most of the warm gain. The archive-only intermediate had one successful cold/warm 3G pair of 44.93/6.33 s. A later intermediate attempt had five failed module responses and timed out. It supplies no timing, and an earlier check of another HACS directory did not establish its cause. Each final pair verified the identity in the *registered* directory and in the browser's actual responses. No local request failures, HTTP errors, duplicate module responses or page exceptions occurred on the final timing arm.

The first viewport-only implementation sometimes queued unrelated background registration at first visibility while HA was still covering the controls. On warm slow 4G, the final scheduler released that work 37–44 ms after the benchmark first observed a visible card. Its own hit test succeeded 8–19 ms before the independent probe's next hit-testable sample. On the other nine visits it released 5–9 ms after the independently observed usable surface. The probe polls approximately every 40 ms and confirms over two animation frames. On the final warm test the background floor-plan request started at 2.207 s, between confirmed visibility at 2.18 s and confirmed usability at 2.24 s. This last change prioritized input readiness. It produced comparable overall timings to the previous viewport-only build (43.82/6.34 s cold/warm on 3G and 11.34/2.23 s on slow 4G).

Each pair started in a new mobile Chromium process and authenticated context. The warm visit used a second page in the same context immediately after the cold card became usable. Three independent pairs per link and build produced each median. A monotonic clock outside the page continued through any document reload. The proxy shaped HTTP and WebSocket together at 1.6 Mbps down, 0.75 Mbps up and 150 ms added RTT for slow 4G, and 0.4 Mbps down, 0.25 Mbps up and 350 ms added RTT for 3G. See the [benchmark method](first-visit.md) and [preceding trace](websocket-startup.md).

## Verification

The final build passed 315 selected serial tests for ordinary and specialty cards, popup content and focus, energy calculations, editing, packaging, archives and old conversion formats. On the disposable system, opening an overview group showed its populated controls. Opening the saved card in HA's native editor and closing it made no dashboard save. Opening the Energy view and its history sheet produced a chart canvas. Tapping the synthetic Studio light dispatched once, and the runner verified restoration of its original state. None of those interactions read the archive.

With the same archive implementation installed, an explicit export returned the exact pre-detachment dashboard including all 68 views. Opening ordinary settings used zero archive reads. Export used one, and selecting that same self-contained file for restore used one verification read with zero writes and zero dashboard saves. The offline converter also reproduced the saved original material from the matching recovery file and rejected the wrong file.

The local iPhone dashboard capture was replayed with each of its 16 views opened directly in a fresh browser context. The final build matched all expected card lists and all 16 per-view signatures, with 97 native HA wrappers and 92 visible surfaces. Home's popup opened and closed, a synthetic switch dispatched once, and the native editor emitted the expected change while preserving the card ID and type. No view loaded the editor at rest. No Marao modules were missing and no HA error cards appeared. Camera playback was outside this check.

The capture provider refreshed its snapshot between earlier iterations. An intermediate Home replay had requested an HA loading-screen module absent from the older capture. The refreshed snapshot contains the matching 9,034-byte asset and expects one additional surface on view six. The last two builds were compared using the identical refreshed snapshot, pinned in memory. The historical offline HA API and shell diagnostics matched on both. No improvement to the older capture is inferred from that comparison.
