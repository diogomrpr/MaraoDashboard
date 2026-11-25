# Cache behavior and warm startup

## Builds and method

The baseline is commit `d92de6c6`, package `7ff317f7243c9547d24638135a114ba7468b5bb29d8b43cbe43bc44b84afbec6`. The installed candidate is package `f9d51e01b49bd792c708777cc6bb1932b66cddac8ddd00249d9c93609a2beb3e`. Frontend sync verified its served assets and preserved all 68 disposable dashboard views.

The [first-visit method](first-visit-hacs.md#method) ran against the same installed overview on each arm. For each profile, three independent mobile Chromium processes loaded the overview cold and immediately reopened it in a new page in the same authenticated browser context. A monotonic clock in the benchmark process included any document reload. Slow 4G shared 1.6 Mbps down and 0.75 Mbps up with 150 ms added RTT. The 3G profile used 0.4 Mbps down and 0.25 Mbps up with 350 ms. HTTP and Home Assistant’s WebSocket shared the shaped connection.

Closing a cold page at first usability can leave different background assets in cache. Warm transfer is Chromium's sum of resource transfer sizes through the usable mark, including optional downloads and response-header accounting. It excludes WebSocket frames. The release-check transfer counts just the fresh release fetch.

## Warm slow 4G

| Measurement | Before | After |
| --- | ---: | ---: |
| Median first visible card | 4.57 s | 3.69 s |
| Median first usable card | 4.57 s | 3.78 s |
| First usable by trial, seconds | 3.82, 4.57, 4.57 | 3.78, 3.73, 3.82 |
| Warm transfer by trial, bytes | 16,156, 155,207, 155,207 | 1,349, 1,349, 1,349 |
| First usable on the preceding cold visits, seconds | 13.41, 12.19, 12.16 | 13.42, 13.31, 13.35 |

The warm median improved by 0.79 s (17%). The cold median increased from 12.19 s to 13.35 s. Two baseline cold visits ended before an additional 139,051 bytes of Home Assistant resources completed, moving those transfers into the warm visit. Across each complete cold–warm pair, total transfer fell from 1,892,544 to 1,864,386 bytes.

## Warm 3G

| Measurement | Before | After |
| --- | ---: | ---: |
| Median first visible card | 12.42 s | 12.21 s |
| Median first usable card | 12.42 s | 12.21 s |
| First usable by trial, seconds | 12.41, 12.42, 16.29 | 12.21, 16.05, 12.09 |
| Warm transfer by trial, bytes | 16,156, 16,156, 155,207 | 1,349, 140,400, 1,349 |
| First usable on the preceding cold visits, seconds | 51.13, 51.13, 46.41 | 50.66, 46.12, 50.64 |

The warm median improved by 0.21 s (1.7%). In each arm one warm visit fetched additional Home Assistant resources. The slowest warm visit exceeded 16 s on both builds. The cold median fell from 51.13 s to 50.64 s. Three samples per arm give a clearer result for bytes saved than for the size of the timing change.

## What the browser loaded

The weather card was first visible and usable on every visit. Each warm visit served all 14 fingerprinted startup scripts from the HTTP cache. The baseline fetched the full release manifest once. The candidate used one compact check and made zero full-manifest requests through usability. That check dropped from 16,156 to 1,349 transferred bytes per visit, a saving of 14,807 bytes (92%). The changed check accounts for the same byte saving on each shaped link.

All 24 visits used one document. The benchmark observed zero page exceptions, local request failures, HTTP errors or repeated fingerprinted script responses. Its local-only proxy denied one external stylesheet request per visit. Browser version was Chromium 149.0.7827.55.

### Font and image reuse after a package update

A separate Chromium check used a loopback HTTP server with the HACS cache lifetime and two generated package versions. The first page mounted a Marao media card and loaded Montserrat (215,968 encoded bytes) and its YouTube artwork (14,800 bytes), one request each. A second page in the same context loaded the next package's renderer and stylesheet, one new request each. The font and artwork both decoded from the original URLs with zero server requests and zero transferred bytes. This exercised 230,768 bytes of cross-version reuse separately from the overview timing benchmark.

## What changed

- The energy card records when a Recorder request starts. Reopening a day or month read before its end fetches the completed interval once. A late partial read cannot overwrite the final result. Tests exercised the change from 100 to 105 across the October–November boundary and later reuse of the final value.
- The HACS loader reads a small JSON record from the installed JavaScript entry. It reads the current response as text without evaluating remote source, using a fresh request even if a same-length replacement has the same filesystem timestamp. Older installed entries resolve through their complete release manifest. Startup and later update checks use the same reader when available.
- Packaged fonts and images use individual content hashes in their URLs. CSS and JavaScript continue to use the package identity. Older saved picture-card aliases remain available. The first transition from the previous naming scheme creates a new cache key for each asset.
- Graphs mounting within one second share a pending 24-hour Recorder read when their authenticated connection, entity, latest reported observation and requested attributes match. Each card owns its live observations and error state. A completed or failed request leaves the shared map. Reconnecting, changing users or requesting a different response shape starts a separate read.

## Reproduction

The 226 selected Node checks passed across energy/history, graph visibility, frontend refresh, package construction, installation and native dependencies. The same checks can be run serially with this command.

```sh
node --test --test-concurrency=1 tests/frontend/{marao-history-cards,marao-card-visibility,frontend-refresh,native-package,frontend-preparation,native-dependencies}.test.js
```

After installing each arm, run each command three times. Each invocation supplies one independent warm sample. The output reports the build identity, visible and usable times, resource totals, cache hits and failed requests. The updated probe also reports the release check's transfer size separately.

```sh
node tests/benchmarks/dashboard-first-card.cjs candidate 4g 1 /marao-dashboard/overview warm
node tests/benchmarks/dashboard-first-card.cjs candidate 3g 1 /marao-dashboard/overview warm
```
