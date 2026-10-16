# Design

## Context

See proposal.md for motivation and affected consumers. Starting commit is v0.8.0, `7f4241b0f36620bc82b28fe73373cec77ed54faf`. The current user request supersedes the project policy's five-entry cap; all remaining mobile, preservation and ownership rules still apply.

Capacity appears independently in builder creation/pinning/validation/schema (`editor-model.js`, `MaraoDashboardPanel.js`), canonical validation (`page_model.py`), legacy/current generation (`generator.py`), native compilation (`native.py`), the native editor's route repeater (`MaraoNativeCardEditor.js`) and the shared runtime navbar (`frontend/MaraoCards.js`). Both native and generated cards reach the same renderer. Native administrator editing is separate from routes.

The navbar uses fixed 48px circular links, wrapping flex layout, 10px side padding and viewport/safe-area width limits. Six links plus gaps and padding exceed normal 320px width. The host spacer is fixed; shared `applyFullscreen` already measures live navbar height when run, but sizing changes can wait for its periodic refresh. Popup content also uses fixed bottom clearance. This is a shared geometry change as well as a validation change.

## Goals / Non-Goals

**Goals:** Six explicit entries work end to end with no silent loss; narrow layouts preserve touch geometry; shared height consumers update immediately; existing installations retain their choices.

**Non-Goals:** New navigation architecture, more than six entries, extra overflow controls, changing page discovery/default menus, applying other editor changes or redesigning runtime card actions.

## Decisions

### 1. Separate capacity from existing automatic defaults

Use six as the configured capacity at every reviewed boundary. Reuse existing constants where present, or introduce small named constants in existing Python/JavaScript module boundaries and parity tests rather than a new code-generation framework. The legacy automatic selection remains five; it is a compatibility default, not the maximum. Canonical absent/empty navigation and native starter behavior remain as currently specified, without new defaults or rediscovery.

Update builder auto-pin-on-user-creation to fill the sixth available slot, explicit pinning, JSON `maxItems`, validator errors and native repeater limit. At six pins, creating more pages still succeeds unpinned. A seventh entry is rejected before writes; never use a slice to repair over-capacity explicit input. Native Advanced/YAML editing must receive the same error and preserve the invalid draft for correction.

Alternative: globally replacing every five with six would change automatic routes and unrelated numeric limits, violating preservation. Updating only the renderer would leave valid six-entry input blocked by the editors/backend.

### 2. Adapt layout in the shared navbar

Keep the existing compact one-through-five appearance. For six routes, select six columns when the measured safe content width fits six 48px links and their gaps; otherwise use three columns/two rows. If enlarged zoom or safe-area constraints cannot fit three, use fewer columns without shrinking links. Keep source order row-major, active circles, localized internal labels, normal route activation and strong haptics.

Use actual navbar/container width so native card previews inside narrow editors behave correctly even on wider screens. Reuse existing CSS/layout tools; a local container query or measured layout state is sufficient. No carousel, horizontal swipe, tooltip-dependent label, hidden sixth route or arbitrarily small icon target is acceptable. Multi-row presentation uses an appropriately rounded container rather than forcing a tall pill shape.

### 3. Reuse measured height for clearance and lifecycle

Add a bounded size observer to each connected shared navbar. When geometry changes, reuse the existing shared clearance update immediately; do not add another polling loop. Disconnect/dispose the observer with its card and avoid feedback loops by updating only changed dimensions. Route changes, preview transitions, rotation and HA view replacement must continue through the existing ownership path.

Use measured live height for the navbar's owned spacer and existing page bottom clearance; propagate the same relevant height to popup bottom padding through a scoped shared CSS value or existing shared update path. Retain compact existing clearance for one-through-five entries and when no navbar is active. Multiple retained/duplicate instances must consider only active visible bars and restore original owned styles after leaving the dashboard. Do not leak a height from another dashboard/view.

Popups stay above navigation, scroll internally and retain focus/inert/close contracts. Ordinary HA dashboards with an individual native navbar receive bottom clearance while keeping their native toolbar. Native administrator Edit stays separate and respects admin/preview/edit-mode guards.

Alternative: adding a larger global fixed spacer would cover the new wrap but waste space on every smaller navbar and still fail at unusual zoom/preview widths. The current periodic update is not sufficient evidence of correct immediate resize behavior.

### 4. Preserve source and runtime contracts

No schema/config-entry version bump is needed: six is an expanded accepted list length using unchanged fields. Preserve names, icons, relative/custom routes, `path` aliases, unknown entry fields, order, native markers, empty lists, unpinned pages, protected custom YAML and history. Existing source conversion and validation remain the path for supported historical shapes; do not add a parallel migration.

Test independently authored expectations for existing zero/one/five-entry sources, an installed five-entry dashboard with an unpinned sixth page, explicit six-entry current/legacy configurations and seven-entry rejection. Do not regenerate historical expectations from the new implementation. Existing automatic five-route snapshots stay unchanged. Existing native saved dashboards and explicit deletions stay independent of builder writes.

Changes to editor/generator/native/compiler/runtime must deploy as one compatible package; otherwise one boundary can reject six while another accepts it. Save & Generate continues to use preflight, exact backups and existing atomic/recovery/history paths. Read-only preview never writes. An older package may reject new six-entry data, so rollback restores the pre-change package and saved baseline together, not assets alone.

### 5. Align documentation, fixtures and scoped verification

During implementation, update AGENTS.md, the dashboard quality guide, current usage/native configuration docs, English/Portuguese messages and current component/check map to the six-entry cap. Retain historical release records and old immutable fixtures. Do not rewrite unrelated prior change artifacts merely because they record the previous cap; the new delta is the superseding requirement.

Add a distinct safe six-entry gallery/editor case and one realistic page composition under `/marao-dashboard`, with all destinations reachable under that root. Native examples use explicit safe routes; no extra disposable dashboard is necessary. Show one-row and wrapped behavior plus a final control and a popup, rather than multiplying every card case.

Select focused navbar/native/editor-model/editor-UI/generator checks, relevant migration/history preservation, safe-area geometry and `test:ha:alignment`. Include six-route browser interactions and both themes, normal iPhone/Android, 320px, landscape and required text/zoom profiles. Reuse shared checks and inspect representative consumers; unrelated slider/security action suites are not automatically required. Mapping shared-file edits must use reviewed component scope and keep unresolved paths an error.

## Risks / Trade-offs

- Six links cannot fit the current 320px row -> use a balanced three-by-two layout with full-size controls and immediate height clearance.
- Changed maximum might repin an existing sixth page -> keep defaults and saved selections separate from capacity; assert upgrade/repeated-setup preservation.
- Frontend/backend limits might drift -> parity/acceptance tests cover all public paths at six and seven, including native Visual/YAML.
- Resize observation could produce loops or leaked styles -> compare dimensions, scope active bars, disconnect observers and verify shell restoration.
- Multi-row height can obscure final controls or popup content -> measure actual shared clearance and assert geometry immediately after resizing.
- Downgrade may encounter unsupported six-entry data -> retain exact backups and restore matching package/data together.

## Migration Plan

No automatic source conversion or menu expansion is introduced. Run focused historical/current navigation compatibility and recovery checks early. Rebuild bundled editor/native assets and deploy compatible modules/backend together only to disposable `192.168.0.28`, with exact source/generated/affected-state backups. Verify explicit six-entry save/reload/repeated generation/history restore and native ownership, then restore and verify the disposable baseline.

During explicit release preparation, run scoped preserved-install proof for affected navigation/generator/native validation and ownership consumers, using relevant legacy/current baselines, independent expected selections and cleanup/recovery evidence. Run scoped publication/release gates and applicable exact-commit CI. The capacity change does not implicitly request every historical scenario, a full mobile matrix or parallel tests.
