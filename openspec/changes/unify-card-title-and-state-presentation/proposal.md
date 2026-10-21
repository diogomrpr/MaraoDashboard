# Proposal

## Why

Most card titles still share a row with an icon or control, unnecessarily wrapping on phones. Redundant binary-state text adds clutter, while unavailable and failed states do not consistently change the entire card surface.

## What Changes

- Give every visible Marao card title the full usable content width, with icons, readings and controls below it. Preserve intentionally hidden titles and icon-only controls; allow essential wrapping at large text sizes.
- Remove redundant normal binary-state text, starting with lights and applying the same semantic rule across card families. Use distinct active/inactive backgrounds, existing icons and accessible state. Omit the separate round on/off badge across card families as subsequently requested by the user. Preserve values, transitions, summary counts, action labels and meaningful custom text. Honor the approved room-only exception: normal lighting uses its background without a visible lighting count or binary cue, retaining localized accessible status and visible problems.
- Make unknown, unavailable, missing, disconnected and recognized error conditions affect the entire card, with localized reasons and non-color cues. Neutral availability treatment and fault/error treatment remain distinct; partial failures preserve usable content and target-specific guards.
- Apply the policy to generated cards, builder-created cards and separate camera/history/energy cards, and keep gallery coverage, realistic pages, translations and documentation aligned.

## Capabilities

### New Capabilities

None; reuse the existing presentation and interaction capabilities.

### Modified Capabilities

- `mobile-theme-layout`: full-width titles throughout Marao, extending the existing compact-summary layout requirement.
- `card-behaviors`: concise binary-state presentation without losing domain meaning, readings, metadata or actions.
- `entity-state-actions`: consistent whole-card availability, fault, reported-error and partial-problem presentation with safe recovery.

## Impact

**Affected-card set:** all Marao-owned card families and variants: base/header/title, weather, glance, navigation, room, light/fan, cover/access and access actions, security, sensor/battery, switch, scene, number/Wallbox, climate, media/app, vacuum, dishwasher/washing-machine, graph/toggle-graph, timeline, energy-period and camera/event cards. This includes their popup and realistic-page uses. Informational/entityless cards receive title layout changes but do not acquire invented entity problems.

Observed on disposable `/marao-dashboard` at a 390×844 browser viewport: lighting titles have 258px instead of 322px of usable width and show redundant `Desligado`; navigation already gives titles a full row. Source inspection confirms the shared `title icon` grid, competing Wallbox/header controls, and separate camera/history renderers. Current availability styling often uses opacity, graph/camera errors use local text, and service failures use a native notification. Physical iPhone/Safari rendering has not been verified during this proposal.

Implementation reaches `MaraoCards.js`, `MaraoDashboard.js`, `MaraoFrigateEventsCard.js`, the shared theme/localization, `generator.py`, applicable `frontend_src/` catalog/model defaults, docs, existing frontend/browser/Python checks, and `ha-test/` Cases/fixtures. No dependency, API or configuration-schema addition is intended; preserve existing user configuration and unrelated work.

Non-goals: brand redesign, changes to Home Assistant-native or third-party cards, new state polling, a global optimistic state machine, safety-gesture changes, editor performance work or publication. Compose with the separate planned climate-feedback change without changing its requested-versus-reported distinction. This proposal creates planning artifacts only; application changes and full-gallery verification remain implementation work.
