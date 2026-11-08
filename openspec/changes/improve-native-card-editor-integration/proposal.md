# Proposal

## Why

Marao now appears in Home Assistant's By entity picker, but useful editor integration is still incomplete: card Help links are missing, starter discovery can choose unavailable entities, suggestions can be misleading, and picker language can differ from HA. Complete those integrations and declare proven effective defaults so supported hosts can recognize edits that return to their original behavior.

## What Changes

- Add a `documentationURL` to every public Marao card registration, including Camera Events, pointing to that card's published reference.
- Complete `getStubConfig(hass, entities, entitiesFallback)` support. Prefer compatible available unused entities, then compatible available fallbacks, without searching unrelated state or choosing unknown/unavailable entities. Keep incomplete setup drafts editable when no suitable entity exists.
- Refine `getEntitySuggestion` using role-specific device classes, units and capabilities rather than domain compatibility alone. A temperature sensor must not suggest energy, dishwasher or washing-machine controls; selecting a person should offer a People card containing that person alone.
- Add `getDefaultConfig()` declarations for audited, context-independent defaults whose omission has exactly the same runtime meaning. On hosts that consume this API, returning a field to its original effective value must not cause a false unsaved-change prompt. Preserve HA's Save/Cancel authority and existing behavior on older hosts.
- Refresh Marao-owned picker names/descriptions from HA's selected language, with browser language only as an initial fallback. Keep saved card names and entity names unchanged.

**Priority:** Help links, starter selection and suggestion accuracy first; effective-default declarations and language consistency complete the same change.

**Affected cards:** All current public catalog registrations and `custom:marao-camera-events-card`; generic runtime compatibility types remain supported. Specific selection policies concern entity-bound roles and the People collection. Layout-only cards remain available through By card.

**Non-goals:** Replacing the native/custom editors with `getConfigForm`, adding cards, badges or integrations, changing card geometry/themes, changing device actions, inventing app sources, discovering collection members beyond the selected person, patching HA classes or Save, restoring the retired builder, publishing or running broad browser/device suites.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `native-dashboard-editing`: Per-card Help links, trustworthy creation defaults, semantically appropriate entity suggestions, effective-default-aware dirty tracking and HA-language picker metadata, preserving native ownership and lossless configuration.

## Impact

Observed working-tree baseline: commit `e613bf85422a9b749e58c0618f7f9c5327c6e2dc`, including the completed popup/logo changes and the installed entity-suggestion fix. `native-cards.js` has no documentation URLs, exposes a two-argument stub callback, searches all `hass.states`, uses browser language for registrations and has no effective-default declaration. A read-only synthetic check selected an unavailable light despite an available fallback and offered temperature sensors appliance/energy roles. People returns no person suggestion. These findings are code-level evidence, not a browser check of this proposal.

Primary paths are `frontend_src/native-cards.js`, `native-bootstrap.js`, existing shared editor/model/localization helpers, `MaraoFrigateEventsCard.js`, the catalog only if applicability/default metadata belongs there, and the current card documentation/slug mapping. Existing native-card, bootstrap, editor preservation and package assertions should cover the change. Rebuild owned frontend assets and install the final applicable graph on disposable `192.168.0.28`; no Python backend change or new dependency is intended.

**Compatibility:** No dashboard/source/config-entry version change or migration is intended. Creation callbacks affect only explicitly requested new cards. Metadata refresh and default declarations never save a dashboard, retarget existing cards or refill deleted content. Preserve explicit false/null/empty values, unknown fields, names, actions, layout, visibility, popup ownership and member order. Keep immutable released inputs unchanged. Effective-default consumption on the supported installed HA must be checked before claiming its native dirty-state benefit; older hosts retain their existing native behavior.

**Acceptance:** Help opens the matching card reference; available unused/fallback selection is deterministic and never selects an unrelated entity; temperature suggestions exclude specialized appliance/energy roles; a person creates a one-member People draft; proven defaults cooperate with supported HA dirty tracking without weakening real unsaved-change protection; English/Portuguese picker metadata follows HA's language without rewriting saved data.

## Gallery authoring follow-up — 2026-11-07

The user requested that every test-dashboard example be reproducible using Home Assistant editing. Extend this existing native-editor change with missing effective appearance/actions and family fields, public held Security action discovery, legacy detail/editor entry points and native grouped-grid editing. Preserve saved types, aliases, unknown settings and native outer Save/Cancel. Correct the current gallery's incompatible neutral Light bindings using existing safe Light helpers; do not weaken role or opening-service validation. No renderer redesign, source migration, backend change or release is requested.
