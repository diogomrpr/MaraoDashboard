# First visible and usable Marao card

24 November 2026. The baseline is the HACS package from 0.37.6 on `main` at `8e0b081f`. Its served identity began `e07b68aa`. The candidate identity begins `b84e42ce`. Both arms used `/marao-dashboard/overview` on the same disposable Home Assistant installation. The dashboard kept its 68 views and its original global resources.

## Results

| Visit | First visible, before → after | First usable, before → after | Change in time to usable |
| --- | ---: | ---: | ---: |
| Cold slow 4G, median of three | 19.84 → 16.98 s | 19.84 → 16.98 s | 2.86 s faster (14.4%) |
| Cold 3G, one trial each | 72.50 → 62.92 s | 72.50 → 62.92 s | 9.58 s faster (13.2%) |
| Warm slow 4G, one revisit each | 4.99 → 3.74 s | 5.26 → 3.80 s | 1.46 s faster |
| Warm 3G, one revisit each | 12.40 → 12.42 s | 12.40 → 12.42 s | 0.02 s slower |

The cold slow-4G trials were 19.84, 20.26 and 19.78 s before, and 17.09, 16.90 and 16.98 s after. On both cold profiles the weather card was the first visible and usable card. Completed resources fell from 166 to 162 and their encoded bodies from **2,809,383 to 2,428,415 bytes**. All measured runs used one document. A separate controlled document reload verified that the benchmark kept time across a reload.

The warm slow-4G revisit transferred 275,816 bytes before and 15,999 bytes after. On warm 3G the totals were 15,576 and 15,999 bytes. Closing the cold page as soon as a card becomes usable can leave different later resources in cache. Each warm result is a single pair.

## Method

Mobile Chromium 149.0.7827.55 used a 393 × 852 CSS pixel viewport. Each cold trial started a fresh browser process and authenticated context with an empty cache. The warm trial reopened the same view in a new page sharing the first trial’s cache immediately after its first usable card. A monotonic timer in the benchmark process started before navigation and continued across document reloads. Each trial required a visible `ha-card` with rendered content inside the active view. The usability probe also required an enabled control inside a qualifying card that could be hit-tested through its shadow roots. Both signals were rechecked after two animation frames. The probe excluded HA error cards, loading spinners and the navbar.

A loopback SOCKS proxy shared one downstream and one upstream budget across HTTP and Home Assistant’s WebSocket. Slow 4G used 1.6/0.75 Mbps down/up with 150 ms added RTT. The 3G profile used 0.4/0.25 Mbps and 350 ms. Two concurrent 32 KiB transfers completed in 483 ms and 1,667 ms on the respective profiles, against 478 ms and 1,661 ms expected. The proxy permitted only the disposable origin. Its external stylesheet request failed in both arms. The browser measured an authenticated live page without an iPhone app process or offline downloader.

Resource sizes below use completed resource timing entries. `encodedBodySize` includes cached bodies, so the warm network comparison uses `transferSize`. These counters exclude WebSocket frames and bodies still in flight. The elapsed times include their effects on the shared link.

A separate diagnostic cold 3G visit tracked HA’s temporary `hui-error-card` elements during registration. Empty card surfaces were visible from 44.47 s to 63.18 s. Across 628 viewport samples, none showed a readable, hit-testable error message. The weather card became usable at 63.19 s. This diagnostic is separate from the timing table. Each timed trial had zero page exceptions and zero failed local requests through first usability.

## Cold resource breakdown

| Completed or requested asset | Baseline bytes | Candidate bytes |
| --- | ---: | ---: |
| `MaraoNativeBootstrap.js` | 296,221 | 75,779 |
| `MaraoNativeCards.js` | 277,371 | 177,883 |
| `MaraoSchedules.js` before first card | 47,117 | 0 |
| Three floor-plan modules before first card | 14,727 | 0 |
| Completed Marao fingerprinted resources at first card | 1,070,643 | 688,839 |

The served bootstrap dropped 220,442 bytes when popup-save planning moved out. Separating raw YAML conversion saved 99,488 bytes in the ordinary card adapter. The native editor also shrank from 389,958 to 290,244 bytes on disk and still downloads when editing opens. Resource timing showed that the Montserrat request had not completed by the first cold card in either build.

## Startup changes

On a cold navigation, HA loads its shell and applies the dashboard’s global resource list. Marao’s HACS entry fetches the package manifest and resolves versioned modules. Previously, the card path waited for native bootstrap, navigation, basic renderers, floor-plan and schedule registration, and finally the ordinary card adapters. On the new path the native bootstrap overlaps dashboard startup, and the landing view can compose ordinary cards as soon as the basic renderers and adapters are ready.

- The loader starts the dashboard and its native bootstrap together. Navigation fetches its independent dependencies together. Ordinary card adapters register before floor plans and schedules, while specialty registrations continue for direct navigation.
- Popup ownership and direct-route protection stay active from startup. A confirmed dashboard save loads the popup planner. The coordinator rechecks the active dashboard and saved configuration after the download before writing.
- Ordinary native cards use the same structural validation as historical conversion. The historical compiler owns raw YAML parsing and continues to preserve nested raw cards. Chart.js, the native card editor and the detailed color and activity interfaces already loaded on demand.
- A detached native card now waits for state or attachment before composing its children. Ordinary state updates inspect the entities bound to the card. Linked popup views still use full registry metadata. A five-wrapper Node microbenchmark with 1,000 synthetic entities took 1.398 ms before and 0.886 ms after for initial configuration through composition. This excludes DOM painting and transfer.
- Montserrat now uses a 215,968-byte WOFF2, down from the 744,936-byte TTF. The font keeps all 2,747 glyphs, its character map, weight range 100–900, and `font-display: swap`. The original TTF and its published stable address remain available.

## Shared resource audit

The saved 16-view Marao dashboard and the saved 14-view Test dashboard registered Firemote and Ultra Vehicle globally. Their configuration trees, including nested cards and templates, contained no explicit references to either library. Test did contain button-card, Bubble Card and navbar-card references. The current Marao source and disposable dashboard configurations have no Firemote or Ultra Vehicle registrations. The audit covered the available snapshots, shipped editors and disposable installation. Global registration also exposes third-party cards to other dashboards and the HA picker, so the implementation changes only Marao-owned code and assets.

The iPhone report’s 23.28 s slow-4G and 85.97 s 3G measurements came from another client and installation. Its 3.42 MB cold home view and experiment omitting two libraries provide context for the resource audit. All comparisons in this report use paired Marao frontend measurements on the disposable installation.

## Direct routes, actions and editing

The latest available iPhone snapshot contained a 16-view configuration captured with Marao 0.37.1. A read-only replay loaded its saved HA HTML, application chunks, bootstrap and the app’s playback script, first with the 0.37.6 baseline package and then with the candidate. Each path started in a fresh mobile Chromium context. HTTP requests came from local files, service workers were blocked and sockets could not reach a backend. Neither package wrote to the saved snapshot.

All 16 paths, including both managed popup subviews, matched the archive’s per-view card signatures in both arms. There were 97 HA card wrappers and 91 rendered surfaces across the views, five of each on home, and zero rendered error cards. The group sheet opened and closed, a synthetic switch dispatched once, and the candidate native editor emitted the edited name while retaining the card ID and type. Both arms recorded the same offline API denials, unavailable HA chunk and source map, ancillary asset misses and HA app exception counts. Every requested Marao asset was available.

On the disposable installation, a group tap opened a sheet and its close control dismissed it. HA opened the group’s native card editor and closed it without saving. The browser loaded the packaged WOFF2. A Studio fixture light received one service call for one tap and HA confirmed its state change. Its original state was restored. Frontend sync verified the served candidate fingerprint and the exact saved configuration, including all 68 views. The two preview builds and 53 targeted Node tests passed, covering registration order, native composition, raw YAML preservation, historical strategy and popup-save races.

## Reproduction

With Playwright Chromium installed and `ha-test/local.json` configured for the disposable instance, run the following commands on each arm after installing that arm. Use `candidate` as the label for the second build. An isolated checkout can point `MARAO_TEST_CONFIG` at the existing ignored configuration. Each run emits JSON with timings and resource counts.

```sh
python3 tests/benchmarks/dashboard-link.py --calibrate
node tests/benchmarks/dashboard-first-card.cjs baseline 4g 3 /marao-dashboard/overview warm
node tests/benchmarks/dashboard-first-card.cjs baseline 3g 1 /marao-dashboard/overview warm
```
