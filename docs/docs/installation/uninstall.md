---
title: Uninstall
layout: page
parent: Installation
nav_order: 1.5
---

# Uninstall

Create a backup first, then remove Marao in this order:

1. Go to **Settings > Devices & services**, open Marao Dashboard, and delete its
   config entry.
2. In HACS, open Marao Dashboard and select **Remove**.
3. Remove the `marao-dashboard` entry from `lovelace.dashboards` in
   `configuration.yaml`.
4. If this installation was upgraded from an older release and Marao still
   reports a legacy resource Repair, remove only the exact entries it names.
5. If no other dashboard uses it, remove the copied
   `www/community/MaraoDashboard/dashboard` template directory.
6. If no other theme uses it, remove `themes/MaraoDashboard`. Keep a
   shared `frontend.themes: !include_dir_merge_named themes` setting when other
   themes still depend on it.
7. Delete the generated `dashboard/MaraoDashboard` directory only if you no
   longer need the dashboard JSON, custom YAML, or version history.
8. Restart Home Assistant.

There is no current Marao Lovelace resource to remove. Removing the config
entry unregisters its frontend modules and editor panel; restarting Home
Assistant also clears the `/marao_dashboard_static` route.

A typical dashboard entry to remove looks like this:

```yaml
lovelace:
  dashboards:
    marao-dashboard:
      mode: yaml
      title: Marao Dashboard
      icon: mdi:home
      show_in_sidebar: true
      filename: dashboard/MaraoDashboard/dashboard/dashboard.yaml
```

If this installation was upgraded from an older Marao release, also remove any
legacy resource named by Marao's Repair. These can include Marao's old root
JavaScript files and URLs below `/hacsfiles/MaraoDashboard/vendor/`. The exact
inline `/hacsfiles/MaraoDashboard/MaraoDashboard.js` entry in
`frontend.extra_module_url` is normally removed automatically when the frontend
configuration can be edited directly. Includes, complex frontend YAML, and
YAML-mode Lovelace resources require manual removal.

Do not remove Google Fonts or unrelated resources. Legacy migration leaves
stale copied vendor files on disk and unloaded; deleting those files is not
required to clear the Repair. After manually removing a listed entry, reload
the Marao integration or restart Home Assistant. Reloading Lovelace resources
alone does not clear the Repair.
