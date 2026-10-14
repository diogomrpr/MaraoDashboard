# Design

## Context

See proposal.md for the diagnosed gaps. The editor catalog, ordered page validators and generator share format 2. MaraoCards owns cards and hold lifecycle; MaraoDashboard owns the strict slide. Generated popups already provide inert background, focus and scroll containment.

## Goals / Non-Goals

Deliver safe native alarm/opener controls and a private validated import. Do not connect to the original instance, copy its PIN, implement unrelated queued features, publish, or introduce a third-party card.

## Decisions

- Generate an alarm popup containing an internal `hc_alarm_controls_card` rendered by MaraoCard. Reuse its hold/error/availability helpers and popup lifecycle; do not expose raw alarm services as ordinary tappable actions.
- Derive arming modes from supported_features and PIN requirements from code_format/code_arm_required. Keep a masked field mounted across ordinary state updates; clear transient input on action attempts, entity/config replacement, popup closure, removal and disconnect. Gate action completion against the latest target and state.
- Add `hc_access_slide_action_card` to the catalog. Derive a restricted native opener service from the entity domain; validate explicit action_service overrides against that mapping. Existing raw lock/cover slides retain their service and localized labels.
- Keep format 2 and existing unknown configuration unchanged. Existing alarm cards gain a stable generated popup, while explicitly authored tap actions remain authoritative. Test supported historical source conversion against independent unchanged expected JSON and new generated-sheet expectations.
- Generated editable alarm sheets use the owned page/card identity. Keep pre-existing authored `#alarm-…` navigation fragments available for protected custom YAML rather than reserving that whole prefix during validation.
- Resolve the mounted main include graph privately. Inventory distinct card bindings/actions, use explicit selections and stable IDs, consolidate equivalent pages, replace external cards with Marao/native content and report uncertain media source names/presentation differences. Write output only under ignored .ha-test/imports.

- Preserve native vacuum segment command/params using optional action data, while retaining the default shorthand and enforcing the selected vacuum target. Recognize the original dishwasher vendor attention states in shared warning/readout logic. These additive options stay in format 2 and round-trip unchanged.

## Risks / Trade-offs

- PIN leakage in service errors → sanitize the action failure before shared notifications and clear input immediately after submission.
- Button timestamps mistaken for door state → label the opener by its action/target without claiming open/closed.
- Legacy missing templates → preserve observable bindings/options, document unavailable template-specific behavior, do not invent HA entities.
- Media source names are unavailable offline → retain the user's six named defaults and flag confirmation after import.

## Migration Plan

No JSON conversion or version bump is required. Add baseline compatibility assertions before UI validation. Disposable deployment uses existing backup/preflight/recovery tools and safe gallery entities, with the original source read-only. Any rollback restores the matching package and saved owned data together. Release-only preserved-install proof and publication gates are outside this request.
