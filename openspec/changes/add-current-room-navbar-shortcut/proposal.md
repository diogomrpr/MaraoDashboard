# Proposal

## Why

Marao's navbar currently contains fixed destinations, so users must find their room manually even when Bermuda already reports it. A permanent location shortcut can take each signed-in user to their current room without moving the remaining navbar controls when location is missing or they leave home.

## What Changes

- Add an opt-in Current room shortcut in a reserved navbar slot, shared across views but resolved independently for each signed-in HA user.
- Automatically match the HA account to its linked `person.*`; allow a browser-local person override for shared devices and an explicit return to Automatic.
- Configure one Bermuda Area sensor per person and map stable HA area IDs to existing dashboard pages.
- Show the detected room's name/icon and navigate on tap only. Retain an away-style placeholder when no usable room destination exists.
- Allow an optional existing Away page, enabled only when the selected person's authoritative presence confirms they are outside home. Unknown/unavailable location is not evidence of being away.
- Add native settings, localized identity preferences, documentation and narrowly scoped unit coverage.

Confirmed decisions: separate owner accounts on phones, automatic account identity, manual shared-device override, optional Away page. Proposed defaults: existing room pages rather than popups, first-slot placement, explicit person-to-sensor and area-to-page setup. These defaults are planning choices, not claims of additional user confirmation.

## Capabilities

### New Capabilities

None; this extends existing navigation ownership.

### Modified Capabilities

- `navigation-popups`: fixed location slot, automatic/local identity resolution, Bermuda area navigation, optional Away destination and lossless settings.

## Impact

Affected card set: `custom:marao-navbar-card` and its automatic dashboard-wide surface. Shared consumers: route partitioning, active-route state, native settings validation/save, main-page shortcuts and navbar lifecycle. Existing People/header cards remain consumers of HA presence without inheriting room tracking.

Runtime work belongs in `custom_components/marao_dashboard/frontend/MaraoNavigation.js`; editable settings/bootstrap source is under `frontend_src/`. Reuse native HA selectors, existing Marao sheets, theme tokens and English/Portuguese localization. No Bermuda API calls, third-party frontend dependencies, tracking history, device fingerprinting, automatic redirects, generated Away content or security actions are included.

Compatibility is additive: absent configuration preserves today's navbar exactly; routes, explicit emptiness, order, opaque options and unrelated dashboard content remain intact. No legacy source/generator migration or configuration-entry version change is intended. Supported released settings and retained historical rendering must be checked during implementation; any discovered need for a breaking format conversion requires revising this plan first. Existing native-editor work is a dependency to preserve, not part of this change's implementation claim.
