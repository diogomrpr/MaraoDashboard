# Design

## Context

See [proposal.md](proposal.md) for the problem and agreed Apple-style direction. This design is needed because feedback crosses several independently rendered Shadow DOM components.

Planning baseline: `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84`, with substantial pre-existing frontend, floor-plan, media, documentation and build-output changes. This change owns only its planning directory at proposal time. Implementation must take a fresh baseline and preserve concurrent work.

The source currently has several separate mechanisms:

| Owner | Current mechanism / integration point |
| --- | --- |
| `MaraoCards.js` | `cardStyles()`, generic button `:active`, `_bindTapAction()` and `_bindHoldAction()`; nested controls and popup close/retry buttons |
| `MaraoNavigation.js` | Navbar and maintenance/overflow button styling; navbar refresh has a separate hold owner |
| `MaraoDropdown.js` | Shared trigger/option markup and binding, including floating popover options |
| `MaraoFrigateEventsCard.js` | Separate event, filter, more, retry and header button styles |
| `MaraoFloorPlanCard.js` | Separate buttons and spatially positioned markers; marker `transform` already anchors it to the floor plan |
| `MaraoSlider.js`, `MaraoLightColor.js` | Existing direct-manipulation owners; their gestures must not enter ordinary tap feedback |

Card/navigation reduced-motion CSS currently disables transitions but leaves active scale transforms. Simply increasing scale would make minimum-size surfaces smaller and could displace floor-plan anchors. Existing tests in `tests/frontend/marao-card-visibility.test.js` cover hold cancellation/completion and preserving the invoking control before a popup opens; reuse those boundaries.

## Goals / Non-Goals

**Goals:** One small presentation primitive, stable interactive geometry, no effect on action timing, and deterministic cleanup across re-rendering and navigation. Apply the same runtime treatment in generated, native, popup and builder-preview hosts.

**Non-Goals:** A new gesture-dispatch framework, global pending-state system, persistent motion preferences, platform detection, or changes to the specialized safety gestures. Scope exclusions are in the proposal.

## Decisions

### 1. Share presentation and lifecycle without owning actions

Introduce a dependency-light runtime module, provisionally `MaraoPressFeedback.js`, exporting shared CSS/tokens and an opt-in feedback binding with explicit surface/content targets and a disposer. Existing renderers retain action dispatch, availability checks, focus restoration and haptics. The feedback helper emits no service calls or vibration.

Bind at each existing component's lifecycle boundary and use the event path to select the innermost eligible target. Register exact surfaces rather than traversing arbitrary Home Assistant or embedded-card internals. Separate floating dropdown options receive the same shared styles/binding even outside the trigger's subtree. Disable/target changes clear local feedback before reusing a control. Dispose listeners, timers and animation work when a surface is replaced or disconnected.

Alternatives: independent CSS changes preserve the current drift; a new global action manager would broaden scope and risk duplicate dispatch. A shared local helper supports quick taps and cleanup without either problem.

### 2. Highlight the fixed surface and move only noninteractive content

Use a rounded, pointer-transparent highlight layer behind readable foreground content and above the surface background. Consume Marao theme colors; begin with approximately 8% neutral contrast tint, adjusting within a restrained range for actual background contrast. Do not use active/success colors for this transient state.

Keep outer buttons and card surfaces fixed. Move a dedicated noninteractive icon/content wrapper slightly inward; begin with approximately `scale(.98)`. Whole-card feedback moves its main noninteractive icon or a small content group, never the entire card subtree. Text-only actions use their content wrapper. Existing positioning transforms, including floor-plan marker translation and popup positioning, remain on their original owners. Independently interactive children never inherit the transform.

The fixed surface remains visibly at least 48px, preserving circular/rounded geometry, hit boundaries, section sizing and wrapped-text layout. For a media or artwork action, use a dedicated visual layer rather than scaling a live player or its controls.

Alternatives: whole-button/card scaling violates stable minimum geometry; full-content brightness changes can reduce text contrast; a spreading ripple and spring bounce do not match the chosen restrained treatment.

### 3. Immediate onset, brief release and interruptible cleanup

Start visual acknowledgement on eligible primary pointer down. Suggested initial defaults are 70ms for inward movement and 160ms for release, with a short monotonic easing and no overshoot. A valid very quick tap retains enough visual acknowledgement to reach roughly 80ms total from press onset, then releases, only while the original surface remains mounted and eligible. The action runs at its existing valid activation point regardless of this visual lifetime. Navigation or popup dismissal never waits to display the effect.

These are implementation tuning defaults, not new public settings or claimed Apple mandates. A fresh press replaces any pending release; a generation/token check prevents old cleanup from clearing a newer press. Do not queue animation sequences or block repeated valid activation. Supported keyboard clicks receive the same acknowledgement without changing native button semantics or triggering twice after a pointer click.

Cancel on scroll intent, pointer cancellation/departure, blur where applicable, page hiding, navigation, removal, configuration replacement or loss of action availability. Cancellation clears immediately without a release/completion pulse. Use passive observation where possible; ordinary feedback must not capture the pointer, prevent default scrolling, or invent a `touch-action` rule. Keep current action cancellation guards; a feedback listener is not an alternative activation path.

### 4. Specialized gestures remain in control

Exclude sliders, color-wheel drags, strict open/unlock slides and hold targets from the ordinary tap binding. Their existing gesture owner continues to drive progress and haptics. A hold-capable card with a short-tap action can use shared visual styling under that existing owner, but must not acquire a competing pointer listener or haptic source. The navbar refresh hold follows the same rule. Safe close/lock taps participate normally.

This avoids accidental release activation after a cancelled hold, loss of horizontal-intent detection and duplicate haptics. Preserve focus establishment before popup opening, existing error surfaces and Home Assistant's authoritative state.

### 5. Reduced Motion removes transforms, not only transitions

Use `prefers-reduced-motion: reduce` to force press-related content transforms to none and retain a stationary highlight. Remove superseded local `:active` scale rules so they cannot win by specificity. The media query applies immediately when preference changes, including during an effect. Essential direct manipulation and hold/slide progress are unaffected.

### 6. Trace the runtime boundary without changing saved data

Integrate shared feedback into the owners listed above and the explicit action set in the proposal. Do not apply it to noninteractive content, embedded native media controls, builder/editor chrome or Monaco. Preview renderers inherit visuals while retaining their existing no-service behavior.

No changes are needed in Python validation, saved configuration, generator templates, native-model conversion or localization: feedback introduces no text or options. Existing translated action names remain attached to their controls. Include any new module in the existing build/owned-asset pipeline and verification mapping; regenerate derived assets using project tooling rather than editing bundles manually. Update the quality guide's press-feedback description during implementation. Existing realistic pages and `card-test` cases are sufficient unless a concrete missing example is discovered.

## Risks / Trade-offs

- **Nested or overlapping targets animate together** → explicitly bind the innermost control and exclude direct-manipulation/hold surfaces; assert child activation does not invoke the parent.
- **Old cleanup erases a new press or survives navigation** → disposable per-surface ownership with a generation guard and clear hooks for lifecycle/availability changes.
- **A fast tap is invisible** → brief bounded visual acknowledgement while mounted; never delay the action or keep a dismissed popup alive.
- **Feedback obscures state or looks like success** → neutral theme-aware overlay with unchanged authoritative colors, errors and haptic semantics.
- **Legacy transforms shrink targets or break anchored markers** → remove competing press transforms and animate inner content only; preserve positioning transforms.
- **Shared consumers are mistaken for a broad test gate** → use a small offline lifecycle/dispatch regression and review representative consumers; routine phone appearance checks remain the user's responsibility.

## Migration Plan

There is no data or public API migration. During implementation, use the existing frontend build and compatible `prepareFrontend()` sync to disposable `192.168.0.28` after final edits and essential checks. Its served-asset/readiness verification confirms installation. Do not generate replacement dashboards or reset helper state for this presentation change.

Rollback, if genuinely needed, restores only this change's runtime edits and regenerates/syncs the matching frontend assets while preserving unrelated changes; persisted configuration needs no rollback. Leave successful final assets installed for user testing.

Verification is limited to behavior-level assertions for fast taps/re-entry, cancellation/cleanup, nested dispatch isolation and retention of existing hold/slide guards if touched. Do not test literal timing constants as a proxy for behavior. User watch list: perceptible quick taps, smooth release, stable buttons, scroll cancellation, and stationary Reduced Motion feedback. No automatic browser campaign or camera playback/transport checks are part of this change.
