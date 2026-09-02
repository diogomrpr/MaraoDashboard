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
3. Leave the seven dashboard dependencies uninstalled for the first baseline
   run. The local sync sends only Marao-owned files.
4. Copy `.ha-local.example.json` to `.ha-local.json`, then replace every sample
   address and credential with values for your test instance.

Keep the safe defaults for the first run:

```json
{
  "dependencyMode": "missing",
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

Run local checks before using Home Assistant:

```sh
npm run test:static
npm run test:python
```

### Missing-dependency baseline

The browser end-to-end check signs in and regenerates the currently configured
Marao dashboard. Confirm the URL in `.ha-local.json` belongs to the disposable
test instance, then explicitly allow those writes in that ignored local file:

```json
{
  "dependencyMode": "missing",
  "allowDashboardWrites": true,
  "allowRemoteWrites": false
}
```

Run the check:

```sh
npm run test:ha:e2e
```

In `missing` mode, the check verifies that the builder lists all seven projects,
all seven are reported as not detected, recheck and direct HACS links are
available, and Save & Generate stays enabled. It submits the unchanged builder
configuration through the same backend command used by Save & Generate, then
opens every generated view. Each view must render the expected visible
missing-card placeholders for its direct card configuration without unrelated
warnings or errors.

Save & Generate rewrites Marao's generated dashboard JSON and YAML, may update
its `configuration.yaml` dashboard entry and Repairs, and may create a history
snapshot. The test does not call entity services or change entity states.

If the run reports a URL below `/hacsfiles/MaraoDashboard/vendor/`, follow the
Marao Repair and remove only the exact legacy YAML resource entries it lists.
Do not restore copied vendor files.

### Installed-dependency checks

After the baseline passes, install the seven
[dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }})
independently through HACS. Then change the local settings to:

```json
{
  "dependencyMode": "installed",
  "allowDashboardWrites": true,
  "allowRemoteWrites": false
}
```

Run `npm run test:ha:e2e` again to visit every generated view and verify that
each directly configured custom-card type that is active for the current entity
states renders at least the expected number of instances without warnings or
errors. The test does not change entity states.

Run the browser check only after verifying that `.ha-local.json` points to the
disposable test instance. It is not part of `npm test` or continuous
integration.

Set both write opt-ins back to `false` when local testing is complete.
