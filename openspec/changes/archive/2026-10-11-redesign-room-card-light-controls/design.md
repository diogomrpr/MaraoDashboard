# Design

## Context

See `proposal.md` for the requested visual change and affected-card scope. Current `hc_room_card` uses the shared title/icon grid, circular `.icon`, normal `.state` and full-width `.room-lights-off` button. `_rooms_view` supplies a primary entity, room name/icon, full `light_entities` and a navigation action. The highlight considers primary state instead of the light list; the action's disabled state already considers that list.

End-to-end path: existing room/builder options → generator shortcut/light-list configuration → shared `MaraoCards.js` renderer/state/action/CSS → theme/localization → Cases and realistic Rooms. Tests currently cover room colors and generator light-list output; `test-ha-card-alignment.js` includes room controls and shared icon geometry. Cases include room states, empty navigation and one-light-unavailable, but need an off-primary/on-secondary room case.

The supplied image demonstrates hierarchy, location and deliberate icon cropping. It does not select a gold palette or require pixel-identical tall card dimensions. Use existing Marao themes, Montserrat and scalable mobile layout. No asset generation is needed.

## Goals / Non-Goals

**Goals:** distinguish the single lighting control from room decoration, aggregate all selected lights, retain navigation and guarded one-shot lights-off, and keep titles/errors readable in small two-column cards.

**Non-Goals:** new card type, membership/discovery changes, turning lights on, optional layout switches, generalized watermarks across every family, brand/palette replacement or new dependencies.

## Decisions

### 1. Derive one room-light presentation from explicit targets

Within the shared room-card branch, normalize and deduplicate configured `light_entities` once and reuse that list for summary, semantic status and dispatch guards. Known on/off members determine normal active/inactive state; any known on light activates an otherwise normal room. The primary `entity` and legacy `lights_target_entity` are not authoritative membership sources. No light list means no lighting status or action; an unrelated primary sensor/cover must not imply a light is on.

Track missing/unknown/unavailable members separately and retain known active information in the semantic summary. Any such problem or a disconnected HA takes neutral problem precedence and disables All off, with localized readable partial/all-unavailable information. Do not label unknown members All off. Navigation remains an independently configured local action and must not inherit lighting service availability. Leave generic overview/group summary semantics unchanged.

Normal room state text, zero-active counts and All off labels are omitted from a dedicated visible row. Keep a localized lighting summary in the navigation surface's accessible description, separate from its room/destination name. Do not remove deliberate non-state custom labels or meaningful configured readings as a side effect. Preserve visible abnormal information. This user-directed room-only choice is a narrow exception to the baseline's general non-color visual normal-state cue; reconcile it with `unify-card-title-and-state-presentation` during implementation without broadening the exception or rewriting other proposals here.

Alternative rejected: adding `summary_entities` to generated rooms alone would leave manual room cards wrong and conflate a room's lighting policy with generic summary state. Fix the runtime once and verify generator inputs.

### 2. Room-specific foreground and decorative layers

Add a room-specific body/layout class and a separate decorative room-icon element. Give the title the entire content width, then reserve a lower-left action area. Let the card's height grow with wrapped title/error content. Use the existing configured room icon and existing show-icon/name options; do not fetch images or invent a new persisted background-icon option.

Position the large icon absolutely at the lower right, behind foreground content, with proportionate size and controlled negative right/bottom offset for the requested partial crop. Remove its circular badge/background. Reuse semantic room/icon colors with subdued decoration in both themes. The icon is decorative (`aria-hidden`, no focus role, no hit target, pointer events off); the existing card clipping contains it. Keep its region below the title and away from the action, reducing/repositioning decoration at narrow or enlarged-text layouts rather than shrinking text or controls.

Do not reuse the interactive `.icon` class for this artwork. Geometry checks should classify it as decoration, while still measuring the actual lights button and every other real control. Intentional decorative edge crop is allowed; clipping title, error or controls remains a defect. Scope CSS/state hooks to `hc_room_card`; shared number/media/navigation icons retain their contracts.

### 3. Compact native child button, unchanged service semantics

Replace only the room All off markup/layout with a native circular button using the existing lights-off glyph, a contrasting control surface/boundary and a 48 × 48 CSS-pixel visible minimum. A 24–28px centered glyph makes it visually compact; do not confuse glyph size with target size. Anchor it at the lower left. Remove the visible text span and full-width sizing but retain the existing localized `room.turn_off_lights` accessible action/room name, optional tooltip and strong haptics. No hover-only or focus-only presentation.

Preserve the complete deduplicated list and existing one-shot `light.turn_off` action. Stop propagation/default navigation and recheck the actual connection and all targets at dispatch, including state changes since render; disabled markup alone is insufficient. Activation never opens the room. Tapping elsewhere, including the decorative area, follows the existing room navigation without dispatching a light service. Do not add all-off confirmation, turn-on behavior or optimistic state. The button remains present for configured lights under the current available-state semantics; no new hide-on-all-off option.

### 4. Keep configuration and generation stable

Retain public `hc_room_card`, room name/icon, `light_entities`, navigation actions, custom labels and existing advanced/raw options. Verify `_rooms_view` and any generic/template shortcut path carry the full selected light list and independent route; remove no membership configuration to implement a visual change. Builder previews, if present, must share the runtime layout. There is no new editor setting or schema version.

`unify-editable-page-templates` already plans room shortcuts with explicit light targets and an All off child. This redesign changes their presentation without depending on that unfinished page conversion; preserve the light-list contract when it lands. Reuse existing theme tokens and EN/PT action copy; add only needed semantic summary/availability strings. The missing dedicated room-card documentation should be filled in alongside the card index/navigation guidance so manually configured examples receive the same behavior.

## Risks / Trade-offs

- Large decoration could cover content or intercept taps → separate noninteractive layer, reserved foreground space, scoped clipping and explicit narrow/enlarged-text inspection.
- Background could show Off while another light is On → derive from the full explicit list and test first-off/second-on, duplicates and partial unavailable cases.
- Action could leak into navigation or act after disconnect → child event isolation and current target checks; test zero navigation plus exactly one service call and haptic on valid activation.
- Other card icons could inherit the layout → room-specific classes/branches and representative neighboring-card regression checks.
- Normal state relies visually on color by request → keep semantic state and visible problem information; do not treat this exception as permission to remove status cues from other families.

## Migration Plan

This is a shared presentation/derived-state correction, with no persisted transformation or format bump. Historical room configurations keep names/icons/routes/selected lights, unknown/raw options and protected content. Add provenance-backed compatibility assertions that saved JSON is unchanged and older room cards still navigate/dispatch correctly with the new runtime. Maintain the upgrade feature inventory; previews/dry runs remain read-only and history archives remain immutable. Any complete rollback restores the matching prior package and exact source/output/affected owned-state baseline, using existing backup/recovery rather than a starter reset.

Update safe Cases and realistic Rooms with active secondary, all-off, no-light, disconnected and partially/all-unavailable states; use representative bed/door/garage icons and a long room name for composition without duplicating arbitrary icon permutations. Test render/aggregate/actions, generator preservation and gallery fixtures first, then run `npm run test:ha:alignment`, disposable dry-run/sync and final visual/interactive inspection of every affected room card at 320px/iPhone/Android portrait/landscape, both themes and the normal/bold/200% text/200% zoom/bold-plus-200% matrix. Inspect neighboring families if shared code changes. Any defect restarts focused checks and final inspection. No physical-phone test is claimed by emulation.

Use focused historical checks during development. Only explicit final-candidate versioned-release preparation runs the preserved-install upgrade scenario with historical room coverage and verified cleanup; a later push/tag/release still requires `verify:publish` and exact-commit CI. This planning task performs no deployment, implementation or release.
