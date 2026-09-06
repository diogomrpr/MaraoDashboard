---
title: Update
layout: page
parent: Installation
nav_order: 1.4
---

# Update Marao Dashboard

1. Create a Home Assistant backup.
2. In HACS, open Marao Dashboard and select **Update**.
3. Review the release notes for configuration or migration steps.
4. Restart Home Assistant.
5. Refresh the Marao Dashboard Editor and regenerate the dashboard when the
   release notes request it.

HACS owns `custom_components/marao_dashboard`, including the JavaScript served
from `/marao_dashboard_static`. The integration refreshes the dashboard YAML
template library under `www/community/MaraoDashboard/dashboard` and the theme
YAML under `themes/MaraoDashboard`; local edits to those copied files may be
replaced. Keep dashboard customizations in `dashboard.json` or inside the
generated YAML custom markers documented on the configuration page.

## Migrating from older Marao releases

Older Marao releases registered JavaScript from the Marao HACS directory,
including copied card bundles. Marao removes only its own legacy
`/hacsfiles/MaraoDashboard/MaraoDashboard.js`,
`/hacsfiles/MaraoDashboard/MaraoFrigateEventsCard.js`, and
`/hacsfiles/MaraoDashboard/vendor/` resources in storage mode. Standalone
third-party resources and Google Fonts remain untouched. Marao also leaves any
stale copied vendor files on disk and merely stops loading them.

An older release may also have added
`/hacsfiles/MaraoDashboard/MaraoDashboard.js` to
`frontend.extra_module_url`. Marao removes that exact inline entry
automatically when `configuration.yaml` can be edited directly. If the frontend
configuration uses an include or another complex YAML structure, or Lovelace
resources are configured in YAML mode, Marao leaves the YAML untouched and
raises a Repair listing the exact entries to remove manually. Current releases
register Marao-owned modules through Home Assistant's frontend API instead.

After manually removing the entries named by the Repair, reload the Marao
integration or restart Home Assistant. Reloading Lovelace resources alone does
not clear the Repair.
