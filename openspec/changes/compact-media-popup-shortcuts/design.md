# Design

## Context

The media page already uses MaraoControlGrid's existing 80px logo-only capacity. `_media_popup` still emits a Home Assistant grid with two columns, bypassing that layout. The native card compiler and generated YAML both call this same popup generator.

## Goals / Non-Goals

**Goals:** Repair the missed popup consumer using the existing control-grid component.

**Non-Goals:** No new layout options, artwork changes, remote-control changes or dependency additions.

## Decisions

Emit `custom:marao-control-grid` with three columns for the app group only. Reuse its existing runtime reflow and availability presentation; leave remote grids intact. Existing released Apple TV app lists are read exactly as before. Old generated grids remain accepted; normal regeneration updates owned popups. Manually authored raw grids, source configuration, custom app names/sources/options, order and archived history remain unchanged. No source migration is required.

## Risks / Trade-offs

- [Backend code must run before popups change] → Install the final backend on the disposable instance in one normal preparation/restart, preserving helper state. Native cards recompile through their existing lifecycle; generated YAML uses normal owned-output generation.
- [Responsive behavior] → Reuse the tested app-group capacity rather than shrinking generic controls or adding popup-specific CSS.

## Migration Plan

No persisted-source migration. Normal generation retains existing backup/atomic-write behavior. Install final current code on disposable 192.168.0.28 and reuse readiness checks. Rollback uses the previous package and its corresponding generated output through the existing recovery path.
