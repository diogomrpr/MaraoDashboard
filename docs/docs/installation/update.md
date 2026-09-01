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

## Update dashboard dependencies separately

Marao does not ship or update its seven third-party dashboard dependencies.
Update each one from its own HACS page. The versions in the
[dependency guide]({{ '/docs/installation/dependencies.html' | relative_url }})
are tested baselines, not pins. Newer upstream releases may work, but review
their release notes and test the generated dashboard after upgrading.

## Migrating from bundled dependencies

Older Marao releases registered JavaScript from a Marao `vendor` directory.
Install all seven standalone dependencies first, then remove legacy resource
URLs containing `/MaraoDashboard/vendor/`. Storage-mode and YAML-mode cleanup,
including Card Mod duplicate handling, is covered in the
[upgrade section of the dependency guide]({{ '/docs/installation/dependencies.html#upgrading-from-older-marao-releases' | relative_url }}).

An older release may also have added
`/hacsfiles/MaraoDashboard/MaraoDashboard.js` to
`frontend.extra_module_url`. Remove that legacy entry during the upgrade;
current releases register Marao-owned modules through Home Assistant's frontend
API instead.
