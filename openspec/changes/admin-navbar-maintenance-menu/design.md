# Design

## Context

See proposal.md and capability deltas. `MaraoNavigation.js` binds `bindNavbarRefresh()` from `MaraoFrontendRefresh.js`; the helper already owns the 3000ms threshold, movement/cancellation, progress and click suppression. `_refreshFrontend()` owns unsaved/busy and refresh feedback. `_syncPageRefresh()` currently prepends a landing-page row containing an admin editor anchor and the optional cache-reset button. `native-strategy.js` supplies dashboard_root and editor_path from the actual generated document for administrators, preserving a collision-safe internal editor view.

The regular navbar overflow has its own anchored layout and focus lifecycle. `MaraoPopupCard` in `MaraoCards.js` supplies the full card-detail popup behavior but is optional card content. Critical navigation must remain usable before or despite those optional modules failing.

## Goals / Non-Goals

Goals: keep normal pages free of an editor shortcut, branch the existing hold using the current role, reuse guarded actions and preserve navigation/recovery startup. Non-goals: Home-only gesture changes, new timers or thresholds, generic popup frameworks, persisted settings, source migrations or backend work.

## Decisions

1. **Branch only the shared completion path.** Replace the direct completion call with a small navbar-owned dispatch: inspect the current `hass.user.is_admin`, open maintenance for admins, otherwise call the existing direct refresh method. Preserve the helper's threshold and guards. Do not decide eligibility from stale role metadata captured at hold start. Select localized menu-hold versus refresh-hold guidance through current navbar context; cancellation and haptics remain shared.
2. **Use a small browser-native modal sheet.** Create a native `dialog` on demand, styled with existing theme/safe-area/column-width conventions and a short slide-up entrance above the navbar. `showModal()` supplies inert background and focus containment without importing optional card/editor modules or duplicating the full card-popup implementation. Include a localized title and close control, named 48px Edit dashboard and Clear cache/refresh actions, and internal scrolling. Restore focus to the invoking control or a current matching navbar control when the DOM was replaced. Keep this menu separate from the route-overflow list; no menu entries become configured routes.
3. **Reuse existing actions after dismissal.** Build Edit dashboard from current dashboard_root/editor_path, preserving internal HA navigation and existing editor guards. Show it only with real route metadata; standalone hosts lacking that metadata offer refresh alone. Recheck admin/user/dashboard ownership before acting, dismiss the sheet to release its own inertness, then invoke the existing guarded action once. Debounce repeated activation by closing/invalidating the menu session before dispatch. No refresh is triggered just by opening or closing maintenance.
4. **Own lifecycle explicitly.** Retained navbar surfaces must own one menu session tied to current user and dashboard. Close and invalidate it on role/user/route change, preview/edit transition, lost host ownership or removal. An unrelated modal taking ownership also invalidates maintenance. Escape, backdrop and Close dismiss without action. Never remove another modal's inert state; a menu action must still obey current refresh protection after closing its own sheet.
5. **Remove only the permanent editor row content.** Delete the editor anchor, its editor-only initialization and access guards from `_syncPageRefresh()` while preserving the optional cache-reset button and its normal direct tap behavior for either role. With show_cache_reset false, remove the entire row and spacing. With true or omitted, keep its existing first-view placement. The hold menu is independent of this flag, and never fabricates a target for empty configured navigation.
6. **Keep contracts and documentation aligned.** Source, generator/compiler, templates and native route metadata need no new fields. Use existing English/Portuguese localization tables in `MaraoNavigation.js`; add only menu/action feedback text. Update the configuration guide and documented editor-access instructions. Reconcile the permanent-link clause in the existing native-transition change as an explicit superseded decision, preserving its unrelated unfinished work. Direct-route/bookmark access is the empty-navbar fallback; do not promise a new sidebar or settings shortcut.

## Risks / Trade-offs

- [The hold becomes less discoverable than a visible button] → Document the gesture and direct-route fallback; keep visible progress describing the current action.
- [A stale admin menu leaks editor access or acts on a different dashboard] → Revalidate current role/user/context at display and activation; invalidate on ownership changes. HA authorization remains authoritative for writes.
- [Modal inertness prevents the chosen refresh or bypasses another modal] → Dismiss only the owned dialog before invoking existing guards; retain protections for other modal owners.
- [An optional card module fails before maintenance is requested] → Keep this native menu in the navigation-owned path, independent of MaraoCards/editor initialization.
- [Retained surfaces or repeated holds create duplicate menus/actions] → One current menu session per owning navbar, explicit teardown, and exactly-once action tests.

## Migration Plan

No migration or persisted conversion: supported released sources, show_cache_reset, explicit empty navigation, route order, unknown content and editor path stay unchanged. No data backup/write operation is introduced by menu display. Code rollback restores the previous hold callback and editor anchor; source data needs no downgrade.

Use existing `tests/frontend/frontend-refresh.test.js` for gesture behavior and `tests/frontend/marao-navbar-card.test.js` for role dispatch, page-row visibility, route targeting and lifecycle. Reuse its VM/DOM harness; add only narrow assertions for the changed authorization/modal paths. Existing safe dashboard pages suffice; no new gallery entities, route fixtures or test matrix. Broaden to one targeted browser visit only if native modal/focus behavior needs diagnosis; do not make a routine mobile/theme campaign mandatory.

At apply time capture the dirty baseline, review the scoped diff, build through existing editor/native distribution tooling and install the final compatible assets once with `prepareFrontend()` on disposable `192.168.0.28`. Served-asset/readiness checks suffice. Preserve configuration/helper state, report blocked installation honestly, and hand off admin versus regular-user behavior plus modal dismissal for manual checking. Publication remains separate and requires unit-only verify:publish; no release or additional integration/full testing is authorized here.
