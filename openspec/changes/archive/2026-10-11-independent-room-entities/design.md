# Design

## Context

See [proposal.md](proposal.md) for evidence and scope. The affected path is first setup/registry discovery → saved JSON → administrator `config/get` → normalization and Visual/JSON editing → `config/generate` or generation service → room resolution → room views, Overview summaries/popups and derived Security/Media content.

`build_base_dashboard_config` already writes explicit entity groups, but also writes `area`. `_resolve_entity_container` merges that area's current entities on every plan/generation. The editor marks any room with `area` as `__areaLinked`, preserves its original entity source on serialization, and `_editableContainer` calls `materializeAreaRoom`, importing the area again before editing. This explains the synthetic deleted-entity reproduction. `ensure_dashboard_config` and `_should_repair_base_dashboard` also rediscover entities for saved empty starters.

`importAreaRoom` currently makes an independent snapshot but discards the area association needed for suggestions. `_openCardGallery` has only a card catalog; `_openCardEditor` already handles compatible entity selectors and shared basic/advanced options. `cardForEntity` maps domain/device class to catalog entries. The existing management response supplies area metadata, friendly names, effective entity areas, device-area fallback and visibility/state flags. No new registry service or external dependency is needed.

## Goals / Non-Goals

**Goals:** One independently editable room document, intentional first-run population, useful optional suggestions, two Add entry paths and safe migration of legacy sources.

**Non-Goals:** Synchronizing HA areas, editing HA registry assignments, new entity/card families, bulk selection, new runtime renderers, extra editor engines, autosave, deleting independent references elsewhere, or changing protected-custom-YAML ownership. Keep current JSON folding/startup proposals compatible with the same shared draft and schema.

## Decisions

### 1. Use explicit entities and retain `area` only as suggestion metadata

Keep the existing `entities` string/object/grouped shapes and the optional `area` field; canonical room contents serialize explicitly even when empty. `area` becomes an optional stable HA area ID for suggestions, not an input to room resolution. Do not derive the association from room names or rename HA areas. Imported/initial rooms retain it, and Edit room offers a localized optional area selector for changing/clearing it without replacing contents. A missing/deleted associated area produces a readable suggestion state and global search; it cannot delete existing cards.

Remove recurring area expansion from the generator and `__areaLinked`/automatic materialization from the editor. Preserve automatic domain grouping and fixed-column mixed entity/page-shortcut order. Continue enriching explicitly selected IDs with current metadata for appropriate cards/state; enrichment must not discover extra membership or silently remove an explicitly selected unavailable entity. Reuse raw-card and supported override/variable preservation.

### 2. Convert legacy room membership through one shared backend path

Introduce a small top-level `config_version: 1` marker for this first explicit-membership format; an absent marker is legacy. Validate it as a supported integer, excluding booleans, and reject unknown newer versions without writes. Preserve it through both editor views/schema. A marker is necessary because deleting an entire `entities` property in an already-converted room must mean empty, not another area-only import. Do not add a generic migration framework.

Centralize conversion in the existing Python configuration/generation path and reuse it for setup, editor preview/save, external generation and dry runs. It returns canonical source, not rendered card metadata or private registry details. Work on a copy and preflight validation before committing. For each legacy room:

- If it has an `entities` property, that explicit list is the selection, including `[]` or `{}`. Never seed this branch from `area`, even if previous generation included other area entities.
- If it lacks `entities` and has only a legacy area source, capture its supported area membership once, resolving legacy ID/name aliases safely. Do not guess ambiguous associations or treat missing registry/area metadata as an empty successful import; return a readable conversion error and preserve the source.
- Merge explicit legacy `include`, apply `exclude`, and fold applicable `overrides` into the chosen entries. Keep supported custom templates/variables, names/icons, page shortcuts, fixed-column ordering, raw cards and unrelated unknown fields. Remove those recognized legacy room-membership instructions from the canonical room so they cannot silently reapply after a deletion. Retain existing custom-page configuration contracts.
- Preserve the area association as a stable suggestion ID when it can be resolved; an obsolete hint on an already explicit room must not block editing its list.

Current-format rooms resolve only their explicit lists; a missing property is empty and is canonicalized to an explicit empty list when saved. Legacy room instructions belong to legacy import conversion; if manually reintroduced into a current-format room, validation explains how to import/express the intended explicit selection rather than silently changing membership.

First setup with no saved file creates versioned explicit snapshots. Existing saved emptiness is authoritative, even for the default name/slug. Remove both automatic empty-starter rediscovery paths. Generated-asset/theme repairs may remain, but they must use the saved canonical selection, not rebuild rooms from today's registry.

For saved-file upgrade, preflight conversion and generation, retain the existing JSON/generated baseline through history, then use the existing recoverable save/generation path. Preserve failure reporting and its documented rollback limits; do not claim a global filesystem transaction. Read-only `config/get` can return a canonical conversion preview with a pending-conversion indication; it must not write or overwrite the local draft. Save persists the reviewed canonical document. Dry runs return a plan only. Service generation must persist conversion to its selected source file on successful non-dry-run generation so later calls do not repeat discovery.

History restore retains exact historical JSON and generated-directory restoration; do not rewrite archived snapshots. A restored legacy source is previewed/converted on its next edit/save using the same rules. Document that a legacy area-only source cannot reveal deletions never recorded in explicit JSON; an existing explicit list is always honored. Do not attempt to reconstruct intent from screenshots or mutate saved data on a metadata refresh.

### 3. Reuse the existing Add dialog and card form

Put two semantic, localized tabs inside `_openCardGallery`: By card type and By entity. Keep By card type's catalog, including page shortcuts. By entity has an always-visible search field and, when search is empty, a Suggested for this room list. No association means explanatory empty content plus global search. Custom pages use the same tabs but global search only.

Filter candidates using the existing supported catalog/domain mapping and enabled/visible registry entries with state metadata. Respect the effective entity area before device fallback; an entity explicitly assigned elsewhere must not be suggested merely because its device belongs to this area. Unavailable entities can be configured with clear state labels; choosing them is configuration editing and dispatches no physical action.

Search the current registry by friendly name or entity ID, case-insensitively, across all areas; do not require an exact area/name match. Show readable name, ID, compatible card and area/state detail where useful. Keep stable ordering by name/ID. Exclude already represented entities from suggestions; in global results mark and disable already-added entries in the entity-first flow. Build the present-ID set from explicit entity cards and literal entity references in raw cards, without evaluating expressions or inventing dependencies. Intentional specialized duplicate cards remain possible through the existing card-type path and its duplicate warning.

Use `cardForEntity` to choose the compatible default, then pass the selected entity into `_openCardEditor` as a prefill. The normal form remains the final local Add action and supplies all existing options; selection/search never saves or changes HA area assignments. Recheck duplicates against the current draft at confirmation. Preserve cross-tab search/selection state while the Add dialog remains open, clean up listeners on close, and do not recreate a second parallel options form.

### 4. Refresh suggestions without reloading the draft

On deliberate Add opening, obtain current registry/area metadata through the existing administrator management request and consume only its editor metadata; never call `_load` or replace `_model`, Monaco source, dirty state or local card options. Reuse one in-flight request, disable incomplete selections during loading, and show a localized retryable error on failure. Retry is deliberate, not a loop driven by every `hass` assignment. No polling or background synchronization. Search is local against the returned metadata.

This is separate from Visual startup: retain the local/lazy JSON resource approach in `improve-editor-startup`, and preserve folding/view behavior from `enable-json-editor-folding`. Do not load Monaco to open Add or introduce another registry/cache framework. Keep existing administrator authorization and disposable-target restrictions.

### 5. Align documentation, fixtures and focused checks

Update the configuration guide's `area` examples to show explicit contents and explain suggestions. Update the update guide with changed semantics, version marker, precedence for legacy explicit lists, area-only snapshot limits, backup/recovery and exact historical restore. Add English/Portuguese panel copy for tabs/search, area association, suggestion/loading/empty/error/duplicate states and pending conversion. Remove obsolete “follows area / Convert now” UI and stale synchronization guidance.

Extend `tests/frontend/editor-model.test.js` for JSON deletion, empty source, unchanged unknown fields, area hints, ordering and candidate/default-card selection. Replace obsolete legacy-area preservation expectations with the accepted conversion contract. Extend focused generator/setup/history tests for canonical conversion, first install, explicit-empty preservation, registry addition/movement/removal, idempotence, preview/dry-run, service save, preflight failure/rollback and legacy restore. Verify selected metadata is used without changing membership.

Use the pinned Playwright/disposable client workflow for the two Add tabs, room suggestions, off-room friendly-name/ID search, duplicates, cancellation, prefilled options, repeated Add, registry refresh failure and unsaved JSON/Visual draft preservation. Reuse an existing editor browser check if the startup/folding changes have landed. Tests and fixtures remain under `tests/` and `ha-test/`; no new framework or shipped fake entities.

Update safe Cases/realistic pages with independent rooms, an empty associated room and representative supported entities (including a device-class-specific card) to exercise delete → regenerate → suggestion → explicit add. Keep all pages on `/marao-dashboard`. The affected inventory includes generated room cards/shortcuts/summaries, Overview derived popups and default Security/Media consumers. Preserve explicit page roles and protected raw content. Use safe fixture-only registry changes and restore test state after checks.

## Risks / Trade-offs

- Legacy explicit sources were formerly additive to areas → the explicit list now wins deliberately; record the changed behavior, show migration status and keep the prior baseline recoverable rather than reintroducing omitted entities.
- Area-only legacy sources contain no explicit deletion history → snapshot once and explain that limit; never infer earlier intent or repeat the import for current-format empty rooms.
- Registry metadata may lag or fail → refresh once on Add, expose a retry, and keep the draft intact; no automatic membership changes.
- The same entity can appear in several independent places → deduplicate suggestions within the current container only; removing a room entry must not delete explicit page/raw-card references elsewhere.
- Generator membership changes affect derived pages → test deletion/addition through room views, Overview and derived Security/Media, and inspect every affected consumer after the final check.

## Migration Plan

Before applying, record actual affected-card IDs and preserve unrelated work. Land conversion/first-run preservation and their tests before the new Add UI. Rebuild owned editor assets, run focused model and matching Python checks, and verify `npm run check:editor`. Use `npm run ha:sync:dry-run` before deployment only to disposable `192.168.0.28`; confirm the served fingerprint.

Validate UI on 320px and representative iPhone/Android portrait/landscape, both themes and normal/bold/200% text/200% zoom/bold plus 200% text. All tabs, search, results and actions must be semantic, localized and visibly at least 48 × 48 CSS pixels, with wrapping, internal dialog scrolling, focus restoration and no hover dependence. Treat console errors, resource failures and repeated requests as defects. After the last edit and focused check, finish with visual/interactive inspection of Add and every generated card/derived popup in the recorded set, including the changed Cases and realistic pages. If icon-only action layout changes, run `npm run test:ha:alignment` first.

Rollback requires the prior complete integration/editor assets and pre-conversion JSON/generated baseline, because the old release interprets `area` differently. Never downgrade only JavaScript while leaving a migrated source exposed to the old generator. Keep private backups and traces ignored. Publication remains separate and requires `npm run verify:publish` before any push/tag/release and the published commit's Tests, hassfest and HACS gates.
