# Design

## Context

See proposal.md for motivation and compatibility. Baseline is v0.8.0 at `7f4241b0f36620bc82b28fe73373cec77ed54faf`. The user's new direction replaces the unimplemented six-entry/wrapping plan. Mark that plan superseded without checking off implementation tasks or treating it as verified work. Other editor proposals and unrelated edits stay intact.

Five-entry caps exist in builder creation/pinning/schema/validation, Python canonical/legacy validation and generation, native compilation and the native route repeater. All generated and native navbar variants reach `MaraoNavbarCard` in `frontend/MaraoCards.js`, which currently rejects a sixth route and renders fixed 48px links with flex wrapping. Shared fullscreen ownership measures bar height and preserves native shells; popup sheets own modal focus/inert state and sit above navigation.

## Goals / Non-Goals

**Goals:** One shared single-row renderer; complete configuration preserved independently of device width; a matching anchored, internally scrollable vertical menu; predictable focus, dismissal and ownership.

**Non-Goals:** A new navigation schema, positioning framework, global menu service, extra horizontal rows, route promotion based on usage, automatic repinning, or implementing the previous six-entry plan first.

## Decisions

### 1. Remove configuration caps, retain validity and defaults

Remove only product count limits from `editor-model.js`, panel pin/add paths, JSON `maxItems`, `page_model.py`, relevant `generator.py` validation, `native.py`, the native editor routes repeater and runtime `setConfig`. The repeater already supports unbounded lists by default; retain unrelated limits such as charging presets. Preserve type/label/destination validation and report actual invalid entries without slicing the document.

Builder pinning and ordinary new-page creation no longer encounter a full-navbar condition. Existing unpinned pages remain unpinned. Keep legacy automatic first-five selection as a separate compatibility default; canonical absent/empty lists and native starter defaults retain their existing meaning. A larger configured list is explicit user intent, not permission to expand saved installations from discovery.

Alternative: raising a shared number again would still impose an unnecessary limit and require more policy changes. Rewriting all automatic menus would violate preservation without helping explicitly configured overflow.

### 2. Compute a deterministic presentation partition

Keep one authoritative configured list. Compute slot capacity from available safe width in the active HA view, or the bounded preview host, measured control size (minimum 48px), gaps and padding. At rest the bar width stays compact for few routes and stops growing at the available safe width. Do not measure width from a child whose size already depends on the current partition, which can oscillate.

For `N` routes and `S` available slots:

```text
N = 0      --> hide the bar and overflow
N <= S     --> all N routes; no More button
N > S      --> first max(S - 1, 0) routes + More
               remaining routes in vertical menu
```

With one available slot, More owns every route when needed. Use `flex-wrap: nowrap` or equivalent fixed-row geometry. At the exact fit boundary no toggle is needed; once overflow is required its slot replaces a route and that route joins the vertical list. Do not cap slots at five or six on larger available widths. Test zero, exact fit, one-over, one-slot and much longer lists independently of actual device widths.

Keep original route indices/identities through partitioning. Selecting an overflow route does not promote or reorder it. Mark its link current and give More the active-circle treatment plus an accessible current-destination description. No visible text labels are added to the established icon-only navbar; every link and button still has a localized semantic name.

### 3. Anchor a vertical version of the same surface

Render overflow beside the horizontal bar within the same navbar shadow root so the toggle's controlled-region relationship stays valid. Reuse theme, icon, circle, shadow, spacing and strong-haptic helpers. A small shared surface/control style inside this component is sufficient; do not fork styling per generated/native host.

Position the menu fixed above the toggle with a short gap; align its icon-column center with the toggle center. Read actual toggle bounds, viewport/safe insets and available space instead of deriving an x-coordinate from route count. Width is one icon-control column plus the navbar-like padding. Since the toggle is constrained inside the safe row, keep that alignment while fitting the menu within side boundaries.

Bound the menu's height between the toggle and current safe top boundary (including the retained native header where relevant). Use vertical scrolling and overscroll containment inside the menu. Long lists do not enlarge the bar or page spacer. Do not create horizontal scrolling or shrink controls. Render menu destinations only while open; use ordinary linear list processing, not a new virtualization framework. Verify representative longer lists for correct last-item reachability and bounded geometry.

Illustrative overflow, with remaining routes in their configured order:

```text
                         ( Studio )
                         ( Energy )
                         ( Media  )
                             |
( Home ) ( Rooms ) ( Scenes ) ( More )
```

The labels illustrate positions; the actual surfaces use icons and accessible names.

### 4. Use a small non-modal navigation interaction

Use a semantic toggle with expanded state and a controlled navigation region containing real links. Avoid `role=menu` unless implementing its complete keyboard contract; ordinary links plus Tab/Shift+Tab and Escape provide the existing browser navigation model. Toggle activation opens once and focuses the active overflow link, or the first remaining link; ensure focused/selected entries scroll into view. Keyboard focus leaving the region closes it without stealing the newly chosen focus.

Second activation, Escape and outside interaction close the menu. Restore toggle focus after Escape or explicit toggle dismissal; route selection lets navigation own focus, and outside focus movement keeps its explicit target. Outside-dismiss handling must consume a pointer gesture that only dismisses an overlaid menu so it cannot accidentally actuate the covered dashboard card. Scope any click suppression to that gesture; do not install permanent global suppression. Reuse the current navigation function and haptics so a selected link navigates exactly once, including hash/custom URLs and active-route handling.

Menu open state is ephemeral card-instance state, never configuration. Preserve it across unrelated HA state updates, but close on source replacement, route/navigation changes, host removal, dashboard editing, preview transitions, modal-sheet opening or any size/inset change that repartitions/repositions the menu. Clear the correct listeners and restore focus only if the matching opener still exists. Unrelated state updates must not recreate the menu or reset its scroll.

### 5. Keep sizing, modal and host ownership shared

Use bounded size/viewport observation and existing navigation hooks to recompute slots immediately. Close first, then repartition on resize/rotation/zoom; update only changed geometry to avoid loops. Dispose observers with the card. Reuse existing bar-height clearance so final page controls remain reachable; the vertical menu is an overlay and does not inflate normal page padding.

Keep the menu above dashboard content but below Marao modal sheets. Dismiss it through the shared sheet-opening boundary before applying modal focus/inert ownership; do not turn the overflow into another modal popup or interfere with slider gestures. Retain existing popup scrolling and close semantics. Native preview may display the computed single row but its links/toggle remain non-interactive and introduce no fullscreen effects. Ordinary dashboards containing individual native navbar cards retain HA's toolbar. Administrator Edit remains a separate control outside route slots and keeps existing guards.

Do not introduce a new polling loop, globally leaking safe-area variables, portal theme copies or dashboard-specific positioning hacks. Test clipping/alignment in both generated views and native standalone/preview hosts because they have different ancestors.

### 6. Preserve source, history and release boundaries

The stored representation stays the same ordered list; no visible/overflow partition, open state or screen slot count is persisted. Retain format 2, component keys, explicit empty lists, labels/icons/URLs/path aliases, unknown fields, raw/protected content, source conversion and native ownership. No migration or default insertion is planned.

Test independently authored expectations for supported existing zero/one/five-entry sources, an unpinned extra page, explicit longer legacy/current/native lists and invalid route shapes. Read-only compilation/preview and menu gestures must not write source, history or generated files or dispatch entity services. Existing explicit saves retain preflight, exact backups, atomic generation/recovery and immutable archives. Long lists require the new supporting package; downgrade restores a matching saved-data baseline with its package.

Update AGENTS.md and the quality guide during implementation to replace the count/wrapping policy with one row plus overflow, and update current English/Portuguese help/errors/docs and feature coverage. Mark the six-entry proposal/tasks superseded in this planning batch; do not rewrite its historical design/spec contents or mark its work complete. Update current check mappings and add distinct safe cases and a realistic page under `/marao-dashboard` without creating another disposable dashboard.

## Risks / Trade-offs

- Reserving More reduces direct routes by one at overflow -> deterministic prefix/remainder behavior and exact-boundary tests make this predictable.
- Safe-area or preview width differs from device width -> measure the active view/preview bounds and toggle, test rotation and enlarged zoom.
- A long menu may extend above the viewport -> bound safe height, scroll internally and verify the last destination without background scrolling.
- Outside dismissal can trigger a covered entity action -> gesture-scoped dismissal suppression and safe fake-card assertions.
- Menu focus/layers can conflict with sheets or HA editing -> close at shared ownership transitions and test focus restoration/preview/admin guards.
- Large lists can become expensive -> keep processing linear, mount menu only when open and verify representative long lists without adding a new product cap.
- Legacy and native selections could be expanded inadvertently -> retain explicit defaults and prove preserved-install selections/ownership.

## Migration Plan

No automatic conversion or repinning. Ship backend validators, builder/native editors and shared runtime together so all paths accept longer lists consistently. Rebuild bundled editor assets and deploy only to disposable `192.168.0.28`, with exact source/generated/affected-state backups. Verify save/reload/repeated generation/history, then restore and verify the disposable baseline.

Run focused compatibility/security-of-dispatch checks early, then one covering scoped affected batch and final combined inspection of normal/exact-fit/overflow/long-menu cases in both themes, representative iPhone/Android, 320px, landscape and required text/zoom profiles. Include alignment and relevant popup/shell geometry. During explicit release preparation require scoped preserved-install proof for affected navigation/generator/native contracts and recovery, then scoped publication/release gates and applicable exact-commit CI. Do not implicitly run the full historical/mobile matrix or parallel checks.

## Implementation verification (2026-10-16)

Implementation started at `4f4e3bb3bf9f2a68a7ead783b535ad4868c83a36` (v0.9.2).
Format 2, public route keys and existing automatic first-five selection remain
unchanged. Explicit lists are uncapped across the builder, native compiler/editor
and shared renderer; malformed routes preflight before writes.

`npm run test:affected -- --component navbar-overflow` passed all 31 scoped
checks, including independent route expectations, supported legacy conversions,
protected history, generated/native ownership, reproducible assets, nine selected
mobile layouts in both themes, safe-area geometry and icon alignment. Live checks
covered Visual/JSON and native Visual/YAML preservation, exact-fit and overflow
boundaries, long-menu scrolling, hash/back/forward navigation, safe dismissal,
popup focus restoration and disabled bounded previews. Exact disposable cleanup
was verified. Representative normal, landscape and zoomed captures were reviewed;
WebKit outside-touch dismissal and the following touch also passed in both themes.

No physical-phone inspection or full suite was performed. This implementation
was not published; release preparation still requires scoped preserved-install
proof and publication gates for the affected navigation/generator/native paths.
