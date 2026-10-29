# Design

## Context

The media page already uses MaraoControlGrid's existing 80px logo-only capacity. `_media_popup` still emits a Home Assistant grid with two columns, bypassing that layout. The native card compiler and generated YAML both call this same popup generator.

## Goals / Non-Goals

**Goals:** Repair the missed popup consumer using the existing control-grid component.

**Non-Goals:** No new layout options, artwork changes, remote-control changes or dependency additions.

## Decisions

Emit `custom:marao-control-grid` with three columns for the app group only. Reuse its existing runtime reflow and availability presentation; leave remote grids intact. Existing released Apple TV app lists are read exactly as before. Old generated grids remain accepted; normal regeneration updates owned popups. Manually authored raw grids, source configuration, custom app names/sources/options, order and archived history remain unchanged. No source migration is required.

The user's 2026-10-28 size refinement caps each visible app surface at 80 by 80 CSS pixels with 18px corners, centered in its existing grid cell. Apply this in the shared app-card styles so popup, page and native hosts agree. Keep the 80px grid capacity, configured columns and existing source lists unchanged; only app surfaces are exempt from filling their cells. Retain semantic app names, full-tile actions and problem-details access.

Hover feedback uses an animated, soft theme-colored shadow on the rounded card surface, leaving the logo unobscured. Retain the slight lift, a softer shadow during press compression, enabled-action guards and reduced-motion handling across all app-shortcut hosts.

## Risks / Trade-offs

- [Backend code must run before popups change] → Install the final backend on the disposable instance in one normal preparation/restart, preserving helper state. Native cards recompile through their existing lifecycle; generated YAML uses normal owned-output generation.
- [Responsive behavior] → Reuse the tested app-group capacity rather than shrinking generic controls or adding popup-specific CSS.

## Migration Plan

No persisted-source migration. Normal generation retains existing backup/atomic-write behavior. Install final current code on disposable 192.168.0.28 and reuse readiness checks. Rollback uses the previous package and its corresponding generated output through the existing recovery path.
