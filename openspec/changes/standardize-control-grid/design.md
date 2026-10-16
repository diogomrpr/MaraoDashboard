# Design

## Context

See [proposal.md](proposal.md) for the outcome and the [layout](specs/mobile-theme-layout/spec.md) and [generation](specs/dashboard-generation/spec.md) deltas for acceptance behavior.

The existing path is sufficiently shared to fix this without a new editor workflow:

- `frontend_src/MaraoDashboardPanel.js` already edits section `columns`; `editor-model.js`, `canonical-page-model.js` and `page_model.py` preserve those sections and mixed order. `docs/docs/installation/configuration.md` documents automatic grouping versus fixed columns.
- `generator.py:_page_view()` and `_entity_container_cards()` emit native HA grids with `square: false`. Fixed sections mix card types; automatic sections create domain buckets. Access/group popups also emit grids.
- `MaraoCards.js:cardStyles()` supplies an 84px content minimum plus padding, not a uniform outer size. The effective kind normalizes legacy unlock/open actions. `MaraoNativeCards.js` hosts the same renderer through the existing HA card factory.
- Native HA grid cells can outgrow a shorter Marao surface. Merely increasing a body minimum does not establish equal rows across the whole grid or stretch every host/surface layer.
- `MaraoDashboard.js:_fitAccessGrid()` currently widens one strict opener's native grid item when its cell is unusably narrow. A uniform grid instead needs all its columns to reflow together.
- The completed `align-slider-card-headers` delta records the already implemented light/fan/cover/strict-opener header exception, while the durable baseline still contains the older universal title rule. The new delta carries that accepted exception forward and extends the header to standard access summaries and close/lock controls. Synchronization must preserve both changes in chronological order; do not rewrite completed evidence.

Planning edits affect no rendered cards. Future runtime/generator consumers are recorded in the proposal. The unrelated `optimize-browser-verification` planning work remains untouched.

## Goals / Non-Goals

**Goals:** Own the minimum-size and whole-grid layout contracts at Marao component boundaries; reuse the current section model, child renderer, card factory and gesture handlers; make eligibility and preservation independently testable.

**Non-Goals:** A dashboard-wide maximum-height observer, arbitrary HA shadow-root style injection, a general layout framework, new persisted layout options, automatic section rewrites or replacement entity/action implementations.

## Decisions

### 1. Select standard controls by effective role, not rendered children

Use a shared runtime classification for light, cover, access summary, strict opener, close/lock action and lock/cover-targeted guarded access action. Use the corresponding generator policy after card resolution, with parity fixtures specifying both sides independently. Missing entities keep their configured family; current state and `_range()` output never determine eligibility. Generic service/alarm holds and fan height remain outside this change. Keep the fan's existing header exception.

Add one family-scoped presentation marker and shared 174px minimum-outer-height token/fallback. Count borders and padding inside the outer surface. Let the body fill that surface and keep title/icon, useful state and lower controls consistently positioned. Layout retains unused space on sliderless cards without creating a placeholder control. Hidden names/icons remain hidden; eligible icon-only cards retain their role and centering at the common size. Other icon-only families remain unchanged.

Alternative: set a hard body `height:174px`. This miscounts padding/borders and clips larger text or error messages. Stretching only siblings in one row also fails the requested cross-row consistency.

### 2. Own a small control-grid container

Introduce `custom:marao-control-grid` beside the existing project-owned card registrations in `MaraoCards.js`. Its inputs are ordered `cards` and the existing one-through-six `columns` count. Reuse the HA card factory and the established popup/native child creation pattern, forwarding `hass` and preview state. Validate the complete configuration before replacing working children; guard asynchronous factory completion, show readable failures, and avoid repeated initialization on unrelated HA updates. Ordinary state updates update the existing children instead of remounting their ranges or strict sliders.

The container owns ordinary CSS Grid, equal-width columns, one gap token defaulting to 8px and equal flexible rows with a 174px floor. Use content-sized equal rows across the complete grid, not a fixed container height. Stretch the owned child/native-host/surface layers into their cells while allowing intrinsic text to contribute to row sizing. Provide a valid native card-size estimate without using it to clamp visible height. No per-card measurement/clone loop is needed for row equality.

Support eligible shared-renderer and native Marao child configurations for explicitly authored containers. Reject unsupported direct-container configurations visibly rather than dropping children. An empty explicit container is hidden without an error or spacer. Registration and asset loading must precede any generated use of the type.

Alternative: alter native HA grid shadow-root internals. That creates an undocumented dependency and risks affecting raw/user-owned cards. Turning on HA's square mode instead ties height to width and does not express this content-driven rectangular contract.

### 3. Use the container only at eligible existing boundaries

Centralize generator grid construction/eligibility for `_page_view()`, `_entity_container_cards()` and access popups. Select the control container only when the nonempty grid's complete child list is eligible. Preserve the child dictionaries, order and current columns exactly. Carry the caller's raw-card provenance into this decision: a raw card stays on the existing path even when its declared type resembles a standard Marao card. Keep the native grid for any non-control, raw or unknown child; do not split a mixed section or move its cards.

Entity Group popups reconcile direct keyed children in `MaraoPopupCard:_reconcileGroupChildren()`, rather than emitting a nested native grid. Reuse the same owned CSS sizing/reflow recipe on that existing content host for eligible light/cover groups. Retain the membership map, filtering, focused-card removal and existing child nodes. Remove uniform-grid styling when only the localized empty/loading status remains. This avoids a second rendering or filtering implementation.

Fixed-column sections containing mixed standard families therefore become one continuous uniform grid. Explicit automatic mode retains domain buckets; eligible buckets gain uniform rows but are not merged. Document the existing **Edit layout → fixed columns** route for users who want one continuous mixed grid. Full-width panels remain in explicitly separate sections; existing mixed panels retain their selected widths. Independent grids share the baseline, not a global maximum.

Apply baseline sizing to standalone/manual/native cards even without the new container. Equal-height rows across an arbitrary independently authored HA grid are not promised; explicitly placing its eligible cards in the reusable Marao control container provides that contract. This boundary is deliberate, not a silent exception to container acceptance.

### 4. Reflow the whole grid and retain the last cell's width

Treat saved columns as the preferred maximum. Use CSS container-responsive sizing to reduce the effective column count, preserving that source value. The normal minimum usable width must cover the strict track's existing 144px requirement plus card padding (172px with current padding); text-relative sizing must also account for enlarged labels. Keep every slider/control at least 48px and permit wrapped label/track growth.

Use row-major placement without dense packing. Retain unused column tracks in a partial final row so the last card keeps the same width. Coordinate `_fitAccessGrid()` with the new owning container: the container's whole-grid policy handles its children; the existing native-grid fallback remains for unrelated hosts. Do not promote an individual owned-grid child to a full-width span.

Use common sizing through all rows at each effective column count. Rotation, locale/text changes, availability messages and clearing errors must converge through normal CSS layout without synthetic service calls, repeated asset loads or a resize feedback loop.

### 5. Reuse the editor model and verify preservation

No new serialized layout field, starter default, card catalog role or visibility option is needed. Existing section/column controls already express the proposed composition. Update the configuration and card guides, quality guide and coverage map; localize any additional help/error text if implementation introduces it. Do not treat the editor's draggable entity-row list as a runtime dashboard preview.

Extend the existing header/alignment checks and add a focused `control-grid` selection in `verification-map.js`, marked as affecting generated output. Assert actual outer surfaces and at least three rows, not only host dimensions. Expected equal heights, gaps, order and eligibility must come from independently specified fixtures. Reuse mounted-range, strict-access and guarded-action tests; geometry alone cannot prove dispatch safety.

The canonical safe gallery needs one mixed odd-count grid, sliderless/capability-absent and hidden-field cases, a later-row long title, a problem transition and a non-control/raw fallback. Reuse existing fake entities. Add a realistic Studio/room control section with separate full-width content and a generated access-popup counterpart. Keep distinct states/options without a Cartesian matrix.

## Risks / Trade-offs

- **One long title enlarges the grid** → Limit equality to its control section, retain a common baseline elsewhere, and reflow the whole section before columns become cramped.
- **Unused slider space or an odd final cell remains** → These are intentional consequences of equal card size; retain internal layout space and the last card's normal width.
- **Factory wrapping defeats surface stretching** → Measure generated, native, popup and preview surfaces and verify all owned host layers, including outer borders.
- **Responsive changes end a gesture or create a wider opener hole** → Preserve child lifetime and use whole-grid column changes; test cancellation/completion, rotation and target loss.
- **A broad grid replacement changes raw content or explicit layout** → Require complete eligibility and compare independently expected child/source dictionaries before and after generation.
- **An older package cannot render newly generated containers** → Deploy matching assets/output together and retain exact recovery copies; rollback package and saved output as a unit.

## Migration Plan

1. Keep source format 2 and existing supported conversion paths unchanged. Inspect provenance-backed released fixtures for every source format reaching affected grid generation. Independently expected source JSON must remain identical; expected eligible output wrappers change while children, raw/protected regions, references, ownership paths and unrelated HA settings remain preserved.
2. Add focused generation/history/compatibility assertions and update the existing upgrade feature inventory for the new grid output and unchanged source/options. Preserve immutable historical fixtures/reports; add current expectations with release provenance instead of rewriting archives.
3. Use existing read-only preview/dry-run, exact backups, preflight, staged/atomic file replacement and recovery paths. No separate write pipeline or migration reset is introduced. Deploy compatible assets and regenerated owned output together only on disposable `192.168.0.28`; retain recovery data through failure/interruption and verify cleanup.
4. Before a future versioned publication, run `test:ha:upgrade -- --scope control-grid` for the affected saved-format/output features and supported baselines selected by the updated coverage map. This is required because generated container types change, even though source JSON does not. Verify preserved installation, failure/recovery and cleanup; fresh fixture generation is insufficient. Run the scoped publication gate and applicable exact-commit CI. No full suite or historical matrix is implied.
5. Roll back using the matching previous package, exact saved source, generated output and affected owned-state backups together. Protect unrelated concurrent edits and report restoration failures. A package-only downgrade must not leave unsupported new container types behind.

## Apply record

Apply baseline: `c72b0d40dce4f70acd95e59b291ab7745bdb6c01`. Affected families: light, cover, access summary, effective strict openers, close/lock actions and lock/cover-targeted guarded actions, through generated, group/access popup, native, manual and preview hosts. Source format 2 and public keys/options remain unchanged; only wholly eligible owned output containers change. Supported released source fixtures and independent preservation expectations remain immutable.
