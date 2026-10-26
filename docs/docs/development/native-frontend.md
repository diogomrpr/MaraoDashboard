---
title: Native frontend transition
layout: page
parent: Development
---

# Native frontend transition

The breaking stable release is **v0.22.0**, in the existing
`diogomrpr/MaraoDashboard` repository. The disposable instance now runs the
**v0.22.1-beta.1 update-test prerelease**, installed through actual HACS after
v0.22.0. Native saves, independent disk comparison, restart retention, matching
legacy rollback, native read/write permissions and same-repository handoff passed.
The update retained a real unsaved Monaco draft, deferred client refresh until
explicit discard, then loaded the coherent new editor/worker graph at the same
route. The same authenticated Core connection stayed open with no stop event;
this establishes no restart during the update without claiming access to a host PID.
No browser errors, failed resources or legacy backend requests were observed.
Camera playback/physical devices and the remaining visual watch list stay manual.
The OpenSpec change remains open for that acceptance review.

The target reuses `diogomrpr/MaraoDashboard` as a HACS Dashboard repository, a Home Assistant dashboard
strategy, native configuration storage and the existing Visual/JSON builder.
The released legacy package remains frozen for rollback/reference. Guided manual
migration removes it before native import; no new Python bridge is built. Configuration History/Restore is removed; old archives remain
private and unchanged. Sensor/recorder history stays. Netatmo uses native basic
recordings without inferred detection types; playback remains a manual check.

## Compatibility and evidence

| Boundary | Minimum/contract | Current evidence and limit |
| --- | --- | --- |
| HA/frontend | Stable 2026.10.0 | Read-only strategy, actual registry/config/resource reads, Visual/Monaco and deferred workers passed on disposable HA 2026.10.0. Older or development versions are refused before native writes. |
| Native editor protocol | `ll-strategy-dashboard-marao-dashboard`, `getConfigElement`, `setConfig`, `config-changed` | Actual HA strategy settings, Visual/Monaco and installed builder saves passed. The internal editor has a stable position after the landing view, avoiding HA's retained numeric-index failure when pages are added/removed. See the [HA strategy contract](https://contributors.home-assistant.io/frontend/custom-ui/strategy/). |
| Native server saves/events | `lovelace/config/save`, `lovelace_updated` | Installed unchanged/edited saves, exact disk comparison and restart retention passed. A temporary non-admin account could read the disclosed source and was denied a save; it was deleted afterward. Session tests cover failure retention, single-flight and already-stale refusal. Simultaneous writers retain HA's native limit. |
| Source visibility | Readable through authenticated native config APIs | Hidden/admin-only editor controls do not make source private. Import and cutover require explicit review; path-only hints cannot detect every secret. |
| Resource registration | Native storage UI or existing YAML list | The disposable uses `resource_mode: yaml`: resource writes are intentionally absent. Append only the owned URL, use native `lovelace.reload_resources` and preserve mode/unrelated resources. This requires no Marao backend. |
| HACS Dashboard files | Flat files in repository `dist/` | Actual same-repository remove/re-add and v0.22.0 installation passed, followed by a HACS update to v0.22.1-beta.1 without restart. HACS prefers any attached release assets; attach the complete flat graph with the converter. The initial converter-only download failed readiness and was corrected; it is retained as failed evidence. |
| Netatmo browse metadata | Native camera unique ID and `events/<camera>/<epoch>` | [HA 2026.10.0 camera code](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/netatmo/camera.py) stores events by event time and builds the camera unique ID from its ID/type; [native media source](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/netatmo/media_source.py) exposes those IDs. Metadata-only tests verify matching and safe decimal epochs. No provider title is parsed for detections. |

HA can acknowledge a normal save and notify clients before disk persistence is
independently established. The user accepted this native limitation and the
remaining simultaneous two-device last-writer race. Pre-save comparison catches
an already changed baseline, retains/exportable drafts and does not claim global
compare-and-swap. The upstream save report is
[Core #188548](https://github.com/home-assistant/core/issues/188548). Migration
still needs exact private backups and independent persisted/restart proof.

## Version boundaries

| Version | Current value | Meaning |
| --- | --- | --- |
| Source JSON | 2 | Persisted editable page/card semantics; see [migration maintenance](source-migrations.md). |
| Native envelope | 1 | Strategy metadata wrapping the complete exact `source_json` string. |
| Native compiler contract | 1 | Source-to-native strategy compilation contract. |
| Legacy generated contract | 3 | Existing owned YAML/markers used only to recognize retained legacy output. |
| Repository release | 0.22.0 stable; 0.22.1-beta.1 update test | v0.21.1 remains the immutable legacy rollback baseline. Package labels are separate from source/envelope versions. |
| Frontend graph | SHA-256 identity | Owned source/assets/build-rule identity, independent of release labels. |

## Local artifacts

Developers build editor bundles with `npm run build:editor`, then run
`node frontend_src/build-native.cjs --frontend` for Dashboard repository staging
or `node frontend_src/build-native.cjs` for the self-contained offline HTML.
The frontend CLI also replaces the versioned root `dist/` and `hacs.json`. Commit
that complete reproducible graph with the source; HACS downloads only `dist/`,
not the legacy reference code. Do not hand-edit generated distribution files.
End users receive that ready-to-open HTML; they do not need Node, HA login,
another server or Marao's HA builder to convert pasted JSON.

Dashboard staging has root HACS metadata/license and a flat `dist/` containing
the stable loader/release manifest and content-identified assets. Esbuild injects
a graph-local URL resolver without modifying the global browser URL constructor.
The manifest includes file hashes for migration/readiness verification. Dynamic
editor/CSS/font/worker references stay in the owning graph. A document-level
runtime gate prevents duplicate frontend entries from registering competing
runtime graphs. A full HA refresh/reopen is required at the manual retirement
boundary; already released legacy code is not retroactively changed.

Commit the complete flat `dist/` graph with the source and use an immutable tag.
**If a release has any attached asset (including the converter), attach every
file in `dist/` as a separate release asset too.** Installed HACS prefers release
assets whenever any exist, even if none match the entry filename. A converter-only
release therefore installs no frontend; a single entry file omits dependencies.
Before publication, compare asset names/hashes with `MaraoFrontend.release.json`.
Do not use integration ZIP handling for the Dashboard package.

Keep the existing repository: remove its HACS Integration registration completely,
then add it as Dashboard. Installed HACS validates the latest stable tag before
version/beta selection, so a frontend prerelease alone cannot bootstrap this
handoff while v0.21.1 is stable. Historical tags remain unchanged. The user
explicitly authorized the breaking v0.22.0 stable release on 2026-10-26.

The offline converter bundles its font, license, styles and script with a restrictive
content security policy. It retains answers in page memory and clears them when
the source changes. It assumes harmless presentation defaults and asks only for
required membership/address information. Known old owned asset addresses resolve
at compilation; unresolved private files or retired services block conversion.
Output covers supplied content, not unseen installation files.

## Manual migration and remaining gates

Follow the [per-instance manual guide](../installation/native-migration.md): export
open drafts, stop editing, take exact private matching package/data backups,
convert/download locally, remove only the legacy integration/YAML registration,
restart, then create/import through native HA UI at the same address/settings.
Creation and content import are separate steps. After interruption, inspect the
actual same-root registration and finish import or restore matching package/data;
no automatic checkpoint, endpoint fence or server transaction is promised.

`prepareFrontend()` detects an already migrated native dashboard and uses
`prepare-native-frontend.js`. It verifies the resource/source/Cases view, absent
legacy Python, allowed disposable target, package hashes and served assets. It
swaps the complete package with a recovery copy, retains unrelated source/fixtures
and never calls native save or integration reload/restart. Repeat sync is a no-op.
Ordinary `ha:sync` also updates only marker-owned disposable fixture code, with a
restart only when that Python code changed; it preserves native source, helper
configuration and generated files. Synthetic devices use their own fixture entry,
independent of the removed product backend. Frontend-only sync does not run this
fixture preparation. Both frontend preview and ordinary `ha:sync` refuse installing the native candidate
over a legacy installation; guided migration comes first. Explicit historical
upgrade receipts keep their existing isolated verification path.

Before completion, the original dashboard root must survive native import,
independent disk comparison, restart retention, matching package-plus-data rollback
and retained-runtime checks. Old clients need a full HA refresh/reopen, after
exporting drafts. The second HACS Dashboard update passed with one uninterrupted Core session,
unchanged source/settings, draft deferral and a coherent new graph. Local builds
and browser request overrides remain separate from this actual-install evidence.

## Retired backend consumers

The released v0.21.1 Python tree is frozen reference/rollback code. Native releases
are staged by `build:hacs`; HACS downloads only the flat `dist/` files and
installs no `custom_components` package. The repository retains legacy source
for compatibility checks and rollback reference, outside the downloaded graph. Do not
publish the working frontend tree as a new legacy Integration release.

| Released entry point | Native replacement or removal | Migration action |
| --- | --- | --- |
| `marao_dashboard.generate_dashboard`, `config_path`, dashboard-key/dry-run service inputs | Local JSON import/export, shared write-free validation/preview and explicit native save | Review automations and external tools; a closed-browser generation job has no frontend equivalent. Resolve/remove that dependency before cutover. Alternate JSON files must be backed up and supplied explicitly. |
| `marao_dashboard/config/get` (`full`, `initial`, `context`) | Native `lovelace/config`, bundled catalog, native entity/device/area registry reads | Keep complete source in the native envelope; initial display scope remains deferred from full metadata. |
| `marao_dashboard/config/generate` | Shared local validation/compiler, then `lovelace/config/save` | Preserve already-stale/conflicting drafts; native simultaneous-writer/disk-save limitations remain disclosed. |
| History scope and `marao_dashboard/history/restore` | Removed by user decision | Keep exact archives privately; do not enumerate/import them or create new product snapshots. |
| `marao_dashboard/camera/netatmo_events` | Native registry/media browse/resolve for basic recordings | Keep provider/options; no typed metadata, inferred title filters or private fallback. |
| `marao_dashboard/frontend/subscribe` | Native `lovelace_updated` and installed frontend manifest identity | No custom subscription after removal; defer asset refresh for retained drafts/popups/gestures. |
| `/marao-dashboard-editor` | Same-root saved `editor_path`, plus native strategy settings | Export open drafts and stop old clients before removal; document full HA refresh/reopen afterward. |
| `/marao_dashboard_static/*`, `/api/marao_dashboard/frontend/*` | Known owned files in the flat hashed package | Resolve proven owned files at compile time, including absolute old URLs. Unknown old files ask for an explicit accessible replacement URL; private includes and retired calls require correction. Original JSON is untouched; only approved file answers change converted source. |
| Python template/theme/generated YAML installers | Shared frontend compiler and scoped bundled theme/font | Preserve original generated/custom/history/theme files; later native saves never modify them. |

Repository usage includes the legacy setup/editor tests, disposable legacy prepare
and historical upgrade harness, installation service examples and old editor
bookmarks. Their legacy behavior is not a new native API. The native preparation
path explicitly refuses accidental legacy deployment. Local source review cannot
discover callers outside this repository or HA installation; the per-instance
manual checklist covers those declared dependencies.

## Frozen modern compatibility data

`ha-test/upgrade/fixtures/native-baselines.json` records the verified public release,
annotated tag object, peeled commit, source hash and integration-tree digest for
v0.17.0 (contract 2), v0.20.0 and v0.21.1 (contract 3). Exact released generators ran offline
with empty registry and source-unit checks disabled for data replay. These outputs
are released-code oracles, not installed historical packages or sole expectations.

Independent fixed target data applies only documented owned namespace aliases,
preserves opaque legacy options/unknown raw templates, adds an empty access
variables object and uses the current native raw-only grid/square default for the
v0.17.0 target. The v0.21.1 compiled target equals released output and its source
text stays exact. Whole-target comparisons and hashes pass; actual preserved
installation, restart retention and rollback have separate private evidence for
the actual v0.21.1 installation. Older releases are data replay, not live installs.

`npm run test:ha:upgrade -- --conversion-only` runs the reviewed ten-baseline native
data matrix, custom-root and repeat-conversion checks. Its report explicitly says
`installed: false`. Native dry-run lists the lineage and manual guide; the old
automatic Python replacement runner refuses this candidate before writes. Full
source/output expectations and per-step fixtures remain checked by their focused
unit suites; no historical package installation is inferred from conversion.
