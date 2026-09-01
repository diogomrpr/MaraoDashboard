---
title: Installation
layout: default
---

# Installation

Marao Dashboard is distributed as a Home Assistant integration through HACS.
The integration loads the builder and cards and registers the Marao theme.

## Add the custom repository

1. Open HACS and select **Custom repositories**.
2. Enter `https://github.com/diogomrpr/MaraoDashboard`.
3. Select **Integration** as the repository type.
4. Download Marao Dashboard and restart Home Assistant.

## Add the integration

1. Open **Settings → Devices & services**.
2. Select **Add integration** and search for **Marao Dashboard**.
3. Complete the one-step setup.
4. Refresh the browser.

No Lovelace resource or `configuration.yaml` entry is required. Continue with
the [dashboard builder](builder.html).

## Updating

Install the update in HACS, restart Home Assistant, and refresh the browser.

## Removing

Remove the Marao Dashboard config entry, then uninstall it from HACS. Dashboards
already created by the builder remain in Home Assistant until you delete them
from **Settings → Dashboards**. Cards from this integration will show as missing
after it is removed.
