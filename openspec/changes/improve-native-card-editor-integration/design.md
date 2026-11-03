# Design

## Context

See [proposal.md](proposal.md) for the outcome and [the delta](specs/native-dashboard-editing/spec.md) for acceptance. A design is needed because creation defaults, native dirty tracking and global registration language cross the current card and host lifecycles and must not change persisted configuration.

`frontend_src/native-cards.js` already supplies visual editors, inert previews, native sizing, stub configuration and entity-suggestion callbacks. The public Camera Events class has its own stub/editor/sizing methods. `native-bootstrap.js` owns a per-root HA controller; root Marao settings are optional, so ordinary dashboards containing standalone Marao cards must also receive metadata improvements.

The durable `native-dashboard-editing` baseline still contains historical text. The completed `use-home-assistant-dashboard-editor`, popup changes and working-tree entity-suggestion fix establish the effective native ownership. This change adds requirements without deleting their scenarios or reviving their retired alternatives. Later spec synchronization must reconcile those changes together.

Official references inspected during planning:

- [Card editor and picker](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/): registration metadata, three-argument stubs, suggestions and editor alternatives.
- [Native constructor interfaces](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/types.ts): `getDefaultConfig`, editor, preview and sizing contracts.
- [Native edit dialog](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/editor/card-editor/hui-dialog-edit-card.ts): effective-default comparison and native Save/Cancel ownership.
- [Picker metadata consumption](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/editor/card-editor/hui-card-picker.ts): names/descriptions are copied when the native picker is created; changing registration text alone does not promise to refresh an already-open picker.

These are current upstream references, not proof of every API on every supported HA release. The earlier installed entity-suggestion check used disposable HA 2026.10.0. Effective-default behavior needs its own narrow installed-host check during implementation.

## Goals / Non-Goals

**Goals:** Keep discovery and creation deterministic; use documented extension points; keep display metadata separate from card data; integrate proven defaults without weakening genuine draft protection.

**Non-goals:** A second editor, new framework/dependency, generalized registration system, source migration, layout redesign, device-action changes, new HA features/badges, or private native-class/save overrides. See the proposal for the affected-card set.

## Decisions

### 1. Keep one small owner for registration metadata

Extend the existing registration owner with pure helpers beside `native-cards.js`; extract a small shared helper only where the native host and standalone card lifecycle both need it. Keep type identity, localized name/description, documentation destination and suggestion callback together. Preserve third-party entries and avoid duplicates on repeated attachment.

Derive public reference slugs from the catalog template identity using the same rule as `docs/examples/manifest.js`, with an explicit Camera Events mapping. Native tag aliases such as Energy and Floor Plan must resolve to their actual reference slugs. Use the documentation origin/base from `docs/astro.config.mjs`; never construct Help links from installed graph identities or disposable paths.

Alternative: hardcode independent URLs in every class. Rejected because aliases and the standalone events registration would drift.

### 2. Respect HA's candidate pools before domain preferences

Pass both ordered entity lists through the static card callback to one selection helper. Deduplicate without reordering. Filter each pool by existence, availability, catalog domain, device class and safety compatibility; search the unused pool completely before the fallback pool. Within an explicitly supplied pool, preserve its order rather than allowing a preferred domain to jump ahead of an unused candidate in another supported domain.

Use the same path for Camera Events rather than always starting with `cameras: []` when a suitable candidate is supplied. Media app defaults may use only the selected player's advertised source list. If candidates cannot produce a valid initial binding, use localized setup guidance and keep the draft editable, following the existing floor-plan setup pattern. Do not invent an entity, app source or implicit collection. Calls lacking usable candidate lists remain valid setup drafts rather than scavenging all state.

Candidate discovery is a creation concern. Changing the registry, metadata or a card's availability must never retarget a saved card. Explicit By entity selection stays bound to that entity even when a different entity would make a better starter; an unavailable selected entity can retain neutral disabled presentation.

Alternative: use all `hass.states` as a universal fallback. Rejected because it bypasses HA's used/unused ordering and can select unavailable or unrelated entities.

### 3. Separate suggestion applicability from manual card validity

Add a concise role policy at the current native suggestion boundary. It narrows automatic recommendations without invalidating supported manual configurations or changing historical conversion:

| Role/family | Evidence for an automatic suggestion |
| --- | --- |
| Generic state/sensor/number/switch/history | Existing compatible domain; numeric graph roles also need numeric state or numeric metadata. |
| Weather/Header | A weather entity; a generic temperature sensor does not prove a weather role. |
| Battery | Recognized battery device class and compatible metadata. |
| Energy period | Recognized energy unit using the existing unit-family table, without contradictory device-class metadata. |
| Dishwasher/washing-machine and other specialized controls | Generic sensor/input domains alone are insufficient. Keep manual By card configuration available when a specialized role cannot be proved; do not infer appliance purpose from a display-name substring. |
| Wallbox current or controls requiring another binding | Require compatible current/capability evidence and complete safe defaults; do not guess an additional target or unsupported preset. |
| Access | Reuse existing access classification, including recognized cover classes and existing access fallback rules; preserve strict slides/holds. |
| Media app | The exact selected player and an actually advertised source; no invented app source. |
| People | `person.*`; construct `entities: [selectedId]` without a primary entity field or scanning for other people. |

Run the existing card validator over proposed complete configurations. Missing semantic evidence means no specialized suggestion, not an error card and not an exception suppressing arbitrary runtime faults. Layout-only and larger collection setup remains in By card. This change does not add media display variants or automatically populate collections beyond the selected person.

Alternative: tighten the catalog's general domain validators globally. Rejected because manually authored cards and supported historical inputs may intentionally use those broader bindings.

### 4. Declare only proven effective defaults

Expose `getDefaultConfig()` for stable per-role literal defaults verified against the actual runtime and form readers. The catalog is a candidate list, not automatic proof: context-dependent defaults and values whose omission has special meaning must not be declared. Exclude selected entities, names, generated hashes, popup references, security values, actions, units inferred from an entity and collection contents. Keep explicit false, null, empty arrays/objects and unknown fields distinct unless the specific literal has independently proven omission equivalence.

Use HA's supported default-consumption path for dirty comparison. A concrete target case is a previously omitted boolean changed away from and back to its real default. Never monkey-patch HA's dirty-state provider, Save, Cancel or warning dialogs. The declaration itself never inserts defaults or writes saved cards. Existing complete `config-changed` events and native layout/visibility preservation remain authoritative.

Check the installed `.28` host's implementation/version and record whether it consumes these declarations. If it does, verify the native effective-change case once. If it does not, ship the harmless declaration for supporting hosts, retain normal native behavior and explicitly report the unsupported native equivalence case; do not claim it passed or weaken guards to simulate support. No minimum HA version increase is intended.

Alternative: serialize every default into saved cards or suppress all default-looking changes. Rejected because either can rewrite explicit intent and hide real drafts.

### 5. Refresh registration text from the existing HA lifecycle

Use the current host controller and standalone card's HA context to publish HA's current language to Marao-owned metadata. Update only when that language changes; use browser language before any HA context arrives. Root `marao` settings are not a prerequisite. Avoid polling, another observer and per-state metadata rewrites.

Preserve registered type identities, Help URLs, callbacks and third-party entries. A newly created picker/editor reads current labels. Already-open native pickers can retain HA's copied labels until naturally reopened/remounted; do not forcibly recreate a dialog or discard a draft to refresh text. HA profile language and saved entity/card names are not changed. Reuse existing EN/PT label dictionaries and the same lifecycle's cleanup; no background writer is introduced.

Alternative: keep navigator language permanently or force native picker refreshes. The former preserves the mismatch; the latter risks active editing and relies on private behavior.

## Risks / Trade-offs

- **Specialized suggestions become conservative** → Keep the full manual catalog reachable, document omitted recommendations and test positive energy/battery/access cases alongside rejected temperature/appliance cases.
- **An unused secondary-domain source loses to a used primary-domain source** → Assert ordering across both pools, including a damper/fan example, rather than merely testing matching domains.
- **A declared default masks a genuine change** → Audit actual runtime omission behavior; assert false/null/empty/unknown/action/placement distinctions independently of the declaration helper.
- **Native default support differs across HA versions** → Check the actual installed host and preserve explicit support limits without importing or patching its internal classes.
- **A global registry refresh changes another package or an active draft** → Update only owned entries on language transitions; test repeated attach/dispose and standalone dashboards without root settings.
- **Help URLs drift from website slugs** → Compare the registrations with the existing documentation manifest and alias cases in a small unit assertion.

## Migration Plan

No data migration, backend installation or generated-dashboard rewrite is planned. Creation/default metadata does not modify an existing document. Record the implementation-start dirty snapshot and inspect released configurations only for preserved optional/explicit-value semantics; immutable fixtures and old history remain unchanged.

Rebuild the current owned frontend, then batch-install through `prepareFrontend()` on disposable `.28`. Installation verifies served assets and preserves saved views/helpers. Use one targeted native visit only for the concrete Help/default/dirty-state boundary as needed; cancel temporary drafts, dispatch no device actions and compare saved state if a write was exercised. Broad browser/theme/device/camera suites are not implied.

If a deliberate test write is necessary, retain exact before/after state privately and restore it only after a fresh concurrency comparison. Package-only rollback is sufficient when no data was written; otherwise restore the matching package and affected saved data together. Unrelated changes and user customization must remain intact.
