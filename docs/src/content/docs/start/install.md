---
title: Install Marao
description: Install the frontend package and add your first Marao card in Home Assistant.
---

Marao is a **HACS Dashboard** package. It supplies cards, their editors, popups, navigation and a coordinated appearance. Home Assistant stores and edits the dashboard; a Marao Python integration is not needed.

## Before you start

Use stable Home Assistant **2025.12.0 or newer** and HACS. Your devices and their entities should already work in Home Assistant.

If you have an older Marao **Integration** installation or a dashboard using `strategy.source_json`, follow [migration and recovery](../../help/migration/) first. Updating the package does not convert saved dashboards.

## Install the package

1. In HACS, open **Custom repositories** and add `https://github.com/diogomrpr/MaraoDashboard` with category **Dashboard**.
2. Download Marao Dashboard.
3. Confirm that Home Assistant has one JavaScript module resource at `/hacsfiles/MaraoDashboard/MaraoFrontend.js`.
4. Refresh Home Assistant or close and reopen the companion app.

If resources are managed in YAML, preserve that mode and every existing resource. Add only the Marao module, run Home Assistant's `lovelace.reload_resources` action, then refresh. Do not register the same module twice.

```yaml
resources:
  - url: /hacsfiles/MaraoDashboard/MaraoFrontend.js
    type: module
```

The snippet shows a resource-list entry, not a complete Home Assistant configuration. Keep your existing surrounding `lovelace` configuration.

## Add a card

Open an editable dashboard, choose **Edit dashboard → Add card**, and search for **Marao**. Select a card, choose its entities, then **Save**. You can also paste the configuration from a card's playground into a manual card.

Marao cards can sit beside built-in cards or other cards you have installed yourself. Marao does not install, update, replace or remove those resources.

Continue with [your first card](../first-card/) or [dashboard-wide setup](../dashboard/).
