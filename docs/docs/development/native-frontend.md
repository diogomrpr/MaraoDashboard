# Native frontend architecture

The current product is a HACS **Dashboard** package. Home Assistant stores ordinary views and cards; no Marao Python backend is installed. The [dated transition record](native-transition-record.md) retains earlier migration evidence without describing the current authoring workflow.

## Authoring and runtime

`frontend_src/native-cards.js` exposes the public catalog through Home Assistant's native card contract. `native-card-editor.js` owns configuration forms. `card-composition.js` validates and composes each saved card occurrence, including its automatic details. Preserve complete configuration, unknown fields, explicit emptiness and unrelated native layout/visibility whenever patching fields.

`native-bootstrap.js` attaches one shared navbar from the versioned root `marao` settings. Its boundary uses the `hui-root` controller lifecycle and `lovelace.setEditMode`. Unsupported metadata remains untouched with native editing still reachable. Root settings are optional: an individual Marao card does not take ownership of the entire dashboard shell.

Home Assistant owns views, sections, sizes, visibility and Save/Cancel. Automatic popup content remains per occurrence. A linked `popup_view` points to a same-dashboard Sections view that HA owns; creation is explicit, recovery-backed and guarded against stale/ambiguous invoking cards. Removing a reference does not delete that view.

Existing strategies render read-only and offer staged conversion through `ordinary-model.js` and `ordinary-session.js`. Source-only options, opaque fields and exact received text remain inert in recovery/provenance. See [migration and recovery](../installation/native-migration.md).

## Compatibility boundaries

| Boundary | Contract |
| --- | --- |
| Home Assistant | Stable 2025.12.0 or newer; unsupported/development versions are refused before protected native writes |
| Native cards | Public `custom:marao-*` types, `setConfig`, `hass`, editor and sizing interfaces |
| Shared dashboard settings | `marao.version: 1`; independent of release version |
| Historical source | Source format 2, native strategy envelope 1, compiler contract 1 |
| Legacy generated output | Contract 3; recognition/recovery of old owned output |
| Installed graph | SHA-256 source/assets/build identity, separate from package version |

A minimum-version declaration is not evidence that every feature was tested on that version. Preserve scoped evidence and its limits. Authenticated native configuration is readable even when its dashboard or editor is hidden/admin-only. Explicit imports require review of private values; path hints cannot detect every secret.

Native save acknowledgement and update events do not independently prove disk persistence. Pre-save comparison catches an already-stale baseline; it cannot provide global compare-and-swap against simultaneous writers. Preserve drafts/recovery on failure and retain this limitation in migration guidance.

## Build and package ownership

`npm run build:editor` regenerates source-owned frontend bundles. `npm run build:hacs` stages the Dashboard package and replaces root `dist/` and `hacs.json`. `npm run build:converter` creates the standalone offline HTML converter. Do not edit generated distribution files.

The flat graph contains the stable loader, release manifest and content-identified modules/assets. An injected graph-local URL resolver preserves relative assets without changing the browser's global URL constructor. Manifest hashes support readiness checks. A document-level gate prevents competing registrations from duplicate entry loads.

Commit the complete graph when publishing an immutable tag. If any release asset is attached, including the converter, attach **every file in `dist/`** too: HACS prefers release assets once any exist. Converter-only or entry-only releases are incomplete. Compare filenames/hashes against the manifest; do not use integration ZIP packaging.

The converter embeds its script, styles, font and license with a restrictive content security policy. It keeps answers in page memory, runs shared ordered conversion and asks only for required missing context. Unresolved old files, private includes and retired service calls block output; it cannot recover unseen files.

## Development installation

`prepareFrontend()` in `ha-test/prepare-frontend.js` installs compatible frontend changes on the disposable instance without a browser. Native preparation verifies the allowed target, existing dashboard/resource, complete graph and served assets, retaining a recovery package and unrelated configuration. It does not save a dashboard or restart HA. An unchanged successful graph is reused.

`npm run ha:sync` additionally prepares owned safe fixtures and restarts only for changed fixture Python. It preserves ordinary native dashboard data and unrelated helper state. Neither path authorizes operating production. Agents use only `192.168.0.28`.

Legacy installations require guided migration before native preparation; the installer refuses an accidental overwrite. Installation/readiness checks confirm deployment, not real-camera or physical-device acceptance.

## Historical compatibility

Retained Python source and immutable historical fixtures remain reference material outside the HACS download. Do not publish a new Integration package from the current frontend tree. Frozen provenance in `ha-test/upgrade/fixtures/native-baselines.json` identifies released-code inputs and independent expected native output; replay is not proof of live historical installation.

The source conversion chain, ordinary conversion, protected content and native card validation share maintained frontend models. Preserve unsupported-newer inputs, private backups, exact source, ordered membership and unknown data. See [source migrations](source-migrations.md) and [focused testing](focused-testing.md).
