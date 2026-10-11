# Design

## Context

See [proposal.md](proposal.md) for motivation and the three capability deltas for acceptance behavior.

The user has confirmed that the noticeable delay affects mode/on-off changes. Treat those transitions as the primary reproduction and acceptance path; temperature accumulation is a separate source-reproduced issue, not a claim that the user experiences delayed temperature changes.

The current path is builder entity configuration → `generator.py` climate cards and mode sheets → shared `MaraoCard` rendering and action handlers in `MaraoCards.js` → `callServiceWithNotification` → Home Assistant → a later `hass` state update. Builder source lives in `frontend_src/MaraoDashboardPanel.js` and `editor-model.js`; no additional setting is needed. Generated mode sheets reuse the normal thermostat card, so an instance-only preview would become inconsistent when a sheet opens.

`_range`/`climateTarget` read reported attributes; mode styling/buttons read reported entity state. `_adjustNumber` computes each temperature request from those same reported attributes. `_setClimateMode` dispatches without updating the display. The single-mode default goes through `climateDefaultAction` and `performAction`, which must not be missed. A local simulation against the current class, without Home Assistant or physical actions, reproduced three increases from 21 producing three requests for 21.5.

The shared service helper checks connection/target availability, disables duplicate native error notification, and catches errors into one readable notification. A resolved promise therefore does not distinguish a skipped, failed or successful request. The implementation must expose the actual outcome to climate reconciliation without changing existing callers' error behavior. Home Assistant distinguishes [service responses and entity state-change events](https://developers.home-assistant.io/docs/api/websocket/); a successful service response is not a matching state report.

The existing safe climate fixture writes state immediately. Existing frontend tests cover bounds, range targets and service notifications; existing live checks exercise climate steppers and mode sheets but lack delayed/rejected confirmation. There is no evidence of a Marao dispatch debounce. Device/transport timing and Apple Home's implementation remain unmeasured.

## Goals / Non-Goals

**Goals:** Immediate, coherent mode/on-off feedback as the primary fix; accumulated rapid temperature steps for the separate discovered defect; honest confirmation and failure handling using existing controls and service dispatch.

**Non-Goals:** Faster physical equipment, inventing measured temperature or `hvac_action`, optimistic aggregate summaries, a global state engine, new backend APIs, polling, retries, new settings or a new browser/test framework. Arbitrary scripts and unknown custom climate actions do not invent a preview.

## Decisions

### 1. Add a small climate-only requested-settings overlay

Keep an ephemeral entity-keyed record beside the existing card runtime containing only requested mode, requested single/range target, per-setting request generation, expiry and subscribers. Overlay these settings when rendering climate controls and computing the next step. Never mutate `hass.states` or clone its entity into an apparent authoritative record. Measured temperature, actual activity, availability and overview summaries continue to use reported state.

Share the overlay across duplicate cards; subscribe/unsubscribe with existing card configuration/lifecycle. Closing a popup must not erase a remaining card's request. Release listeners and timers when no relevant cards remain, on target changes, and on disconnect/target loss. No storage survives reload. Instance-local values were rejected because popup/repeated-card views would disagree; modifying global HA state would mislead unrelated cards.

### 2. Reuse the stepper and central service path

Feed `climateTemperatureChange` an effective requested mode/target when pending, preserving existing attribute aliases, finite-value checks, bounds, step rounding and range-gap behavior. A mode request that changes the single/range target shape must use available reported fields for the new shape and clear incompatible previews; never fabricate a missing target. Preserve unitless values, 48px buttons, strong haptics and focus during immediate re-render. Invalid or unavailable interactions create neither a service call nor a preview.

Apply feedback at the existing native climate service boundary for `set_temperature` and `set_hvac_mode`, covering dedicated handlers and direct default/configured native climate actions. Only concrete valid settings for explicitly resolved climate entity targets receive previews. Preserve action vocabulary and arbitrary custom actions; do not infer what a script, navigation, area/device-only target or toggle will do.

Extend `callServiceWithNotification` minimally with opt-in outcome reporting for climate requests (sent/success/error/skipped), preserving its current return/error contract and the single centralized `hass.callService` site. Availability is checked before preview and again at dispatch. Non-climate consumers keep the existing path. An inferred success from a fulfilled promise was rejected because errors are already caught in this helper.

Publish the valid preview synchronously before awaiting the service and dispatch each interaction exactly once using existing native payloads. No debounce, queue, coalescing or automatic retry is introduced; rapid taps produce absolute successive requested targets. Service completion order is not used to determine which user intent is latest.

### 3. Reconcile individual requested settings with bounded lifetime

For each setting, a newer interaction replaces its requested value, generation and 30-second deadline. Treat a low/high pair as one setting. Mode and target can remain independently pending. Match targets using existing numeric normalization/precision and both range endpoints, rather than formatted text. A service acknowledgement alone leaves pending feedback intact. Unrelated `hass` updates do not refresh deadlines.

Matching reported settings clear their pending overlay. While pending, differing reports remain the underlying reported values but do not overwrite the displayed latest request: these can be old command echoes or changes from another controller. Current-request rejection restores the latest reported setting immediately. An older request's error is still reported once but cannot erase a newer generation. Timers and late callbacks must also compare generations; an obsolete timer must not affect a new request.

At 30 seconds after the latest interaction for a setting, clear an unconfirmed preview and show localized “Change not confirmed” feedback through the existing notification mechanism. A late matching state update thereafter renders normally. Disconnect, missing/unknown/unavailable target clears previews immediately and retains native connection/unavailable treatment. Do not label a merely slow confirmation as a stale/offline device. This fixed interval is an initial product choice, not a user-facing setting.

A project-wide reconciliation engine and persistent histories were rejected; this record handles only the two requested climate settings. Available state is a precondition, not a guarantee that a command will succeed.

### 4. Keep pending feedback compact and localized

Use the existing state/control layout and Marao theme with a short English/Portuguese updating indication and an internal accessible status. Requested mode may drive the existing mode-selection treatment, clearly marked pending. Do not add a new busy screen, disable rapid valid stepping while pending, show units, shrink touch controls, or add focus-only styling. Preserve actual readings and essential text at all mobile text/zoom profiles. Reuse current tokens rather than redesigning card colors.

### 5. Extend existing fixtures and checks at the failure boundary

Add deterministic test-only climate behaviors for delayed service acknowledgement, delayed state confirmation, rejected service, no confirmation and differing reported target. Preserve immediate fixtures and support separate instances plus single/range targets. Add materially distinct cases to `ha-test/cases.json`/`cases.js` and the existing fixture-generation path, with a representative delayed thermostat on a realistic generated climate page. Keep all fake code outside the shipped tree.

Use existing Node tests for rapid taps, bounds, mode/target interactions, per-field generations, rejected/skipped calls, timer cleanup, duplicate-card lifecycle and out-of-order responses. Use controlled clocks for expiry rather than waiting 30 seconds in unit tests. Extend existing live Playwright checks to measure immediate display before the fixture reports, dispatch counts, eventual confirmation and failure recovery. Retain focus/popup behavior and service notification assertions.

Start live validation with off → supported mode, supported mode → off and supported mode → another mode while acknowledgement or state confirmation is delayed. Verify the selected mode, label and pending treatment immediately; verify that measured temperature and actual activity remain reported. Then validate the independent rapid-temperature-step path.

During implementation update the authoritative-display wording in `AGENTS.md` and the quality guide for this explicit climate-only exception. Keep baseline specs unchanged until verified completion and archive/sync. Builder/generator templates continue their existing schema; change their code only if an inspected path actually needs adaptation.

## Risks / Trade-offs

- A device can reject a command or disconnect after an available check → retain guards, pending indication, readable errors, immediate invalidation and bounded fallback.
- Concurrent commands can complete or be reported out of order → generations protect the latest display; reported state remains authoritative after reconciliation. No client claim of physical ordering or successful equipment operation is made.
- A different controller changes a setting while Marao is pending → its report is retained underneath the preview; matching latest intent or the bounded deadline restores reported display. The maximum masking interval is 30 seconds after the latest local interaction.
- A very slow device confirms after the deadline → show the not-confirmed message honestly, then display late reported state normally. This change addresses feedback, not device latency.
- Extending the shared service helper can affect non-climate actions → preserve default behavior and verify every consumer family, including stricter access/security paths, rather than adding another service dispatcher.
- Immediate renders can lose focus or rapid taps → preserve existing focus restoration and test repeated touch input through the same numeric control and sheet.

## Migration Plan

No configuration, entity data, credentials or saved-dashboard migration. Preserve existing uncommitted work. Implement and deploy only to disposable `192.168.0.28` with safe fake climate entities; refresh the frontend and reconcile from reported state.

Run focused checks after each batch. After the last edit and focused check, visually and interactively inspect every affected card on the disposable dashboard, including shared service consumers if that helper changed. Check light/dark, 320px and representative iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold plus 200% text, clipping, pending/error readability, focus and control alignment. Run the icon-only alignment check if an icon-only shared layout is affected. Fix defects and repeat the final inspection.

Rollback consists of reverting this runtime/translation/fixture change and reloading the prior frontend; no persisted requested state needs repair. Publishing is separate and requires the existing disposable-instance publication gate and matching CI checks. Keep the unconfirmed native reconnect issue in its separate change.
