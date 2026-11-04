# Design

## Context

See [proposal.md](proposal.md) for the requested result and [the value-control delta](specs/value-numeric-controls/spec.md) for acceptance. Inspection started at `0d5267902da0b2ab595db77af149a7a4b2f64da6` with no tracked changes. Existing unrelated proposals remain outside this change.

`MaraoSlider.js` immediately writes confirmed/target fractions to CSS variables. `MaraoCards.js` reads cover `current_position`, keeps user destinations in `_sliderTargets`, and preserves the native input during a drag. Outside that drag, `_setMarkup()` can replace the slider branch and `_render()` destroys/rebinds its controller. Both the drawing owner and element lifetime need to survive compatible position updates for interpolation to work reliably.

The helper also serves light brightness, fan speed and the light-color picker's brightness range. Cover-backed ventilation already uses cover position semantics. Keep smoothing explicit at the internal caller boundary for cover position controls; preserve default immediate behavior for the other consumers and leave strict access slides separate.

## Goals / Non-Goals

**Goals:** Animate only presentation toward confirmed readings, retain stable controls across compatible updates, and keep native input and existing action guards authoritative.

**Non-Goals:** No motion estimator, polling, travel-time setting, global pending-state system, third-party animation library, new card option, or alteration of existing fill/target geometry. Widely spaced readings can still produce pauses after the bounded glide.

## Decisions

### 1. Keep reported, requested and drawn values separate

| Value | Owner and use |
| --- | --- |
| Confirmed position | Latest valid HA `current_position`; supplies reported/accessible state, data attributes and availability decisions immediately. |
| Requested target | Native input and existing `_sliderTargets`/gesture logic; supplies the service payload and independent target thumb. |
| Drawn position | A per-control fractional presentation value; supplies only SVG/CSS geometry during interpolation. |

Animation frames update drawing variables only. They do not write HA state, replace logical input values, emit input/change events, update saved configuration, call services or generate haptics.

Pass an internal cover-animation mode through the existing slider binding/update boundary, preserving its existing numeric update arguments and default immediate behavior. The caller must explicitly distinguish a thumb following current position from an independent requested target, using existing target/gesture state rather than guessing from equal numeric values.

When the thumb follows current position, draw it from the same interpolated value as the fill. When a user target exists, draw that thumb immediately at the target while the confirmed channel can continue smoothing independently. Keep `min(currentFraction, targetFraction)` fill containment. In particular, a lower requested target can already cap the visible fill; this change does not add a second position marker or redefine that existing relationship.

Alternative considered: animating the range's logical value. That would mix presentation with input/dispatch data and could move a requested destination while the user interacts.

### 2. Use one bounded animation per mounted slider

Keep a single `requestAnimationFrame` owner in `bindSlider()`, with the latest confirmed endpoint, current drawn value, segment start/time and prior changed-report time. Initialize directly from the first valid value. On a changed report:

- Sample the current segment's drawn value at the new report time before retargeting, preserving positional continuity.
- Start a linear segment from that value to the latest confirmed endpoint. Linear movement avoids repeated easing pulses and overshoot.
- Use 300 ms for the first changed report; thereafter use 80% of the interval since the previous changed reading, clamped to 200–500 ms. This is a local timing rule, not an estimate of physical blind speed.
- Replace the previous endpoint instead of queuing reports. Unchanged values and unrelated broadcasts do not restart the segment or update its cadence.
- Complete exactly at the endpoint, then release the frame request. No new position is inferred while waiting for another report.

Keep normalized fractions rather than measured pixel widths, so existing CSS geometry handles resizing/rotation. Clamp drawing values to the supported range and retain the rounded track and target cap.

Alternative considered: a CSS-only transition. Current element replacement prevents reliable continuity, and a controller can explicitly retarget, separate logical values and cancel stale work. A global animation manager or spring model is unnecessary for this short bounded motion.

### 3. Retain the slider branch and its binding during compatible updates

Extend the existing retained-surface path in `MaraoCards.js` to keep the connected native range and its SVG drawing when entity/role, range bounds/step and applicable capabilities remain compatible. Preserve the ancestor branch as needed so the range is not detached/reparented during an active interaction. Refresh labels, icons, actions, disabled state and surrounding content normally; retaining the range must not freeze the rest of the card.

Reuse the same slider controller when its input survives. Do not destroy/rebind it after every render. Send new confirmed/target values to that owner explicitly and keep the current service context fresh. Preserve the existing active-drag refresh behavior through the same update path. An incompatible entity/configuration/capability change disposes the old binding and initializes the replacement directly from its own data.

This is a narrow extension to the current shared rendering/control lifetime, not a general DOM renderer. Verify both idle updates and an update arriving during a drag; stable input identity alone does not prove the SVG or animation owner survived.

### 4. Give direct input and lifecycle events priority

Pointer/keyboard input immediately owns the target channel and cancels any old thumb-following interpolation that could fight it. Preserve native scrolling/drag behavior, heavy interaction haptics and one final service call. Continued HA readings may smooth the independent current channel, subject to the target cap. Gesture cancellation restores the existing confirmed target behavior without dispatching a partial value.

Use actual current HA/input data for all dispatch calculations. No animation timing or displayed intermediate percentage participates in `_setRange()`.

Cancel pending frame work on binding destruction, entity/configuration replacement, invalid position/capability, unknown/unavailable state, disconnection, hidden document/page or removed popup/control. Use existing card visibility/lifecycle ownership where available; any binding-owned listener must be removed with it. Keep cancellation distinct from gesture completion so disposal cannot issue an action.

On recovery/visibility restoration, synchronize directly to the latest confirmed state and reset cadence; do not replay hidden updates. Honor `prefers-reduced-motion` on initial binding and preference changes: settle the drawing immediately and avoid positional animation while it is active. Duplicate controls retain independent local lifetimes and never share another card's pending target.

### 5. Preserve the existing end-to-end contracts

| Surface | Required handling |
| --- | --- |
| `frontend/MaraoSlider.js` | Own bounded interpolation and cleanup; preserve existing geometry, range semantics and default immediate updates. |
| `frontend/MaraoCards.js` | Enable the mode for ordinary cover positions and cover-backed ventilation; retain compatible input/SVG/controller, current state refresh and dispatch guards. |
| Native composition and group/popup hosts | Continue using the shared runtime; removal/closure disposes animation, and no host-specific smoothing copy is added. |
| Light, fan-speed and `MaraoLightColor.js` consumers | Retain current behavior through the default helper mode; inspect representative calls and existing regression assertions. |
| Editor, catalog, validation, templates and generators | No new persisted setting or generated field; existing card descriptors remain compatible. Backend/migration code and historical fixtures need no changes. |
| Theme and translations | Reuse current fractional SVG geometry, touch size, palette and localized labels; no new user-facing control text is needed. |
| Documentation and examples | Update Cover/Fan notes in `docs/examples/manifest.js`, regenerate corresponding references, and clarify confirmed-value presentation in the quality guide/coverage notes. Reuse existing opening/closing/ventilation examples and safe HA cover helpers. |
| Frontend build/install | Rebuild owned assets using current tooling and install the final applicable frontend once on the disposable instance. |

### 6. Verify the animation contract with existing tests

Extend `tests/frontend/marao-slider.test.js` using a deterministic fake frame/time source. Check an intermediate frame and exact endpoint, retarget/reversal from the currently drawn value, unchanged-report deduplication, immediate independent target input, no animation-generated calls/haptics, reduced motion and disposal. Reuse existing commit/cancel checks; do not use real-time sleeps or create a separate browser harness.

Extend the existing value-slider cases in `tests/frontend/marao-card-visibility.test.js` to prove that input, SVG and controller identities survive compatible idle/dragging cover updates, relevant labels/disabled state still refresh, and invalid/lifecycle changes stop old work. Cover the ventilation equivalent and one immediate-mode shared consumer through the same narrow assertions where useful.

Review a behavior-tier selector plan for `slider` and `cover` from the implementation snapshot and actual shared-file hunks. Run the small changed-contract checks serially; a broad mapping does not mandate all mapped suites. Existing safe gallery and realistic room controls suffice unless a specific missing demonstration is found. Browser inspection is optional; one targeted visit is enough if selected. No full suite, geometry/text/theme matrix, camera playback or real household device operation is implied.

## Risks / Trade-offs

- **A render destroys an otherwise correct animation** → Verify connected input, drawing and binding identity across consecutive reports and state changes, not just computed fractions.
- **Animated values leak into a user command** → Keep logical values separate and assert original final input plus exactly one completed dispatch.
- **Repeated broadcasts keep the indicator moving indefinitely** → Retarget only changed readings and release the frame owner at a fixed confirmed endpoint.
- **Smoothing appears behind the actual report** → Cap each segment at 500 ms, keep reported/accessible values authoritative and document the small presentation delay.
- **The device reports infrequently** → Smooth only the received step; hold after it finishes. Actual device reporting cadence remains unmeasured and is not changed by this work.
- **Retained controls show stale surrounding state** → Keep state labels, action availability and service context on the normal refresh path while preserving only the compatible slider branch.

## Migration Plan

No persisted values, defaults, option fields, card identifiers or generated structures change. Existing released configurations use the same `current_position`, user target and slider descriptors, so no migration/version conversion, saved-data rewrite or historical expected-output change is needed. Animation state is disposable memory owned by the mounted control.

After separately authorized implementation and essential local checks, batch-install the final compatible frontend through `prepareFrontend()` directly on disposable `192.168.0.28`, without opening a browser merely for installation. If a genuinely necessary fixture/backend change makes full preparation necessary, use one `ha:sync` instead. Preserve test configuration/helper state, verify current assets/readiness, leave successful assets installed and report any installation failure as not installed / not ready for test.

The normal frontend rollback has no data conversion to undo. If a deliberate safe test also changes persisted configuration, retain exact package/configuration backups and restore matching affected state together while protecting concurrent edits. This proposal workflow writes planning artifacts only and performs no build, installation or runtime testing.
