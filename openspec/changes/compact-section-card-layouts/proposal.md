# Proposal

## Why

Marao's 174px control-card minimum and reserved internal regions leave substantial unused space, particularly on sliderless cards. Cards should be compact without losing information or interactions, while every row within one dashboard section retains equal card heights and separate sections size independently.

## What Changes

- Recompose light, fan, cover and access-control cards into a compact title/useful-reading block beside the icon, followed immediately by any supported control. Remove empty layout regions without shrinking typography or the visible 48px controls.
- Replace the unconditional 174px family floor with content-driven sizing. Use 128–140 CSS pixels as the initial normal short-content slider-card budget, not a maximum or a reason to clip enlarged text, action labels or errors. A section containing only simple cards may be shorter.
- Keep the current concise binary-state presentation: no redundant normal On/Off line. Preserve accessible state, existing icon/shape cues, substantive custom labels, brightness/position/power readings, operational states, transitions, history, loading and problem details.
- Give each Marao-owned logical section one sizing boundary covering all its content cards and all rows, including mixed Marao families. A later long title or problem may enlarge that section; it must not enlarge another section. Preserve existing section/card order and automatic domain composition rather than inventing new sections.
- Reuse the current grid/card factory and section model. Preserve old `custom:marao-control-grid` configurations and extend the owned section path beyond the existing light/cover/access-only eligibility. Native/manual cards retain the compact renderer; section equality applies when the section is owned by the Marao grid, without rewriting unrelated Home Assistant containers or third-party internals.
- Update the quality/layout guidance, canonical safe gallery, realistic-page example and scoped checks together. Do not move current inline functions behind additional popup interactions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: Compact ordinary-control composition, content-driven intrinsic sizing and equal content-card surfaces across each section, independent of other sections.
- `dashboard-generation`: Preserve logical section ownership through fixed and automatic layouts, support mixed owned families, and preserve source/raw/protected configuration while extending section presentation.

## Impact

- **Planning baseline:** `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`. Planning affected-card set: empty. Preserve the unrelated `add-chartjs-history-details` and `enable-native-camera-live-view` changes.
- **Observed:** `MaraoCards.js` applies a 174px minimum and fractional equal rows to standard controls; the state is below the title/icon row. The saved normal iPhone review recorded nine 220.5px cards because of a later long title; this is historical evidence, not a current retest. Redundant normal binary text is already suppressed. Automatic source sections currently split into independent domain grids.
- **Implementation affected set:** Compact composition directly affects light, fan, cover, access summary, strict opener, close/lock and guarded access controls. Section stretching includes all supported Marao content-card families through the shared renderer, timeline/energy/event renderers and native adapters; headings, navbar and popup definitions are structural, not equal-height participants. Shared-consumer checks must cover generated, popup/group, explicitly authored grid, native and preview hosts.
- **Source paths:** `MaraoCards.js`, `MaraoDashboard.js`, `MaraoFrigateEventsCard.js`, editable `frontend_src/MaraoNativeCards.js` and its build, `generator.py`, section/layout help, themes/translations where needed, gallery fixtures, generation/preservation and focused geometry/gesture checks. No new runtime dependency or persisted layout option is proposed.
- **Compatibility:** Preserve format 2, supported released conversions, public card keys, old grid inputs, saved columns, explicit emptiness/deletions, order, names/options, unknown fields, raw cards, protected YAML and unrelated HA settings. Generated section wrappers/metadata change, so independent output expectations and focused recovery checks are required; future explicit versioned publication also needs scoped affected-format preserved-install proof. No saved-source migration or starter reset is proposed.
- **Prior decisions:** This supersedes the 174px/intentional empty-space policy in completed `standardize-control-grid`, retaining its section-wide equality rather than the rejected per-row-only alternative. The older durable title baseline and completed header/grid deltas must be reconciled chronologically without rewriting completed evidence.
- **Non-goals:** Fixed clipping heights, hidden information, smaller touch targets, new density settings, automatic card relocation, changing gestures/services, a dashboard-wide maximum, arbitrary third-party/native-HA surface restyling, implementing the other open changes, implementation or publication in this planning turn.

