# Gallery and release verification

## Purpose

Provide a repeatable private development environment, exhaustive safe examples
and trustworthy mobile release verification against the current workspace.

## Requirements

### Requirement: Reuse the existing free development stack
Development SHALL use Node/npm, Python 3.14 in the existing virtual environment,
locked project dependencies, pinned Playwright and Chromium, and available browser
control. OpenSpec SHALL remain developer-only tooling. No new test framework,
paid browser service or weakened sandbox is required for this workflow.

#### Scenario: A fresh contributor prepares local checks
- **WHEN** the locked Node/Python dependencies and Chromium are installed
- **THEN** existing scripts provide focused tests, disposable sync and mobile inspection without HACS users installing those tools

### Requirement: Current-workspace disposable preparation
Ignored `ha-test/local.json` SHALL supply URL, administrator token, explicit
disposable acknowledgement and SSH connection. `ha:sync:dry-run` SHALL report the
plan without writes or HA contact. Real preparation SHALL build/deploy the current
workspace, install only safe fixtures, generate one dashboard, wait for readiness
and validate files/resources/routes/entities before recording success.

#### Scenario: A frontend-only change is prepared
- **WHEN** current assets are deployed to the allowed disposable instance
- **THEN** integration reload/browser refresh applies the fingerprinted assets without an unnecessary backend restart

#### Scenario: Integration or fixture Python changes
- **WHEN** preparation detects restart-bound code
- **THEN** it restarts the disposable HA and waits for readiness before tests continue

### Requirement: One exhaustive gallery with realistic counterparts
The disposable dashboard SHALL remain at `/marao-dashboard`, with Cases at
`card-test` and populated realistic product views. Canonical dashboard JSON,
Cases YAML, `cases.json`/`cases.js`, helpers and fake providers SHALL stay in
`ha-test/`. Every supported card and materially distinct state, option count,
behavior, popup/action/layout SHALL be visible; changed behavior SHALL also have
a representative realistic-page example. Equivalent value permutations need not form a Cartesian matrix.

#### Scenario: A supported capability is added
- **WHEN** its behavior changes the builder/runtime contract
- **THEN** canonical coverage and safe entities are updated in the same change
- **AND** both Cases and its realistic product placement exercise it

### Requirement: Meaningful focused checks
Ordinary changes SHALL use the smallest covering unit/static/browser check.
Icon-only controls or shared layout changes SHALL run `test:ha:alignment`; value
slider changes SHALL run the relevant slider check. Test-only and documentation-only
changes SHALL not trigger unnecessary full-suite or device actions.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** its focused verification runs
- **THEN** alignment is checked within the runner's 0.5 CSS-pixel tolerance and representative affected components and difficult layouts are visually inspected afterward

### Requirement: Mobile release matrix
Release checks SHALL cover 320x700, iPhone 390x844/844x390 and Android
360x800/800x360 layouts, both themes, and normal/bold/200% text/200% zoom/bold plus
200% text configurations as represented by the existing 26 profile/theme runs.
Browser processes SHALL preserve isolated touch/device settings; typography SHALL
be reapplied and checked during full-page scrolling. Device metadata SHALL remain
compatible with the native HA frontend when Playwright is upgraded.

#### Scenario: A release mobile run inspects every view and popup
- **WHEN** cards load later during scrolling or a sheet opens
- **THEN** the selected typography, theme, touch and safe-area profile remains applied

### Requirement: Interaction and resource verification
Release verification SHALL cover cold loads, full scroll, safe-area/navbar clearance,
popup focus/scroll/close, availability/errors, real external state change,
single dispatch and gesture cancellation. Real disconnect/recovery SHALL retain
native warning and exception assertions. Screenshots SHALL complement diagnostics,
including native-density slider curves and representative final visual review.
Distinct interactions SHALL run once per relevant theme, with device repeats only
for native gestures or geometry. The complete automated mobile layout matrix
SHALL run once per release candidate. Failure screenshots SHALL remain mandatory;
exhaustive success captures SHALL be opt-in diagnostics.

#### Scenario: A browser interaction check completes without an exception
- **WHEN** the corresponding popup is visually empty or clipped
- **THEN** the UI still fails acceptance and requires a root fix

### Requirement: Strict HACS boundary and reproducible assets
The editor SHALL be built from `frontend_src/` into committed runtime assets and
`check:editor` SHALL detect drift. HACS staging SHALL contain only the integration;
source and staged boundaries SHALL reject fixtures, synthetic media, local caches,
test dependencies and secrets. Test providers SHALL never overwrite real providers.

#### Scenario: A fixture or credential file enters the integration tree
- **WHEN** package boundary validation runs
- **THEN** packaging fails instead of shipping it

### Requirement: Publication gate and exact-commit CI
Immediately before every push, tag, GitHub or HACS release, `npm run verify:publish`
SHALL pass against the disposable instance. GitHub Tests, hassfest and HACS SHALL
pass for the published commit. Known relevant contract violations SHALL prevent
publication even when automation misses them. Complete exact-candidate preserved-install browser evidence MAY be reused only
after private capture/coverage/cleanup and restored-install validation; the gate
still runs before every push/tag/release. A past one-release exception SHALL
NOT become a permanent waiver or error allowlist.

#### Scenario: The native reconnect check still fails for a future release
- **WHEN** publication is being prepared
- **THEN** the failure remains reported and the normal publication gate remains unmet

### Requirement: Honest evidence and limits
Verification reports SHALL distinguish automated Chromium profiles from actual
phones/Safari and record performed checks and remaining defects. VoiceOver,
TalkBack, OS high contrast, desktop acceptance and real-device actuation SHALL
remain outside the current acceptance target. Physical haptic strength SHALL
not be claimed from browser automation.

#### Scenario: Only automated phone profiles were run
- **WHEN** completion is reported
- **THEN** the report identifies emulation and does not claim physical iPhone/Android testing
