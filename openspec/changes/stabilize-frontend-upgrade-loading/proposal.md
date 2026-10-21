## Why

Android clients can retain dashboard HTML and only part of Marao's JavaScript
module graph during integration updates. The existing flat static route serves
current files even when their URL requests an old fingerprint, with 31-day HTTP
caching. Recovery depends on navigation successfully starting first.

## What Changes

- Serve a small, uncached bootstrap through HA's network-only `/api/` namespace.
- Choose the installed fingerprint on the server before loading card modules.
- Serve all current module dependencies, editor assets and workers under that
  fingerprint's own API path; reject stale or changed content instead of mixing it.
- Keep the previous flat entry URL as a compatible bootstrap for existing pages.
- Preserve the existing safe, bounded open-session refresh mechanism.

## Scope and Compatibility

All Marao frontend consumers, integration registration, refresh cache targeting,
installation checks, update guidance and scoped tests are affected. No persisted
configuration or dashboard output changes; names, selections, raw cards, protected
YAML, history, auth and unrelated caches remain untouched. No format migration.
A completely cached already-running old document cannot execute new code until
it contacts the server; do not promise remote control of such documents.
No release, production access, new cache-clear UI or general browser QA campaign.
