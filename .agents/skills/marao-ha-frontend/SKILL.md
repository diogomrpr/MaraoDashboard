---
name: marao-ha-frontend
description: Implement or debug Marao's vanilla JavaScript Home Assistant cards, native card editors, visual builder, shared controls, and mobile styles. Use for frontend_src or shipped frontend changes; preserve HTMLElement and Shadow DOM rather than introducing Lit or another framework.
license: MIT
---

# Marao Home Assistant frontend

Marao uses browser-native custom elements and JavaScript modules. Upstream Home
Assistant uses Lit/TypeScript internally; that does not make those dependencies or
its internal imports part of this project. Follow the existing shared components
and the [dashboard quality guide](../../../docs/docs/development/dashboard-quality.md).

## Trace the visible result

Use the [source and coverage map](../../../openspec/feature-coverage.md) to connect
the requested behavior to its editor option, validation/generation, runtime,
translations, and gallery case. Change the shared owner used by affected cards.
Edit builder source in [frontend_src](../../../frontend_src/) and regenerate its
assets with `npm run build:editor`; do not repair generated editor bundles by hand.
Runtime card sources live in the
[shipped frontend](../../../custom_components/marao_dashboard/frontend/).

## Custom element and state decisions

- Validate configuration in `setConfig` or the existing shared validator. Keep
  configuration distinct from HA state and preserve names, defaults, and unknown
  keys across editor round trips.
- Treat `hass` updates as frequent. Update the affected DOM without replacing an
  active input, gesture target, or editor model. Keep focus, selection, scroll, and
  native touch behavior intact while authoritative state changes.
- Keep card-specific state on its owner. Preserve intentional shared climate
  request state across duplicate controls; do not generalize it into a global
  optimistic-state system. Follow the
  [state/action contract](../../../openspec/specs/entity-state-actions/spec.md).
- Dispatch services from completed interactions, not rendering. Check the actual
  target's availability and supported capabilities. A visible control alone does
  not prove correct targeting, cancellation, or exactly-once dispatch.
- Own listeners, timers, subscriptions, and requests through the element lifecycle.
  Clean up on removal; ignore stale async results after configuration/target changes.
  Clear pending/loading feedback when the operation settles, while retaining readable
  service errors until a successful explicit retry or configuration replacement.
- Native card editors emit the complete updated config through `config-changed`
  with bubbling and composition across Shadow DOM. Preserve unrelated fields;
  retain the builder's existing draft/save mechanism for panel editing.

## Rendering and interoperability

Use Marao's theme tokens, localized labels, existing semantic controls, and shared
popup/slider/navbar behavior. Keep Monaco's internal presentation stock. Apply
Marao's mobile geometry and interaction rules instead of upstream desktop, visible
focus, tooltip, or third-party-card defaults.

When changing a custom-card API, verify the
[official card contract](https://contributors.home-assistant.io/frontend/custom-ui/card/)
and the supported installed frontend. Keep the custom element name, `custom:`
type, resource URL, and relevant editor/sizing APIs aligned. HA internal component
implementations are references, not stable external APIs to import from `src/`.

## Verify proportionally

Follow `AGENTS.md`'s minimal verification policy and the
[testing skill](../marao-testing/SKILL.md). Routine visual and real-device checks
belong to the user. Use the smallest existing check for changed nontrivial logic;
agent browser inspection is optional. If a requested stream plays, ordinary
playback acceptance is satisfied. Do not add automation, layout/theme matrices,
fixtures or timing investigations without a reported defect, concrete risk or
explicit request.

Install the final applicable changes on disposable HA `192.168.0.28` before calling
the task done, even when the user handles all visual testing. Batch edits and
normally sync once at the end. Use `prepareFrontend()` from
`ha-test/prepare-frontend.js` for compatible frontend-only sync without a browser;
use full `ha:sync` only when backend/fixtures/setup require it. Verify installation
through the helper's served-asset/readiness checks, leave the changes installed,
and report any blocked installation as not ready for test. Browser overrides and
local builds do not satisfy installation. Instruction-only edits need no sync.

When a browser check is needed, use `npm run ha:preview -- --component <ids> --watch`
on compatible disposable HA. Inspect the requested behavior once, leave successful
assets installed and clean up temporary helpers. Publication/upgrade gates remain
separate. Hand off promptly with a short manual watch list and honest limitations.

[Community sources and adaptations](references/sources.md) are for skill maintenance;
do not load all upstream references for an ordinary frontend task.
