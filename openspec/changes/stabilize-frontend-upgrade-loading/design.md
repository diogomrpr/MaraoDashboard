## Diagnosis and Design

Starting commit: 6ae6c619fedd3a6a415279b81f32a0ba0559e73e (v0.14.2), clean tree.
HA 2026.10.0 on disposable 192.168.0.28. HA's service worker uses stale-while-
revalidate for custom paths; `/api/` uses NetworkOnly. The flat Marao static
registration enables HA's 31-day cache headers, and ignores the requested version.
A stale index can therefore load an old cached entry with new uncached dependencies.
This is a reproducible loading weakness, not yet proof of the exact phone error.

The bootstrap response embeds the current asset URL, is no-store, requires no
credentials like the existing public static files, and contains no user data.
It is served under `/api/` so HA's worker never substitutes an older bootstrap.
Every module and deferred editor asset is addressed under `/api/marao_dashboard/frontend/<fingerprint>/`.
Relative module/style/worker imports stay in that namespace and retain `?v=` for
existing identity coordination. The server checks the requested fingerprint and
file digest against its setup snapshot. A partial deployment or stale deferred
request fails explicitly rather than returning another release's bytes.
The legacy flat entry URL returns this bootstrap too, bypassing old code on its
next network request. Other legacy assets remain available for released clients.

Existing clients with the update subscriber recover on version mismatch or
foreground/reconnect using the current guarded refresh. Cached old pages that
have no working subscriber must reach the new bootstrap through a subsequent
normal page load. Neither HTTP headers nor server code can purge a phone's
already-satisfied HTTP cache or replace JavaScript that is already executing.

No builder/catalog/default/generator/theme/translation changes are required:
this changes loading only. No source/config migration or history writes. File
allowlisting and content checks prevent path traversal and unintended serving.
Reuse update unit tests and a small browser cache reproduction, not device matrices.

## Sources and Current Evidence

- Official HA service-worker source: https://github.com/home-assistant/frontend/blob/dev/src/entrypoints/service-worker.ts
  (`/api/` network-only, custom paths stale-while-revalidate).
- Official HA static handler: https://github.com/home-assistant/core/blob/dev/homeassistant/components/http/static.py
  (31-day static cache lifetime).
- Related Android recovery-navigation report, resolved upstream:
  https://github.com/home-assistant/android/issues/7410
- Related extra-module registration race:
  https://github.com/home-assistant/frontend/issues/53890
  Marao already waits for `home-assistant` registration; do not conflate that race
  with the reproduced mixed-module failure.
- Generic HA error card source:
  https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/cards/hui-error-card.ts
  (non-admin titles and normal-view details can be hidden). The supplied phone
  screenshot alone cannot establish the underlying exception.

Checks completed: 81 scoped Python lifecycle/asset tests; 30 refresh unit tests;
6 frontend-preparation unit tests; 16 verification-selector unit tests;
20 upgrade-tool unit tests; strict
OpenSpec validation; one local Chromium stale-cache reproduction. Final package
installed on disposable 192.168.0.28 with current served-asset checks. Direct live
checks confirmed stale API and legacy bootstrap URLs select current assets and
serve no-store, including deferred editor resources. Existing warm v0.14.2 browser
automatically reached the current API graph and retained its energy route, but
its raw check failed on a single `Object` page error during reconnection. That
exception requires separate diagnosis; it is not recorded as a clean pass.
No physical Android/Companion testing or new release has been performed.

### Reconnect diagnosis and cleanup

The existing connection-only check timed out at its disconnect-state assertion
(`test-ha-dashboard-e2e.js:1062`), before collecting reconnect evidence. Its raw
failure remains `/private/tmp/marao-cache-reconnect.json.exit.json`; it is not a
pass and did not establish a cache regression.
A separate real disposable restart preserved raw subscription messages in
`/private/tmp/marao-cache-native-diagnostic.json`. It showed the `Object` rejection
as `not_found: Subscription not found.` when HA unsubscribed the previous
connection's `persistent_notification/subscribe` id 37, after it had subscribed
again on the new connection. This matches the existing native stale-unsubscribe
failure. Stable-delivery evidence was rechecked on 2026-10-21 and retained at
`/private/tmp/marao-cache-native-upstream.json`: Core 2026.10.2 and frontend
20260930.4 still do not contain websocket fix
4c5674c36cc898bbd38abc54b4d89777e37a8496. The diagnostic also retained failed native
HA chunk/fetch requests during the deliberate server outage; these are not
Marao asset failures or a clean browser pass. Recovery retained the energy route
and had zero generic HA error cards. Saved helper state was restored afterward.
Final loaded-entry, panel fingerprint and current served-asset checks passed
following that restart. No runtime code changed after installation.

Acceptance: the mixed-version loading risk is reproduced and prevented by the
new startup contract; old flat entry URLs remain compatible when they reach the
server. The exact exception underlying the user's non-admin screenshot and
physical Android acceptance remain unverified. No claim of universal immediate
recovery for a wholly cached, already-executing old document is made.
