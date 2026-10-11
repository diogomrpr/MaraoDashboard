# Design

## Context

See `proposal.md` for motivation and confirmed scope: **all pages**, including Home and Rooms. Current editor page selection and composition are separate; custom/room containers already share card editing, but assume entity-backed entries or shortcuts. `_entity_container_cards` supports automatic domain groups or one fixed grid; special view functions also mix full-width and two-column sections. A mere move of the existing guided forms would leave these limitations intact.

End-to-end path: starter/setup and management entry points in `__init__.py` → configuration normalization/resolution/planning in `generator.py` → `editor.py` catalog and `frontend_src/editor-model.js` → `MaraoDashboardPanel.js` → generated templates, runtime and popups. The delivered ordered migration hooks convert format 0 to format 1 with explicit room membership. Entity Groups are additive descriptors in format 1. This page conversion is the next ordered step, format 1 to format 2, reusing the delivered preflight and recovery path; the historical upgrade runner is implemented, and its complete final-candidate live evidence remains required before publication. Tests exist in `test_generator.py`, `test_init.py`, `test_history.py`, editor model/panel checks and browser runners. Safe fixtures and product counterparts live under `ha-test/`.

## Goals / Non-Goals

**Goals:** one page document and editor, creation-only template population, reusable existing card roles and faithful historical conversion. Keep the same catalog, native grids, shared controls and action guards as the foundation.

**Non-Goals:** template inheritance, ongoing room discovery, template import/export or marketplace, a new layout framework, new operational card behavior, runtime dependency changes or release execution during this task.

## Decisions

### 1. One ordered page collection, retaining container contracts

Use `pages` as an ordered array of named, icon-bearing, unique-path containers and `landing_page` as a page-path reference. Each page reuses existing `entities` descriptors, raw `cards`, and automatic or `columns` layout contracts. `entities` continues accepting the supported historical shorthand but can also contain entity-free reusable descriptors such as shortcuts and groups; stop assuming every editable card requires `entity_id`.

Add optional ordered `sections`, each reusing the same container fields. A page uses either its existing flat container content or sections, not both ambiguously. Sections use automatic grouping or 1–6 columns. This is the minimum native-grid extension that preserves Energy/Home/Wallbox/Media composition without squeezing their full-width cards into one two-column grid. Section order and mixed card order are explicit; advanced raw cards and unknown fields survive both views. Preserve legacy room `subview`, title presentation and icon behavior as generic page options rather than inferring them from a page type.

A room page has optional area association for suggestions and one-time population; it is otherwise identical to any page. Do not retain runtime `security`, `energy` or `room` composition types. Template identity is not required after creation. Resolve/validate routes once across all pages; `overview`, `rooms` and former guided names are no longer reserved special renderer branches. Generate the selected landing view first so opening the dashboard root remains valid, then other views in saved relative order. Page manager ordering and navbar ordering remain separately explicit.

Alternatives rejected: wrapping named guided objects inside an Add page wizard keeps their fixed composition; forcing one grid loses layouts; leaving Home/Rooms special contradicts the user's answer. A universal tree/layout engine is unnecessary.

### 2. Top page manager and one creation flow

Replace the disconnected navbar selector, Overview form, Rooms section and guided/custom page section with a top page manager. Retain general dashboard settings separately. Rows expose page details, edit/duplicate/order, navbar visibility and a clearly separate Delete page action. Add page first chooses Empty/Home/Rooms/Room/Security/Energy/Wallbox/Media and page name/icon/path, then opens the ordinary card editor. Add room moves into the Room starter choice; there is no parallel room creation route.

Creation may prefill compatible selected entities from the current document/area once. Unbound template roles remain draft slots in the local editor; required slots must be bound or removed before Save & Generate, and unused optional slots can be omitted. Do not fabricate placeholder entities or emit runtime warning cards. Empty is always available and can be saved. A Rooms starter creates editable room shortcuts to explicitly selected current pages; it does not automatically insert future room pages. Add a shortcut through the same card flow to expose a later unpinned page.

At five navbar entries, creation succeeds unpinned with localized explanatory text; pinning a sixth fails visibly until another entry is unpinned. Existing navbar choices and label/icon overrides remain intact. Unpin never deletes. Whole-page deletion retains the existing named confirmation, disallows deletion of the last page, and requires the user to choose a new landing page when necessary and retarget or explicitly remove owned references before saving. Individual card removal follows the accepted no-confirmation behavior of `remove-card-delete-confirmation`; do not reintroduce that modal here.

Reuse path replacement to cover landing, navbar, shortcuts and generated popup references, including cards inside sections and nested groups. Duplication creates independent descriptors and generated popup identities. Raw external URLs remain opaque user data; do not claim automatic repair of arbitrary executable/raw Lovelace references. Surface known unresolved local references instead of silently rewriting unrelated custom content.

### 3. Promote page-only roles through the existing catalog

Extend `EDITOR_CATALOG` and the shared card form only where an existing role is not currently selectable. Keep all current public `hc_*` and `custom:marao-*` renderers stable. Normalize the following configurations to the existing shared runtime, usable on any page:

| Starter / migrated content | Reusable configurations and required parity |
| --- | --- |
| Home | Weather/forecast, Entity Groups for light/cover/battery/climate, and ordered native-scene collection with its existing sheet; groups retain member options, summaries and popup filters |
| Rooms | Entity-free room/page shortcuts, optional primary status source and explicit light-target list for the existing separate All off child action |
| Room / custom | Every catalog card, mixed shortcuts and raw cards, area suggestion metadata, existing automatic/fixed layouts and relevant popups |
| Security | Alarm presentation, access cards and existing guarded service actions; native `button.press` must not become a generic toggle or bypass a safety guard |
| Energy | House-power graph, daily/monthly energy/cost period cards, matching history sheets, load graphs with optional toggle, appliances; all names/icons and graph options editable |
| Wallbox | Status/base card, power/max-current graphs, shared current input with at most three configured presets, pause/resume switch |
| Media | Generic/Apple TV player card and popup, remote/volume-remote options and explicit app source/name/icon entries; preserve app order, bounded seeking and short/long remote commands |

For scene collections, keep native `scene.turn_on` distinct from select/input-select scene cards and retain the collection popup. The scene list is edited as explicit entries; no fake `sun.sun` fallback. Names override display locally, including energy/history sheet titles, without renaming HA entities. Associated secondary entities such as toggle or volume remote keep their own readiness checks. Do not simplify cover classification to ordinary percentage control where strict access actions apply.

Factor existing card/popup dispatch once rather than copying each special view function into each template. Newly generated popup hashes use the page path plus a stable local card key and popup role. Copying a page regenerates owned identities; explicit configured hashes are retained when unambiguous and validated against collisions. Preserve existing migrated hashes where possible and rewrite owned links together when a path changes. Each page receives required popups and one footer/navbar; nested card popups must be collected too. Requests/gesture lifecycle, focus trapping/restoration, loading/error states, theme and typography remain shared. No new CSS framework or state engine.

### 4. Coordinate accepted proposals before assigning the format step

Build on the delivered ordered conversion/recovery hooks in `ensure-safe-dashboard-upgrades`. `independent-room-entities` supplies 0→1; this structural page conversion supplies 1→2. Entity Group descriptor/summary/filter behavior remains shared. Reconcile the accepted overlapping artifacts before implementation; preserve their independently verified behaviors rather than treating this conversion as their verification.

The page collection supersedes `overview.entity_groups` storage: move those descriptors into the editable Home card list; the group contract itself stays unchanged. Room suggestions and explicit membership apply to associated pages. Update overlapping capability deltas under the appropriate update workflow before implementation/archival so future sync cannot restore separate guided forms or old group storage. Preserve editor startup, sticky header and JSON folding work already present; no unrelated refactoring.

### 5. Deterministic historical mapping with preservation

Use the Python conversion as the authoritative compatibility path for setup, editor reads, Save & Generate, service/alternate sources and history preflight. Do not create a separate browser registry-driven migration. Return canonical previews/status to the editor read-only; JSON edits submitted in old format pass the same backend conversion. Update JS validation/schema/serialization to understand canonical pages and preserve unknown options rather than stripping to catalog fields.

Mapping preserves existing view paths and rendered ordering:

- Convert Overview into sections for weather, task groups and the scene collection; materialize resolved group members once. Existing explicit group configuration, including an empty list, wins over defaults.
- Convert Rooms into its explicit shortcut list, preserving displayed names/icons, primary state and All off light targets. Convert every room/custom page independently with its layouts and raw cards. There is no subsequent shortcut or membership synchronization.
- Convert each present guided object into the exact configured roles in the parity table. Absent optional pages stay absent. Explicit Security access or Media player lists, including `[]`, take precedence; only absent lists use the historical resolved room selection once. Include/exclude/overrides follow the accepted explicit-room migration first.
- Preserve all retained object options: names/icons/variables, media remotes/apps, energy/load graph settings, charging presets, raw content, source ordering and navigation overrides. Keep unknown fields at equivalent scope; where old scope has no direct counterpart, retain them in a documented non-operative `legacy_page_options` map rather than dropping or reactivating them. Never use retained legacy instructions as a second source of composition.
- Set landing to the former Overview route and retain explicit navbar selections. For absent navigation, materialize the former effective first-five choice to avoid a changed default after collection reordering. Legacy URL entries retain their validation and meaning. Preserve generated filenames/manifest ownership where possible; use existing protected-region cleanup for renamed/removed owned paths.

Reject ambiguous mixed legacy/canonical models, path collisions, invalid versions and malformed bindings before writes. A current-format empty selection means empty, including missing card lists; no repeated discovery based on missing fields. Migration must be idempotent. New first-run sources use the same template/card constructors; recognized untouched legacy starter repair can happen only through the accepted compatibility path, never by treating an edited canonical empty page as a failed starter.

## Risks / Trade-offs

- Broad shared generation impact → use the explicit parity table, historical expected documents and full affected-gallery final inspection, not just template screenshots.
- Old implicit behavior becomes fixed membership → snapshot the effective selection once, preserve explicit emptiness, document independence and expose suggestions instead of recurring sync.
- Templates with unavailable bindings → local draft validation and removal, no fabricated runtime entities; unavailable selected real entities still render their normal disabled state.
- Duplicate/renamed pages can collide in popups or leave shortcuts → scoped identities, reference traversal and readable preflight errors; never erase raw content to make validation pass.
- Migration or overlapping proposals can lose user data → shared ordered conversions and exact recovery; reconcile pending plans, keep versions/provenance explicit and avoid frontend-only migration.

## Migration Plan

1. Establish the canonical schema and independent expected JSON fixtures before replacement. Under `ha-test/upgrade/`, cover published format-0 inputs and the accepted explicit-room format, every guided role, overridden names/options, explicit empty/deleted selections, mixed layouts, custom/unknown/raw content, navbar URLs, protected YAML and existing group descriptors where supported. Expected JSON must be authored independently from the candidate migrator; record release/tag/commit provenance rather than calling a current starter to fabricate old behavior.
2. Add the ordered page conversion and generation compatibility, catalog/card role support, generic page UI and current-format starter. Exercise read-only preview/dry-run, successful writable conversion/no-op, malformed/future source, interrupted/failing writes and archive-compatible restore with focused model/generator/lifecycle/history checks. Automatic upgrade preflights routes, owned output and protected markers before mutation.
3. Capture an exact private baseline of source bytes, generated files and affected owned registration/resource/theme state before writable upgrade. Reuse the durable recovery checkpoint; report failures and restore the affected baseline, retaining private recovery data if incomplete. History archives stay byte-for-byte unchanged. A manual downgrade restores the matching previous package **and** exact JSON/generated/owned-state backup, not only old assets.
4. Update configuration, builder/card and update docs, bilingual copy, safe Cases coverage and realistic pages on the single `/marao-dashboard`. During iteration use focused checks plus disposable dry-run/sync and final visual/interactive inspection of all affected cards, popups and page-editor controls. Include the complete mobile/text/theme matrix; run alignment checks whenever icon-only layout changes. Treat warnings, exceptions, failed resources and repeated requests as defects.
5. Maintain the historical upgrade feature-to-assertion inventory. Run the preserved-install upgrade scenario only during explicit final-candidate versioned-release preparation, without fresh fixture preparation masking conversion, and verify cleanup. `verify:publish` is still required before any push/tag/release; release also requires exact-commit Tests/hassfest/HACS and the separate upgrade gate. No publication or live upgrade verification occurs while authoring this proposal.
