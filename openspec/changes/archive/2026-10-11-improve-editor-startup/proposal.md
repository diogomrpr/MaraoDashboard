# Proposal

## Why

The editor opens its toolbar quickly but leaves its content empty before the visual controls become usable, reproduced on the disposable instance. Its startup also downloads and evaluates nearly 4 MB of JavaScript, 99% attributable to the JSON-only Monaco editor, even when the administrator only uses Visual.

## What Changes

- Keep the visual editor's initial module and styles small; load the existing bundled Monaco code, styles and workers only when JSON is requested.
- Render a localized loading indication while configuration is being read, then make the visual controls usable without waiting for JSON assets.
- Keep initialization to one request at a time, block actions that need an unloaded document, and provide explicit retry for failed configuration or JSON loading without repeated background requests or draft loss.
- Measure navigation, panel registration, configuration response, visual rendering and native-control readiness before and after the change. Address any remaining measured bottleneck in this path, rather than treating a smaller bundle as proof that the reported delay is fixed.
- Preserve Visual/JSON draft sharing, format/schema/entity assistance, save/discard/history behavior, administrator authorization and current-version local asset loading.

Investigation on 2026-10-10: three read-only `marao_dashboard/config/get` calls took 204, 152 and 142 ms for approximately 499 KB, 717 entities, four rooms and 20 history versions. The served panel matches the workspace and contains 3,989,879 bytes; local build analysis attributes 3,939,502 bytes to Monaco. A separate asset request took 133 ms. These are local API/asset timings, not end-to-end browser timings or evidence about another installation. Browser inspection reproduced shell-before-content and recorded no warnings/errors. The exact contribution of native-control initialization and rendering to the post-toolbar gap remains to be timed.

## Capabilities

### New Capabilities

None; extend the existing editor and resource contracts.

### Modified Capabilities

- `visual-builder`: Visual readiness independent of JSON startup, explicit loading/failure/retry behavior, safe asynchronous tab switching and draft preservation.
- `integration-lifecycle`: Content-versioned local loading of deferred editor modules and styles as well as existing workers.

## Impact

Editable source: `frontend_src/MaraoDashboardPanel.js`, `panel.css` and a small JSON-specific module. Build output: `build-editor.cjs`, committed editor assets and their HACS packaging checks. Verification: existing editor-model tests, focused browser checks under `tests/`, resource/fingerprint/setup tests where affected, and the local-development guide. Reuse the installed Monaco, esbuild and Playwright; add no dependency or framework.

The affected dashboard-card set is **empty**, both for planning and for the intended editor-only implementation. Affected UI surfaces are editor startup, Visual/JSON tabs, selectors, dialogs, toolbar, loading/error feedback and revisit/disconnect lifecycle. Existing safe dashboard configuration is the representative test document; no new card behavior, gallery dashboard or card permutation is introduced. Reassess the card set if implementation reaches shared dashboard code.

No redesign, telemetry service, browser security changes, CDN, authentication changes, configuration migration or speculative backend API split/cache. Current timings do not establish history enumeration or the management API as the dominant problem; retain those APIs unless later stage measurements justify a revised plan. Test only disposable `192.168.0.28`, preserve unrelated work and keep credentials and detailed diagnostic artifacts private. This change is planning only; deployment and publication have not occurred.
