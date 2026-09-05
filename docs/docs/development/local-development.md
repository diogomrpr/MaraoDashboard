---
title: Local development
layout: page
parent: Development
nav_order: 2
---

# Local Development

Use a disposable Home Assistant development instance for visual checks. Never
point the sync or browser test at a production Home Assistant installation.

## Prepare the test instance

1. Enable SSH on the test instance and use key-based authentication.
2. Create a dedicated administrator test user and a Home Assistant backup or VM
   snapshot. The dashboard builder is available only to administrators.
3. Use a disposable Home Assistant instance for the baseline run. The local
   sync sends only Marao-owned files.
4. Copy `.ha-local.example.json` to `.ha-local.json`, then replace every sample
   address and credential with values for your test instance.

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
card being changed. For example:

```sh
npm run test:static
npm run test:python
```

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

Run the focused browser check directly when the changed card needs visual or
interaction coverage:

```sh
npm run test:ha:e2e
```

The check verifies that all generated views and the card gallery render with
the self-contained Marao card runtime. It checks the gallery's card and popup
counts, confirms the navbar is present, and reports any Home Assistant warnings
or errors.

Save & Generate rewrites Marao's generated dashboard JSON and YAML, may update
its `configuration.yaml` dashboard entry and Repairs, and may create a history
snapshot. The test does not call entity services or change entity states.

If the run reports a URL below `/hacsfiles/MaraoDashboard/vendor/`, follow the
Marao Repair and remove only the exact legacy YAML resource entries it lists.
Do not restore copied vendor files.

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

Run `npm run test:ha:accessibility` against the disposable local Home Assistant instance to exercise Android- and iPhone-sized viewports with 200% bold text. Full-page dashboard screenshots and true-viewport dashboard and popup screenshots are written to `test-results/accessibility/`. This focused check also runs automatically as part of `npm run verify:publish`.
