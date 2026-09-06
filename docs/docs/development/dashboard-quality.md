---
title: Dashboard quality contract
layout: page
parent: Development
nav_order: 3
---

# Dashboard quality contract

This guide explains the binding rules in the repository's root
`AGENTS.md`. The root contract wins if wording here ever diverges. These
requirements apply to both new and existing Marao behavior.

## Product boundary

Marao Dashboard is a complete, mobile Home Assistant dashboard product. It
includes the integration, administrator builder, generator, project-owned
cards, floating navbar, popovers, theme, fullscreen shell, documentation, and
safe card gallery. Camera support is one feature of that product.

Keep the runtime self-contained:

- Prefer Home Assistant and browser-native capabilities.
- Ship only Marao-owned frontend code.
- Do not bundle, fork, install, update, remove, or require third-party
  Lovelace cards.
- Keep frontend resources under Marao's namespaced integration paths and let
  the integration register them.
- Keep builder fields, validation, generated YAML, reusable templates, runtime
  behavior, translations, documentation, and gallery examples in sync.
- Preserve hand-written YAML inside the generator's protected custom regions.
- Preserve Marao's project identity. The README's single `Inspired by`
  attribution is the only permitted prior-project reference; do not repeat its
  name elsewhere.

When a behavior is shared, implement it once in the shared component. A card
variant must not acquire its own copy of slider, numeric-input, popup, state,
or action logic.

## Safe development environment

Agents may deploy and test only against the disposable local Home Assistant at
`192.168.0.28`. The configured target, credentials, and write opt-ins belong
in ignored local files.

Never:

- point sync, browser, accessibility, or end-to-end tests at a live or
  production Home Assistant instance;
- use a real household instance merely to inspect entities or integrations;
- actuate a real lock, exterior door, gate, garage door, alarm, security
  control, camera privacy control, valve, or other safety-relevant device;
- commit tokens, passwords, alarm codes, camera credentials, private entity
  data, internal secrets, or secret-bearing screenshots, traces, and logs.

Use the **Marao Dashboard Card Test** gallery and its fake/template helpers for
interaction tests. It must contain every supported Marao card/template and key
popup variant, including both single-mode and multi-mode climate examples. Add
a safe helper whenever a supported state, action, or history shape cannot
currently be exercised there.

## Working loop

### Before editing

1. Read the applicable repository instructions and the affected implementation,
   generator, template, documentation, and tests.
2. Inspect the current affected card or flow on the disposable dashboard when
   visual behavior matters.
3. Identify the shared root of the behavior, its generated consumers, and the
   safest gallery entity for interaction.
4. Record the affected-card set: direct cards plus every consumer of a changed
   shared component, template, token, or layout rule. Record an empty set when
   the change cannot affect card rendering.
5. Group edits into one small coherent batch.

Do not require a full device matrix or a formal defect ledger for a small
iteration. Establish only the baseline needed to understand the affected
behavior.

### During iteration

1. Make the smallest root-cause change.
2. Update every relevant layer so the builder and generated result cannot drift.
3. Run the smallest focused syntax, unit, static, or card check that covers the
   change.
4. For UI work, sync to `192.168.0.28`, refresh the affected route with the
   required cache busting, and visually and interactively inspect the affected
   card at the relevant mobile viewport.
5. Check Home Assistant warning/error cards, the browser console, failed
   resources, and repeated requests.
6. Fix every observed warning or error at its source. Do not suppress,
   hide, relabel, or ignore it.

Prefer a browser or dashboard/resource reload for frontend changes. Batch
restart-bound changes and restart the disposable instance only when a reload
cannot apply them.

### Final affected-card visual gate

After the last edit and focused automated check, immediately before reporting
completion, inspect every card in the affected-card set on the disposable Home
Assistant dashboard. This inspection is the final validation action and must
verify:

- horizontal and vertical alignment and intended centering of every visible
  text block, icon, button, slider, value, image, and other element;
- consistent internal spacing and alignment between sibling cards;
- no clipping, overlap, unintended gap, overflow, or off-center control;
- correct light/dark and active/inactive presentation where the change affects
  those states;
- no warning card, console exception, failed resource, or repeated request.

If the inspection finds a defect, return to implementation, run the smallest
focused check for the correction, then repeat this final visual gate. Earlier
screenshots or an inspection made before the last edit do not satisfy it.

Use impact-based scope during normal work: inspect only the affected-card set.
Inspect the complete gallery only when the user requests it, a shared
foundation has gallery-wide impact, or release stabilization requires it.

### Test timing

Focused checks are the normal development loop. Do not repeatedly run the full
suite while related UI work is still changing.

Run `npm run verify:publish` only when:

- the user requests the full gate;
- the work enters final stabilization; or
- a push, tag, GitHub release, or HACS release is the next step.

`npm run test:ha:e2e` is a release check and may target only the configured
disposable instance. Never publish when `verify:publish` fails. GitHub Tests,
hassfest, and HACS validation must pass for the published commit.

### Reporting

For routine work, report the user-visible result, focused check, and whether it
was deployed locally. Use a detailed device/test/restart/limitation report only
for release work, final stabilization, or a material security/safety change.

## Mobile information hierarchy

Mobile is the sole acceptance target. Preserve useful wider-screen behavior,
but do not trade mobile clarity or touch ergonomics for desktop density.

The main flow should:

1. Show urgent configured exceptions when they are abnormal.
2. Show the normal home summary and frequently used safe actions.
3. Organize controls by user task, floor, or room.
4. Put detailed history, configuration, and diagnostics behind progressive
   disclosure.

Do not force a permanent security-first layout. Security, alarm, climate,
lighting, or unavailable-device status becomes prominent when configured and
actionable. Avoid duplicating an entity unless one placement is a clearly
identified summary and the other is its detailed control.

Keep common safe actions within one or two interactions. Safety gestures may
deliberately take longer. Always show the authoritative current state beside
the action it affects.

## Responsive layout and typography

### Viewport behavior

- Support a 320 CSS-pixel-wide viewport without horizontal page scrolling.
- Use content-driven card height and minimum sizes; do not clip essential
  content into a fixed-height composition.
- Let essential titles, states, errors, and action labels wrap.
- Secondary, nonessential metadata may use an ellipsis.
- Reflow multi-column content before controls become cramped.
- Keep pages vertically scrollable and leave enough content space for the
  floating navbar.
- Avoid nested scrolling except inside a bounded popup.

Use `env(safe-area-inset-*)` for device-derived insets. Apply notch/top padding
only for iPhone behavior that needs it. Preserve the accepted compact iPhone
navbar offset rather than adding a universal bottom gap. Never assume that
every iPhone has the same cutout or home-indicator size.

### Montserrat and scaling

Montserrat is Marao's primary font, with the existing Roboto/system fallbacks.
Use the shared theme typography variables and scalable layouts. Do not shrink
text automatically, use `transform: scale()`, or apply page zoom to make a
card fit.

The supported accessibility simulations are:

- normal text;
- stronger/bold text;
- 200% text size;
- 200% browser zoom;
- stronger/bold plus 200% text size.

Test those configurations explicitly and separately as listed. OS Bold Text
does not have a reliable general web signal; the layout must tolerate its font
metrics rather than trying to detect it. VoiceOver, TalkBack, and OS
high-contrast modes are outside the current acceptance target.

The automated runner uses Chromium mobile device emulation, including the
phone user agent, touch behavior, device pixel ratio, OS text scale, safe-area
insets, and an explicit Marao light or dark mode. It also scales the shared
Marao typography tokens because Chromium does not resize every explicit CSS
length from its OS-scale setting alone. Treat it as a repeatable first-order
phone simulation and the automated release gate. Native iOS or Android Home
Assistant app inspection is recommended when a device is available, but it is
not required and must never be claimed unless it was actually performed. Its
200% page-zoom case uses half the effective layout viewport with increased pixel
density; this intentionally tests reflow without claiming to reproduce native
browser chrome.

Essential information and controls must remain visible and operable under the
supported simulations. Card height may grow. Touch targets must not shrink.

## Theme and visual language

- Use the shared Marao spacing, radius, typography, elevation, surface, state,
  and icon variables.
- Support the Marao light and dark theme modes independently.
- Normal text should meet 4.5:1 contrast; large text and meaningful control
  boundaries should meet 3:1.
- Pair color with text, icon, shape, or state. Color alone is not status.
- Active entity cards use the theme's domain/state highlight. Inactive,
  disabled, unknown, and unavailable states remain visibly distinct.
- Icon backgrounds that are intended to be circular must remain perfect
  circles.
- Use whitespace and alignment before adding decorative separators.

Simple, short animations are required when they explain an action or state:
popup entrance, direct slider movement, press progress, and immediate action
acknowledgment. Do not add continuous or ornamental animation.

## Semantics and touch

- Use native `button`, `input`, links, and dialog semantics where practical.
- Every interactive control must be visibly at least 48 by 48 CSS pixels.
- Trigger ordinary actions on activation/release, not pointer-down.
- Do not rely on hover, an undocumented swipe, a long press with no visible
  progress, or a tooltip as the only explanation.
- Give every icon control an internal accessible name that describes its
  action and target. A visual tooltip is optional.
- Preserve meaningful DOM order and native keyboard behavior for ordinary
  semantic controls where it already exists. The strict access slider remains
  drag-only and must not gain a keyboard, tap, or button execution path.
- Do not add visible focus rings or other focus-only decoration.
- Localize every user-facing string, including concise actions such as
  `Unlock`. Layouts must tolerate their translations.

Popups must use modal semantics. While open, background content is inert, focus
stays within the popup, and closing restores focus to the invoking control.
The popup close control follows the same visible 48-by-48 rule.

Climate values intentionally omit degrees and temperature units in both visual
and accessible text.

## Entity and command states

Every interactive entity card must intentionally handle the states applicable
to it:

- initializing/loading;
- inactive and active;
- disabled;
- `unknown`;
- `unavailable`;
- disconnected;
- domain transitions such as opening, closing, locking, unlocking, or changing
  HVAC mode.

`unknown` and `unavailable` must be explicit, disabled, and visually neutral,
never substituted with a plausible safe-looking or active state. Disable
actions in either state.

Use Home Assistant's native connection warning when its authenticated
connection is lost and disable entity actions until it recovers. Do not add a
competing global offline banner. After reconnecting, reconcile state before
allowing an action.

Show stale status only when the integration exposes an explicit, recognized
freshness signal. Do not infer staleness from arbitrary timestamps or timers.

For each completed interaction, emit immediate visual and haptic
acknowledgment and dispatch one explicit action. Keep rendering Home
Assistant's authoritative state and surface a readable error when the service
call reports one. Do not infer physical success from a successful service
response.

The current contract deliberately does not require a project-wide optimistic
pending, confirmation, or timeout state machine. Add one only when a specific
feature requires it and the user approves that scope.

## Haptic contract

Use Home Assistant's native strong/heavy haptic event for every button press
and at slider engagement. Use the existing browser vibration fallback only
where supported.

For strict access sliders:

- emit strong feedback at each newly crossed 10% progress boundary;
- emit each boundary's feedback at most once per gesture;
- emit a distinct strong completion haptic after a valid slide;
- do not emit completion feedback for a canceled or failed gesture.

Haptics supplement visible feedback; they never replace it.

## Action safety

### Access points: open and unlock

Opening or unlocking a lock, exterior door, gate, or garage door uses Marao's
strict slide control as the only execution path. Do not add a tap, hold,
double-tap, generic confirmation button, or non-drag alternative for the same
action.

The control must:

- show the authoritative current state nearby;
- use a concise localized visible label such as `Unlock`;
- expose an internal semantic name containing both action and target;
- have a track and thumb that meet the visible 48-by-48 minimum;
- require deliberate travel to the completion boundary;
- establish horizontal intent before capturing the pointer;
- cancel when vertical motion indicates page scrolling;
- do nothing on track/thumb tap, incomplete travel, early release, reversal
  below the boundary, release outside the boundary, pointer cancellation,
  route change, page hiding, or component removal;
- dispatch once, only after valid completion on release;
- reset clearly on cancellation and remain driven by Home Assistant state.

The horizontal-intent behavior is required now; it is not a future
enhancement. Test it with touch-like pointer movement in the gallery.

### Access points: close and lock

Closing or locking uses a clearly labeled explicit tap and immediate feedback.
Do not use `toggle`, and dispatch no more than once for one activation.

### Other risky security actions

A risky security action that is not access-point open/unlock—such as disarming
an alarm or disabling a security/privacy control—requires a 1.2-second
press-and-hold.

- Draw continuous border progress around the control.
- Dispatch only after the full duration.
- Release, cancellation, pointer loss, moving outside the control, route
  change, or disabling the entity before completion must reset without
  dispatch.
- Keep the current state and exact resulting action explicit.
- Give strong haptic feedback when the hold starts and again when it completes.
  Pair completion with immediate visual feedback and continue reflecting Home
  Assistant's state.

Destructive builder or administrative actions require an explicit
confirmation that names what will be removed or replaced.

## Shared component contracts

### Standard entity cards

- Card background and icon treatment follow the entity's domain and current
  state using theme variables.
- Active, inactive, transitional, unknown, unavailable, and loading treatments
  must remain readable in light and dark modes.
- The state and action cannot be ambiguous or encoded only by color.

### Value sliders

- The track is tall enough to keep the thumb visibly centered and contained.
- Track and card backgrounds must contrast; never choose the same background.
- The progress fill is rounded to the same geometry as the thumb.
- Fill represents the current confirmed percentage or value.
- The thumb independently represents the user's target value.
- The fill never visually passes the thumb and never escapes the rounded track.
- Covers update the fill from live position while the target thumb may already
  be at the requested destination.

### Numeric input

All numeric entity inputs use the reusable up/down control rather than a range
slider. Use the entity's supported minimum, maximum, step, and current target.
The control occupies the useful height of its card and keeps arrows and value
large and readable.

### Climate

- Separate the operating mode, current temperature, and target control.
- Omit degree symbols and units from all visual and accessible climate values.
- A single supported mode turns on directly to that mode.
- Multiple supported modes open the Marao popup.
- The popup begins with the normal climate card and follows it with large,
  localized mode buttons in a two-column grid.
- Mode and setpoint controls use a readable theme surface and state-colored
  selection treatment.
- Climate card background follows heat, cool, heat/cool, auto, dry, fan, off,
  transitional, unknown, and unavailable theme states.

### Floating navbar

- The navbar is simple, floating, compact, and limited to five entries.
- Width and spacing scale automatically with the number of routes.
- Active icon backgrounds remain circular.
- Keep button gaps compact without violating the visible 48-by-48 control rule.
- Derive iPhone positioning from `env(safe-area-inset-bottom)` and preserve
  the accepted lowered offset. Do not add a generic extra bottom margin.
- The navbar stays below open popups in the stacking order.
- The fullscreen shell hides Home Assistant's native top bar only while a
  Marao dashboard is active and restores the normal Home Assistant chrome when
  the user leaves it.

### Popups

- Animate upward from the bottom.
- Stay above the navbar and all dashboard cards.
- Keep a visible close button and internal scrolling.
- Support content-driven height or a configured fixed/max height.
- On wider layouts, stay centered and use the first dashboard column's width
  rather than stretching across the screen.
- Keep the background inert, trap focus, close through explicit close/back
  behavior, and restore focus.

### Cameras, graphs, and media

- Camera cards use Home Assistant feeds and Marao-owned Frigate/UniFi Protect
  event presentation. Activating a camera card opens its event popup. Do not
  autoplay audio. Show unavailable feeds and provider failures explicitly.
- Use native Home Assistant graph/history data. Show all available requested
  history and a clear empty/unavailable state when it cannot be loaded.
- Media popup action buttons show their icons rather than leaking service or
  action text into the visual control; each still has an internal semantic
  name.
- Lazy-load heavy camera, graph, and secondary popup content when possible.

## Performance and reliability

- Subscribe to Home Assistant state updates instead of aggressive polling.
- Update the affected component rather than rerendering the entire dashboard.
- Reserve usable space for asynchronous content to avoid disruptive layout
  shifts.
- Keep primary state and controls usable while secondary content loads.
- Clean up subscriptions, timers, pointer capture, and event listeners when a
  component disconnects.
- Treat multiple service dispatches from one interaction as a correctness
  defect.

## Release verification

The complete release gate covers the generated dashboard and card gallery at:

| Profile | Viewport |
|---|---:|
| Reflow minimum | 320 × 700 |
| Representative iPhone portrait | 390 × 844 |
| Representative iPhone landscape | 844 × 390 |
| Representative Android portrait | 360 × 800 |
| Representative Android landscape | 800 × 360 |

Also inspect a larger phone where a changed layout needs it. The release check
must cover light and dark theme behavior and the supported typography matrix:
normal, bold, 200% text, 200% zoom, and bold plus 200% text. Test 200% text and
200% browser zoom as distinct configurations.

For affected interactions, verify:

- a cold route load and complete vertical scroll;
- no horizontal page scroll at 320 CSS pixels;
- safe-area placement and navbar clearance;
- popup size, scroll, inert background, focus containment, and close/restore;
- loading, active, inactive, unknown, unavailable, disconnected, and reported
  error behavior where applicable;
- one safe external entity change appears without reloading;
- buttons, numeric controls, normal sliders, strict access sliders, and
  press-and-hold controls dispatch no duplicate actions;
- no warning/error cards, relevant console exceptions, failed resources, or
  repeated failed requests.

Strict-slide release coverage includes tap, partial drag, near-complete cancel,
reverse drag, vertical-intent cancel, release outside, pointer cancellation,
route change, valid completion, unavailable, and disconnect cases. Verify the
10% haptic boundary logic with the focused component test; browser automation
cannot prove physical vibration strength.

The release contract does not require VoiceOver, TalkBack, OS high-contrast
modes, a desktop browser target, a physical phone, or real physical-device
actuation. Do not claim those were tested.

## Definition of done

A change is done when:

- it matches the requested behavior and this contract;
- reusable behavior is fixed in its shared implementation;
- builder, generator, runtime, theme, translations, documentation, tests, and
  gallery remain aligned where applicable;
- the focused check passes;
- UI work is inspected on the disposable Home Assistant and observed warnings
  are fixed at the root;
- no essential content clips under the relevant mobile/text configuration;
- state and safety gestures are correct for affected actions, with one dispatch
  per completed interaction;
- the full gate passes when requested, stabilizing, or publishing;
- no known relevant violation of this contract remains at publish time, even
  when the automated gate cannot detect it;
- routine results are reported concisely and any known limitation is stated.
