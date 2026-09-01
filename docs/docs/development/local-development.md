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
2. Install the seven
   [dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }})
   through HACS. The local sync sends only Marao-owned files.
3. Create a dedicated test user and a Home Assistant backup or VM snapshot.
4. Copy `.ha-local.example.json` to `.ha-local.json`, then replace every sample
   address and credential with values for your test instance.

`.ha-local.json` and local SSH keys are ignored by Git. Do not commit them.

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

```sh
npm run ha:sync
```

The task builds the HACS package, copies the integration and Marao frontend to
the configured test instance, and installs the card-test helper package. It
requests a Home Assistant restart only when integration code requires one.

For frontend-only changes, refresh the browser after syncing. If an older
resource remains visible, clear that device's Home Assistant frontend cache.

## Tests

Run local checks before using Home Assistant:

```sh
npm run test:static
npm run test:python
```

The browser end-to-end check is deliberately opt-in because it signs in and
interacts with the configured instance:

```sh
npm run test:ha:e2e
```

Run it only after verifying `.ha-local.json` points to the disposable test
instance. It is not part of `npm test` or continuous integration.
