# Proposal

## Why

The user reports never seeing two columns on a Samsung Galaxy A35 5G.
Marao's original section sizing required at least 352 CSS pixels inside the
section at normal typography, so page margins can make an ordinary phone
collapse to one column even when smaller, usable cards could fit.

The initial implementation lowered that threshold to 320px of usable section
width. The user still reports one column and requests a shared screen-size fix.
Extend support to 320px viewports with ordinary margins by lowering the usable
section threshold to 280px, without adding device-specific behavior.

## What Changes

- Make supported two-column Marao sections retain two columns at 320px, 360px
  and 384px phone viewport widths with the existing dashboard margins and normal
  or bold typography.
- Adjust both the fixed cell-width floor and its text-size multiplier through
  one shared sizing policy; keep JavaScript placement and CSS grid sizing aligned.
- Let narrow cards wrap their content and grow vertically while preserving
  readable information, 48px touch targets and existing strict access controls.
- Retain automatic single-column reflow when narrower space, enlarged text or
  zoom needs it, and restore the preferred layout when space returns.
- Preserve explicit one-column choices, automatic full-width groups, saved
  order, section-wide equal heights and the 8px gap.
- Add explicit two-column acceptance checks at normal phone widths, including
  a realistic Rooms page, alongside existing containment/reflow checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: supported narrow-phone two-column layouts, shared
  responsive sizing and readable, touch-safe reflow.

## Impact

Affected-card set: all Marao-owned content cards hosted by the shared section
grid, including room/navigation summaries, ordinary controls, access controls
and detailed cards. Generated pages, manually configured Marao grids, native
wrappers and popup/group consumers of the shared sizing styles are in scope.
Existing one-column popups remain one column. Independently authored native
Home Assistant containers and third-party card internals keep their ownership.

The shared owners are `MaraoCards.js:controlGridStyles()` and
`MaraoControlGrid._layout()`. Relevant checks are the control-grid Node/browser
checks, selected mobile profiles and action/slider geometry. Update the canonical
safe gallery, a realistic Rooms example, configuration/quality documentation
and the verification map where needed.

The original source calculation and its 352px threshold were confirmed locally,
including the release checkout. The Galaxy A35's actual app/browser viewport,
display settings and installed page composition have not been measured. The
320px, 360px and 384px targets are deliberate acceptance widths, not claimed
device measurements.

No new setting, device-model detection, dependency, generated wrapper change,
source-format migration or saved-data rewrite is planned. Existing columns and
group metadata remain compatible; this changes only their responsive rendering.
The completed `compact-section-card-layouts` change remains the basis for compact
cards and section-wide equality. This change adds a concrete narrower-width
guarantee without reopening its height or grouping decisions.

Non-goals: forcing every section to two columns, changing automatic family
grouping, reducing font/control sizes, redesigning cards, implementing camera
changes, publishing a release or accessing a live Home Assistant instance.
