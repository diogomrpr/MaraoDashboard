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
future changes. Read affected capability specs and relevant project-context and
quality-guide sections; do not load every guide for every task. Applicable rules
remain binding. OpenSpec does not override this contract or establish test success;
keep future work in changes and archive only completed, verified work.

## Task routing and completion

- Start with the requested outcome and concrete acceptance cases. Use the short
  path for small fixes restoring documented behavior, refactors and documentation
  corrections: inspect the affected path, implement, verify and report. A new
  OpenSpec change is not required when requirements stay the same.
- For new behavior, public/persisted contracts, migrations or substantial
  cross-layer work, reuse an applicable OpenSpec change or create one. Honor
  explicit planning versus implementation intent; do not turn an authorized
  implementation request into a planning-only completion or redundant approval.
- Use the project skills for their affected areas: `marao-ha-integration` for
  backend/configuration work, `marao-ha-frontend` for cards/editor/browser work,
  and `marao-testing` for selecting checks or diagnosing verification failures.
  Load only relevant skills/references. The frontend is vanilla JavaScript custom
  elements, not a Lit/TypeScript application; keep existing architecture and tools.
- Before reporting completion, compare each requested outcome and acceptance
  case with the implementation and selected evidence. Fix relevant gaps; passing
  tests or completed OpenSpec artifacts alone do not establish task success.

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

## Verification policy: minimal by default

- Prioritize delivering the requested working feature. The user handles routine
  visual and real-device testing. Do not turn ordinary implementation into a QA
  campaign or delay delivery for speculative edge cases.
- Use the smallest check that demonstrates the requested result. For a stream,
  seeing it play is sufficient for routine playback acceptance. For a visual-only
  change, code review and a short manual watch list are sufficient; agent browser
  inspection is optional. For nontrivial logic, use one small existing targeted
  test or assertion where useful, rather than running every mapped suite.
- Expand verification only when the user asks, a reported/observed defect needs
  diagnosis, or the changed code presents a concrete security, data-loss,
  migration or recovery risk. Name the specific risk and check only that path.
  A shared file, hypothetical failure, or available test suite alone is not a
  reason to expand scope.
- Do not automatically add browser automation, test scripts, fixtures, screenshots,
  theme/device/text/zoom matrices, performance measurements, or repeated reloads.
  Reuse existing checks. Add a regression test when it catches a concrete defect
  or protects nontrivial logic; do not test trivial implementation details.
- Stop after the requested behavior works, essential checks pass, and the current
  changes are installed on the disposable test instance. If the user takes over
  testing, finish installation and necessary cleanup, then hand off. Report
  known failures honestly; never suppress them or claim unchecked behavior passed.
- End routine work with the result, what was actually checked, and a short,
  feature-specific list of what the user should watch for manually. Detailed
  verification reports require a request or a material safety/data issue.
- This policy takes precedence over routine inspection, coverage and completion
  requirements in skills, guides and OpenSpec. Product quality, privacy and safe
  data handling still apply. Explicit publication gates below remain required
  for pushes/tags/releases; do not start them during ordinary implementation.

## Test installation is part of done

- Before saying a software change is done or ready for the user to test, install
  all applicable current changes on disposable Home Assistant `192.168.0.28`.
  This is mandatory even when browser inspection and further testing are handed
  to the user. Local edits, package builds and browser request overrides are not
  installation. Never install to production.
- Batch related changes and normally install once, after the final edit and
  essential local checks. Install earlier only when needed to diagnose an actual
  problem or when requested. If code changes afterward, sync the affected final
  changes before handoff. Do not reinstall unchanged successful assets.
- Use the fastest compatible path: frontend-only work uses the existing
  `ha-test/prepare-frontend.js` helper's `prepareFrontend()` directly for sync
  without opening a browser, or `ha:preview` if inspection is already needed.
  It verifies installed compatibility and served assets, and reloads Marao only
  when necessary. Do not start watch mode unless ongoing preview is useful.
- Use `npm run ha:sync` for initial setup or changed backend/fixtures/generated
  configuration that require full preparation. Batch restart-bound changes into
  one restart; do not run full preparation for compatible frontend-only work.
  Preserve user test configuration and safe helper state where applicable.
- Successful installation and its current-asset/readiness checks are sufficient
  deployment confirmation; they do not require another browser test campaign.
  Leave the changes installed so the user can test immediately. Report the test
  URL and any required page reload briefly.
- If installation is blocked or fails, say **not installed / not ready for test**
  and explain the blocker; do not call the task done. Documentation, instructions
  and test-tool-only edits with no installed/runtime effect need no redeployment.

## Development workflow

- Record the starting commit, acceptance cases and affected shared consumers before
  code changes. For scoped automated verification, capture the starting dirty state
  with `npm run test:affected -- --snapshot /private/tmp/<task>.json`.
  Documentation/instruction-only edits need only diff and changed-link review.
- Inspect the affected end-to-end path, preserve unrelated work, and implement
  related queued tasks as one batch with the smallest coherent shared-root fix.
- Select development scope with `test:affected -- --since <snapshot> --tier
  <visual|behavior|focused> --component <reviewed IDs> --plan`. Review the actual
  task diff, including hunks in shared files; a snapshot cannot attribute concurrent
  edits. Use reviewed `--file <path>` subsets when needed and disclose exclusions.
  Unchanged pre-existing work is outside this task's checks. Shared consumers remain
  in scope; inspect representative equivalent consumers. Resolve unknown mappings
  without falling back to everything. `--base` remains available for commit ranges.
- Verification tiers are tools for deliberately selected coverage, not an automatic
  checklist. Use the minimal policy above for routine work. Select `focused` for
  concrete security/data/migration/installation risks; use the smallest relevant
  checks. A selector plan is a scope aid, not an instruction to run every check.
- When an agent browser check is needed, use `npm run ha:preview -- --component <ids> --watch`
  on the disposable instance. It syncs current frontend files to an already
  compatible installation, reloads Marao when needed, then refreshes the real HA
  page. It does not reset helpers, explicitly generate dashboards or restart HA;
  entry reload retains normal lifecycle behavior, including generated/history updates.
  Keep the test instance on the latest applicable project changes before completion.
  Leave successful assets installed after inspection, errors or closing preview;
  do not revert the package for cleanup unless the project itself was reverted.
  Safe helper cleanup and recovery of a genuinely failed operation remain required.
  Watch updates only while running; fresh/backend/fixture setup uses explicit `ha:sync`.
  One targeted inspection is enough when selected. Additional layouts/themes need
  a reported defect, concrete risk or explicit request. No mandatory screenshot.
  Stop once the requested behavior works, essential checks pass and cleanup is
  complete; leave remaining visual checks to the user.
- Keep existing affected examples accurate. Add gallery cases or safe fixtures only
  when needed to demonstrate the feature or reproduce a concrete defect; do not
  expand a gallery matrix as a prerequisite for routine feature delivery.
- In focused and publication verification, select `test:ha:alignment` for changed
  icon-only/shared action geometry and relevant slider checks. A visual-only edit
  does not inherit those suites during development. Changed action, security,
  migration and recovery contracts still need assertions; visibility cannot prove
  correct dispatch or data preservation.
- In automated focused/publication coverage, run reviewed theme-independent
  geometry and behavior in one reference theme;
  retain representative appearance/state checks in both themes and additional
  combinations where theme changes the contract. Repeat devices only for native
  gestures or geometry. Share compatible visits and validate explicitly supplied
  completed evidence against the current required scope. Use relevant narrow/text/zoom/landscape profiles
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
  Its scope covers the whole release candidate; task snapshots, file subsets and
  visual/behavior reports cannot narrow or satisfy publication proof. Run broad
  regression in the explicitly requested pre-release campaign, never daily by default.
  Reuse unchanged validated focused evidence rather than repeating browser work.
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

- The acceptance target is mobile only. Design for 320 CSS pixels and representative
  iPhone/Android portrait and landscape layouts. These are product requirements,
  not a mandatory agent test matrix for every change.
- Use scalable Montserrat typography supporting normal text, bold text, 200% text,
  200% browser zoom, and bold plus 200% text. Essential content wraps; secondary
  content may use ellipsis. Development selects relevant cases for the changed layout;
  focused/publication checks retain their selected distinct profiles.
- Selected automated mobile profiles form the focused/publication UI gate, not a
  requirement for presentation-only development. Real-phone inspection is
  recommended when available but is not required; do not claim it was performed
  unless it was. VoiceOver, TalkBack, and OS high-contrast modes are outside the
  current acceptance target.
- Every interactive control must be visibly at least 48 by 48 CSS pixels. The
  dashboard is touch-first: no hover-only behavior and no hidden swipe action.
- The JSON code editor uses stock Microsoft Monaco typography, sizing, themes
  and native widgets, as explicitly requested by the user. Keep Marao's UI rules
  on the surrounding controls; do not restyle Monaco's internal presentation.
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
- Keep the navbar floating, compact, safe-area aware on iPhone, and in one row
  of full-size controls. Preserve every configured entry; use a rightmost toggle
  for a matching vertical overflow menu when needed. Keep popovers above it.
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
