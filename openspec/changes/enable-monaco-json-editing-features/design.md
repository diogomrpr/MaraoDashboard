# Design

## Context

See proposal.md for motivation and scope. At `7f4241b0f36620bc82b28fe73373cec77ed54faf`, Monaco 0.56.0 is bundled locally. `json-editor.js` initializes the JSON language worker, installs `buildJsonSchema` from `editor-model.js`, defines both themes and enables formatting/folding, but hides gutter folding controls. Find, replace and completion commands are present in the generated JSON bundle. Line numbers use Monaco's enabled default.

`MaraoDashboardPanel.js` owns one deferred editor/model, explicit toolbar actions, Visual/JSON synchronization, dirty state and disposal. `_setEditorSource` avoids replacing identical text, which is essential for preserving history. `build-editor.cjs` keeps JSON code/styles/workers out of Visual startup and fingerprints served assets through the integration. `editor.py` already supplies field kinds, descriptions, domains, defaults and advanced option metadata. Existing model/panel/browser tests cover folding, loading, preservation and save/recovery.

Design is warranted by the shared schema, mobile control geometry and asynchronous session state. No runtime card, generator, theme-file or backend API redesign is needed. The separately planned card-drag feature touches the same panel/model files; integrate against their current contents without applying that feature here or overwriting its artifacts.

## Goals / Non-Goals

**Goals:** Expose Monaco's existing editing capabilities; enrich Marao-specific assistance through existing metadata; retain one source document and explicit save; meet the repository's mobile control requirements without loading JSON code for Visual users.

**Non-Goals:** An editor abstraction supporting multiple engines, the VS Code workbench, server-side language services, external schemas/CDNs, new document persistence, blanket library upgrades or custom reimplementations of search, parsing and text history.

## Decisions

### 1. Keep one deferred Monaco model and reuse commands

Retain the installed version and local worker/build path. Use Monaco's standard
commands, context menus and keyboard shortcuts for editing tools; do not add a
separate editing toolbar. Keep one deferred editor/model and the existing Save
and Visual/JSON controls.

Route tools to Monaco actions/services. Use Monaco search for matches, navigation and replacement, its completion provider/schema system for suggestions, and its model text history for formatting/replacement/completion undo. Do not create a second textarea, document or regex-based JSON parser. Opening/searching/navigation/folding/view changes do not mark dirty; actual text edits flow through the existing model-change listener.

Use Microsoft Monaco's stock widgets, default monospace font, compact line
spacing, minimap and `vs`/`vs-dark` themes. The user's follow-up explicitly rejects
Marao styling inside the editor. Remove the custom editing toolbar, docked find,
gutter buttons, view zones and widget CSS. Keep the existing HA Save and mode
controls outside Monaco. Native commands provide find/replace, suggestions,
formatting, undo/redo and diagnostics; no custom editing mode is needed.

Alternative: embedding VS Code or replacing Monaco adds loading/lifecycle work without being needed for these features. A custom search implementation would duplicate behavior already bundled and risk inconsistent undo and folded-result handling.

### 2. Use native Monaco folding

Keep Monaco's JSON folding controller and gutter icons, with
`showFoldingControls: "always"` so arrows remain discoverable. Native commands
handle keyboard folding. Use default glyph sizing and line density; do not add
custom glyph widgets, view zones or folding-state code. The explicit request for
stock Monaco supersedes the earlier 48px internal-editor adapter.

### 3. Derive suggestions from current configuration metadata

Extend `buildJsonSchema` or a small JSON-only helper using `EDITOR_CATALOG` data already delivered to the panel. Map field kinds to schema properties, descriptions and documented choices at their correct locations, including nested options. Cover catalog/template roles, entity bindings, group membership/filtering, media app/remote options, camera providers, vacuum command structures, energy formatting and charging presets. Preserve opaque object-valued command data as opaque rather than inventing constraints.

Use the current draft for page path choices, not only the saved document. Use existing entity metadata and applicable role/domain compatibility for completion ranking/filtering; valid manual bindings must remain accepted. For incomplete JSON, provide syntax-level/known-context assistance without replacing the draft or guessing destructive structure. Do not insert defaults merely because a schema contains them. Unknown properties/raw cards remain allowed wherever already supported.

Prefer the JSON language service for normal schema completion. Add a narrowly scoped provider only for context the schema cannot express, with model URI/version checks and explicit disposal. Refresh metadata/paths without recreating the model or resetting undo. Keep backend `validateConfig` and generation validation authoritative; assistance must not introduce stricter incompatible rules or claim to validate capabilities it cannot know.

### 4. Navigate diagnostics without changing configuration

Publish current syntax/schema markers for Monaco's native diagnostic widgets and F8 navigation, preserving severity and true source locations. Native navigation reveals affected code and enclosing folds. Respect model version so late worker responses do not show errors for obsolete text. Clear diagnostics on model replacement/disposal and distinguish worker/resource failures through existing retry behavior.

Keep semantic backend/save errors in the existing readable status path. Attach a source location only when it is known; never fabricate a line number. Diagnostic presentation must not relabel validation failures, silently fix values, suppress warnings or bypass Save/Visual validation.

### 5. Preserve editor state and provide more space

Use Monaco view-state APIs to retain selection, scroll and folds across unchanged Visual/JSON switches and editor-area resizing. Keep the model alive while the panel is connected, and avoid `setValue` when text is unchanged. Undo/redo remains Monaco's text history for that model; a changed Visual document uses the established explicit synchronization boundary, with invalidated ranges/view state recomputed rather than blindly restored onto unrelated text. Discard/history restoration continue to replace the source deliberately.

Allocate the available HA content area beneath the existing sticky header. Keep Save and tabs reachable; there is no custom expanded-editor mode or additional toolbar.

Use stock Monaco typography, themes and native widget sizing inside the editor, as the user explicitly requested. Keep Marao typography and sizing on surrounding app controls. Add English/Portuguese strings to the current panel/JSON localization path; use Monaco's bundled localization facilities for any newly exposed native widget text rather than shipping mixed untranslated controls. All added listeners/providers/widgets belong to the existing panel/editor lifetime and must dispose once.

### 6. Keep resource and safety boundaries unchanged

Bundle JSON-only code and any localization/style assets with the integration under existing content-versioned URLs. Extend reproducibility checks rather than adding a CDN. Retain no-JSON-on-Visual assertions, one initialization attempt, explicit retry and stale-completion guards.

The flow remains local draft -> existing validation -> explicit Save & Generate -> existing private backup/preflight/atomic generation/recovery. Search, suggestions, folding and diagnostics never dispatch entity services, write a file or issue management mutations. Configuration text/entity metadata stay on the HA origin; no remote schema fetching, telemetry or external editor service is added.

## Risks / Trade-offs

- Monaco does not officially support mobile browsers -> retain the user's chosen engine but make selected iPhone/Android typing, selection, paste, completion, search and gutter interactions acceptance gates; report actual coverage without claiming physical-phone/Safari testing.
- Monaco retains its stock compact widgets on mobile by explicit user choice; verify native interactions and app navigation without adding another editor skin.
- Catalog help could reject valid released configurations -> test schema assistance against supported historical/current fixtures and preserve permissive unknown/custom structures; server validation remains authoritative.
- Providers or gutter updates could cause repeated work -> scope by model/version, use visible ranges, dispose subscriptions and assert no duplicate workers, requests or actions.
- Replacing text can reset undo/folds -> avoid unchanged replacements and test continuity plus deliberate Visual edits, Discard and restore separately.
- Shared panel changes can conflict with drag planning -> preserve the independent change and verify current shared-source behavior as one coherent batch when implementation is requested.

## Migration Plan

No persistence migration, default insertion, dashboard version or generated-contract change is planned. Read-only tests must prove opening tools and accepting no edits leaves supported released/converted source documents, history and generated files unchanged. Independently expected text fixtures must cover accepted replacements/completions/formatting and their undo, including unknown keys, raw cards, explicit emptiness, order and nested command data. Keep protected generated YAML and archives immutable.

Rebuild and deploy compatible editor assets together only to disposable `192.168.0.28`. Update safe editor scenarios using existing Cases and realistic Studio content under `/marao-dashboard`; no new dashboard is required. Capture exact source/generated/affected state before a persistence scenario and verify cleanup afterward. Existing save preflight/recovery remains unchanged; if rollback is needed after writes, restore the matching package and source/generated/owned-state baseline together.

Select scoped editor model/UI, JSON asset/loading, schema compatibility and alignment checks through `tests/verification-map.js`. Add a focused JSON scenario rather than implicitly selecting every editor or runtime scenario. Final inspection combines both themes with required mobile/text/zoom layouts. Scoped preserved-install proof during release preparation is conditional on implementation actually changing persistence, ownership or upgrade behavior; frontend assistance alone does not request a full historical upgrade run.

## User follow-up scope

The user explicitly requested default Microsoft Monaco after inspecting the first
implementation, then clarified “Do not overthink … Just use it.” Sections 1–4 of
tasks record that earlier implementation; section 5 supersedes its custom editor
presentation. This follow-up starts at the same uncommitted HEAD
`7f4241b0f36620bc82b28fe73373cec77ed54faf`. Runtime affected-card set: empty.
Persisted configuration, generation, ownership and migration are unchanged.
