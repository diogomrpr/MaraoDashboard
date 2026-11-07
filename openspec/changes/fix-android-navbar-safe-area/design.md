# Design

## Context

See [proposal.md](proposal.md) for the reported overlap. Starting commit: `fa71c7a33798b32480eab41bfad6f038e8b1ebf9`. The pre-edit snapshot is `/private/tmp/marao-android-navbar-safe-area.json`; the pre-existing untracked `add-popup-template-editor` change is unrelated and must remain untouched.

`MaraoNavigation.js` already owns `safeArea()` and `navbarBottomGap()`. Navbar CSS, touch-barrier height, refresh feedback, maintenance padding and fallback page clearance use this helper. Page clearance also measures actual navbar geometry. `MaraoCards.js` uses the same helper for popup scroller padding; its existing max with the safe inset does not add that inset twice. Overflow uses current measured controls and viewport bounds. Portaled sheets retain live inset inheritance.

## Goals / Non-Goals

**Goals:** clear Android's system bar with the existing 24px floating gap, preserve iPhone positioning and make all shared consumers agree.

**Non-Goals:** alter navbar actions, routing, editor layout, dimensions, theme or app settings; introduce device constants, extra fixtures or new test tooling.

## Decisions

- Return `calc(24px + ${safeArea("bottom")})` for the existing non-iPhone branch. Keep the iPhone/iPod branch exactly as shipped. A one-off Android offset would ignore device/navigation differences; changing the iPhone formula would violate the accepted placement.
- Retain CSS resolution rather than reading pixels into JavaScript. Existing precedence is Marao override, HA local inset, browser environment, zero. Explicit zero stays authoritative and changes remain live without configuration updates or new listeners.
- Change the shared helper only. Existing consumers already share it; inspect geometry and popup inheritance rather than introducing duplicated padding.
- Preserve builder/validation/generator/configuration contracts and existing theme tokens/translations: no new data or visible copy is involved. Saved releases need no migration; existing gallery and realistic dashboard pages already demonstrate navigation and popups.
- Extend `tests/frontend/marao-navbar-card.test.js` to exercise the real helper for Android/non-iPhone and iPhone/iPod user agents, retaining existing fallback/shared-consumer assertions. Run this file only, then install with `prepareFrontend()` on disposable `192.168.0.28` and use its readiness/served-asset checks.

## Risks / Trade-offs

- Incorrect or missing device-reported inset → use the existing authoritative fallback chain and hand actual three-button/gesture navigation confirmation to the user; never guess a model-specific height.
- Double clearance from a host already protecting the edge → preserve its explicit zero and do not add the inset again in consumers.
- Existing iPhone compact placement regresses → keep its expression unchanged and protect it in the targeted regression.

## Migration Plan

No configuration or data migration. Sync final frontend assets once using the existing guarded helper, preserving dashboard configuration and safe helpers. The helper handles staging/recovery and verifies current assets. No production access, physical actions, release or publication are required. A later push/tag/release uses the unit-only `verify:publish` gate separately.

## Acceptance

Non-iPhone spacing resolves to 24px plus the current inset (48px inset gives 72px; zero gives 24px), retains explicit-zero precedence and updates through CSS. iPhone behavior remains unchanged. Shared navigation/page/popup spacing remains aligned, with full-size controls and native editor behavior preserved. Review and the targeted unit test cover the code contract; user phone checks cover actual OS inset reporting and reachable page/popup controls.

## Implementation evidence — 2026-11-06

- The runtime diff changes only the non-iPhone helper result. The existing inset precedence, iPhone/iPod expression, control dimensions, native editor behavior and all shared consumers are unchanged. CSS retains live resolution; consumer review found no duplicated inset addition.
- `node --test tests/frontend/marao-navbar-card.test.js`: 24 passed, including the extended actual-helper regression and existing popup inset-inheritance, route partition, control sizing and shell restoration checks. This is unit/source-contract coverage, not physical-device geometry proof.
- `openspec validate fix-android-navbar-safe-area --strict --no-interactive` and `git diff --check` passed. The affected-scope plan was reviewed; its additional suites were not run under the approved targeted-test scope. No files from unrelated work were excluded from the task diff or changed.
- `prepareFrontend()` succeeded on disposable `192.168.0.28` in native mode, with installed identity `4221507a13a79bd15414bf0d9c1dba246280b2d0428250b592f105025b00280f`. The helper verified installed/served assets and unchanged dashboard configuration; no fixture reset, browser visit, production access or release occurred.
- Test URL: `http://192.168.0.28:8123/marao-dashboard`. Reload the dashboard if it still displays old assets. Manual handoff: confirm clearance above Android's three buttons, sensible gesture-navigation spacing, and reachable final page/popup controls. The pictured phone's actual inset and appearance remain unverified.
