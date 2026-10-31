---
title: Update
layout: page
parent: Installation
nav_order: 1.4
---

# Update Marao Dashboard

**Moving from an Integration release (v0.21.1 or earlier)?** Follow the
[one-time breaking migration](native-migration.md). Do not update that old HACS
Integration entry in place. Remove it and re-add the same repository as Dashboard.

## Normal Dashboard updates

1. Export any unsaved drafts and keep a private backup of the native dashboard.
2. In HACS, open Marao Dashboard under **Dashboard** and select **Update**.
3. Review the release notes, then refresh HA or reopen the companion app.

No Marao integration reload or Home Assistant restart is required. HACS owns
`www/community/MaraoDashboard`; it downloads the entire versioned asset graph.
Keep `/hacsfiles/MaraoDashboard/MaraoFrontend.js` registered once as a module.
Do not install a single JavaScript file without its accompanying assets.

## Refresh an open device after an update

The stable loader reads the installed release manifest. Entry modules, deferred
editor code, styles and fonts use one content-identified graph. Startup,
foreground and reconnect checks discover a changed package. Recovery waits while
a draft, popup or gesture is active; finish, save/export or discard edits before
refreshing. An old cached session may require a full refresh/reopen once.

The configured refresh button and two-second navbar hold remain fallbacks.
Browser recovery clears frontend Cache Storage, re-fetches the registered startup
loader into the HTTP cache (including its HACS query parameters), then reloads.
If the loader cannot be fetched, recovery reports a failure instead of reloading
an old cached copy. Companion apps can use their native cache-reset command.
These actions retain sign-in, preferences and the current dashboard route. An incomplete
installation produces an error: finish downloading the complete package and
refresh the client. A restart does not replace missing frontend files.

## Saved configuration and recovery

Ordinary views and cards live in HA dashboard storage and use HA's native editor.
Existing strategy sources remain read-only until explicit conversion through the
former editor page. Recovery exports retain the original source and proposed
document; native edits do not regenerate from migration provenance. Saved
selections, explicit emptiness, order, names and unknown/raw content are retained.
Dashboard settings versions remain separate from package and source versions.

Export configuration before replacing it. A pre-save comparison catches an
already changed baseline and retains conflicting drafts, but simultaneous
cross-device saves retain HA's native last-writer behavior. Native save
acknowledgment/readback alone is not proof that disk persistence has completed.

Configuration History/Restore is removed; sensor history remains. Old legacy
archives stay private and untouched. For rollback, restore the matching package
and saved document together; a legacy rollback also needs its original generated
files and owned HA settings. Follow the [rollback instructions](native-migration.md#if-you-need-to-return-to-the-old-installation)
and preserve unrelated changes made after the backup.
