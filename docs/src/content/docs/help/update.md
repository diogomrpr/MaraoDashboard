---
title: Updates and compatibility
description: Update the frontend package while preserving Home Assistant configuration.
---

For an ordinary native dashboard already using the HACS **Dashboard** package, install the stable update in HACS and refresh Home Assistant or reopen the companion app. Normal frontend updates do not require a Home Assistant restart.

Read the release notes before a version with migration instructions. Keep a private Home Assistant backup and the matching package before changing saved formats or installation models. An older **Integration** installation and a `strategy.source_json` dashboard have separate [migration paths](../migration/).

## What stays saved

Home Assistant owns the native dashboard document, including views, cards, layout and visibility. Marao visual edits preserve unrelated options, custom card data, explicit empty selections and ordering. Updating assets does not replace your dashboard with discovered or starter content.

Package versions and saved settings versions are separate. For example, `marao.version: 1` is the dashboard-settings contract, not the installed release number. Do not change it to match a package version.

## Refreshing clients

The stable `MaraoFrontend.js` resource loads the installed frontend's manifest. If a client still shows old assets, use Marao's cache refresh or fully reopen it. Administrators can hold the navbar and choose **Clear cache and refresh**. Avoid duplicate module registrations or manually mixing files from different releases.

## Returning to an older version

If an update changed persisted data or ownership, restore the exact matching package and saved data together. Export any newer edits first and preserve unrelated changes. Restoring old assets alone cannot reverse a data migration. The [recovery guide](../migration/) explains the older installation transitions.

This website documents the current stable release. Its card runtime, settings references and examples are built for that release; unreleased source changes are not published as an Upcoming edition.
