# Implementation evidence

Starting commit: `68a9deb96ffd5164949ac6c20f040beed57d654d`. Task baseline: `/private/tmp/marao-auto-refresh-implementation.json`. Existing dirty work was preserved. Affected selection resolved frontend-refresh, lifecycle and navbar-startup; the concurrently changed `tests/frontend/marao-card-visibility.test.js` was explicitly excluded. The selector was used as a scope aid, not a request to execute every mapped check.

The user explicitly requested minimal checks and will test on their phone. This follows the updated AGENTS.md and replaces the proposal's routine browser/gallery campaign.

| Contract | Evidence |
| --- | --- |
| Every successful editor save, including identical saves, sends a unique refresh | Real local HA WebSocket test with administrator sender and read-only-user subscriber passed |
| Failed save emits nothing; ordinary user cannot generate | Same backend test passed; service/history/dry-run call sites reviewed and unchanged |
| Current version does nothing; later version refreshes without save | Existing frontend-refresh suite extended with controller assertions; passed |
| Duplicate saves, deferred edits/hidden/unrelated routes, offline preflight, denied storage and stale-reload loop protection | Targeted controller assertions passed |
| Exact URL, cache scope, preferences/auth preservation and Android in-app reload path | Existing frontend-refresh unit assertions passed; these are mocked host checks, not phone proof |
| Setup and lifecycle | Existing setup-entry installation test passed; new subscription test covered unavailable/current identity delivery and unsubscribe cleanup; setup publication placement reviewed |
| Generated data and historical compatibility | No generator/source/history writes added to recovery; no schema changes; upgrade suites not run |

Checks run: `node --test tests/frontend/frontend-refresh.test.js` (29 passed), the selected `test_frontend_refresh_signals` and `test_setup_entry_installs_base_dashboard_once` backend cases (both passed), JavaScript syntax checks, `git diff --check` and strict OpenSpec validation. The first backend WebSocket attempt could not bind localhost in the sandbox; the same single test passed with local-server access. No test server remains running.

No Home Assistant deployment, browser automation, new gallery fixtures, physical Android inspection, comprehensive suite or publication gate was performed. Nothing was changed on the disposable or production instance.

Phone acceptance: after installing the coherent backend/frontend update and loading the handler once, save unchanged content twice and check that another connected dashboard refreshes once each time while retaining its page and sign-in. Check a later frontend update recovers without a save, ordinary reopens do not reload, and open controls/unsaved edits defer recovery. These live observations remain unverified; do not archive this record as physical-device proof.
