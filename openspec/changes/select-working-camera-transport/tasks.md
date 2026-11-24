## 1. Shared playback
- [x] 1.1 Add positive per-camera discovery, authenticated signed proxy URLs and native MSE/ManagedMediaSource playback with bounded buffers and cleanup.
- [x] 1.2 Wire native-first failure/stall fallback into shared inline/popup/preload lifecycle without changing camera selection, UI, controls or event behavior.
## 2. Verification and installation
- [x] 2.1 Add focused regressions for native success, working provider fallback, exhaustion, authorization/isolation and cancellation; update camera guidance and reviewed source/check mappings.
- [x] 2.2 Review the scoped selector and essential checks, build, apply through card:apply and confirm final disposable installation. Report actual Safari/browser coverage and manual watch items without publication.

## Evidence — 2026-11-22

- Starting commit `fa71c7a33798b32480eab41bfad6f038e8b1ebf9`; source dirty snapshot `/private/tmp/camera-live-fallback.json`. Preview task `9d7d3d99-aac4-4d9c-b82d-5cf53fb79015`, independent baseline `f3bb77a4d52495c7afc4ab546d8cbf1357c0e190`. The explicit user request authorized the same inline/popup camera scope and shared preload consumer. Existing unrelated dirty work was retained.
- Seven focused fallback unit tests and four existing documentation-example tests passed serially, plus build/reproducibility and strict change validation. The focused selector was reviewed for the actual camera/test/documentation paths. Copied unchanged preview dependencies, generated bundles and unrelated edits were excluded from promotion. No broad native/HLS/slow-link/cancellation suites were run.
- A local browser check used only the existing fictional camera MP4, locally fragmented in private scratch space, and intercepted HA/provider boundaries. Current source passed native advancing playback without provider discovery, simulated native 401 followed by advancing MSE, and exhausted paths with explicitly labelled snapshot/error in both WebKit and Chromium. No page errors occurred. This is real browser decoding of safe fixture media, not a physical Safari/iPhone or real Frigate-camera test. No live Home Assistant or camera/security settings were accessed by that check.
- `npm run card:apply -- --task 9d7d3d99-aac4-4d9c-b82d-5cf53fb79015` promoted the reviewed patch, reran 11 checks, built and installed on disposable `192.168.0.28`. Receipt `.card-design/9d7d3d99-aac4-4d9c-b82d-5cf53fb79015/.application/d2695517-b816-4d58-ae50-be200a1dee8d/receipt.json` reports complete/installed and verified identity `b01ddbd5d11336ca19a5cfd9abdf4c6b783ebea8d80e0dcd8d916b638f66e6c3`. Existing dashboard/helpers remain intact. No production access, release or archive.
- Manual watch list after reload at `/marao-dashboard`: native camera stays live; fallback startup on a positively identified Frigate camera; independently selected popup camera and fullscreen/events; explicit Snapshot/error on exhaustion and Retry. Native unsupported identities/browser codecs/denied provider access remain explicit failures rather than guessing another source. Each playback path has the existing 30-second progress bound; no new saved options or migrations.

## Port to the current release baseline

- [x] Carry the shared camera implementation onto the v0.37.5 main baseline. Preserve existing card configuration and native-first playback.
- [x] Match the real HA authenticated fetch contract by passing a relative API path. Add a focused regression for the existing per-camera proxy paths, missing or denied sources, and signed query validation. Playback verification remains manual-only.
