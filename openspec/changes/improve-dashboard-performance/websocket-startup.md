# What the first card waits for

The baseline was commit `5b387479`, served package `f9d51e01b49bd792c708777cc6bb1932b66cddac8ddd00249d9c93609a2beb3e`. The candidate package was `5372e3e361c48896e5444f038ae5b783abccf11676ef054ef7c2a062997fbaaf`. Both used the same 68-view overview dashboard and global resources on disposable Home Assistant. The candidate also applied the one-time compaction of its saved Marao migration record.

## Warm 3G trace

In a baseline revisit that took 12.19 s, the browser transferred only 1,349 bytes for HTTP resources through the usable mark. All 14 fingerprinted Marao startup scripts were HTTP cache hits. The Home Assistant WebSocket still had to authenticate, deliver current state and registries, and return the complete saved dashboard. The local transport negotiated per-message deflate. The relay counted 349,083 bytes in the compressed WebSocket frame containing the dashboard. At 0.4 Mbps that frame alone occupies about seven seconds of download capacity.

| Seconds from navigation on matched warm 3G visits | Before | After |
| --- | ---: | ---: |
| Document first byte | 0.47 | 0.46 |
| WebSocket authenticated | 1.23 | 1.23 |
| Initial entity state observed in the page | 2.97 | 3.62 |
| Home Assistant requested `lovelace/config` | 4.12 | 4.11 |
| Relay finished sending the config-bearing frame | 11.49 | 7.86 |
| Saved configuration available in the Lovelace root | 11.71 | 7.97 |
| Native view mounted | 11.72 | 8.02 |
| Fresh release check finished | 12.12 | 8.38 |
| Marao weather adapter registered | 12.14 | 8.40 |
| Weather control hit-testable | 12.19 | 8.46 |

Both visits already had HA's icon packs in cache. The config-bearing frame fell from 349,083 to 169,642 bytes on the wire. The request-to-response interval shortened from 7.61 to 3.87 s. Both visits took about half a second from the configuration becoming available to a usable weather control. On this matched path the first card appeared 3.73 s sooner.

## Saved data

The decoded configuration measured 4,114,965 UTF-8 bytes. Native views accounted for 568,571 bytes. Marao's retained migration record accounted for 3,544,970 bytes, including 1,070,693 bytes of original source, 1,070,861 bytes of original document and 1,403,278 bytes of accounting. The historical document already contained the original source verbatim. Its source also reproduced the initial accounting rows exactly.

The candidate stores each exact duplicate once. Browser startup reads the ordinary active views directly. Export and recovery can reconstruct the complete original record on demand. The actual saved dashboard shrank to 1,775,298 bytes. The disposable installer verified the original record against its expansion, kept a private exact disk backup, and checked the complete proposed dashboard in Home Assistant memory and persisted storage. All 68 view definitions were preserved.

## Remeasured 3G

| Visit | Before, three trials (s) | After, three trials (s) | Median before → after |
| --- | --- | --- | ---: |
| Warm, first visible and usable | 15.99, 16.04, 12.19 | 8.46, 8.46, 9.06 | 15.99 → 8.46 s |
| Cold, first visible and usable | 46.16, 46.26, 50.90 | 46.97, 47.16, 47.12 | 46.26 → 47.12 s |

The overall warm median includes two baseline visits that also downloaded the nine icon packs. The matched warm trace above isolates the 3.73 s improvement more closely. Similarly, two baseline cold visits reached the card before ten additional HA responses completed. Those responses transferred 204,091 bytes, including the nine icon packs and a separate 65,040-byte resource. With the same 145 resources completed, cold usability was 50.90 s on the baseline and a median 47.12 s on the candidate. Each candidate warm visit transferred 1,350 HTTP bytes and the config-bearing WebSocket frame measured 169,641–169,672 bytes.

## Why the previous cold slow-4G median rose

The [previous cache comparison](cache-behavior.md#warm-slow-4g) found a median change from 12.19 to 13.35 s. Its two fastest baseline cold visits completed 135 resources. Each transferred the other nine on the warm revisit. The cache-fixed cold visits completed 144 resources. With 144 completed resources the earlier build measured 13.41 s, and the cache-fixed build measured 13.31–13.42 s. In that group total cold transfer fell from 1,876,388 to 1,863,037 bytes.

The nine responses were Home Assistant Material Design Icon (MDI) packs. The current trace reproduces their 136,351 encoded body bytes, or 139,051 bytes with Chromium's response-header accounting. They started together and occupied about 0.99 s on one cold slow-4G visit. On 3G, requesting the same nine packs on the warm visit also delayed the fresh release check. Which visit fills this cache accounts for the two timing groups.

## Remeasured slow 4G

| Visit | Before, three trials (s) | After, three trials (s) | Median before → after |
| --- | --- | --- | ---: |
| Cold, first visible and usable | 13.46, 13.42, 13.43 | 12.44, 12.56, 12.90 | 13.43 → 12.56 s |
| Warm, first visible | 3.92, 3.77, 3.74 | 2.85, 2.74, 2.79 | 3.77 → 2.79 s |
| Warm, first usable | 3.93, 3.87, 3.88 | 2.95, 2.83, 2.84 | 3.88 → 2.84 s |

Every cold slow-4G visit completed 144 resources, including the same nine icon packs. In one matched pair, HA received the dashboard at 10.97 s before and 9.99 s after. The competing icon requests finished at 11.94 and 10.97 s respectively. The cold median improved by 0.87 s with that traffic present on both arms.

## Verification

All 24 timed visits reached the weather card in one document. All warm visits used the cache for all 14 fingerprinted Marao startup scripts. There were zero page exceptions, HTTP errors, local request failures or duplicate Marao script responses. The local-only proxy denied one external stylesheet per visit. The benchmark ran on mobile Chromium 149 on a simulated connection.

All 28 selected conversion, provenance and recovery tests passed. A separate Chromium visit opened the generated offline converter from disk, compacted a synthetic dashboard containing later native edits, and downloaded the complete migration record, recovery file and proposed dashboard. The native edits, original YAML and all seven recovery hashes matched. The converter made zero network requests.

## Reproduction

Use the [first-visit benchmark](first-visit-hacs.md#method) with a fresh browser process for each cold–warm pair. Set `MARAO_STARTUP_TRACE=1` to include protocol names, aggregate sizes and timestamps. The loopback-only proxy shares each direction's configured bandwidth across HTTP and WebSocket traffic. Its optional wire trace counts large server frame payloads without recording the payloads. Home Assistant sometimes coalesces the dashboard reply with small adjacent replies in one frame. The frame size includes those replies. Transport, browser protocol and DOM observation timestamps can differ slightly.

```sh
MARAO_STARTUP_TRACE=1 node tests/benchmarks/dashboard-first-card.cjs baseline 3g 1 /marao-dashboard/overview warm
MARAO_STARTUP_TRACE=1 node tests/benchmarks/dashboard-first-card.cjs baseline 4g 1 /marao-dashboard/overview warm
```

Repeat each command three times per installed arm. The 3G profile uses 0.4/0.25 Mbps and 350 ms added RTT. Slow 4G uses 1.6/0.75 Mbps and 150 ms. Each sample starts its clock before navigation in the benchmark process and retains it across document reloads.
