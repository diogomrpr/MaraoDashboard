# First usable card with HACS JavaScript compression

## Comparison

The baseline is the first optimization pass at commit `20d7627e` (0.37.6). All arms used the same saved overview on disposable Home Assistant and the same HACS-style gzip delivery. The [earlier audit](first-visit.md) records the original iPhone comparison, the Firemote and Ultra Vehicle inventory, the first-pass optimizations and the earlier disposable installation's uncompressed delivery.

The installed candidate has package identity `7ff317f7243c9547d24638135a114ba7468b5bb29d8b43cbe43bc44b84afbec6`. The first visible and first usable card was the weather card in every trial.

### Cold visits

| Link | Trials per build | Median visible, before → after | Median usable, before → after |
| --- | ---: | ---: | ---: |
| Slow 4G | 3 | 14.70 → 13.50 s | 14.70 → 13.50 s |
| 3G | 2 | 52.50 → 51.18 s | 52.50 → 51.18 s |

The slow-4G cold trials were 14.78, 14.67 and 14.70 s before, and 13.53, 13.50 and 13.45 s after. The 3G cold trials were 53.45 and 51.55 s before, and 51.09 and 51.26 s after. The cold medians improved by 8.2% and 2.5%, respectively. In both final cold 3G trials, the navbar already accepted input by 48.09 s.

### Warm visits

| Link | Revisits per build | Median visible, before → after | Median usable, before → after |
| --- | ---: | ---: | ---: |
| Slow 4G | 3 | 3.75 → 3.73 s | 3.79 → 3.89 s |
| 3G | 2 | 12.43 → 12.31 s | 12.43 → 12.31 s |

Slow-4G warm usable times were 3.79, 3.75 and 3.80 s before, and 3.88, 3.99 and 3.89 s after. The two extra baseline slow-4G cold seeds used to obtain independent warm samples took 14.68 and 14.77 s. They are outside the planned three-trial cold comparison. On warm 3G, usability took 12.44 and 12.42 s before, and 12.57 and 12.04 s after. The warm samples do not establish a consistent speedup.

Every baseline warm visit transferred 15,999 resource bytes through usability. Final warm slow-4G transfer sizes were 16,156, 20,089 and 57,761 bytes. Both final warm 3G visits transferred 16,156 bytes. When the 3G manifest started at 4.37 s on the final warm build, Home Assistant had its saved config by 11.90 s, specialty requests started at 11.99 s and the weather card became usable at 12.04 s.

### Resources through the first usable card

| Cold measurement | Baseline | Final |
| --- | ---: | ---: |
| Fingerprinted Marao JavaScript responses | 30 | 14 |
| Encoded bytes in those responses | 211,399 | 174,335 |
| All completed encoded resource bytes on slow 4G | 1,950,596 | 1,833,488 |
| All completed encoded resource bytes on 3G | 1,950,596 | 1,898,228 |

Marao's 37,064-byte saving is reproducible on both links. Other HA requests can finish on either side of the earlier card milestone. Each cold Marao script carried a gzip header in both builds. The five final preload targets each transferred once. The stable release manifest returned once per final visit. Timed visits had zero page exceptions and zero failed local requests or HTTP errors through usability.

## What the first card waited for

In a diagnostic slow-4G run on the uncompressed first-pass installation, HA had entity state at 2.91 s, created the view at 11.07 s and started requesting the fingerprinted Marao modules at 12.10 s. Navigation and its dependencies finished at 13.64 s. The renderer finished downloading at 15.09 s, its last helper at 16.05 s and the ordinary card adapters at 17.11 s. The weather card met both the visible and usable checks at 17.17 s. The 17 helper requests spanned several batches on six connections. About 60 ms elapsed between the last adapter response and the observed usable control, including the paint and sampling delay.

The installed HACS 2.0.5 implementation writes a gzip sidecar when it installs a JavaScript file (`HacsBase.async_save_file` in `custom_components/hacs/base.py`). The disposable sync helper previously copied only the release files. It now stages the same sidecars, accepts an existing HACS file with different gzip headers after verifying its decoded contents, and preserves unrelated attachments. The release continues to ship ordinary JavaScript. The previous report measured a first-pass cold slow-4G median of 16.98 s on uncompressed delivery. With HACS-style gzip the same build measured 14.70 s. This report compares the baseline and candidate under matched delivery.

## Changes

- Ordinary cards import a single built module containing their shared rendering helpers. Bundling eliminates repeated copies of shared dependencies and excludes unused exports, including authoring functions. Navigation and press feedback keep their existing owners.
- The stable HACS entry uses the validated release manifest to hint the installed resolver, navigation and bootstrap modules. The hints use the same identity as the entry imports and skip files absent from older packages.
- Once navigation is ready, the browser can fetch the renderer, the helper module and the native adapters together. The same imports still register basic cards first, native wrappers second and specialty modules afterward. Preloading uses the package's versioned URLs.
- The early bootstrap updates picker labels using each registration's translation callback. It no longer carries a second copy of the editor's translation table. The native adapter still owns card validation, localized picker text and synchronous stub creation.
- The asset resolver stores each owned filename once and computes its versioned flat path on demand. This preserves published asset addresses, query strings, fragments and external URLs.

| Fingerprinted JavaScript | Baseline gzip bytes | Final gzip bytes |
| --- | ---: | ---: |
| 17 renderer helper responses, combined | 52,854 | 30,393 in one response |
| Native bootstrap | 23,893 | 9,379 |
| Main card renderer | 56,724 | 56,580 |
| Ordinary card adapters | 48,815 | 48,856 |
| Flat asset resolver | 1,302 | 999 |

## Cold and warm request ordering

On a 3G trial with the smaller renderer graph, both native adapters and rendering helpers started alongside the main renderer. Starting navigation dependencies directly from the release manifest then moved that three-file wave from 48.65 s to 47.89 s. The weather card became usable at 51.39 s. The navigation control was hit-testable at 47.89 s.

Tracing also identified two requests for the same 15,856-byte release manifest on this cold visit. The loader completed its request at 45.62 s. The automatic update subscription started another at 48.24 s. The subscription now consumes the loader’s validated identity once, when the active and installed package agree and the result is at most five seconds old. Subsequent update events and foreground or reconnect checks still fetch the manifest.

Warm traces showed two orders of events. In one 3G visit the ordinary modules were cached and ready by 5.98 s. About 107 KB of specialty modules and dependencies finished downloading before the weather card was usable at 14.45 s. In a separate visit the connected Lovelace root had its configuration at 11.73 s and had mounted its view by 11.77 s. The ordinary adapters registered at 12.47 s and the card was usable at 12.54 s, before any specialty download finished. Home Assistant had already defined its view element at 4.14 s in that second visit.

The final change lets the active Lovelace view paint before the remaining specialty modules start if the base cards register first. A mounted view proceeds immediately. A wrapper that needs a specialty renderer can request it directly. Edit mode, strategy dashboards, non-Lovelace panels, navigation away and hidden pages can also proceed immediately. An unsupported host has a bounded fallback. This uses the existing native root lifecycle and a temporary DOM observer.

## Direct navigation, card actions and editing

The final built package replayed all 16 saved dashboard routes in fresh mobile browser contexts, including both managed popup routes. The saved dashboard was captured on Marao 0.37.1. The runner served its archived HA frontend and substituted the current Marao package from disk. All 16 per-route card signatures matched the first-pass build and the archived expectations. The views produced 97 card wrappers and 91 rendered surfaces, including five of each on home, with zero rendered error cards. Opening and dismissing the group popup, dispatching exactly one synthetic switch action and renaming a card through the native editor while preserving its ID and type also passed. Offline HA API denials, missing ancillary assets and HA app exception counts matched the first-pass replay. Every requested Marao asset was present.

On the installed disposable dashboard, the overview group sheet opened and closed, Montserrat loaded from WOFF2 and Home Assistant opened the saved group's native card editor and dismissed it without a save. The Energy view opened its on-demand history chart, painted a canvas and closed the sheet. One tap in Studio dispatched exactly one service call to a fixture light. HA confirmed the new state and the runner restored the original state. Installation verified the served identity and preserved the complete saved dashboard, including all 68 disposable views.

Both documentation preview builds and 248 targeted Node tests passed. Coverage included the package and preload owner, popup and native registration, the view-paint wait and demand override, renderer actions and history, the initial and subsequent update checks, and disposable gzip staging and recovery. Timings and interaction checks used Chromium. The saved iPhone layout was replayed locally.

## Method

Mobile Chromium 149 used a 393 × 852 CSS pixel viewport. Each cold trial used a new browser process and authenticated context. Each warm trial reopened the overview in a new page in the first cold context after the first usable card. A loopback proxy shaped HTTP and WebSocket traffic together at 1.6/0.75 Mbps with 150 ms added RTT for slow 4G and 0.4/0.25 Mbps with 350 ms for 3G. A monotonic clock started outside the browser before navigation and continued across document reloads. Each timed visit used one document.

The visible check required rendered content inside an on-screen card. The usable check required an enabled control that passed hit testing. Both were checked again after two animation frames. The navbar, empty surfaces, spinners and HA error cards could not satisfy either check. Resource totals count completed bodies through the mark and exclude WebSocket frames. Encoded size includes cached bodies. Warm transfer uses the browser's transfer-size counter. One external stylesheet request was denied by the local-only proxy in each trial.

Install the first-pass dist using the updated disposable sync helper for the matched baseline, then install the candidate normally. The [first-visit benchmark method](first-visit.md#reproduction) describes the proxy and test configuration. For paired warm samples, run each profile once per fresh browser process. The benchmark now includes the observed HACS package identities, JavaScript response encodings, repeated script response counts and the number of GET responses for the release manifest alongside its completed-body totals.

```sh
node tests/benchmarks/dashboard-first-card.cjs candidate 4g 1 /marao-dashboard/overview warm
node tests/benchmarks/dashboard-first-card.cjs candidate 3g 1 /marao-dashboard/overview warm
```
