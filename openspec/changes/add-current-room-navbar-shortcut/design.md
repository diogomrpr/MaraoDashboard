# Design

## Context

See `proposal.md` for motivation and confirmed decisions. Design is required because this crosses runtime navigation, shared persisted settings and local identity preferences.

`MaraoNavigation.js` owns `MaraoNavbarCard`, `navbarPartition`, current-route updates, automatic surfaces, main-page actions, maintenance and shell cleanup. Its `hass` setter currently updates active routes, not dynamic destinations. `frontend_src/dashboard-settings.js` validates version-1 settings, patches the native document losslessly and refuses stale or non-admin saves. `dashboard-settings-dialog.js` provides shared native selectors and draft Save/Cancel. `native-bootstrap.js` supplies the dashboard-wide settings to the runtime. Existing tests are `tests/frontend/marao-navbar-card.test.js` and `tests/frontend/dashboard-settings.test.js`.

The native-editor change already establishes shared settings; this proposal builds on the current working tree without changing that change's artifacts or claiming it as implemented here. No application files were modified during planning. Starting commit: `cf4662333dd6223c761e698f4131a197d67e19a7`; unrelated dirty work exists.

Upstream references inspected during exploration:
- [HA people/accounts](https://www.home-assistant.io/docs/configuration/user-configuration/): a login can be linked to a person.
- [HA Person entity](https://github.com/home-assistant/core/blob/dev/homeassistant/components/person/entity.py): presence combines configured trackers; account matching must use the exposed user association, not the state-change context author.
- [Bermuda Area sensor](https://github.com/agittins/bermuda/blob/main/custom_components/bermuda/sensor.py): current area name and stable `area_id` attributes. Registry area assignment describes the entity/device's configured area, not its moving location.

## Goals / Non-Goals

**Goals:** one shared navigation owner and resolver; lossless optional settings; account-specific results from shared configuration; local overrides without privilege escalation; stable controls and no room-history retention.

**Non-Goals:** changing People cards, adding a presence backend, resolving multiple tracking devices automatically, calling Bermuda services, identifying hardware from browser fingerprints, editing HA people/accounts, generating room/Away content or resurrecting the retired whole-dashboard builder.

## Decisions

### 1. Explicit configuration, automatic runtime identity

Proposed additive configuration under `marao.navbar.current_room`:

```yaml
enabled: true
people:
  person.alex:
    area_sensor: sensor.alex_phone_area
rooms:
  kitchen:
    path: /marao-dashboard/kitchen
away_path: /marao-dashboard/away  # optional
```

`people` is keyed by HA person entity ID; `rooms` by HA area ID. `enabled` defaults false when omitted. Maps can be explicitly empty. Paths target actual views of the active ordinary dashboard, including subviews, through the existing view-address resolver. No guesses based on page titles, entity names or current sensor state. Retain invalid/deleted references visibly in settings so they can be repaired; runtime disables their destination. Reject malformed new values on Save. Do not silently drop unknown keys.

An explicit sensor association is small, predictable and works when someone tracks a watch rather than a phone. Automatic sensor discovery from names or the person's currently selected tracker is ambiguous and is excluded. Use stable Area attributes; do not use the Area Last Seen sensor as a fallback.

### 2. Identity preference belongs to the browser

Priority: explicit local override, otherwise exactly one `person.*` whose HA user association equals `hass.user.id`. Use current visible HA state; no administrator-only person-list API or backend is required. If the supported host lacks the association, show unresolved identity and offer explicit selection rather than guessing.

Store only the overridden person entity ID in a namespaced local preference keyed by origin, dashboard root and signed-in user ID. Automatic removes the key. Guard unavailable/corrupt browser storage; keep a deliberate choice in memory and show a localized message when persistence fails. Reset in-memory resolution immediately on account/dashboard changes. A deleted/unreadable override does not silently become Automatic. Override follows only people already accessible through HA; it grants no permissions.

Expose **Location preferences** as a feature-specific main-page action for all users when enabled, beside the existing page actions. Open a shared Marao sheet with Automatic and a native person selector. This avoids adding a second navbar slot or changing the existing two-second hold and ordinary-user refresh behavior. Label it as applying to this browser; no shared Save action or administrator role is required. Keep it available when the location placeholder is disabled or no ordinary navbar routes exist.

### 3. Resolve states before rendering a destination

```text
local override or signed-in account
                 |
                 v
          selected HA person
                 |
          valid presence?
           /           \
         home        outside home
          |                |
  configured Area      optional Away
       sensor              page
          |
  current area_id --> mapped dashboard page
```

Loading, disconnected, missing identity, missing sensor, unknown/unavailable presence or sensor, and unmapped/deleted targets resolve to non-actionable states. A valid `not_home` or named non-home zone takes precedence over a lingering room reading; Away navigation does not depend on the Area sensor being available. Home requires a usable current Area and mapped view. Missing room detection alone never confirms away.

Return a small derived presentation containing status, localized label, icon and optional destination. Render a neutral `mdi:home-export-outline` placeholder with distinct accessible descriptions for away, room unknown, loading, unavailable and setup problems. A mapped destination uses the native view title/icon with localized Current room or Away and standard icon fallbacks. Indicate current page through the existing active circle and `aria-current`; an ordinary duplicate route retains its independent active indication.

HA updates change derived presentation in place, preserving focus and active gestures. Recheck identity/state/target on activation, so a press cannot use the preceding room/account after a state update. State changes never navigate or dispatch services. No custom location polling, smoothing, timeout or optimistic state machine; consume Bermuda's authoritative room selection.

### 4. Reserve space before ordinary overflow partitioning

At supported phone widths, reserve the first 48px location slot, then partition configured routes into remaining slots with More rightmost. Keep the dynamic entry outside persisted `routes`; ordinary order, duplicates and explicit empty lists remain untouched. Location transitions never change ordinary capacity or promote an active route. An enabled location entry alone still renders with no ordinary routes.

At the existing defensive one-slot width, More contains the location entry followed by every ordinary route. At two slots with ordinary routes, location plus More preserves all destinations. This explicit exception avoids losing routes or shrinking targets. Feature disabled/absent uses the original partition without a spacer. Retain safe areas, popup layering, editing/preview guards, main-page actions and hold cancellation.

### 5. Settings and source ownership

Extend `dashboard-settings.js` and `dashboard-settings-dialog.js` for admin configuration with HA person/entity/area/navigation selectors. Save through the existing read/compare/patch/save boundary; Cancel discards edits. Propagate through `native-bootstrap.js` without per-view copies. Add preference labels in the runtime's existing navigation locale table and settings English/Portuguese text. Reuse theme/semantic controls and Marao modal ownership; no CSS framework or new backend endpoint.

Regenerate editable bundles using `npm run build:editor`; do not manually patch generated editor code. Retained historical generator/source paths remain read-only and unchanged; this opt-in configuration targets ordinary native dashboards. Review representative legacy navbar consumption to ensure omission still yields its existing behavior. Documentation belongs in `docs/docs/usage/native-dashboard.md` and `docs/docs/installation/configuration.md`. Safe examples belong in `ha-test/`, including realistic room/Away views under the existing dashboard and a compact representative gallery case only where useful.

## Risks / Trade-offs

- Bluetooth follows a carried device, which can be left behind -> document the selected source and use explicit presence; do not claim physical person certainty.
- Bermuda can fluctuate between rooms -> change only the shortcut, never redirect the page; rely on upstream room selection.
- A renamed/deleted view or area breaks an explicit mapping -> disable it with readable setup feedback and retain the authored reference for repair.
- Local browser storage can be cleared or isolated in another WebView -> explain override scope and fall back to Automatic only when no deliberate stored override exists.
- More on extremely narrow hosts is an exception to always-visible location -> preserve the complete menu and 48px controls, while keeping location pinned at the 320px acceptance width.
- Shared save or local preference could overwrite unrelated data -> retain unknown keys, draft cancellation, stale-save refusal and independently specified preservation tests.

## Migration Plan

1. Compare existing version-1 settings and supported release fixtures with the optional field. No settings version, dashboard-format or HA config-entry bump is intended; omission must yield identical behavior. Keep unknown fields and explicit emptiness through current and retained readers. No discovery regeneration or automatic rewrite.
2. Before user-requested settings writes, retain the exact existing dashboard document using the existing recovery/export mechanism; preflight the draft and use native HA persistence with existing stale-source checks. Browser preferences affect only their own key; never clear unrelated storage. A failed local write retains the session choice and reports it.
3. Verify round trips and refused invalid/stale writes with independent expected documents. If an actual historical conversion is needed, stop and revise the plan with a versioned migration and recovery cases rather than silently expanding scope.
4. Install the completed implementation on disposable `192.168.0.28`, preserving dashboard/helper state. Use `prepareFrontend()` directly for compatible frontend-only work; use `ha:sync` only if changed fixtures/setup require it. Batch final runtime assets and metadata once.
5. Disable the feature for behavioral rollback while retaining its configuration. A package downgrade restores its matching exact saved dashboard and affected local key together when necessary; do not replace user pages with generated defaults or restore over concurrent edits. Keep recovery data through failure and report restore failures.

Verification is a small existing Node-test selection for resolver/partition behavior and settings/local preference preservation, plus user manual checks of movement, shared-device selection and Away taps. No automatic mobile matrix, camera tests or full/upgrade campaign. If publishing is separately requested, run unit-only `verify:publish` and required package metadata gates; reuse development evidence.
