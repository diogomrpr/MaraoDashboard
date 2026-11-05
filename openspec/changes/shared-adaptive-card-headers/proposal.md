> Withdrawn on 2026-11-05 at the user’s request: retain the previous top alignment and name size; the later 36px enlargement was also reverted. Retained as proposal history; do not apply the centered-header, adaptive-size or icon-consolidation tasks below.

# Proposal

## Why

The cover name is top-aligned with its right-hand icon and uses a fixed enlargement regardless of line count. The same compact header is used by other control cards, while generic icon surfaces have competing sizes; one shared composition should center names and use the icon's height well.

## What Changes

- Vertically center the name itself beside the right-hand icon in every eligible compact control header. Keep text left-aligned; secondary readings belong below the name/icon row and must not offset the name's center. Preserve the cover's new in-bar state.
- Share a 48px circular primary icon surface and 28px glyph through common sizing tokens. Consolidate generic circular entity/activity/history/color icons across cards, including narrow layouts; retain purposeful artwork, logo, badge and operating-control geometry.
- Share two token-based name sizes: a prominent single line when the complete name fits, otherwise a smaller wrapping name whose two ordinary lines fit the icon height. Never reduce below the user's primary text size, truncate a name, or defeat accessibility scaling. Longer names or enlarged text grow/reflow naturally.
- Apply this to light, fan, cover, access-summary and standard open/close/lock/unlock controls, including compatible hold actions and normalized aliases, in every host. Audit every other card family and record why its existing composition is retained or shares icon sizing only.
- Replace the cover-only font override with the common rule, and reconcile the earlier no-shrinking wording with this explicitly requested bounded single-line/two-line choice.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: shared generic primary icon size, centered compact names, bounded adaptive typography and readable overflow fallback across eligible families.

## Impact

**Planning baseline:** `7b500719b6318261bd33a2bda13ce6a5e09c6341`, with existing uncommitted cover, media, navbar and editor work preserved. This request changes planning artifacts only; its current implementation affected-card set is empty.

**Intended implementation affected-card set:** compact name layout for `md_light_card`, `md_fan_card` (native fans and safe cover-backed ventilation), `md_cover_card`, `md_access_card`, `md_access_slide_action_card`, standard lock/cover `md_access_action_card` and compatible `md_access_hold_action_card` selected by `standardControl()`. Includes normalized service openers, supported slider-absent variants, generated/manual/native cards, group members and popup members wherever a visible name/icon header exists. Generic circular primary icon sizing also reaches shared `.icon` consumers such as base, navigation/entity-group, sensor/battery, switch/scene, climate, media, weather, vacuum, appliance and graph cards when that icon is rendered, plus equivalent Glance/activity and access-popup entity icons. Their full-width titles and specialized controls stay intact. The design inventories the remaining families and explicit exceptions.

**Observed:** `MaraoCards.js` owns `standardControl()`, compact markup, generic `.icon` styling, the cover-specific 1.25× title rule and dedicated access-popup rows. Compact icon surfaces are 48px, general surfaces 52px, narrow general surfaces 40px, and glyphs 28px or 24px. Baseline specs require full-width titles outside the compact families and prohibit automatic shrinking; the proposed bounded variants are an explicit exception, not permission to shrink arbitrary content.

**Compatibility:** presentation and measurement only. Preserve names, explicit field hiding, accessible names, capabilities, actions, persisted/public options, released configurations, generated structures, ordering, unknown/raw/protected content and historical archives. No migration, schema, version bump, dependency or user setting is proposed. Existing card configurations receive the shared runtime behavior without saving/regeneration. Preserve the completed `inline-cover-state` behavior.

**Non-goals:** change state semantics or move every state into a slider; redesign full-width title families, room artwork, Glance's vertical layout, brand tiles, navbar, slider thumbs, safety gestures, Monaco or native/third-party HA cards; implement, deploy, publish or run a comprehensive test campaign during this proposal.
