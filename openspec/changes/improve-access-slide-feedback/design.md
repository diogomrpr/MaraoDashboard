# Design

## Context

See `proposal.md` for the agreed behavior. Color and animation are the primary visible acknowledgement, with short labels as support. Design is needed because asynchronous outcomes, error ownership and strict security gestures share the same component.

Current path: `MaraoSlideToOpen` in `MaraoRuntime.js` resets the gesture on release, guards the target, sets `_sending`, animates an inset border for 280 ms and requests heavy haptics. Its render depends on disabled state; subsequent renders can replace the animated DOM. Generated access popups and direct access slides reuse this component. Alarm-grid disarm is a separate guarded consumer through `_alarmOwner`.

`MaraoCards.js` dispatches through `callServiceWithNotification`, which reports `skipped`, `sent`, `error` and `success` outcomes and catches service errors. Its promise can resolve after an error or skipped dispatch. `serviceOutcome` owns existing readable errors and stale-request guards, including parent-card dispatch through `_callService`. Awaiting the promise alone cannot establish success.

`MaraoNavigation.js` already provides heavy HA haptic events plus optional browser vibration. Current source requests these at travel milestones and completion. Tests in `marao-security.test.js` exercise safe native-opener routing and strict-slide consumers; `marao-climate-card.test.js` covers haptic/service helpers. Existing access examples and shared theme tokens can demonstrate this without real hardware.

## Goals / Non-Goals

**Goals:** Feedback shared by every access opening/unlocking slide; truthful asynchronous outcome handling; no duplicate dispatch or weakening of strict gesture guards.

**Non-Goals:** A global request manager, physical-outcome timeout/retry system, new builder settings, automatic opening, new device APIs, platform-specific vibration workarounds or an alarm-disarm redesign.

## Decisions

### Keep a small transient presentation phase on the slider

Use idle, sending and accepted presentation, tied to the current invocation. Sending starts only at the existing `sent` outcome after guards. A quick roughly 200–300 ms blue pulse begins that phase; a restrained shimmer continues while unresolved. Acceptance changes the handle to a checkmark and holds the blue surface for roughly 1000 ms, followed by a short fade back. Disable a fresh gesture while sending and during the short accepted hold; ordinary state/availability guards continue to apply afterward.

Render phase-derived CSS classes and icon/label content rather than attaching the whole confirmation to a disposable DOM node. Start the pulse after the phase is committed to the current render so a disabled-state rerender cannot erase it immediately. Ordinary `hass` updates must not restart timers or replay haptics. Do not add a background fill that progresses during dragging: the existing classic track remains unchanged until valid dispatch.

A border pulse alone was considered and is already too subtle. Persistent green success was rejected because an acknowledgement does not prove physical movement and would compete with existing state colors. Blue marks a command interaction only.

### Observe explicit service outcomes and preserve error ownership

Compose a slider-local outcome observer with the existing `serviceOutcome` error callback for standalone dispatch and the owning card's `_callService` path. If the parent helper needs an observer argument, add only a narrow optional argument at that shared boundary; keep existing callers and intent/target validation unchanged. Each attempt must still create one service call and at most one existing error notification.

Do not infer success from promise fulfillment: the current helper swallows reported errors after notifying. Only `success` starts the accepted phase; `skipped` returns to current idle/availability presentation, and `error` clears blue feedback and leaves existing readable errors authoritative. Keep the alarm-owned branch's PIN, busy and disarm behavior intact without automatically attaching access feedback semantics to it.

### Preserve real state and presentation priority

Feedback belongs to the initiating slider surface. It does not recolor unrelated cards or overwrite the parent entity's state. The current entity label/state remains available; Sending and Request sent describe the request only, with localized semantic feedback for assistive tools. Retain normal open/unlocked colors after the short confirmation. Neutral availability and recognized errors override pulse, shimmer and checkmark.

Use the existing blue theme token with its established contrasting foreground treatment in both themes. Keep the handle/track dimensions and wrapping stable. Under `prefers-reduced-motion`, replace pulse, shimmer and fade with static blue treatment and a pending icon/checkmark. Do not depend on color alone or remove readable error reasons.

### Reuse haptics and contain async lifecycle

Keep existing per-10% travel feedback and one heavy completion event at actual dispatch. No additional success vibration is required, avoiding stacked completion pulses. Browser or Companion support determines physical delivery; source-level event assertions cannot establish that the user's phone vibrates.

Tie timers/outcome observers to request and configuration identity. Removal, reconfiguration, navigation and page hiding clear presentation timers and invalidate late visual effects. Suppress stale accepted feedback on return. An already sent command cannot be cancelled by hiding the page: retain its in-flight dispatch guard until it settles, preserve legitimate error reporting, and never retry automatically. Do not spin animations while hidden or removed. Availability changes suppress blue feedback immediately and remain authoritative if the service later succeeds.

### Preserve saved and generated contracts

Builder, validation and generator continue producing the same access descriptors and targets, including aliases and button/switch/script openers. No saved option, schema version, backend API or migration is introduced. Normal source backups/recovery stay unchanged because this feature performs no persisted writes. Installation is compatible frontend-only work unless implementation reveals a specific necessary backend change; inspect rather than invent that expansion.

## Risks / Trade-offs

- A swallowed service failure could look accepted → drive acknowledgement only from explicit outcomes, asserting errors and skipped calls produce no checkmark.
- A render could erase feedback or replay haptics → store the transient phase on the component and preserve it through unrelated state updates.
- Repeated gestures could duplicate a risky command → retain `_sending`/target guards and block gestures during the brief accepted hold; no new tap or keyboard activation route.
- Late responses could affect another entity → invalidate visual work on lifecycle/configuration changes without claiming an already sent command was cancelled.
- The shared alarm slide could regress → retain a representative PIN/disarm compatibility assertion.
- Physical haptics may remain absent on a client → retain visual feedback and hand physical vibration checking to the user; do not claim a platform fix.

## Verification and handoff

Use the smallest existing safe tests with controlled service outcomes and timers for pending, acceptance, errors, skipped calls, lifecycle invalidation and exactly-once dispatch. Retain focused strict-gesture and alarm compatibility assertions because changes touch a security-control lifecycle. Add no broad browser campaign. Reuse a safe lock/cover/button example in Cases and a realistic access popup; update documentation and inventories only where their contracts/examples actually change.

Manual watch list: visible blue dispatch pulse, restrained shimmer during a real pending request, brief checkmark hold, normal state restoration, error/availability precedence and phone vibration. Install final applicable assets once through the compatible frontend helper on disposable `192.168.0.28`, preserving configuration/helper state. Actual lock, door or gate devices must never be actuated by agent testing.

## Popup presentation follow-up

Recognize existing access sheets from their configured lock/cover entity and nested access-action cards. Keep the saved configuration unchanged. The sheet owns a live native HA state icon and localized state label; matching child actions derive their popup presentation from that sheet context. This preserves raw/generated and legacy layouts, slider request identity and error handling. The close/lock label is enlarged and centered within its existing tap surface.

### Accepted popup refinement

Use a 48px leading decorative action-icon column. Opening actions omit the separate card title and give the remaining row width to the slider. Closing actions balance the leading icon column with an empty trailing column so the label remains centered across the full card. Access headers use a 112px minimum height, 22px vertical and 12px horizontal padding, a leading circular state icon, left-aligned wrapping title/state text and vertically centered header elements. No saved configuration or dispatch contract changes.
