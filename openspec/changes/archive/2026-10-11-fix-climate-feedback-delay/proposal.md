# Proposal

## Why

The user confirms that thermostat mode/on-off changes have the noticeable delay: Marao waits for Home Assistant to report the new mode before updating its display. Separately, rapid temperature taps lose intent: a local reproduction using the current card sent 21.5 three times after three increases from 21, because each tap read the same reported target.

## What Changes

- Prioritize immediate feedback for requested HVAC modes, including on/off transitions, with a compact localized pending indication until Home Assistant confirms them. Apply the same requested-setting mechanism to temperature targets to correct the independently reproduced rapid-tap defect, consistently across duplicate thermostat cards and their mode sheets.
- Calculate subsequent temperature steps from the latest requested target, preserving native bounds, step size and dual-setpoint separation.
- Keep measured temperature, actual heating/cooling activity and availability authoritative. An optimistic requested mode does not prove the equipment is running.
- Reconcile confirmation, rejection, disconnect/unavailability and an unconfirmed request after a bounded interval; prevent older responses from undoing newer input. Retain exactly one native service dispatch per accepted interaction and the existing readable error path.
- Add controlled delayed and failing safe climate fixtures, gallery examples and focused checks using existing tooling.
- During implementation, align the repository contract and quality guide with this explicitly requested, climate-only exception to authoritative display. No project-wide optimistic state system is proposed.

The user's Apple Home comparison motivates immediate feedback, but its app behavior and the real device's timing have not been independently verified. Source inspection and a local simulated service reproduction establish the Marao feedback and rapid-step defects; they do not isolate device or transport latency. The user's clarified symptom is mode/on-off delay, not temperature-change delay. Temperature stepping remains an independently discovered defect in this change.

## Capabilities

### New Capabilities

None; use the existing control and action capabilities.

### Modified Capabilities

- `card-behaviors`: Immediate requested climate settings, shared-card consistency and bounded reconciliation without inventing measured state.
- `value-numeric-controls`: Climate stepping accumulates from the latest requested target while confirmation is outstanding.
- `entity-state-actions`: Permit explicit climate request previews while retaining authoritative observations, availability guards and single-dispatch error handling.

## Impact

Implementation reaches `custom_components/marao_dashboard/frontend/MaraoCards.js`, runtime English/Portuguese localization in `MaraoDashboard.js`, existing climate/frontend and live browser checks, `ha-test/custom_components/marao_test_climate/`, canonical Cases fixtures and representative generated climate pages. Review generator/builder/template contracts for consistency; no new user configuration or integration API is expected. Update `AGENTS.md`, the dashboard quality guide and relevant development documentation during implementation, preserving unrelated work.

The affected-card set for these planning files is **empty**. The planned UI set is every `hc_climate_card`, including single/multiple-mode, single/range-target, off/active, unknown/unavailable, custom actions and duplicate cards in mode/room/task sheets and generated pages. If the shared service helper is extended, its consumers must also be checked: ordinary action/toggle cards, room light actions, light/fan/cover sliders, numeric/Wallbox controls, selectors/scenes, media/remote, vacuum and security/access actions. Their behavior must remain unchanged.

No new dependencies, framework, polling, silent retry or paid service. Other card families do not gain optimistic state; measured readings, overview aggregates and security actions remain authoritative. Investigations and future validation use only safe fixtures on disposable `192.168.0.28`; no access to the other installed instance or Apple Home is authorized. This proposal does not implement, deploy or publish a release.
