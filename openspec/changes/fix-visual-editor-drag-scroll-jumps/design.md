# Design

## Context

See [proposal.md](proposal.md) for the diagnosis, baseline and complete affected set, and [the builder delta](specs/visual-builder/spec.md) for acceptance. A design is included because the distinction between pickup and intentional edge movement needs a precise decision before implementation.

`MaraoDashboardPanel.js` binds `bindCardDrag` once to its shadow root. `editor-drag.js` discovers the real scrolling ancestor across shadow roots, activates after 8 CSS pixels of pointer movement and immediately schedules its scrolling loop. That loop uses up to 64 CSS pixel edge bands below the sticky header/above the viewport bottom and up to 14 CSS pixels per frame. Pointer position alone currently triggers scrolling.

The source row stays mounted; `panel.css` changes its border style and positions the insertion cue outside layout. The panel's pointer-aware `focusin` handler already avoids revealing a pressed native button. The isolated reproduction found no stationary-press jump, so focus changes require a failing native-input example rather than speculation.

`tests/editor-drag-checks.js` reveals the row at `block: start`, activates it and only checks the drag marker. Its intended-edge-scroll and off-handle-scroll cases do not assert pickup stability. Unit coverage currently tests insertion geometry only. The completed drag delta is not yet synced into the durable builder spec; these new requirements supplement it without rewriting its evidence.

## Goals / Non-Goals

**Goals:** Use a small amount of transient intent state inside the existing session, distinguish activation from scrolling, and preserve live targets, one-release commits and the existing lifecycle cleanup.

**Non-Goals:** A gesture framework, persisted settings, global scroll locking, time-based dwell activation, new dependencies or changes to scroll speed, row geometry or the model/serializer.

## Decisions

### 1. Keep pickup unarmed and require subsequent edge-directed travel

Retain the existing 8 CSS pixel drag-activation threshold. The activating event records the current pointer position but never arms or starts scrolling, even if its movement was diagonal or crossed a large distance. The row marker, insertion feedback and activation haptic still acknowledge pickup immediately.

Proposed implementation defaults are 16 CSS pixels of additional vertical travel to arm scrolling and 8 CSS pixels of inward reversal to disarm it. The former is twice the existing activation distance; the latter tolerates small touch jitter. These are shared internal constants, not user settings or saved fields. Unit and native-input checks must exercise the boundary values. Adjust them only if focused usability evidence requires it, updating the assertions and this decision together.

While unarmed, track the approach from the activation position or the furthest subsequent inward position for that edge. A later real pointer movement must travel at least 16 CSS pixels outward from that reference and be inside the current edge band to arm it. Moving inward updates the reference, so an extreme-edge pickup can move inward and deliberately approach again. Horizontal motion cannot accumulate vertical intent, and the activation event's displacement cannot count toward the additional distance.

Alternative: reducing speed or shrinking the edge band still scrolls unexpectedly on pickup. A dwell timer lets a stationary pickup eventually move the page. Disabling edge scrolling prevents long same-page moves. Requiring extra directional movement addresses the observed trigger while retaining that capability.

### 2. Retain scrolling only while the armed edge remains intentional

Once armed, a stationary pointer in that band keeps scrolling through the existing single animation-frame loop, enabling offscreen destinations. Leaving the band stops immediately. An inward reversal of at least 8 CSS pixels from the most edgeward pointer position also disarms it. On disarm or band exit, discard previous approach distance and rebase the edge's reference to the current pointer; then track the furthest inward position from that new reference. A renewed 16 CSS pixel approach is required before restarting, so a 1 CSS pixel outward twitch after reversal cannot rearm it. Track pointer coordinates rather than row positions so the scroll itself cannot manufacture intent.

Keep the existing scroll-host discovery, edge widths, speed and bounds. Read current header/viewport/container geometry rather than caching it. Resize/header movement must not arm a previously unarmed pickup; the next qualifying pointer movement uses the new bounds. An armed edge that is no longer valid stops. At a scroll limit, stop scheduling frames until further qualifying input makes progress possible.

Use existing cleanup to clear intent and pending frames on release, cancellation, lost capture, Escape, tab/model/busy/modal changes and disconnect. Retain current stale-source validation, consumed-click handling and one valid-release commit. Do not add a separate gesture state system.

### 3. Preserve the surrounding editor and persistence contracts

The path remains shared row/handle -> transient drag session -> existing `movePageCard` commit -> existing dirty/section refresh/focus behavior -> explicit Save & Generate. Python validation, `editor-model.js`, generation, IDs, popup references, archived history and supported released conversions require no changes. Their expected transformation for a pickup or cancellation is identity: source and dirty state remain exactly as before. A successful release retains the independently specified existing ordering result.

Keep handle-only `touch-action: none`, semantic names, 48 CSS pixel controls and strong haptics. Native scrolling outside the handle, keyboard field reveal and explicit up/down/section moves continue normally. If a partly visible handle still produces a native-focus jump, fix only that demonstrated handle interaction in the shared panel path, and add its regression without changing ordinary focus reveal. No theme change or new visible control is expected. Update existing English/Portuguese help together only if on-screen guidance changes.

Update `docs/docs/installation/configuration.md` to distinguish stable pickup, deliberate approach and sustained edge hold. Keep the source/check links current. Reuse existing `ha-test/cases.json` safe examples and Studio's mixed sections, duplicates and empty destination under the same `/marao-dashboard`. Update their editor scenario expectations/coverage and add only a missing distinct long-list case; existing safe entities suffice, without new helpers or runtime gallery routes.

### 4. Measure scroll stability rather than relying on visibility

Extend the existing drag regression instead of adding a separate test runner. Record the actual scroll host's offset, source-row bounds, source and dirty state before pressing. With native mouse and emulated iPhone/Android touch, check press, movement below activation, horizontal and diagonal activation, then a stationary hold across multiple animation frames. Cover top, middle and bottom pickups on a genuinely scrolled section, plus a partly visible handle. Assert unchanged offset and geometry within a documented subpixel tolerance before intentional scrolling; do not use a large tolerance that accepts visible jumps.

Then check threshold-minus-one and threshold movement toward each edge, movement away while still inside its band, sustained scrolling after arming, reversal/rearm, current insertion geometry, scroll bounds, layout changes and terminal cleanup. Assert preview/cancellation equality, one valid move and zero save/entity calls. Preserve the existing off-handle native scroll and successful long-distance transfer tests.

Use the reviewed `editor-drag` component in `test:affected --plan`, including its existing model/panel, generation/migration, asset and selected mobile checks. The map currently selects `--drag-geometry` for narrow, landscape and enlarged profiles, and that path skips the full gesture block. Run the small pickup-stability assertion in that path in the reference theme, or select an equally narrow pickup mode; visibility alone cannot prove stable pickup. Keep full long-distance/commit flows on representative iPhone/Android profiles. If demonstrated focus handling changes the panel, review the additional shared-file selection rather than hiding its consumers. Run checks serially after the coherent batch's final edit. Geometry/behavior uses the reference theme; retain representative appearance in both themes and narrow, landscape, bold, text-200, zoom-200 and bold-plus-text cases selected by the map. Keep existing alignment selection where required by the gate; there is no planned geometry redesign. A full suite or 26-profile matrix is unnecessary.

## Risks / Trade-offs

- An extreme-edge pickup has little outward travel available -> support an inward move followed by a deliberate reapproach, and inspect short landscape/enlarged layouts.
- Tiny touch jitter could repeatedly stop/start scrolling -> use distance thresholds and explicit reversal hysteresis rather than per-frame direction guesses.
- Viewport/header changes could recreate the original trigger -> only real post-activation pointer movement can arm scrolling; geometry updates alone cannot.
- Test setup could mask the jump by revealing the row mid-gesture -> position before recording the baseline, then avoid test-driven scrolling until pickup assertions complete.
- Browser focus differs from the isolated harness -> verify the actual prepared Visual editor before declaring the issue fixed; retain only representative success and failure captures.

## Migration Plan

No saved-data or generated-contract migration is needed. Preserve format 2 and supported historical inputs unchanged; existing focused model/generation/migration checks cover the unaffected boundary, without inventing new release replay fixtures.

Build related editor assets together, run the covering focused checks, then deploy only to disposable `192.168.0.28` and inspect representative Cases/Studio editor interactions as the final step. Pickup checks remain read-only with respect to saved data. If a selected existing Save/reload check writes data, retain its exact source, generated-output and affected-owned-state backups, preflight, concurrency checks, atomic writes, recovery and verified cleanup; report failed rollback.

Rollback restores the matching editor package/assets. If any persistence probe ran, restore the matching package plus exact saved data/owned-state baseline together through the existing helpers, preserving unrelated edits. Historical live upgrade proof is conditional on an actual expansion into persisted/ownership/installation changes during explicit release preparation; it is not selected for this UI-only plan. Publication remains a separate request with the scoped `verify:publish` gate.
