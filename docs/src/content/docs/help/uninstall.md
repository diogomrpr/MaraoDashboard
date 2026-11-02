---
title: Uninstall
description: Remove the frontend package without deleting unrelated Home Assistant data.
---

Export your dashboard configuration and keep a private backup before removing Marao. Removing the frontend package does not remove Home Assistant devices, automations, dashboard storage or uploaded images.

## Remove the frontend

1. Replace or remove Marao cards from dashboards that should remain usable. Keep a copy if you plan to reinstall.
2. Remove the dashboard-level `marao` block if you no longer want its shared navigation and appearance.
3. Remove Marao Dashboard from HACS.
4. Remove only its `MaraoFrontend.js` resource registration if HACS did not remove it. Preserve other resources and their order. YAML-managed resources remain YAML-managed.
5. Refresh Home Assistant or reopen the companion app.

Do not delete a complete dashboard unless you intend to remove all of its cards and have retained its configuration. Linked popup views are ordinary Home Assistant views; deleting an invoking card or removing Marao does not delete them.

## Schedule collections

Schedules are Home Assistant automations and helpers, so they can continue running after the frontend is removed. If you want to remove a collection, use its management controls before uninstalling Marao. Stop operations explicitly, retain recovery data and confirm that devices are idle. Cleanup refuses uncertain ownership or known external dependencies. See [schedules](../../features/schedules/).

## Older installations

An old Python Integration installation has additional owned registrations and files. Follow the [migration and recovery guide](../migration/) to identify them. Do not remove all Lovelace resources, modify HACS's private registry, or delete historical data merely because its filename mentions a dashboard.
