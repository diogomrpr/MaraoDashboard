# Design

## Context

See [proposal.md](proposal.md) for motivation and scope, and the [layout](specs/mobile-theme-layout/spec.md) and [generation](specs/dashboard-generation/spec.md) deltas for acceptance.

The generation delta's added requirement names preserve the completed, not yet
synchronized `standardize-control-grid` generation contract, extending eligibility
to logical sections while retaining source and ownership preservation. The layout
delta carries that contract forward with its revisions. Synchronization must
retain these successor texts rather than restoring the superseded 174px rule.

The current end-to-end path already provides the necessary ownership boundaries:

- `frontend_src/MaraoDashboardPanel.js`, `editor-model.js`, `canonical-page-model.js` and `page_model.py` preserve explicit sections/columns and ordinary card options. A flat canonical page represents one implicit section; automatic domain buckets are not additional source sections.
- `generator.py:_page_view()`, `_entity_container_cards()` and `_control_grid()` emit independent domain grids for automatic layouts and one mixed grid for fixed layouts. Only wholly standard-control lists currently receive `custom:marao-control-grid`; any fan, detailed family or raw sibling defeats eligibility.
- `MaraoCards.js:cardStyles()`, `standardControl()` and `MaraoControlGrid` implement the shared 174px minimum, separate state band, fractional equal rows, guarded card-factory mounting and context forwarding. Popup/group grids reuse the same style/lifecycle paths.
- `binaryState()`, `redundantState`, `displayValue`, `showState` and `cardProblem()` already distinguish redundant normal state from substantive content. The durable `Concise normal binary-state presentation` and entity problem/action requirements remain unchanged.
- Timeline/energy surfaces in `MaraoDashboard.js`, event surfaces in `MaraoFrigateEventsCard.js` and native hosts in editable `frontend_src/MaraoNativeCards.js` have separate stretching boundaries. Stretching a wrapper does not establish equal visible surfaces.
- Native cards mounted in an explicit Marao grid can share its section ownership. Independently authored HA-native sections remain HA-owned; this change must not rewrite their stored composition or inject styles into arbitrary Home Assistant/third-party shadow roots.

The design is warranted because sizing crosses generation, several renderers, native hosts and generated-output compatibility. It does not introduce a runtime framework or third-party dependency.

## Goals / Non-Goals

**Goals:** Separate compact intrinsic card composition from deliberate section equality; reuse the existing grid factory and source section model; make the section boundary, family participation and preservation independently testable.

**Non-Goals:** Per-row-only equality, dashboard-wide height coordination, a serialized density/height setting, hard clipping heights, native-HA layout takeover, new interaction semantics, or implementing the camera/history changes in flight.

## Decisions

### 1. Compact the existing content instead of reconstructing state

For ordinary light/fan/cover/access controls, place title and existing useful state/readings in a text block beside the existing icon/cue; place any value/strict slide directly below. Omit layout rows for absent content. Use modest shared padding/gaps rather than shrinking font tokens or transforming the card. Preserve hidden-name/icon and icon-only layouts without empty placeholders.

Keep binary classification and mandatory problem rendering intact. Do not call the normal state formatter merely to fill a new header line, and do not set `show_state:false` globally: both would respectively restore redundant On/Off text or hide meaningful position, mode, custom labels and problems. Existing non-color cues and localized accessible state remain. The room-only reduced-state exception remains unchanged.

The normal value-slider arithmetic is a useful budget: 24px vertical padding + 48px header + 8px gap + 48px slider = 128px, or the existing 52px icon/padding yields about 136px. These are layout budgets, not measured implementation results. Independently specified English Lamp/Fan/Blind and Portuguese Luz/Ventoinha/Estore value-slider fixtures must fit within 140px before equality in 172px-wide cells of a 352px section at 390x844 CSS pixels, normal typography, ordinary available 50% state and default icon, without extra labels/problems. Narrower cells, long names and larger text grow naturally; desktop-width proof does not satisfy this reference.

Strict access slides currently have a 64px minimum track and a 54px thumb, unlike the 48px ordinary range. Retain that geometry and all label containment; their compact cards can therefore need more height than ordinary value cards. A section mixing them adopts its tallest necessary height. Do not force safety controls into the ordinary 140px reference budget.

Alternative rejected: only lower the 174px token. The separate state band and flexible empty regions would remain, and a long title could still mask the improvement throughout the section.

### 2. Own height once per logical section

Generalize the existing `MaraoControlGrid` rather than adding another independent card factory. Retain legacy `{columns, cards}` input and its public type. Separate the compact-control classification from the owned-content membership policy: a fan, room, numeric, climate, graph or camera card can participate in section equality without adopting the ordinary-control header.

Use one CSS grid's intrinsic fractional rows for all content in a logical section. For fixed columns, retain the current ordered child list. For automatic layout, let the generator supply validated presentation-only group metadata containing the existing domain order, preferred group columns and group-start/full-width placement. Flatten those groups into the one grid, retaining group starts/spans and stable child identity. Do not mount independent equal-row grids and call their aggregate a section.

Use the saved section as the height boundary, including a flat page's implicit section. An explicit popup/group grid is its own boundary. Equalize across every row, including later-row title/error outliers, while each other section has its own grid and height. Preserve 8px gaps and incomplete-row widths. Preferred columns and automatic group widths reflow together when the section width or text size requires it; preserve strict-slide width constraints.

Alternative rejected: a page-wide tallest-card observer. It would couple sections, add measurement/lifecycle work and contradict the confirmed independent-section requirement. Nested grid coordination is unnecessary when the owned generator can preserve automatic composition within one grid.

### 3. Stretch every owned surface, preserve structural/raw roles

Retain the existing grid cell marker or a compatible shared section-cell marker and make every owned host-to-surface layer fill its grid cell. Keep `standardControl()` dedicated to compact family composition. Add a separate explicit owned-content membership policy with independently specified generator/runtime parity expectations; never infer eligibility from the currently rendered slider, entity availability or DOM child count.

Cover generic `MaraoCard` surfaces and native aliases, plus timeline, energy-period and camera-event surfaces where those are section children. In native adapters, stretch only the primary content child; generated popup siblings and zero-height hosts must not acquire a flex share. Preserve range inputs, card surfaces, popup keyed children and focus across HA updates, content changes, rotation and reflow.

The affected content set covers base/entity, header/weather/glance, navigation/room/group, light/fan/cover/access/security, sensor/battery/switch/scene/number/Wallbox, climate/media/app/vacuum/appliance, graph/toggle-graph/timeline/energy-period and event cards when mounted as content. Title headings, navbar and popup definitions are structural exclusions. Detailed families keep their current title/content composition and intrinsic media/chart/control requirements; equality adds space but cannot remove information or crop useful media.

Retain raw dictionaries, provenance, child order and configured widths. Raw siblings must not opt every owned sibling out of section equality. Their grid cells can participate in layout, but arbitrary third-party internals are neither changed nor represented as proven equal Marao surfaces. Unknown/raw content remains accepted by its existing factory path with explicit validation and readable failures.

Standalone native/manual cards share compact intrinsic sizing. Existing HA-authored sections keep HA editor ownership; equality is provided when an explicitly authored Marao grid owns the section. No automatic rewrite of native storage or starter/source selections is introduced. Document that existing boundary instead of promising equality from `getGridOptions()` alone.

### 4. Keep the source model and public card contracts stable

Use current section/column controls; add no persisted density field, discovery default or card-role rename. Keep old grid inputs valid while prevalidating any new generated group metadata before replacing working children. Extend the generator's fixed/automatic and legacy container paths together so setup, editor generation, service generation, native compilation of individual cards and history restore cannot disagree about a card's presentation.

Update runtime-native source and reproducible built output together if host styles change. Update configuration/card help, the quality guide, feature coverage and any generated layout descriptions. Add localized copy only if new explanatory/error text is introduced; never restyle Monaco internals.

The completed `align-slider-card-headers` and `standardize-control-grid` deltas contain accepted rules not fully reflected in the older durable mobile inventory. This successor preserves their requirement names, carrying their unsynchronized additions forward with compact sizing and broader section ownership. At later synchronization, reconcile predecessor additions and successor texts in chronological order as updates to those same requirements; do not introduce duplicates or reapply the old 174px texts afterward. Leave completed tasks and historical evidence immutable. No baseline synchronization or archive operation occurs in this planning turn.

### 5. Extend focused acceptance rather than weakening old assertions

Extend the existing `control-grid` scope in `tests/verification-map.js` with all affected renderer families and section-boundary cases; retain its generated-output upgrade classification. Reuse applicable `slider-headers`, slider, action, native, group, text, popup/scroll and history/event checks rather than duplicating compatible browser visits.

Specify expected membership, order, section boundaries, compact reference bounds and preserved child/source JSON independently of implementation helpers. Replace the 174px assertions in `marao-control-grid.test.js`/`control-grid-checks.js` deliberately, while retaining tests that reject per-row-only equality, shortened surfaces and lost active range inputs. Add cross-section isolation, automatic groups, mixed families, raw siblings and structural exclusions. A late error must grow only its own whole section and shrink back after clearing.

Canonical Cases need two independent sections with visibly different common heights, a mixed odd-count section, an automatic multi-group section, ordinary slider/sliderless/hidden-field states, a long later title/error transition, a detailed-family participant, structural/raw content and native/popup counterparts. Reuse safe fixtures; add a realistic room page with separate simple-control, slider-control and detailed-panel sections without changing users' saved placement.

After the last implementation edit, use `test:affected --component control-grid --plan` to confirm scope, then run the smallest covering serial selection. Include relevant `test:ha:alignment` geometry, ordinary slider gestures and strict access/hold dispatch checks. Geometry alone cannot establish action safety or data preservation.

Use reference-theme geometry for narrow 320, representative iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold plus 200% text; retain representative appearance/state/contrast in both themes and extra combinations only where the theme affects the contract. Share visits and retain failures/representative successes. Finish with direct inspection of representative affected cards, independent sections and difficult layouts on disposable `192.168.0.28`; inspect console/resources/warnings as defects. No full suite, all-profile gallery audit or parallel checks are implied.

## Risks / Trade-offs

- **A detailed card or long title makes its section taller** -> This is the requested section-wide equality; keep existing user-selected boundaries and explain separate sections for intentionally different densities without relocating cards automatically.
- **Automatic group metadata changes composition** -> Independently assert domain order, group starts, full-width/two-column placement, incomplete rows and responsive restoration against existing output intent.
- **An outer cell grows but a separate renderer remains short** -> Measure actual visible surfaces through generated, native and popup hosts, including energy/timeline/event adapters and zero-height popup siblings.
- **Compact markup restores On/Off or hides meaningful content** -> Reuse existing state selection; assert absent binary labels alongside retained labels, values, operational states, metadata and mandatory problems.
- **Reflow replaces a control during a gesture** -> Preserve mounted child identity and existing cancellation/availability guards; test safe completion, cancellation and relevant native touch behavior.
- **Old packages cannot interpret new generated metadata** -> Deploy matching assets/output together, retain exact backups and restore package plus saved data/output as one recovery operation.

## Migration Plan

1. Preserve dashboard format 2, HA config-entry version, source sections/options and public `hc_*`/old grid inputs. Review provenance-backed released fixtures for every supported format entering affected generation paths; retain immutable historical fixtures and independently specify current expected source and transformed owned output.
2. Update focused generation/native/history/upgrade coverage for section wrappers/group metadata while preserving deletions, explicit emptiness, columns, names, unknown/raw/protected fields, popup references, file ownership and unrelated HA settings. Test failure/recovery and unsupported-newer/ambiguous input rejection before deployment.
3. Reuse existing read-only previews/dry runs, exact source/generated/owned-state backups, preflight, staged atomic replacement and recovery retention. Protect concurrent edits and report rollback failures. Deploy the compatible UI and owned output only to disposable `192.168.0.28`, exercising safe fixtures and verifying loaded identities and cleanup.
4. During future explicit versioned release preparation, run scoped `test:ha:upgrade -- --scope control-grid` for affected supported source formats and generated-section features. Preserved-install proof, independent expected data, relevant failure recovery and disposable cleanup are required because owned output changes; fresh fixture preparation is insufficient. Require scoped `verify:publish`, applicable exact-commit CI and `verify:release` for publication. Reuse only unchanged valid evidence.
5. Roll back the matching previous package, exact source, generated output and affected owned state together. Do not downgrade assets alone while leaving new section metadata installed. No release, commit, push, tag or live upgrade is part of creating this plan.

### Compact Android widths

Ordinary groups use a 120 CSS-pixel cell floor and six times the primary font
size, shared by CSS grids and runtime group capacity. Two configured columns
fit in 248px of content space at 18px/20px text, or 272px at 22px text. This
replaces the overly conservative 136px/7.5-times-font cutoff. Cards wrap and grow
vertically rather than reducing text, icon or control sizes; 200% text still
reflows to one column on ordinary phone widths. Preferred columns, mounted
children, section equality and the 80px app-logo floor remain intact.

### Compact media app groups

Logo-only media app groups use an 80px capacity floor independently of ordinary
control groups. They retain the user's preferred columns, reflow below that
capacity, and keep the same mounted children. Generated and native media app
roles share this rule. The square app body keeps a 48px minimum rather than
reserving 112px for invisible title/state rows; warnings remain free to grow.
Source values, dispatch, saved sections and unrelated control floors are intact.
Netflix uses a clean flat local vector symbol; Spotify gains its official vector
icon. The other Media demo logos use fresh 512px publisher artwork, stored locally.
