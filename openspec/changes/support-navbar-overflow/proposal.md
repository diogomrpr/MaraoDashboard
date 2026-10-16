# Proposal

## Why

Fixed five- or six-entry limits prevent larger dashboards from exposing all chosen destinations, and wrapping the floating bar consumes scarce mobile height. Marao needs a single-row navbar whose visible capacity follows the available screen width, with remaining destinations in a matching vertical icon menu.

## What Changes

- Remove the product-level count limit on configured navigation lists across builder, JSON schema, validation/generation, generic navbar cards and native HA navbar adapters/editors. Lists still require valid routes; no configured entry is discarded to fit the screen.
- Keep the horizontal bar to one row of full-size controls. When all routes fit, show them directly; otherwise reserve the rightmost slot for More and place the remaining routes in the overflow menu, in configured order.
- Open the menu upward from that rightmost toggle, with its icon column centered on the toggle. Match the navbar's surface, rounded shape, shadow, icon sizing, active circles, spacing, themes and haptics. Keep it within safe viewport bounds and make long menus scroll internally.
- Preserve stable route positions. A selected overflow route remains in the menu; More indicates that the current destination is inside it. Close on selection, second toggle activation, outside interaction, Escape, viewport repartition or leaving/editing the dashboard; restore focus appropriately.
- Retain native shell/preview/admin guards and keep modal sheets above the bar/menu. The administrator Edit control remains separate. Menu toggling and resizing never write configuration or dispatch entity services.
- Keep saved selections, order, explicit emptiness, route fields, native ownership, historical inputs and existing automatic defaults unchanged. Newly pinning/creating destinations follows ordinary builder behavior without a fixed capacity barrier.

This change **supersedes the unimplemented `allow-six-navbar-entries` proposal**, including its six-entry rejection and multi-row design; apply this change instead of implementing both. The old artifacts remain a record of the earlier plan and must not be archived as completed implementation. The user's current instruction also supersedes the existing five-entry policy; align project guidance during implementation.

Non-goals: a second horizontal row, horizontal swipe navigation, an arbitrary replacement cap, automatic pinning of existing unpinned pages, runtime card/action redesign, replacing HA's editor, or applying the independent drag/Monaco changes. “Unlimited” means no product-level route-count ceiling for finite configured lists, not infinite memory or removal of HA transport limits.

## Capabilities

### New Capabilities

None; extend existing navigation and configuration contracts.

### Modified Capabilities

- `navigation-popups`: width-based single-row navigation, anchored vertical overflow, interaction/focus and modal layering.
- `visual-builder`: uncapped ordered navigation selection and editor/schema parity.
- `dashboard-generation`: complete route-list preservation without count-based rejection, while retaining automatic defaults and upgrade ownership.

## Impact

Starting commit: `7f4241b0f36620bc82b28fe73373cec77ed54faf` (v0.8.0). This workflow creates planning artifacts only; preserve unrelated edits and existing proposals.

Observed shared path: `editor-model.js` and `MaraoDashboardPanel.js` cap selection/schema/pinning at five; `page_model.py`, `generator.py` and `native.py` repeat backend caps. `MaraoNativeCardEditor.js` bounds its routes repeater to five. `frontend/MaraoCards.js` rejects a sixth route and wraps its links. It already owns navigation/haptics/fullscreen clearance and modal popup behavior. Native wrappers compile into that renderer and separately guard administrator editing.

Affected-card set: generic/native navbar families and generated navbar/footer consumers on every page; popup sheets and final page controls consume adjacent layering/clearance. Update shared source, labels, catalog/editor assets, safe cases/realistic examples, documentation/policy and component/check mapping. Use browser-native capabilities; add no third-party card, positioning framework or editor dependency.

Compatibility: retain format 2, config-entry version, route/card keys and existing persisted shapes. Repartition only the presentation, never the saved list. Preserve explicit order/names/icons/URLs/unknown fields, zero-through-five sources, legacy automatic five-route defaults, unpinned pages, protected YAML, history and native ownership without migration. Larger lists require the supporting package; rollback restores the matching package and saved baseline together. Release preparation requires scoped preserved-install proof for changed navigation/generation/native contracts, with exact backups/recovery and cleanup.
