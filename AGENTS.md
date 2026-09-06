# Marao Dashboard agent contract

These rules are binding for every change to this repository, including existing
code: behavior is not exempt because it predates this file. Fix relevant
violations at their shared root instead of adding one-off workarounds.

## Precedence and source of truth

1. System, developer, and the user's current explicit instructions.
2. This file and any more specific nested `AGENTS.md` that does not conflict
   with it.
3. The detailed [dashboard quality guide](docs/docs/development/dashboard-quality.md).
4. Other project documentation and existing conventions.

When two project rules conflict, this file wins. Ask the user only when their
intent cannot be preserved safely. Keep implementation, builder, generator,
templates, documentation, and tests aligned.

## Product and architecture

- Marao is a complete mobile Home Assistant dashboard: integration, visual
  builder, generator, project-owned cards, popovers, navbar, theme, and test
  gallery. It is not a camera-only project.
- Keep the frontend self-contained. Prefer Home Assistant or browser-native
  features and do not bundle, install, modify, or depend on third-party cards.
- Preserve Marao's identity and documentation. Keep the README's single
  approved `Inspired by` attribution; do not repeat that attribution or the
  prior project name elsewhere.
- Preserve current shared component contracts. Do not solve a reusable card,
  input, slider, popup, navbar, or state problem in only one generated card.

## Environment and privacy

- The only Home Assistant instance agents may modify or test is the disposable
  local instance at `192.168.0.28`. Never connect to, deploy to, or operate a
  live or production Home Assistant instance.
- Exercise physical-action flows only with gallery helpers, templates, or other
  safe fake entities. Never actuate a real lock, door, gate, alarm, camera
  privacy control, or other security/safety device.
- Never commit or expose credentials, tokens, alarm codes, camera data, private
  entity data, internal secrets, or secret-bearing screenshots and logs.

## Development workflow

- Before editing, identify the affected-card set: every card changed directly
  and every card that consumes a changed shared component, template, token, or
  layout rule. If no card can be affected, record that the set is empty.
- Inspect the affected end-to-end path before editing. Make the smallest
  coherent root-cause change and preserve unrelated user work.
- During normal iteration, run only the smallest focused check for the changed
  code or card. For UI changes, deploy to the disposable instance and visually
  and interactively inspect the affected card and viewport.
- Use `npm run test:ha:alignment` as the focused geometry check whenever an
  icon-only action card or its shared layout changes.
- Treat every warning, error card, console exception, failed resource, and
  repeated request as a defect. Fix its root cause; never hide, suppress, or
  ignore it.
- Immediately before concluding a change, after the last edit and focused
  automated check, visually inspect every card in the affected-card set on the
  disposable dashboard. Check the alignment and centering of all text, icons,
  controls, and other elements, plus spacing, clipping, overlap, and overflow.
  This is the final validation step. If it finds a defect, fix it, rerun the
  focused check, and repeat the visual inspection. Inspect the full gallery only
  when the user requests it, a shared foundation can affect the whole gallery,
  or release stabilization requires it; otherwise inspect only affected cards.
- Do not run the full suite after small changes. Run `npm run verify:publish`
  only when the user requests it, during final stabilization, or immediately
  before publishing.
- Before every push, tag, GitHub release, or HACS release, run
  `npm run verify:publish`. Do not publish unless it passes against the
  disposable instance. GitHub Tests, hassfest, and HACS validation must pass for
  the published commit.
- Do not publish while a known, relevant violation of this contract remains,
  even when the automated gate does not detect it.
- Keep routine completion reports concise. Use a detailed verification report
  only for a release, final stabilization, or material security/safety work.

## Binding UI and interaction rules

- The acceptance target is mobile only. Release checks cover 320 CSS pixels and
  representative iPhone and Android layouts in portrait and landscape.
- Use scalable Montserrat typography. Test normal text, bold text, 200% text,
  200% browser zoom, and bold plus 200% text. Essential content wraps; secondary
  content may use ellipsis.
- The automated mobile profiles are the release gate. Real-phone inspection is
  recommended when available but is not required; do not claim it was performed
  unless it was. VoiceOver, TalkBack, and OS high-contrast modes are outside the
  current acceptance target.
- Every interactive control must be visibly at least 48 by 48 CSS pixels. The
  dashboard is touch-first: no hover-only behavior and no hidden swipe action.
- Use native semantic controls and internal accessible names. Icons may have an
  optional tooltip, but meaning must not depend on it. Do not add visible focus
  rings or other focus-only styling.
- Popups slide up, remain above the navbar, keep the background inert, trap and
  restore focus, scroll internally, and retain the current centered/column-width
  behavior when space is wider than the mobile target.
- Show distinct inactive, active, loading, disabled, `unknown`, and
  `unavailable` states. Render `unknown` and `unavailable` as disabled neutral
  states, and disable actions for either state or for disconnected entities. Use
  Home Assistant's native connection warning; show stale state only when the
  integration exposes a recognized freshness signal.
- Acknowledge input immediately and dispatch each completed interaction once.
  Keep rendering Home Assistant's authoritative state, and show a readable
  error when one is reported. A project-wide optimistic pending/timeout state
  machine is not required.
- Use strong haptics for button presses and sliders. Access sliders emit haptics
  at each 10% progress boundary and again on completion.
- Opening or unlocking access points uses the strict slide control only. It must
  establish horizontal intent before capturing the gesture, cancel incomplete
  or vertical gestures, and dispatch exactly once on valid completion. The
  visible localized label is concise (for example, `Unlock`); its semantic name
  includes the target. Closing or locking remains a safe explicit tap.
- Other risky security actions require a 1.2-second press-and-hold with visible
  border progress and strong haptics at hold start and completion. Releasing
  early, cancelling, or moving outside the control cancels the action.
- Keep simple, short action animations.
- Keep the navbar floating, compact, safe-area aware on iPhone, and limited to
  five auto-scaling entries. Keep popovers above it.
- Hide Home Assistant's native top bar only while a Marao dashboard is active,
  and restore the normal shell after leaving it.
- Sliders retain a contrasting rounded track, current-value fill, independently
  moving target thumb, containment, and strong feedback. Numeric inputs use the
  shared up/down control. Climate values intentionally show no unit visually or
  in accessible text.
- Use the Marao light/dark theme and state colors with sufficient contrast; do
  not communicate state by color alone. Prioritize alerts only when configured
  and abnormal, then organize normal controls by task or room.
- Localize all user-facing text, including action labels such as `Unlock`.

See the [dashboard quality guide](docs/docs/development/dashboard-quality.md)
for component details, verification matrices, and the definition of done.
