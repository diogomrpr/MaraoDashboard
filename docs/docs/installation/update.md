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
from `/marao_dashboard_static`. The integration maintains the Marao theme YAML
under `themes/MaraoDashboard`; local edits to that installed theme may be
replaced. Generated dashboard files under `dashboard/MaraoDashboard` are
rebuilt from `dashboard.json`. Keep dashboard customizations in that JSON or
inside the generated YAML custom markers documented on the configuration page.

## Saved configuration and recovery

Automatic regeneration retains an existing dashboard route by its exact owned
YAML filename. Preview, generation, saved history and compatible restoration use
that same route, including a previously chosen custom key. Ambiguous or duplicate
registrations are rejected. If a planned route belongs to another dashboard,
setup, previews, saves, generation and restoration stop before changing its files
or creating a new history baseline. Renaming a route removes only the registration
whose exact filename belongs to the saved source.

Keep the matching integration package, `dashboard.json`, generated dashboard
directory (including custom YAML), and affected Home Assistant configuration in
your pre-update backup. Back up an alternate source file too if generation uses
one. History offers exact source/generated snapshots, but is not a complete
Home Assistant or package backup. Archived snapshots must not be rewritten to
simulate compatibility with a new format.

The development candidate retains the saved JSON bytes in new history snapshots,
including spacing, key order and line endings. Existing archives stay unchanged;
formatting already discarded by older releases cannot be reconstructed. JSON
and generated files use separate atomic replacements. Writable generation and
compatible history restoration now stage the saved source, exact output and owned
`configuration.yaml` dashboard/frontend patches, retired owned gallery registration
cleanup, bundled theme and owned resource cleanup together. Resource-only or
theme-only setup uses this boundary without creating or rewriting saved JSON.
Home Assistant's earlier pending resource edits are flushed into the baseline
before Marao removes its registrations. Native cleanup must persist the planned
bytes before the source commits; failures restore the exact file and owned IDs
in the loaded collection. Unrelated registrations and their order remain intact.
A private
`.history/.operation/` checkpoint retains exact before/after copies and its baseline
history identifier until completion or recovery; active operations are serialized.
Startup recovers an interrupted file operation before reading the saved source.
Setup, unload, generation services, editor saves and history restoration also share
one asynchronous operation lock, so a request arriving during startup waits for
setup to finish before reading or replacing the saved dashboard.
This is bounded file recovery, not a transaction over all Home Assistant state.
Retained copies and their directory entries are flushed before the operation
checkpoint permits active replacement. History and recovery directories are
private, and symlinked source/output paths are rejected before backup.

If an affected file was independently edited, recovery stops rather than replacing
that edit. Keep the private checkpoint and matching package backup, resolve the
reported conflict, and retry. A failed rollback remains a failure with its copies
retained. Treat these copies as private configuration and never publish them.

Updates must preserve selections, deletions, explicit empty lists, order, options,
unknown/raw content, protected custom YAML and unrelated HA settings. A format
change needs validated ordered conversion with a recoverable baseline; unchanged
formats should preserve saved source without a gratuitous version increment.
Invalid or unsupported newer configuration must produce a readable error rather
than reset the dashboard. Do not delete the saved source to bypass such an error.

Setup detects a changed generated contract and regenerates existing saved selections
without refilling empty rooms. No-op setup preserves saved source bytes. The current
format converts legacy room selections to explicit membership and ordered editable
pages without inserting removed cards. The complete preserved-install release
scenario remains required before publication. Follow release notes
and retain a complete backup. The bounded source/output/patch/theme/resource
recovery has focused failure and interruption checks. Native pre-JSON storage imports saved views and bindings through the same
recoverable generation path, retains its native registration, and keeps the exact
storage bytes, configuration and theme under the private `.native-backups/`
directory beside history. Native headers become Title cards, subtitle content and
explicit back shortcuts; unsupported or ambiguous sources fail before writes.
Focused native lifecycle checks do not replace live preserved-install evidence.

History preflights source format, generated contract and copy integrity before
replacing active data. Compatible archives restore exact bytes and remain immutable;
normal subsequent generation can convert the active copy. Unsupported old card
bundles or future contracts require their matching complete package/data backup,
not an asset-only downgrade.

Dashboard format validation is now implemented in the development candidate:
absent `config_version` and explicit integer `0` identify legacy room input.
New starters use `config_version: 2`. Format 0 first imports explicit room
membership into format 1; the next ordered step converts it to pages in format 2. Setup converts compatible legacy sources
through the recoverable generation operation and retains the exact prior source
and generated baseline in history. Malformed markers and newer versions are
rejected before generation or setup repairs. This number is separate from
Marao's package version and Home Assistant's config-entry version.

In format 1, rooms contain only their explicit `entities`. An empty list or a
missing property means empty. The optional `area` ID supplies editor suggestions;
registry additions, movements and removals cannot change membership. Legacy rooms
with any `entities` property use that selection, including `[]` or `{}`. Legacy
`include`, `exclude` and `overrides` are folded into it once and removed. Reintroducing
those instructions into a format-1 room produces a validation error.

A legacy room with only an area requires current registry metadata and an
unambiguous area ID/name. Missing or ambiguous metadata stops conversion without
replacing the source. Its one-time snapshot includes supported, visible, enabled
entities with states and respects each entity's area before its device's area.
This source cannot reveal deletions never recorded in explicit JSON. Editor
previews and dry runs do not write; successful Save & Generate or service
generation persists the canonical source. Historical restores remain exact;
their active copy is converted on the next writable generation or setup.

The ordered page conversion preserves existing view paths, configured names,
options, raw cards, unknown fields, scene/access/media selections and compatible
popup links. Absent optional guided pages remain absent. The historical menu is
snapshotted once, including additive URL routes; an explicit empty menu stays empty.
Old object options without an operative role remain under `legacy_page_options`.
Current format-2 absence/emptiness never triggers template population.

Opening a supported document in the editor preserves missing optional sections
and the shape/order of its saved entity lists. Switching between Visual and JSON
does not insert empty pages or regroup an unchanged ordered list. These are
read-only round trips; canonical compatibility changes are persisted only by a
successful writable operation.

Entity Groups in predecessor format 1 convert into ordinary cards in the Home
page of format 2. Their source membership and nested options remain independent. A missing `overview.entity_groups` field
uses the shared legacy defaults in existing order and keeps their popup links.
The editor displays these defaults without changing the saved source or history;
Save & Generate stores the ordered page document. An explicit empty list stays empty.
Starter creation selects useful groups once. Later registry changes do not refill
saved groups. Older packages can ignore these new descriptors, so restore their
matching saved data and generated output when rolling back the package.

If an update fails, retain the failed source and private diagnostic/recovery data.
Restore the prior complete backup, including its matching Marao package and saved
source/generated/owned-state baseline, then restart Home Assistant and refresh the
browser. Downgrading only the package after a JSON conversion is not a safe
rollback: an older generator can interpret new saved data differently. Keep
unrelated changes made since the backup before replacing shared HA configuration.

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

## Refresh an open device after an update

Restart Home Assistant after installing an integration update. Marao's small
startup loader bypasses Home Assistant's custom-file cache and selects the
installed release before loading cards. All JavaScript dependencies, editor
styles and workers use that release's own asset path. A normal dashboard opening
therefore does not need a manual cache clear. This also works when cached HTML
references an older bootstrap version.

An already-open dashboard with the automatic update handler refreshes after a
version change, or when the app reconnects/returns to the foreground. Recovery
waits for edits, open popups and active controls to finish. Existing flat entry
URLs remain supported and select the current release on their next server request.
An older, completely cached running session cannot receive new loading code
until it contacts the server; reopening the app may be needed once when moving
from such a release. Server code cannot erase a phone's already-satisfied cache.

The small top-right refresh button and a three-second navbar hold remain manual
fallbacks. They preserve sign-in, preferences, dashboard settings and the current
page. Save or discard edits first. Android and browsers use web recovery;
supported iOS apps use native cache reset with a bounded fallback. An incomplete
server deployment is reported rather than silently mixing versions; complete
the installation and restart Home Assistant to recover it.
