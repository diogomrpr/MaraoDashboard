# Proposal

## Why

The user mainly notices a delay the first time JSON opens: the dashboard document is already loaded, but Monaco and its supporting resources initialize only after the tab is selected. Prepare that editor in the background while giving the Visual page's required requests, rendering and interactions priority.

## What Changes

- Make the initial response contain the complete editable source, route/conversion status, compact card-display definitions and metadata only for initially expanded card rows. Keep the whole source because visible page actions and reference edits operate across unopened pages; defer optional context rather than introduce partial-document editing.
- Load full catalog/entity/area metadata and creation templates as one deferred editing-context request. Read History only when opened. Bundle each consumer's related needs, share identical in-flight reads, and allow independent deferred transport to overlap frontend rendering after required initial calls finish.
- Separate optional resource fetching from browser computation. After required main-page calls and critical resource requests finish, low-priority JSON resource fetching may overlap remaining frontend rendering; module evaluation, schema/model work and hidden editor initialization wait for usable Visual controls and browser idle opportunities.
- Prepare the existing bundled JSON editor once per connected panel lifetime using the shared deferred context. A Visual action promotes only its required data; explicit JSON selection also promotes Monaco preparation instead of starting duplicate work.
- Keep independent Visual actions, focus and scrolling usable while preparation proceeds. Actions needing unloaded data acknowledge immediately and await only their own prerequisites; Save always retains complete validation. Successful background work does not change the visible tab, source, dirty state or saved output.
- Preserve the latest shared draft across asynchronous preparation, edits, save/discard and reconnect. Retain localized errors and explicit retry without automatic retry loops.
- Replace the old absolute prohibition on JSON requests while Visual is open with ordered startup, cooperative background work and measurable responsiveness requirements. Keep Monaco outside the eager Visual bundle.
- Add compatible, explicitly scoped reads while preserving existing unscoped management responses and source previews. Avoid optional backend computation on the initial path, not just optional fields in its response.
- Update focused backend/lifecycle, request-count, failure/recovery and performance coverage, distinguishing initial server work, main-page usability, background readiness and first JSON opening.

## Capabilities

### New Capabilities

None; this extends the existing editor and frontend lifecycle.

### Modified Capabilities

- `visual-builder`: prioritize visible Visual controls, load broader editing context progressively, prepare JSON cooperatively, and preserve drafts/actions through loading and foreground promotion.
- `integration-lifecycle`: provide compatible scoped management reads with only the required backend work, and apply content-versioned frontend resources to background preparation as well as explicit opening.

## Impact

**Observed baseline:** `_load()` currently waits for an oversized `marao_dashboard/config/get` response containing full registry metadata, creation templates and History even though only the landing page body initially opens. `_ensureMonaco()` then waits for module/styles, icon font and worker validation on first JSON selection, and its foreground loading state disables Save/Discard/History. Native form readiness finishes asynchronously after `_renderVisual()` returns. These mechanisms are confirmed by source inspection; no fresh timing or installed-instance claim is made by this proposal. Historical October 16 measurements are not current acceptance evidence.

**Source scope:** `custom_components/marao_dashboard/__init__.py`, shared catalog/metadata projection helpers in `editor.py` where appropriate, `frontend_src/MaraoDashboardPanel.js`, `json-editor.js`, the editor build/asset graph where needed, generated integration assets, focused backend/editor/model/JSON checks and measurement helpers. Update configuration/development guidance and the verification source/check map. Reuse safe canonical Cases and realistic Studio examples; runtime card behavior and gallery composition do not change.

**Affected-card set:** empty. This changes administrator editor loading and all of its supported configuration consumers, without changing generated cards, runtime components, navbar, popups or themes. Planning started at `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`; unrelated untracked OpenSpec changes remain untouched. Re-record the actual apply baseline before implementation.

**Compatibility:** preserve saved JSON versions, normalization/serialization, unknown fields, explicit emptiness/deletions, order, names, options, raw cards, protected custom YAML and unrelated HA settings. Add scoped reads without changing the default full response or source-preview semantics. Required metadata for historical conversion remains part of that conversion's critical path. No persisted format, generated-output, package-version or config-entry migration is proposed. Background activity is read-only; existing explicit save/restore recovery remains binding.

**Non-goals:** partial saved-document hydration, general editor state redesign, unrelated repeated-switch optimization, runtime dashboard navigation, a generic task scheduler, new dependencies, CDN resources, service workers, persistent browser caches owned by Marao, one request per card/entity, releases or comprehensive testing. Browser idle scheduling is a cooperative signal rather than a promise to detect global spare CPU; browsers without that signal retain safe on-demand initialization for CPU-heavy stages.
