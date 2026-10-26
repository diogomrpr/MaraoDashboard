---
title: Download with HACS
layout: page
parent: Installation
nav_order: 1.2
---

# Download with HACS

Marao v0.22.0 and later use category **Dashboard**. If this repository is already
installed as Integration, complete the [breaking migration](native-migration.md)
first: remove the old package and custom-repository registration before re-adding
the same URL. A normal Update on the old entry does not perform this migration.

## New installation

1. Use stable Home Assistant **2026.10.0 or newer** and configured [HACS](https://www.hacs.xyz/docs/use/).
2. Open HACS → three-dot menu → **Custom repositories**.
3. Add `https://github.com/diogomrpr/MaraoDashboard` with category **Dashboard**.
4. Open Marao Dashboard and select **Download**.
5. Verify `/hacsfiles/MaraoDashboard/MaraoFrontend.js` is registered **once** as a
   JavaScript module, then refresh Home Assistant or reopen the companion app.

HACS downloads the complete flat `dist/` graph into
`www/community/MaraoDashboard`. No Marao Python integration is installed, and you
do not add Marao in Devices & services. Unrelated cards/resources remain unchanged.

With HA-managed resources, use HACS or **Settings → Dashboards → Resources**
(advanced mode may be needed). If resources are already YAML-managed, preserve
that mode and the other entries; append only:

```yaml
- url: /hacsfiles/MaraoDashboard/MaraoFrontend.js
  type: module
```

Run the built-in `lovelace.reload_resources` action after editing the YAML list.
A normal frontend download/resource refresh needs no HA restart. Continue with
[configuration](configuration.md); existing users instead import their converted
complete native document through the migration guide.
