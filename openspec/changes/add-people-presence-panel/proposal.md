# Proposal

## Why

Marao's header can display one person's state, but the card catalog has no dedicated panel for seeing where several people are together. Add an at-a-glance people card so users can see who is home, away, or at a named place without opening individual entities.

## What Changes

- Add **Marao People**, an informational card with an explicitly selected, ordered list of Home Assistant `person.*` entities.
- Show each person's name, existing HA picture or fallback icon, and visible location text: localized Home/Away or the reported named place, such as Work. Update from HA state without polling or calculating locations.
- Keep loading, missing, unknown and unavailable readings distinct. One unavailable person must not hide the remaining people's usable readings.
- Offer native visual configuration for selecting, ordering, removing and locally naming people, with YAML round-trip preservation. Start with an empty list; never add people automatically to a saved dashboard.
- Use Marao's mobile typography, light/dark tokens and wrapping layout. The panel displays all selected people directly; it needs no detail popup or action to reveal their presence.
- Add a small fictional example on the disposable dashboard's Home view and a focused `card-test` example, plus usage documentation and targeted unit checks.

**Confirmed scope:** the user selected “Home, away, or a named place such as Work” on 2026-10-31.

**Planning assumptions:** “panel” means an addable card on an existing dashboard view, not a new HA sidebar panel. Membership uses HA People, which already combine device trackers; individual tracker entities are not a second input mode. The list is informational, with no new tap/hold actions.

**Non-goals:** maps, coordinates, addresses, routes, history, notifications, arrival predictions, tracking setup, person management, discovery-based membership, automatic insertion into existing dashboards, and a separate dashboard/editor/backend.

## Capabilities

### New Capabilities

None; extend the existing card and native editing capabilities.

### Modified Capabilities

- `card-behaviors`: explicit multi-person presence, readable named places, independent availability, mobile presentation and read-only state handling.
- `native-dashboard-editing`: People card selection and lossless visual editing of its ordered membership.

## Impact

Planning baseline: commit `cf4662333dd6223c761e698f4131a197d67e19a7`, working package version `0.24.4`. Pre-existing untracked duplicate `dist/` assets and `add-automation-schedule-card` planning artifacts are unrelated and remain untouched.

Affected card set: new `md_people_card` / `custom:marao-people-card`. Shared consumers requiring preservation review are native catalog registration, composition/validation, collection editing and the header's existing person reading. Scene collections, entity groups and other informational cards retain their existing contracts.

Implementation reaches the frontend catalog, shared card composition/model, native editor and sizing, shipped vanilla JavaScript runtime and localization, documentation, focused frontend tests and disposable examples. No new dependencies or Python endpoint are needed. The completed `use-home-assistant-dashboard-editor` change defines current authoring; historical builder references in baseline documents do not reopen that workflow.

Compatibility is additive. Reviewed local release tag `v0.24.1` uses the same native descriptor/composition and patch-only editor contracts. Existing native cards, source formats 0/1/2, legacy conversion, explicit emptiness, unknown fields and generated output for existing inputs remain unchanged; no migration or version bump is proposed. New People cards require a package containing this family. Saved configuration contains only entity references and display options, never copied presence state or coordinates.
