> Withdrawn on 2026-11-05 at the user’s request: retain the previous top alignment and name size; the later 36px enlargement was also reverted. Retained as proposal history; do not apply the centered-header, adaptive-size or icon-consolidation tasks below.

# Design

## Context

See [proposal.md](proposal.md) for motivation and the [layout delta](specs/mobile-theme-layout/spec.md) for observable requirements. `standardControl()` and the `.compact-header` branch in `MaraoCards.js` already select the compact families across hosts. That header top-aligns a `.compact-copy` containing name plus secondary content against its icon. Generic icon dimensions are duplicated in `.icon`, `.compact-header`, narrow container rules, Glance and access-popup styles. The recent `inline-cover-state` change adds a cover-only name size; it must be replaced by the shared policy without undoing the state bar.

The existing no-shrinking typography rule conflicts with the requested larger one-line/smaller two-line treatment. This change explicitly permits two bounded variants for eligible names; all other readability, scaling and natural-growth rules remain binding.

## Goals / Non-Goals

**Goals:** center the actual name, use one common primary icon size, and select a predictable text variant across every existing compatible compact family. Preserve the established compositions of cards whose primary purpose is a reading, artwork, video or full-width heading.

**Non-Goals:** a configurable typography engine, continuous fit-to-box shrinking, redesigning every card into the same header, new saved settings, new entity discovery or any change to action/state handling.

## Decisions

### 1. Share by presentation role and inventory all families

Reuse the existing compact-family selector; do not branch on entity ID, title text, host or slider presence. All corresponding aliases use their effective runtime kind. Generic circular icon tokens are broader than the adaptive-name policy.

| Family / role | Shared adaptive name | Shared generic icon | Reason / retained composition |
| --- | --- | --- | --- |
| Light, including on/off-only and disabled slider | Yes | Yes | Existing compact header; optional color/Activity icon remains semantic. |
| Fan and safe cover-backed ventilation | Yes | Yes | Same header whether percentage/position control exists or not; retain open/close actions and custom labels. |
| Ordinary cover | Yes | Yes | Name centered beside icon; state stays inside supported position bar, with existing unsupported-bar fallback. |
| Access summary | Yes | Yes | Lock/cover state remains useful secondary content, below the name/icon row. |
| Standard open/unlock strict slides and normalized service openers | Yes, when header is visible | Yes | Share header without altering strict-slide geometry or dispatch. |
| Standard close/lock actions and compatible lock/cover holds | Yes, when header is visible | Yes | Same compact role; retain safe tap/hold semantics. |
| Dedicated access-popup action rows | Only actual visible compact headers | Yes for entity/Activity icon | Preserve deliberately hidden duplicate names and the existing action-row ordering; the sheet heading is a separate role. |
| Base, sensor, battery, switch and scene | No | Yes where generic icon exists | Current full-width names leave room for readings, power metadata, graph content and dropdown controls; preserve that contract. |
| Navigation, entity-group and overview summaries | No | Yes where generic icon exists | Long localized summary titles retain full width; expanded light/fan/cover/access members use their own eligible header. |
| Room | No | Only equivalent circular controls, if present | Full-width name and cropped background artwork stay intact. Room lighting/climate action glyphs keep their deliberate role. |
| Climate | No | Yes where generic icon exists | Preserve full-width title, large measured temperature, pending feedback, dropdown and numeric targets. |
| Number and Wallbox current | No | Only if a generic entity icon is present | Keep reading-led layout and the dedicated stepper dimensions; an arrow is not a primary entity icon. |
| Media and Plex browsing | No | Yes for generic parent entity icon | Keep full-width parent title and existing transport/browse composition; posters and library rows are separate roles. |
| Media-app shortcut | No | No | Logo-led square tile has no visible name or generic circular icon. |
| Weather | No | Yes where generic icon exists | Keep full-width title and forecast/readings. |
| Vacuum, dishwasher and washing-machine/appliance roles | No | Yes where generic icon exists | Keep operational content, measurements and controls below full-width titles. |
| Alarm/security and nonstandard explicit service/hold actions | No, unless already normalized to a standard control | Yes where generic icon exists | Keep separate full-width title, arming/hold feedback and action safety roles. |
| Glance | No | Yes for equivalent circular tile/Activity icon | Retain icon above reading and wrapping label, without inventing a horizontal header. |
| Graph/toggle-graph | No | Yes where generic icon exists | Preserve full-width names, primary measurements and history/chart content. |
| Timeline, power history, energy and camera-event cards | No | Only an equivalent generic entity icon if one actually exists | Dedicated full-width title/toolbar layouts remain; refresh/back/date controls are separate roles. |
| Camera live view | No | No new icon | Preserve full-width name and video surface. |
| Header/title, people, floor-plan, schedule and structural popup/grid hosts | No | No blanket restyling | Their headings, avatars, markers, action buttons or lack of entity header make a forced compact name row inappropriate. |
| Navbar, native HA and raw/third-party cards | No | No | Retain navigation geometry and external ownership. |

This is an explicit applicability decision, not deferred discovery. Future cards with the same compact presentation consume the same policy rather than copying cover CSS. Adding another family to that presentation is a separate product decision because current full-width names are intentional.

### 2. Consolidate generic dimensions without resizing distinct controls

Define internal shared runtime tokens for the 48px circular surface and 28px primary glyph, using existing styling infrastructure and fallbacks so manual/native cards do not depend on a separately installed theme. Apply the same values to equivalent icons in all table rows, `.compact-header`, generic `.icon`, Glance and access-popup entity/Activity icons. Remove competing 52px/40px generic surface and 24px narrow primary-glyph overrides. Keep the existing backgrounds, circular shape, accessible names, badges and action boundaries. Do not globally replace every numeric `48`, `28` or `--mdc-icon-size`: many belong to deliberate operating controls or artwork.

48px matches existing compact and Glance surfaces and the minimum touch target. Keeping 52px generic surfaces with a cover-only 48px override would retain the reported inconsistency; using 40px narrow interactive surfaces violates the touch contract.

### 3. Center the name independently of secondary text

The compact header row contains the visible name and right-hand icon with the existing 8px gap. Align their vertical centers. Move useful secondary content outside that row, immediately below it, rather than centering a combined name/state block. The cover's ordinary state remains inside its position bar. Custom labels, unsupported position fallback and meaningful availability/error feedback remain readable. Additional content can increase intrinsic height; keep the existing compact reference budget only for ordinary short fixtures without extra content. Preserve section equalization and bottom controls.

Hidden names/icons add no empty region. Without an icon the visible name reclaims full width and uses natural primary-size wrapping; icon-only roles keep their centered icon. Dedicated access-popup rows retain their intentionally different layout and do not gain duplicate titles.

### 4. Two typography variants, then natural growth

Use shared Montserrat primary weight and two relative size tokens. Proposed defaults are a large single line at 2× primary with 1.2 line-height and a compact variant at 1× primary with 1.25 line-height. At the current 18px primary size, these produce a 43.2px single line or two 22.5px lines within the shared 48px icon height. The large choice requires the **entire** name to fit both width and height; a short name that fits only at compact size uses compact. Both one compact line and two compact lines stay centered.

If the compact name needs three or more lines, or user typography makes two lines taller than 48px, preserve the complete text at primary size and let the header/card grow, with the icon centered against the name block. Existing section reflow may provide more width. No hard two-line cap, fixed text height, ellipsis, transform, smaller-than-primary fallback, or enlargement of the icon to compensate for long text. Enlarged accessibility text takes priority over fitting the icon's height.

This bounded two-choice policy replaces the cover's fixed 1.25× override. Continuous binary-search font fitting was considered and rejected because it introduces arbitrary sizes, repeated layout work and reduced readability. Width breakpoints alone cannot classify localized names reliably.

### 5. Measure only when the name's layout inputs change

Use browser text layout with the actual font, weight, letter spacing and available name width, through one small shared routine on the existing card owner. A noninteractive hidden measurement of the large one-line candidate avoids estimating character counts or coupling variants to their currently applied size. Select large only when its measured width and line height fit; otherwise select compact and allow wrapping. Keep the visible title node and operating controls mounted.

Observe available width using `ResizeObserver`, coalesce changes into a frame, and refresh on name/icon-visibility/config changes, locale/typography metadata and font readiness. Cache the relevant measurement inputs; an unchanged HA state update does not trigger measurement. Observe width rather than the chosen header height to prevent feedback loops. Handle initially hidden/zero-width hosts when they become visible. On disconnect, cancel pending work and remove observers/font listeners; reconnect schedules a fresh bounded measurement. Keep state updates and active gestures independent of this work. Add no dependency, polling loop or global state store.

### 6. Keep the rest of the authoring and delivery path compatible

`frontend_src/native-cards.js` and generated native wrappers already delegate to the shared card renderer. Generator/catalog/editor/validation changes are unnecessary unless a specific wrapper is found to bypass that owner; repair such a bypass at its shared source without creating a new option. Regenerate generated bundles through existing build commands, never by hand. No new strings are needed; continue rendering configured/friendly/localized names exactly.

Update the typography/header and uniform-control sections of `docs/docs/development/dashboard-quality.md`, relevant light/fan/cover/access documentation and `openspec/feature-coverage.md`. Reconcile pending delta requirements with `inline-cover-state` and the previous header/title changes when later synchronizing baseline specs, without rewriting historical evidence. Reuse existing gallery and realistic-page cases; add only an absent case needed to show a long name or reproduce a concrete issue.

## Risks / Trade-offs

- Extra secondary content can make a compact card taller → keep the name-only center independent of readings and preserve natural height/section equality; do not hide readings to hit a budget.
- Font loading, custom typography and narrow hosts can change fit → measure actual metrics, react to those inputs, and use the primary-size fallback until measurable.
- Choosing variants from current wrapped height can oscillate → always measure the large candidate independently, cache inputs and ignore height-only observer changes.
- New generic icon tokens can reach noncompact cards → audit actual consumers in the table, preserve their title composition and leave specialized control geometry alone.
- 200% text cannot always fit two lines in 48px → grow/reflow rather than counteracting user scaling; record this as intended behavior.

## Migration Plan

Planning only for this request. Future implementation changes runtime presentation without writing user data, generating dashboards or converting saved configurations. Preserve released names, keys, options, raw/unknown fields and historical fixtures. No data migration or live-upgrade campaign is necessary for this scope.

After the final implementation edits and essential targeted checks, install once on disposable `192.168.0.28` using `prepareFrontend()` and its served-asset/readiness checks; leave it installed. Browser/device appearance review is optional for the agent and otherwise handed to the user. Restore a prior frontend only to recover a genuinely failed operation, never regenerate dashboard data to roll back a visual layout.
