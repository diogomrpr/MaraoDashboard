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

- Record the starting commit and affected-card set before editing, including all
  consumers of changed shared components. Record an empty set for tooling-only work.
- Inspect the affected end-to-end path, preserve unrelated work, and implement
  related queued tasks as one batch with the smallest coherent shared-root fix.
- Default to `npm run test:affected`; use `--base <starting-commit>` for committed
  batch work and `--component <id>` for reviewed shared-file changes. Preview the
  scope with `--plan`. Keep the source/component/check map current; unresolved
  scope is an error, never permission to skip checks or run everything.
- Run the smallest covering check after the batch's last edit. Check dependent
  migrations and security controls early. Deploy compatible UI changes together
  only to the disposable instance, then inspect representative affected components
  and difficult layouts as the final step. Fix defects and repeat focused checks
  and inspection. Do not manually review every equivalent card or scroll capture.
- Update the canonical gallery, safe entities and a realistic-page example when
  supported behavior changes. Cover materially distinct states/options/layouts,
  without duplicating equivalent labels, colors or values into a Cartesian matrix.
- Select `test:ha:alignment` for changed icon-only actions/shared action geometry,
  and relevant slider, action, migration and recovery checks for those contracts.
  Visibility checks cannot establish correct dispatch or data preservation.
- Run distinct interactions once per relevant theme; repeat devices only for
  native gestures or geometry. Use relevant narrow/text/zoom/landscape profiles
  for changed layouts. Save failures and representative success captures only.
- Run tests serially by default. Parallel checks require an explicit request and
  `--parallel`. Use isolated contexts/private job outputs; serialize deployment,
  shared builds, dashboard writes, conflicting helper changes, restarts and recovery.
- Run `npm run test:full -- --parallel` only when the user explicitly requests
  comprehensive testing. Do not run the full suite, 26-profile mobile matrix,
  exhaustive gallery review or all historical scenarios implicitly during normal
  implementation, hooks, automatic CI, stabilization or publication.
- Before pushes/tags/releases, use the scoped `npm run verify:publish` gate.
  Publication requires relevant feature/component checks and applicable exact-commit
  Tests/hassfest/HACS validation; a release request alone does not request full tests.
  Reuse unchanged validated scoped evidence rather than repeating browser work.
- Treat observed warnings, error cards, console exceptions, failed resources,
  repeated requests and duplicate service calls as defects. Fix their shared root;
  never hide, suppress or relabel failures. Known relevant violations block release.
- The user permits only the diagnosed native Home Assistant stale-unsubscribe
  reconnect failure until its upstream fix reaches a stable frontend. Preserve raw
  assertions/native evidence and check expiry when applying it. Other selected
  checks and required cleanup remain binding.
- Keep routine completion reports concise and honest about selected, omitted,
  automated and manually inspected coverage. Use detailed reports only for releases,
  final stabilization or material security/safety work.

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
- Versioned publication requires live preserved-install verification only when
  persisted data, migration, generated-output ownership or installation/upgrade
  behavior changes. Select affected formats/features with independent expected
  data, relevant failure recovery and verified disposable cleanup. Changes affecting
  every supported conversion still require every affected baseline; UI-only releases
  do not automatically run historical upgrades or a full mobile matrix.
- Use `npm run test:ha:upgrade -- --scope <components>` for required scoped live
  upgrade proof during explicit release preparation. It preserves the safe existing
  installation and exact backups before remote writes; fresh fixture preparation
  cannot replace preserved-install evidence. Full upgrade/browser coverage requires
  an explicit comprehensive request. Missing, failed, incomplete or stale selected
  proof blocks publication. Downgrades restore the matching package and saved data
  together, not package assets alone.
- `npm run verify:release` checks scoped final-candidate evidence and relevant
  publication checks. Revalidate private coverage, source/asset identities, cleanup
  and the prepared installation before reuse; candidate changes recompute scope
  and invalidate changed inputs. Bind valid proof to the clean final release commit.
  Keep historical comprehensive reports immutable and distinct from scoped reports.

## Binding UI and interaction rules

- The acceptance target is mobile only. Relevant UI checks cover 320 CSS pixels and
  representative iPhone and Android layouts in portrait and landscape.
- Use scalable Montserrat typography. Test normal text, bold text, 200% text,
  200% browser zoom, and bold plus 200% text. Essential content wraps; secondary
  content may use ellipsis.
- Selected automated mobile profiles form the scoped UI gate. Real-phone inspection is
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
