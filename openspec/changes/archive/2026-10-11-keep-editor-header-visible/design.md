# Design

## Context

See `proposal.md` for the current evidence and scope. This is an editor-shell change: `_renderShell` owns the toolbar, tabs and content; `panel.css` owns their layout. Save/dirty/busy updates address existing elements by ID, and Monaco has separate internal scrolling. Keep that wiring intact. The affected dashboard-card set is empty; existing editor fixture content supplies the long-page scenario.

## Goals / Non-Goals

**Goals:** Pin one editor header, preserve document/actions, and leave content usable across mobile text/zoom profiles and HA shell layouts.

**Non-Goals:** New scroll management framework, duplicate action bars, fixed room headings, changes to card renderers/generation, automatic writes, editor startup/folding implementation or extra dependencies.

## Decisions

### Use one sticky header in normal flow

Wrap the existing toolbar and tabs together and apply CSS `position: sticky` with an opaque HA theme background and modest stacking level. Preserve IDs, event handlers, semantic controls and mode selection. Prefer sticky over fixed positioning or scroll listeners: it retains normal-flow space and follows content resizing without maintaining a duplicate height calculation for positioning. Do not pin toolbar and tabs separately with guessed offsets.

Attach it to the actual page scrolling path. Measure real scroll progress and header bounds in the focused browser check, traversing slots/shadow hosts as the existing dashboard scroll check does; do not assume `window` is the scroller. Use the available HA content top boundary, with device-derived inset only where needed and not already provided by the host. Do not change native HA shell behavior or apply dashboard-only top-bar hiding to the editor.

Use the header's actual rendered height for content reveal clearance (`scroll-padding`/`scroll-margin` where appropriate), so keyboard focus and scroll-into-view do not hide fields under it. If a dynamic measurement is needed for this clearance, keep it local, update on size changes and clean it up on disconnect; sticky positioning itself stays CSS-driven. Modal dialogs and native dropdowns must remain above the header, with their current focus behavior intact.

### Keep the pinned region compact and accessible

Start with the existing responsive wrapping; reduce nonessential spacing and omit the descriptive subtitle in compact layouts without shrinking essential text or touch targets. Keep title, save indication, Save & Generate and mode navigation visible. If short/enlarged profiles leave no useful content area with every secondary button inline, move History, Discard and Open dashboard to one localized, touch-sized overflow control using an existing HA/native popup pattern. This is only the compact layout, not a new action or settings option. Preserve disabled state, confirmations and the new-tab behavior of Open dashboard. Use one handler path and no duplicate active controls.

Do not solve header height with a separate scrolling header, clipped labels, scaled typography or a fixed content-height assumption. Keep the form's normal scrolling and Monaco's existing bounded scroll region. Do not pull the JSON Format control or proposed folding controls into this header unnecessarily; preserve their existing placement and behavior. Compose with pending startup/folding changes in the shared shell rather than recreating it during tab switches.

### Verify scrolling and actions in the existing environment

Reuse installed Playwright, disposable target/authentication guards and any focused editor browser check introduced by related work; otherwise add one narrow editor check under `tests/`. Use a safe populated document or mocked read response without leaking configuration/tokens in traces. Assert actual scroll movement at top/middle/bottom before checking header bounds; a no-op scroll must fail the regression. Verify both page scrolling and Monaco scrolling, focused-field clearance, selectors/dialog stacking, narrow/short layout, dirty/busy state and action dispatch. Save/discard assertions use mocks or isolated safe fixture configuration, preserving/restoring the disposable document.

Cover 320px and representative iPhone/Android portrait/landscape, both themes and normal/bold/200% text/200% zoom/bold-plus-200% text using existing profiles. Add geometry/interaction assertions to this browser check rather than a test that merely searches CSS for `sticky`. Check build consistency with existing editor commands. After the last edit and focused check, visually inspect the editor header and content at the affected profiles on 192.168.0.28. No new Cases permutations or whole-gallery/alignment run is needed because dashboard cards and icon-only card layouts are unchanged; expand scope if implementation changes them.

## Risks / Trade-offs

- **A wrapping header can dominate landscape/large-text screens** → Compact secondary actions and retain a usable form area; verify actual geometry, not just header visibility.
- **An unexpected overflow ancestor or HA shell inset can break sticking** → Test the actual deployed editor scroller and native shell in both sidebar layouts; avoid global shell CSS.
- **Higher stacking can obscure native overlays or focused fields** → Keep a bounded header layer, verify dialogs/selectors and measured content reveal clearance.
- **Related editor changes can replace the shell** → Preserve the single shell and its existing action IDs/lifecycle; test first/repeated Visual/JSON activation with current source.

## Migration Plan

No JSON, generated YAML, API or historical-data transformation is required. Historical saved documents must remain unchanged by navigation/scrolling and retain existing explicit save behavior; expected persisted content is identical. Rebuild the complete owned editor asset set and deploy only to the disposable instance through the existing preparation workflow, checking the served version. Keep private evidence ignored and preserve/restore any isolated test data.

Rollback restores the previous complete editor assets; configuration does not need a conversion. If a browser test deliberately saves fixture data, restore its matching source/generated backup as well. No new migration infrastructure or upgrade live run belongs in this feature. Future push/publication still requires the existing gate; versioned release preparation also requires the separate upgrade evidence prescribed by repository rules.
