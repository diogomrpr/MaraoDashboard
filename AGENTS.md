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

The [OpenSpec guide](openspec/README.md) indexes the documented baseline and
future changes. Read the affected capability specs and project context before
planning a task. OpenSpec does not override this contract or establish test
success; keep future work in changes and archive only completed, verified work.

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
- Keep the disposable test instance on one Marao dashboard at
  `/marao-dashboard`. Its realistic product pages and exhaustive `card-test`
  gallery are views of that dashboard; do not create a separate gallery
  dashboard or route Marao navigation through another dashboard root.
- Keep shipped code in `custom_components/marao_dashboard/` (with editable
  editor source in `frontend_src/`), automated checks in `tests/`, and
  disposable-instance fixtures in `ha-test/`. Do not add fake entities, gallery
  YAML, or test-only assets to the shipped integration tree.

## Environment and privacy

- The only Home Assistant instance agents may modify or test is the disposable
  local instance at `192.168.0.28`. Never connect to, deploy to, or operate a
  live or production Home Assistant instance.
- Development tools accept a developer-configured disposable instance through
  ignored `ha-test/local.json` (URL, long-lived administrator token, explicit
  disposable acknowledgement, and SSH connection). This portability does not
  authorize agents to use any target other than `192.168.0.28`.
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
- Implement related queued tasks as one coherent batch. Run the smallest
  covering focused check after the batch's last edit, deploy UI changes together,
  and visually and interactively inspect the combined affected-card set before
  concluding the batch. Check data migrations and shared security controls early
  when later work depends on them.
- Whenever a supported card or behavior is added or changed, update the
  canonical test gallery and safe fake entities in the same change. Keep every
  materially distinct state, behavioral option, popup, action, and layout
  configuration visible, and also place a representative example on the
  realistic generated page where users would encounter it. Arbitrary custom
  labels, colors, and equivalent value permutations do not require a Cartesian
  set of duplicate examples.
- Use `npm run test:ha:alignment` as the focused geometry check whenever an
  icon-only action card or its shared layout changes.
- Treat every warning, error card, console exception, failed resource, and
  repeated request as a defect. Fix its root cause; never hide, suppress, or
  ignore it.
- After the last edit and focused check, visually inspect changed components and
  representative difficult layouts on the disposable dashboard. Cover each
  affected shared component and card family, including normal and enlarged-text
  or zoom cases where relevant. Check centering, spacing, clipping, overlap and
  overflow; fix defects and repeat the focused check and affected visual review.
  Do not manually inspect every equivalent card or scrolling capture. Inspect
  the complete gallery only when the user explicitly requests that review.
- Run each distinct interaction once per relevant theme. Repeat across devices
  only when native gestures or device geometry affect the behavior. Keep fast
  unit, migration and recovery checks; visibility alone cannot verify actions or
  preservation. During release preparation, run one automated mobile layout
  matrix checking visibility, clipping, overlap, touch targets and browser/resource
  errors. Save screenshots on failures and for representative visual review;
  exhaustive success captures are opt-in diagnostics, never the default.
- Finish queued implementation before the complete release stabilization pass;
  do not repeat broad checks between small edits or individual tasks. After a
  defect, rerun its focused check and visual inspection, then verify the final
  candidate. Keep all mandatory publication and preserved-install gates.
- Do not run the full suite after small changes. Run `npm run verify:publish`
  only when the user requests it, during final stabilization, or immediately
  before publishing.
- Before every push, tag, GitHub release, or HACS release, run
  `npm run verify:publish`. Do not publish unless it passes against the
  disposable instance. GitHub Tests, hassfest, and HACS validation must pass for
  the published commit.
- Do not publish while a known, relevant violation of this contract remains,
  even when the automated gate does not detect it.
- The user explicitly allows the known Home Assistant native stale-unsubscribe
  reconnect failure until its upstream fix reaches a stable frontend. Preserve
  raw failing assertions and native subscription evidence; only that diagnosed
  failure is exempt. All other publication and preserved-install requirements
  still apply, and the exception expires when the stable fix is available.
- Keep routine completion reports concise. Use a detailed verification report
  only for a release, final stabilization, or material security/safety work.

## Upgrade compatibility

- Before changing persisted JSON, defaults, generated structures, component keys,
  or public APIs, inspect supported released configurations and record either
  preserved compatibility or an explicit versioned migration. Dashboard format,
  package version, and Home Assistant config-entry version are separate.
- Preserve selections, deletions, explicit emptiness, order, names, options,
  unknown fields, raw cards, protected custom YAML, and unrelated HA settings.
  Never replace an existing dashboard with discovery or starter defaults to
  avoid a migration. Missing or ambiguous migration inputs are errors.
- Share ordered conversion and validation across setup, editor, generation,
  alternate source paths, and history compatibility checks. Previews and dry
  runs remain read-only; invalid and unsupported newer sources remain untouched.
- Back up exact source, generated output, and affected owned state before writes;
  preflight and stage changes, replace files atomically, and retain recovery data
  through failure or interruption. Report rollback failures and protect unrelated
  concurrent edits. Archived history stays immutable.
- Keep provenance-backed historical fixtures, independently specified expected
  JSON, and upgrade feature coverage current with each relevant change. Run
  focused migration checks during development.
- Immediately before versioned publication, require a separate preserved-install
  upgrade scenario in addition to `npm run verify:publish` and exact-commit CI.
  It must verify the final candidate, supported released formats, persisted data,
  complete shared feature/mobile coverage, failure recovery, and disposable cleanup.
  Keep preservation/recovery assertions for all seven supported baselines. Run
  shared interactions and the full mobile matrix once on the actual latest-release
  upgrade; use targeted saved-page, navigation, popup and diagnostic browser checks
  for the other distinct formats. Report those scopes honestly without claiming
  that every historical format independently passed the full mobile matrix.
  Missing, incomplete, failed, or stale evidence blocks publication. This live
  scenario runs only during explicit release preparation, never as a routine
  test, push/PR check, ordinary stabilization, or ordinary version hook.
- Run `npm run verify:release -- /absolute/private/upgrade-report.json` only
  during release preparation. It requires a clean final commit, private complete
  preserved-install evidence, representative upgraded visual review and verified
  cleanup, then runs `verify:publish` and rejects candidate or evidence drift.
  Publication may reuse that exact candidate's successful browser evidence after
  revalidating the private report, coverage and restored disposable installation;
  do not repeat the mobile matrix between its push, tag and release. Changed
  candidate assets, saved source, target or failed/stale evidence invalidate reuse.
  Run `npm run test:ha:upgrade` for the clean final candidate to produce that
  evidence. The runner requires the safe current fixture installation from final
  stabilization, backs it up before any remote write, and never invokes fresh
  preparation while collecting upgrade evidence. Without its real complete
  evidence, versioned publication remains blocked.
  Do not claim fresh-fixture checks or mocked gate tests satisfy that requirement.
  A downgrade requires the matching prior package and saved data/owned-state
  baseline together, not package assets alone.

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
  Climate controls may preview explicitly requested mode and targets with
  pending feedback for up to 30 seconds, shared across duplicate controls.
  Measured temperature, actual activity and availability remain authoritative;
  matching reports, rejection or target loss reconcile each requested setting.
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
  not communicate state by color alone. The user-approved exception is normal
  room lighting: use the room background without a visible lighting-status row
  or binary cue, while retaining localized accessible lighting status, deliberate
  custom labels and visible neutral availability problems. Other families keep
  their non-color state cues. Prioritize alerts only when configured
  and abnormal, then organize normal controls by task or room.
- Localize all user-facing text, including action labels such as `Unlock`.

See the [dashboard quality guide](docs/docs/development/dashboard-quality.md)
for component details, verification matrices, and the definition of done.
