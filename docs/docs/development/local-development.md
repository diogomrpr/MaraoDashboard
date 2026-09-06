---
title: Local development
layout: page
parent: Development
nav_order: 2
---

# Local Development

Use only the disposable Home Assistant development instance at
`192.168.0.28` for visual and interaction checks. Never point the sync,
browser test, or accessibility test at another or production Home Assistant
installation.

## Prepare the test instance

1. Enable SSH on the test instance and use key-based authentication.
2. Create a dedicated administrator test user and a Home Assistant backup or VM
   snapshot. The dashboard builder is available only to administrators.
3. Use a disposable Home Assistant instance for the baseline run. The local
   sync sends only Marao-owned files.
4. Copy `.ha-local.example.json` to `.ha-local.json`, then replace every sample
   credential and keep its Home Assistant target at `192.168.0.28`.

Keep the safe defaults for the first run:

```json
{
  "allowDashboardWrites": false,
  "allowRemoteWrites": false
}
```

`.ha-local.json` and local SSH keys are ignored by Git. Do not commit them.
The browser test refuses to run while `allowDashboardWrites` is `false`. A
non-dry-run sync independently refuses to run while `allowRemoteWrites` is
`false` or absent.

## Build and inspect the sync

Install the development dependencies and run a dry run:

```sh
npm ci
npm run ha:sync:dry-run
```

The dry run validates the local configuration and prints the files, SSH target,
and restart actions without changing Home Assistant. Review every target before
continuing.

## Sync to Home Assistant

After checking every dry-run target, explicitly allow the remote file changes
in `.ha-local.json`:

```json
{
  "allowRemoteWrites": true,
  "allowDashboardWrites": false
}
```

```sh
npm run ha:sync
```

The task builds the HACS package, copies the integration and Marao frontend to
the configured test instance, and installs local-only helper entities used to
render representative dashboard cards. It requests a Home Assistant restart
only when integration code requires one.

Set `allowRemoteWrites` back to `false` after the sync. Dry runs never require
this opt-in and remain read-only.

For frontend-only changes, refresh the browser after syncing. If an older
resource remains visible, clear that device's Home Assistant frontend cache.

## Tests

During normal development, run only the smallest check that covers the code or
card being changed. Select a specific unit or static check where possible;
these broader commands are examples when their complete layer changed:

```sh
npm run test:static
npm run test:python
```

For icon-only action-card layout changes, run the fast geometry check against
the disposable gallery:

```sh
npm run test:ha:alignment
```

It opens the Apple TV popup in a fresh browser context, reports the horizontal
and vertical center offset for every remote button, and fails when either axis
is more than 0.5 CSS pixels off-center. It also prints and verifies the loaded
Marao Cards resource version so an old browser resource cannot produce a false
result.

### Self-contained baseline

The browser end-to-end check signs in, checks the generated Marao dashboard,
and opens the card gallery backed by fake entities. Confirm the URL in
`.ha-local.json` belongs to the disposable test instance, then explicitly allow
those writes in that ignored local file:

```json
{
  "allowDashboardWrites": true,
  "allowRemoteWrites": false
}
```

The browser end-to-end command is a release check. Run it only when the user
requests the full gate, during final stabilization, or immediately before
publishing:

```sh
npm run test:ha:e2e
```

The check verifies that all generated views and the card gallery render with
the self-contained Marao card runtime. It checks the gallery's card and popup
counts, confirms the navbar is present, and reports any Home Assistant warnings
or errors.

Save & Generate rewrites Marao's generated dashboard JSON and YAML, may update
its `configuration.yaml` dashboard entry and Repairs, and may create a history
snapshot. Browser checks may call services only on the disposable gallery's
fake/helper entities and may change those temporary test states. Security
interaction coverage must use those safe helpers and must never operate a real
physical entity.

If the run reports an old Marao root JavaScript URL or a URL below
`/hacsfiles/MaraoDashboard/vendor/`, follow the Marao Repair and remove only the
exact legacy YAML resource entries it lists.
Do not remove Google Fonts or unrelated resources, and do not restore or delete
the stale copied vendor files merely to resolve the Repair. The exact inline
`/hacsfiles/MaraoDashboard/MaraoDashboard.js` entry in
`frontend.extra_module_url` is removed automatically when Marao can edit the
frontend configuration directly; includes and other complex YAML require
manual removal. After a manual change, reload the Marao integration or restart
Home Assistant. Reloading Lovelace resources alone does not clear the Repair.

The card gallery is available in the sidebar as **Marao Dashboard Card Test**
and at `/marao-dashboard-card-test/card-test`. It contains representative fake
entities for the supported Marao card templates and popup variants, so it is
the preferred page for visual review.

Run the browser check only after verifying that `.ha-local.json` points to the
disposable test instance. It is not part of `npm test` or continuous
integration. `npm run verify:publish` includes it with the complete local test
suite and is the required gate before publishing.

Set both write opt-ins back to `false` when local testing is complete.

### Mobile accessibility check

Run `npm run test:ha:accessibility` only against `192.168.0.28`. The release
coverage must include 320 CSS pixels plus representative iPhone and Android
portrait and landscape viewports. Exercise normal text, bold text, 200% text,
200% browser zoom, and bold plus 200% text as distinct configurations; verify
light and dark theme contrast. Full-page dashboard and popup screenshots belong
under `test-results/accessibility/` and must not contain private home data.
This check runs as part of `npm run verify:publish`.

The runner refuses to authenticate unless the configured URL host is exactly
`192.168.0.28`. It uses Chromium's iPhone or Android device settings for the
user agent, touch input, mobile layout, pixel density, OS text scale, color
scheme, and safe-area insets. Light and dark Marao variables are applied
explicitly, so the result does not depend on the test user's last selected
theme. Because Chromium's OS-scale emulation does not resize every explicit CSS
length, the runner also scales Marao's shared typography tokens; project-owned
cards must use those tokens so the 200% visual check remains deterministic.

The 200% page-zoom profile is a deterministic reflow approximation: it halves
the effective layout viewport and raises the emulated pixel density while
keeping the named device screen size. This exercises the layout pressure of
browser zoom, but Chromium device emulation cannot reproduce the surrounding
iOS or Android browser chrome exactly. Keep real-phone checks for final visual
polish where a platform-specific difference matters.

VoiceOver, TalkBack, OS high-contrast modes, and physical-phone testing are
outside the current release gate. Physical-phone inspection remains recommended
when a device is available and must not be claimed unless it was performed. See
the [dashboard quality contract]({{ '/docs/development/dashboard-quality.html' | relative_url }})
for the complete release matrix.

For a quick visual check on a computer, open **Terminal → Run Task** in VS Code
and choose **HA: Preview Mobile Accessibility**. Pick an iPhone, Android,
320-pixel, landscape, bold-text, 200% text, or 200% page-zoom profile, then pick
light or dark mode. The task opens the disposable dashboard in a headed browser
at that profile and keeps it open until you close the page or browser window.
It is a focused development aid, not a replacement for the release
accessibility check.
