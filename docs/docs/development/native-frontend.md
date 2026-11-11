# Native frontend architecture

The current product is a HACS **Dashboard** package. Home Assistant stores ordinary views and cards; no Marao Python backend is installed. The [dated transition record](native-transition-record.md) retains earlier migration evidence without describing the current authoring workflow.

## Authoring and runtime

Basic card definitions register before the larger content runtime downloads. Eager card dependencies load together; a registered card awaiting its content uses Home Assistant's progress indicator. Home Assistant retains ownership of missing-card errors and automatic rebuilding when definitions arrive; Marao does not patch the panel or replace its card elements.

`frontend_src/native-cards.js` exposes the public catalog through Home Assistant's native card contract. `native-card-editor.js` owns configuration forms. `card-composition.js` validates and composes each saved card occurrence, including its automatic details. Preserve complete configuration, unknown fields, explicit emptiness and unrelated native layout/visibility whenever patching fields.

`native-bootstrap.js` attaches one shared navbar from the versioned root `marao` settings. Its boundary uses the `hui-root` controller lifecycle and `lovelace.setEditMode`. Unsupported metadata remains untouched with native editing still reachable. Root settings are optional: an individual Marao card does not take ownership of the entire dashboard shell.

Home Assistant owns views, sections, sizes, visibility and Save/Cancel. Popup settings start collapsed in the card editor. Expansion exposes the native Sections canvas, native menus and complete native card/section dialogs. The full native picker suggests Marao cards first. Scoped dialog instances contain configuration and closure events so the global dialog manager cannot replace the parent editor. Child Save accepts only into the temporary popup document; outer Save/Cancel owns persistence. The single filtered Template dropdown applies occurrence-local version-1 `popup_content` snapshots; the native canvas is always editable. Automatic or linked content is materialized into a private snapshot only on its first actual edit. The synthetic canvas owner cannot save the dashboard. Native child validation, lifecycle guards and restricted draft destinations preserve that boundary. Nested draft editors cannot start legacy source-view transactions. Runtime popups have no authoring toolbar.

Template options are filtered by parent family and Entity Group kind and use parent entity bindings. Compare canonical layout and presentation against generated candidates to display a template name or Custom, independent of saved origin metadata. No-op child saves retain the matching name; exact manual restoration recovers it. The separate chooser, customization/mode controls and duplicate popup presentation fields are removed. Existing saved fields remain preserved.

For a hash-backed summary or other popup owner, copying resolves exactly one saved popup definition in the invoking view and preserves the original shared source. Unsupported or ambiguous sources remain untouched, with explicit legacy source editing under Advanced options. That legacy path retains its separate source-view save and transactional guards; removing a `popup_view` reference does not delete the view.

Native forms use the catalog's compatible domains to expose a primary entity, including Header's optional weather source. Rooms and collections edit their explicit member lists instead. Removing group members prunes only their section references. Schedule devices are setup options for a new collection; an installed collection owns its registered devices. Loading collection choices updates the current form without replacing its draft. Invalid event values and incomplete or duplicate current-room mappings must be corrected before saving; unrelated edits never silently accept the previous values.

Native picker registrations also expose Home Assistant's documented
`getEntitySuggestion(hass, entityId)` callback. By entity suggestions use catalog
domains/device classes and validated defaults, bound exclusively to the selected
entity. Access covers keep their strict access controls; missing/incompatible
entities and incomplete defaults yield no suggestion. Layouts and collections
remain configurable through By card. Building suggestions is read-only; Home
Assistant owns adding the chosen card. Hosts without this callback API retain
the normal By card flow. See the [upstream picker contract](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/#suggest-your-card-for-an-entity).

Existing strategies render read-only and offer staged conversion through `ordinary-model.js` and `ordinary-session.js`. Source-only options, opaque fields and exact received text remain inert in recovery/provenance. See [migration and recovery](../installation/native-migration.md).

## Compatibility boundaries

Managed popup sources carry `marao_popup.version: 1`, independently of package,
source and root-settings versions. Generated native controls carry a logical
`marao_popup_slot`; the source records their last generated baseline, accepted
parent settings, suppressed roles and retained layout for prior popup families.
Parent settings own functional bindings. Native views own order, dimensions,
sections, custom cards and deliberate presentation overrides. Unknown metadata
versions are left untouched. Source inputs are cloned before planning; ordinary
rendering and state changes never persist a reconciliation.

`popup-management.js` reuses automatic composition for all ten configured popup
families and plans updates without I/O. It replaces generated functional fields
only, retaining local names/icons, geometry, unknown fields and raw custom cards.
Missing slots stay suppressed; raw functional overrides detach as custom.
Family changes retain incompatible managed layout and selections in non-rendering
branches; returning restores them with current valid bindings. Group native forms
expose compatible explicit selections without a primary Entity field. Managed
child forms expose presentation and Make custom, with behavior owned by the parent.

Forwarded settings cover Entity Group type/members/filter, scene selection and
actions, climate modes/graph, media display and Apple TV controls, camera stream
and event provider/options, energy period/cost/sub-entities, graph history/devices,
security alarm layout/actions, access mode/actions and floor-plan lights/image.
All catalog variable options pass through the same composition, including legacy
top-level camera provider/event-limit and graph-entity spelling. Routing hashes
are excluded from the parent fingerprint and retained as navigation ownership.

`popup-coordinator.js` belongs to the existing per-root controller. It subscribes
to filtered `lovelace_updated` events only for a connected administrator, compares
the authoritative document with the current host and checks native dialog drafts.
The parent Save and subsequent verified source Save are separate operations.
Cancel, ordinary layout saves, duplicate notifications and its own updates reach
a no-op. Initial loading is read-only; route/user/host removal disposes ownership.
Stale source sheets withhold their native view; stale standalone source views are
inert outside editing. Preview and summary service guards remain in effect.

`MaraoPopupTransaction.js` stages exact original/proposed documents in IndexedDB,
bounded to one pending record per origin/user/dashboard. Stage failure prevents
writes. One native save is followed by authoritative readback: proposed confirms,
original rejects, divergence remains unresolved. Reopening classifies existing
records read-only before another write. Confirmed/unused records are cleared.
There is no popup Blob, export UI, download or permanent recovery archive.

Unmarked and historical sources are adopted only on explicit Edit popup with
provable functional matches; uncertain custom sources use a preserved managed
copy. Newer metadata stays untouched. Compatible source owners continue sharing;
divergence forks only the uniquely identified changed owner. Its direct reference
uses a local invocation hash ahead of any retained legacy hash; nested external
destinations and original definitions are retained. Ordinary native conversion
already copies these unknown view/card fields without migration. Frozen released
fixtures remain immutable and identify the historical inputs used in focused checks.

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

External agent clients can discover the installed version's authoring schema,
metadata, guide and read-only Node planner through the release manifest's
`authoring` index. See [agent authoring](agent-authoring.md). These assets remain
outside normal dashboard startup and do not add a writer or backend.

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

### Native picker metadata and creation

Each public registration supplies a stable card-specific `documentationURL` for native Help, including Camera Events and the Energy/Floor Plan aliases. Metadata text initially follows the browser, then HA's language through the existing root and standalone-card lifecycle. Only Marao-owned names/descriptions change, on language transitions; newly opened picker/editor surfaces read them. Open dialogs are not remounted, and saved names, drafts, callbacks and third-party registrations are preserved.

`getStubConfig(hass, entities, entitiesFallback)` treats HA's ordered unused pool, then fallback pool, as authoritative. Missing/unknown/unavailable or incompatible entries are skipped; the state registry is never searched for another target. Empty pools produce an editable setup card with localized entity/source/image guidance. Camera Events uses the same selection policy and keeps an empty source list when exhausted. Collection members are never discovered automatically.

By entity recommendations additionally require role evidence. Numeric sensors can offer history; energy units must agree with the energy device class when supplied, and battery readings require percentage metadata. Arbitrary temperature sensors do not become weather/appliance/energy cards. There is no standard metadata identifying appliance-status sensors, so those roles remain available through By card. A selected person offers People with exactly that one member, preserving order and avoiding a primary entity. App cards require a real advertised source. Access controls retain strict slide/hold composition.

`getDefaultConfig()` declares only audited Light (`enable_slider: true`, `use_light_color: false`) and Fan (`enable_slider: true`) nested booleans. Runtime omission matches those literals; declarations do not insert fields into saved configurations. Targets, actions, names, security settings, hashes, collections, derived units and other defaults are deliberately excluded. HA owns effective dirty comparison and Save/Cancel. Hosts that do not consume nested defaults keep their normal native warnings; Marao does not patch HA or suppress a genuine draft.

Verified on disposable HA `2026.10.0`: native Help resolves to the Light reference and HA Portuguese metadata is active. The native dialog consumes `getDefaultConfig`, but nested `variables` still compare literally: slider off is dirty, and returning an omitted slider to `true` remains dirty. This host therefore retains its normal warnings; nested effective-default equivalence is not claimed. Cancel left saved dashboard data unchanged, with zero saves, device service calls or downloads.
