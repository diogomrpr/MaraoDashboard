# Design

## Context

See [proposal.md](proposal.md) for the user report and scope. This design implements the [mobile layout delta](specs/mobile-theme-layout/spec.md) and [navigation/popup delta](specs/navigation-popups/spec.md) without changing card actions or configuration.

The user clarified that the defect appears in the Home Assistant iPhone app on another installation; their disposable test installation looks correct. No app build, iOS version, Core version or served asset fingerprint is known for the affected installation, and agents cannot access it. Treat the report as valid evidence of a defect, without claiming its exact cause is reproduced.

Current shared runtime paths in `MaraoCards.js`:

- `MaraoNavbarCard` registers fullscreen behavior when connected and unregisters when disconnected.
- `applyFullscreen` recursively searches the document's shadow roots, hides generic header matches, and changes every `#view` to `var(--marao-safe-area-inset-top, env(safe-area-inset-top)) 0 0` for an iPhone user agent. It saves prior inline styles and retries on an existing one-second timer. It does not use Home Assistant's app-aware inset variables or side insets.
- Popup overlays are fixed at `inset:0`; their sheet uses configured height/max height, defaults to `80dvh`, and has ordinary horizontal padding. Popup bottom clearance and navbar position use Marao overrides with direct browser `env()` fallback.
- The accessibility runner supplies Chromium safe-area emulation **and** matching `--marao-safe-area-inset-*` overrides, with one portrait top value (47px). Its environment probe confirms the supplied insets but does not prove that app-only inset values protect rendered dashboard content. Existing navbar tests mainly inspect source strings.

Read-only inspection of the disposable browser found `viewport-fit=cover` already present, a `hui-view-container#view` at top zero, and zero current safe-area values. Its loaded Home Assistant root CSS defines `--safe-area-inset-top:var(--app-safe-area-inset-top,env(safe-area-inset-top,0px))`, with equivalent definitions for the other sides. This identifies a missing input in Marao's fallback chain. It is an inference about the reported defect, not physical iPhone testing. The browser also displays a native connection warning; no deployment or repair was performed during planning.

WebKit documents dynamic browser safe-area variables and the effect of `viewport-fit=cover`; see [WebKit guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/). Home Assistant documents safe-area handling for custom panels and forwarded inset variables; see [Home Assistant frontend guidance](https://developers.home-assistant.io/blog/2026/07/31/frontend-component-updates-2026.8/). The dashboard is Lovelace rather than an iframe/custom editor panel, so do not copy the editor-panel opt-out configuration into the dashboard fix.

## Goals / Non-Goals

**Goals:** Consume the actual host/app inset source; keep content and tall popup controls clear; update after orientation/inset changes; keep ownership local to the active dashboard; reproduce the missing-input case with existing tools.

**Non-Goals:** Device-model detection or notch tables, a new configuration option, changing native app status-bar settings, modifying global viewport/zoom metadata, adding a polling subsystem, a platform package upgrade, or inspecting the user's other installation. Branding and the reconnect follow-up stay separate.

## Decisions

### 1. Use a shared CSS fallback expression that includes Home Assistant's resolved value

For each required side, retain the existing Marao development override first, then consume the locally inherited `--safe-area-inset-*` value, then `env(safe-area-inset-*, 0px)`. Home Assistant's resolved variable already incorporates its app override. A defined zero is valid: do not replace it with a guessed positive number or take the maximum of all competing sources.

Keep the resolution in CSS so rotation and late app-inset updates recalculate without a JavaScript pixel snapshot. Reuse a short shared expression/token if needed by shell, navbar and popup; do not add a service or configuration abstraction. Keep development overrides out of fixture/theme production defaults. Device names and synthetic test insets are test inputs only.

Using only `env()` misses the app-provided source observed above. A fixed 47px/59px pad or per-model table cannot describe all device, status-bar and orientation configurations. Changing viewport metadata is unnecessary on the inspected instance and risks modifying the host's behavior globally.

### 2. Give safe-area clearance one owner per rendered surface

Scope fullscreen lookup to the active Lovelace root belonging to the connected Marao navbar and current dashboard route, not every matching header/view in the document. The page container owns top and side clearance, not individual cards, templates or generated YAML. Preserve normal padding, using the greater of normal edge spacing and the effective unsafe-edge clearance where they describe the same edge; do not add the full inset at each nested wrapper.

Honor the host's local resolved values at the active container. If an outer host already reserves the unsafe region, retain that ownership and apply only clearance still needed at the Marao boundary. A local resolved zero must remain authoritative; do not fetch a positive root/app value and force it into an already protected descendant. Add geometry tests for both edge-to-edge and host-padded containers so the same unsafe region is never counted twice. Do not infer notch height from a card's changing scroll position.

Preserve prior inline values and priorities for every style property Marao changes, restore replaced containers, and restore all owned changes on route exit/disconnect. Retain the existing lifecycle mechanism unless a focused test exposes an ordering defect; do not add another periodic scan. Native settings and the administrator editor must remain host-managed. CSS inset updates must work while the same view stays mounted, and newly rendered views must receive the current rule.

### 3. Bound popup sheets while leaving the backdrop full-screen

Keep the backdrop at the viewport edges. Give the overlay's flex content area effective top/left/right safe bounds with border-box sizing so its child sheet is constrained to usable space; clamp the sheet's configured maximum height to that space. Preserve configured auto/fixed heights within that bound, centered first-column-width behavior and sticky close header. This moves a tall sheet below the notch without adding artificial top padding to every short sheet.

Resolve top/side insets at the overlay's own ancestor boundary because it is outside the page container. Keep bottom navbar/content clearance and the accepted lowered iPhone navbar offset numerically unchanged apart from consuming the host-aware inset source. Side-constrain the floating navbar if needed to stay in landscape safe width, retaining 48px entries and existing compact wrapping. Do not change focus trapping, background inertness, scroll containment or gestures.

### 4. Exercise the production fallback, not only the existing test shortcut

Extend the existing accessibility runner with a small focused safe-area mode or helper. Test two independent paths: real browser `env()` with no Marao override, and app-provided inset CSS variables with browser insets zero or different. Clear test overrides when switching paths. Include explicit zero, two distinct positive top values (for example synthetic 47px/59px), side insets after rotation, updates on an already-mounted view, an already-safe host container and route exit/reentry. These are synthetic values, not promises about particular phone models.

Assert visible geometry: the first content edge relative to its safe boundary, absence of duplicate gap, sheet title/close containment, navbar containment and final-card reachability. Unit/source checks alone cannot establish this. Extend existing navbar/accessibility-profile tests and use installed Playwright/Chromium; no framework or paid service is needed. Keep existing diagnostics strict. If a connection warning or other defect prevents meaningful inspection, resolve the disposable environment or report the validation limit without suppressing it.

## Affected path and verification

The planning affected-card set is empty. The implementation's shared page width/padding and sheet bounds affect all generated Marao cards and the complete Cases gallery, every popup content variant, navbar and popup hosts. Inventory current families/views from the existing coverage map and `ha-test/cases.json` before implementation; do not rely on historical counts.

Builder fields, JSON schema, validation and translations require no new options or text. Generator/navbar/popup output remains consumer-compatible. Theme colors and typography remain unchanged; use the shared runtime for clearance rather than adding theme-specific offsets. Canonical fixtures stay in `ha-test/`: update a representative existing tall/auto/fixed popup and add a safe full-height example only if current fixtures cannot exercise the bound. Keep a realistic generated-page counterpart, using existing fake entities. Do not duplicate every card for each inset value.

Start with `node --test tests/frontend/marao-navbar-card.test.js tests/frontend/accessibility-profiles.test.js tests/frontend/gallery-cases.test.js` and the focused safe-area browser cases. Run `npm run test:ha:alignment` because shared available-width rules can affect icon-only layouts. During final validation run the existing mobile accessibility matrix and the added app/browser inset cases against the current workspace on `192.168.0.28`, covering both themes, 320px, iPhone/Android portrait/landscape and all supported text/zoom modes. Preserve existing release profiles; extra targeted cases need not multiply every gallery permutation.

After the last edit and focused automated checks, deploy and visually inspect the full affected gallery, realistic views and all affected popup content as the final validation step. Include first-load, scrolling, rotation, inset changes and leaving Marao. Report automated emulation honestly. Actual iPhone app confirmation is valuable if the user can inspect the disposable instance, but is not a prerequisite outside the repository's acceptance contract.

## Risks / Trade-offs

- [Affected installation/version is not inspected] → Reproduce the concrete app/browser inset mismatch on the disposable instance and preserve the unresolved real-installation diagnosis in verification notes.
- [Home Assistant DOM or safe-area ownership differs across versions] → Scope to the active dashboard, use inherited host values and test host-padded versus edge-to-edge containers; avoid broad document mutations.
- [Emulation masks the production path] → Run app and browser fallback cases without `--marao-safe-area-inset-*` overrides and assert rendered geometry.
- [Landscape safe width reduces room for controls] → Preserve wrapping and touch sizes, then run alignment and both-theme mobile checks.
- [A height clamp hides popup content] → Keep internal scrolling and inspect tall/auto/fixed sheets, enlarged text, close controls and last-content reachability.

## Migration Plan

No configuration/data migration is needed. Preserve entities, routes, custom YAML, saved dashboard options and native app settings. Run the deployment dry run and synchronize only the disposable instance; confirm its served frontend fingerprint. Roll back by restoring the prior runtime/tests/fixture revision and refreshing the disposable frontend.

This change authorizes planning only. Future implementation must complete its checks and visual gate before archive. Any later push, tag or release requires `npm run verify:publish` and exact-commit CI; the native reconnect issue remains a separate unresolved follow-up with no continuing publication exception.
