# Design

## Context

See [proposal.md](proposal.md) for the confirmed scope and baseline. Current native editing is established by [use-home-assistant-dashboard-editor](../use-home-assistant-dashboard-editor/proposal.md); its completed deltas supersede the historical retirement notice in the native-editing baseline. Do not extend the retired builder or Python generator to author this card.

Observed implementation:

| Concern | Existing owner and relevant behavior |
| --- | --- |
| Catalog and native registration | `custom_components/marao_dashboard/frontend/marao-catalog.json`; `frontend_src/native-cards.js` derives wrappers, picker entries, stubs and layout sizing from catalog identities |
| Validation and composition | `frontend_src/editor-model.js` validates canonical descriptors; `native-model.js` reuses it; `card-composition.js` composes ordinary cards and converted historical content |
| Native configuration | `frontend_src/native-card-editor.js` patches changed fields, emits complete configurations and preserves unknown data; `card-form-tools.js` supplies ordered collection controls |
| Runtime presence | `custom_components/marao_dashboard/frontend/MaraoCards.js` renders the header's single `person_entity`; `entityStateLabel` already delegates to HA formatting, but no people-list role exists |
| Presentation | Shared runtime localization and tokens in `MaraoRuntime.js`; editor labels in `frontend_src/editor-labels.js`; existing card styles own mobile spacing and typography |
| Build and installation | `frontend_src/build-editor.cjs`, `build-native.cjs`, and the existing `ha-test` preparation helpers build and install the native frontend |

HA already resolves multiple trackers into a person's Home/Away/named-zone state. The panel consumes that result and does not reproduce the tracking rules. See the official [Person documentation](https://www.home-assistant.io/integrations/person/). Existing wrapper APIs fit HA's [custom-card contract](https://contributors.home-assistant.io/frontend/custom-ui/card/); continue using `setConfig`, `hass`, the native editor and sizing hooks rather than importing upstream internal components.

## Goals / Non-Goals

**Goals:** one people descriptor and rendering path across native configuration, preview and generic Marao composition; independent per-person updates; explicit selection with lossless edits; no changes to existing source-format meaning.

**Non-Goals:** a new group popup architecture, additional presence sources, a person-management UI, a new backend, automatic dashboard generation, or a general collection-editor refactor.

## Decisions

### 1. Add one catalog family with explicit membership

Use `md_people_card` and its catalog-derived `custom:marao-people-card` wrapper. It has no primary entity and accepts this ordinary native shape:

```yaml
type: custom:marao-people-card
name: People
entities:
  - person.alex
  - entity_id: person.sam
    name: Sam
    icon: mdi:account
```

`template: md_people_card` remains supported but can be inferred from the native type. `entities` is required, accepts `[]`, and supports strings or member objects. Optional `name` overrides the displayed name; optional `icon` deliberately replaces the HA picture. Without an override, prefer the current person picture, then `mdi:account`. Name fallback is local nonempty name, HA friendly name, then the entity ID. Preserve all unknown fields in stored card/member objects.

Add the role to shared validation's entity-optional roles. Validate original members before permissive flattening can discard malformed data: person ID syntax, unique IDs, list/object shapes and string overrides. A missing live entity is an availability state, not invalid configuration. Use the same small validation function for native/editor and generic runtime configuration so YAML cannot bypass the contract.

Extend `createCardComposition().pageCard` to pass the exact member list into the shared runtime role; its ordinary fallback currently forwards only one entity and variables. No automatic popup or discovery is created. Keep old compiler inputs and historical migrations unchanged.

Alternatives: the existing header handles only one person; Glance is limited to three fixed reading slots; Entity Group introduces aggregate/control and popup behavior. None gives the requested complete list as simply as one informational family.

### 2. Render a simple vertical list inside the shared card

Extend `MaraoCards.js` with the people role, reusing the current card surface, escaping, localization and state formatting. Rows show a fixed-size picture/icon beside a wrapping name and place label. Use semantic list/text markup with no button styling, hover affordances or implicit tap/hold action. The card's name is optional; an omitted name uses the localized People heading.

Read only configured people from `hass.states`; refresh relevant rows when their state, displayed attributes or UI language changes. Reuse existing lifecycle ownership for image load/error listeners. Picture failure restores the fallback without a retry loop or loss of state text. Escape all names and reported place strings as text.

Prefer HA's person formatter for usable state, with explicit English/Portuguese Home/Away fallback and preservation of arbitrary named places. Availability is evaluated before formatting: initial loading, missing, unknown and unavailable each have their own neutral label. Do not feed people through generic active-count rules that treat every non-off value as active. Each row owns its availability; a bad row cannot neutralize or hide healthy siblings. On disconnect, show neutral disconnected rows and rely on HA's native connection warning; do not add stale timers.

Default to full section width and content-driven height in the wrapper sizing hooks. Respect native layout choices while allowing long names/places and enlarged text to wrap. Keep the shared token palette and a visible location label in both themes. No summary count, animation, map or detail sheet is needed.

### 3. Reuse native collection editing without changing other families

Add a person-only multiple selector and ordered member controls to the native editor. Reuse the existing scene-collection selection merge, move buttons and local name/icon dialog mechanics with People labels and domain restrictions. Generalize only the small list operation needed by both; preserve existing scene/group behavior. Move, remove and edit controls retain the visible 48px target and existing haptics.

Keep `entities: []` in the initial stub and after deleting the last member. Preserve configured members missing from current HA metadata so they can be reviewed or removed. Patch only changed membership/overrides into the full original config, preserving native `grid_options`, visibility and opaque fields. Emit the existing complete bubbling/composed `config-changed` event; HA owns draft cancellation and persistence.

### 4. Add focused examples and evidence

Add a small fictional `person.*` fixture set following the existing disposable fixture integration/helper pattern under `ha-test/`, with Home, Away, a named place and an unavailable reading. Existing `sensor.marao_dashboard_test_person` remains the header fixture; do not weaken production domain validation to accommodate it. Add one People panel to the existing Home view in `ha-test/marao_dashboard_test_dashboard.json` and one mixed-state example in the existing `card-test` gallery. No additional dashboard root or real person data is needed.

Extend existing Node test owners: `native-cards.test.js` for registration/validation/composition, `native-card-editor.test.js` for explicit membership preservation, and the card visibility/state tests for location transitions and partial availability. Use a small table of representative states and an independent expected configuration. Review header, scene and group consumers when shared code changes; run only relevant assertions. Update the affected selector mapping if it cannot select this new role.

Document People configuration and HA People prerequisites in `docs/docs/usage/cards/md_people_card.md`, link it from the existing usage index, and update native configuration guidance and the feature coverage map. Build shipped editor assets through the existing build script.

## Risks / Trade-offs

- **Tracker lag is upstream information** → display HA's reported state; do not infer that a person has left or is stale.
- **Many selected people or long labels increase height** → all entries remain visible in a wrapping vertical list with normal dashboard scrolling; no hidden carousel or fixed maximum of three.
- **Collection edits can discard opaque member data** → merge by entity ID, preserve untouched objects and assert reorder/name/empty-list round trips against independent expectations.
- **Existing generic summaries have different availability semantics** → keep the people role's per-entry evaluation explicit and preserve header/group behavior.
- **Presence is private household information** → select only authorized existing person states, persist references/display settings only, use fictional fixtures, and keep coordinates, live state and private pictures out of committed evidence. The card follows HA access permissions; it creates no separate privacy boundary.
- **Older packages cannot render a newly introduced family** → document the package requirement; do not rewrite existing dashboards to compensate.

## Migration Plan

No stored-data migration, source-format bump or compiler-contract bump is required. The reviewed `v0.24.1` native descriptors and patch-only editor remain supported; source formats 0/1/2 continue through their unchanged historical conversion chain. Expected transformation of existing configurations is none. Test preservation at the shared boundary, rather than rewriting historical fixtures or starting an upgrade campaign.

During implementation, record the fresh starting commit/dirty-state snapshot, finish related edits and selected unit checks, then install once on disposable `192.168.0.28`. Because the proposed fictional fixtures change setup, use `npm run ha:sync`, preserving current dashboard choices and helper state through the existing preparation path. Later frontend-only corrections use `prepareFrontend()` directly. Served-asset/readiness checks establish installation; optional browser inspection and the user's visual check do not become a broad test campaign.

Preserve exact affected disposable dashboard/configuration data before fixture/example writes using the existing installer recovery path. If an installation fails, retain diagnostics and recovery data and report not installed / not ready for test. A deliberate downgrade restores the prior package and matching saved dashboard containing no unsupported new card; never discard an authored People card automatically. Leave a successful current installation in place for user testing. Publication, if separately requested, requires unit-only `verify:publish` and the repository's final-candidate installation gate.
