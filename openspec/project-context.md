# Project context and development history

This snapshot records decisions already made, so future tasks do not rediscover
them or turn old bugs into accepted behavior. The baseline is v0.5.1 at
`370c2c57088b0982a5059acbeab998624e0bf427`, published on 2026-10-09. Recheck mutable
environment and upstream facts when executing a future task.

## Product and source map

Marao builds a complete mobile Home Assistant dashboard from an administrator
visual/JSON editor. Python validates and resolves configuration, generates
Lovelace YAML, preserves custom-card regions, and stores restorable versions.
Project-owned browser components display HA state and call native HA services.
There is no external Lovelace card installation step.

| Source | Responsibility |
| --- | --- |
| `custom_components/marao_dashboard/__init__.py`, `config_flow.py`, `const.py` | Integration lifecycle, admin WebSocket commands, generation service, static routes |
| `editor.py`, `frontend_src/editor-model.js`, `frontend_src/MaraoDashboardPanel.js`, `frontend_src/panel.css` | Card catalog, visual/JSON builder and editable editor UI |
| `generator.py`, `config_patch.py`, `history.py`, `legacy_migration.py` | Resolution, protected YAML, config patches, history and owned resource migration |
| `frontend/MaraoDashboard.js` | Runtime startup, font/icons, strict access slide, timeline/energy cards, shell and popup scroll containment |
| `frontend/MaraoCards.js` | Shared cards, actions, value sliders, steppers, navbar, sheets and background history traces |
| `frontend/MaraoFrigateEventsCard.js` | Project-owned Frigate/UniFi Protect events |
| `frontend/themes/MaraoDashboard/marao-dashboard.yaml`, `translations/` | Semantic theme and integration localization |
| `frontend_src/build-editor.cjs`, `frontend_src/build-hacs-dist.cjs` | Reproducible editor assets and strict HACS package staging |
| `ha-test/` | Disposable preparation, credentials interface, safe fixtures, Cases and realistic pages |
| `tests/`, `.github/workflows/` | Unit/static/browser checks and release CI |
| `docs/docs/` | Product options, architecture and development instructions |

Paths above under `frontend/`, `translations/`, and Python module names are
relative to `custom_components/marao_dashboard/`. The public `hc_*` template
names remain stable configuration keys for `custom:marao-card`; they are not a
third-party runtime dependency. The editor's bundled Monaco assets are shipped
runtime assets, while Node, Python test dependencies, Playwright, and OpenSpec
are developer tools.

The [feature coverage map](feature-coverage.md) connects the complete current
catalog, generated components and configuration operations to capability specs
and source/checks. Montserrat currently loads once from Google Fonts with local
fallback fonts; self-contained card ownership is not a promise of offline font
bundling. Runtime copy has English and Portuguese catalogs with locale fallback.

Installed Marao theme YAML is an integration-owned copy. Setup/reload replaces
it when it differs from the bundled version, so local edits to that copy are not
protected customization. Other themes and unrelated HA configuration remain owned
by their users. Protected custom YAML regions and JSON options are separate
preservation contracts; individual generated writes are atomic, not one global
filesystem transaction.

Pre-manifest migration can adopt unmarked, parseable card containers at expected
generated paths even when they differ from today's output. Their unmarked edits
are replaced, not transferred into custom regions. Editor generation snapshots
a valid prior dashboard first; back up legacy YAML and move deliberate manual
cards into protected regions before relying on ongoing preservation.

## Upgrade implementation status (2026-10-10)

Implementation has started with the binding compatibility instructions in
`AGENTS.md` and aligned development/update guidance. Saved-release impact must
be assessed before changing JSON, defaults, generated contracts or APIs, with
preservation, shared versioned conversion when needed, exact backups/recovery,
read-only previews and immutable archives. The 2026-10-11 implementation candidate includes
provenance-backed historical fixtures, independent expected JSON, complete feature
coverage, the shared 0→1→2 conversion/recovery path and the native storage importer.
Verified completed capability deltas have been synchronized into baseline specs;
the remaining change tasks retain their outstanding integrated verification.

The separate final-candidate preserved-install gate is required before versioned
publication. `test:ha:upgrade` now produces the private report through the real
previous-package path, supported historical replays, feature/mobile checks,
actual upgraded visual review and verified cleanup; `verify:release` validates
that report for the clean final commit and runs publication checks again.
The first complete live report remains pending as of this dated update.
Missing upgrade evidence blocks release. This live scenario is release-only;
ordinary implementation uses focused checks and does not authorize running it.
Existing push/publication gates and the unresolved reconnect issue remain intact.
No upgrade, release, migration success or browser verification is claimed here.

## Environment decisions

The only agent target is disposable `192.168.0.28:8123`. Authenticated browser,
API, administrator WebSocket, and SSH access were verified during setup.
Node 24 LTS/npm were installed through Homebrew and exposed to login shells.
Python 3.14 lives in `.venv`; activate it before Python or publication checks.
Use the repository's pinned Playwright and installed Chromium.

Credentials, disposable acknowledgement and SSH settings remain in ignored
`ha-test/local.json`. Keys, screenshots, logs, and deployment cache remain
ignored. Do not copy them into specifications. Browser authentication is limited
to the configured origin's top-level Home Assistant HTML document; never inject
the token into opaque, foreign, SVG, or iframe documents.

The available browser control plus existing Playwright checks cover navigation,
screenshots, mobile sizing, shadow-DOM controls, and diagnostics. Additional
Playwright MCP and Chrome DevTools MCP integrations were evaluated as free but
overlapping and left uninstalled. No paid browser service or disabled sandbox
is needed. OpenSpec is the explicitly requested additional planning tool.

## Decisions from the UI repair and release review

- An initially empty lighting popup established that console checks alone do
  not establish visual correctness. Popups require direct content inspection.
- The preferred palette is soft blue with navy text/outlines and pale neutral
  surfaces. Card, slider track, confirmed fill and target thumb remain separate.
  Light mode uses blue `#7BADE6`, track `#AAC9EF`, fill `#EFF6FF`, white thumb,
  navy boundary `#284D7D`, and neutral cards `#EAF0F8`. Shared mode-aware tokens
  govern the implementation, including dark mode; custom cards do not invent
  their own theme.
- Pixelated slider ends and a square iPhone thumb shadow led to a shared vector
  drawing beneath a semantic native range. Thin aligned strokes and explicit
  native thumb resets replace stacked clipped CSS/native curves. Inspect at
  device pixel density, not only a CSS-resolution screenshot.
- Broken slider dragging was fixed at the input lifetime and popup touch
  boundary. Keep the native input mounted across state updates and preserve
  native touch defaults inside a scrolling sheet. Confirmed fill and requested
  target remain independently driven; cancellation must dispatch nothing.
- Portuguese overview titles gained the card's full width and moved icons below
  the title, with a modest shared font-size adjustment. Essential content still
  wraps at larger text sizes; arbitrary truncation or automatic shrinking is
  not the solution.
- Release stabilization repaired history loading/empty/failure states and stale
  requests, disconnected action guards, zoomed-popup close clearance, vacuum
  capabilities/segments, ignored builder settings, media seek and remote holds,
  and multi-entity summaries. These behaviors are captured in the capability
  specs and canonical Cases fixtures.
- Native on/off lights and single-speed fans omit unsupported sliders. Media
  commands guard the actual remote target; an online player cannot bypass an
  unavailable remote. Empty room navigation has no artificial entity dependency.
- Idle hold controls hide progress entirely. Security holds and media short/long
  commands share lifecycle cleanup but retain their distinct completion rules.
- Test preparation and synthetic providers were moved outside shipped code.
  Source and staged HACS boundaries reject fixtures, caches, private files and
  test dependencies. Mobile profiles use isolated browser processes to retain
  touch emulation; assertions were not weakened.

## Recorded release evidence and its limits

The v0.5.1 review recorded 164 frontend tests and 82 Python tests passing, with
91% Python coverage; 305 configured gallery cards, 50 popups, and 12 generated
views; all 26 mobile/theme combinations; 31 value sliders across that matrix;
and final visual inspection of 1,078 card/navbar captures. Tests, hassfest, HACS
validation, and documentation CI passed for the published commit. These counts
are historical evidence, not permanently fixed gallery sizes or results of this
OpenSpec setup. Private diagnostic artifacts remain under `tests/.artifacts/`.

Mobile verification used Chromium emulation. No physical iPhone/Android,
Safari, VoiceOver, TalkBack, or OS high-contrast inspection is claimed. Automated
geometry, screenshots and lifecycle checks cannot establish physical haptic
strength. A future task must report its own checks and limits.

## Unresolved native Home Assistant reconnect issue

The issue was reproduced on native `/profile` without opening Marao on Core
2026.7.4. After a harmless notification loads the native toast, interrupting and
recovering the actual WebSocket can unsubscribe the old persistent-notification
ID on the new connection, producing `not_found: Subscription not found.` and a
Playwright `pageerror` rendered as `Object`.

With user approval, a backup was taken and only the disposable instance was
upgraded to Core 2026.10.0 on 2026-10-09. The issue remained reproducible. Marao
disabled controls, emitted no offline actions and recovered authoritative state,
but the native exception failed the disconnect portion of the release gate.

Upstream [Fix leaks on reconnect, #780](https://github.com/home-assistant/home-assistant-js-websocket/commit/4c5674c36cc898bbd38abc54b4d89777e37a8496)
was merged on October 8. Its immediate replacement of the unsubscribe wrapper
matches the observed race; confirmation for this reproduction is still required.
The frontend patch checked during review still pinned WebSocket library 9.7.1,
predating that fix. Those are dated observations, not a claim about future releases.

The user explicitly authorized publication of
[v0.5.1](https://github.com/diogomrpr/MaraoDashboard/releases/tag/v0.5.1)
with this documented issue. That exception applied to that release only. No HA
source was patched, experimental frontend installed, or error assertion hidden.
During the 0.6.0 release preparation the user separately allowed only this
diagnosed stale-unsubscribe failure until its upstream fix reaches a stable
frontend. Preserve raw failing assertions and native subscription evidence and
recheck the delivery chain before applying the exception. All other publication
and preserved-install requirements remain intact. The open change
`confirm-home-assistant-reconnect-fix` retains the required verification without
claiming the fix is delivered.

The official delivery check on 2026-10-12 found stable Core
[2026.10.1](https://github.com/home-assistant/core/releases/tag/2026.10.1), whose
[frontend requirement](https://github.com/home-assistant/core/blob/2026.10.1/homeassistant/components/frontend/manifest.json)
is 20260930.3, also the latest stable frontend. Its
[lockfile](https://github.com/home-assistant/frontend/blob/20260930.3/pnpm-lock.yaml)
still uses WebSocket 9.7.1; the identified fix is two commits ahead of that version.
The fix remains undelivered and the confirmation tasks stay open. This check did
not update Home Assistant or claim the reconnect defect is resolved.

The user-approved 2026-10-13 verification policy uses one shared mobile layout
matrix per release, distinct interactions once (device repeats for gestures),
independent preservation/recovery for all seven baselines and targeted browser
checks for other distinct formats. Manual review covers representative changed
components and difficult layouts; failure screenshots remain mandatory.
Publication may reuse complete exact-candidate preserved-install browser evidence
only after private capture, coverage, cleanup and restored-install checks.
