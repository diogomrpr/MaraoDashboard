# Design

## Context

See `proposal.md` for the selected direction. Planning starts at commit
`23c0d0e2c14eee774ac10a23ad50ae1449c31028`. Existing Activity edits, duplicate
untracked distribution files and unrelated OpenSpec changes are outside this
planning scope and must remain untouched.

`MaraoCards.js` owns `readingMarkup`, the glance renderer, shared surface styles,
availability composition and Activity binding. Glance currently uses vertical
rows inside a native `ha-card`. The reading helper also serves header and
dishwasher content, and forecasts share `.reading` selectors. Native cards and
template aliases converge on the same renderer through
`frontend_src/native-cards.js` and `frontend_src/card-composition.js`.

The completed `align-glance-card-styling` delta still lives separately from the
main `card-behaviors` spec. This change replaces its row-presentation and reflow
requirements, retaining its local-reading availability contract. Future spec
synchronization must apply the predecessor first, then this delta. No existing
completed artifacts or durable baseline specs change during this proposal.

A design is included because the separate visible surfaces, retained card-level
actions and three-across sizing benefit from explicit decisions before coding.

## Goals / Non-Goals

**Goals:** keep one existing card/editor/configuration boundary, present one
visual tile per reading, and fit three tiles in normal full-width phone space
without changing the surrounding dashboard's layout policy.

**Non-Goals:** create nested card instances, alter global reading/control-grid
geometry, introduce a new state machine, or turn read-only measurements into
operating controls. Scope and compatibility details remain in the proposal.

## Decisions

### 1. Separate visible tiles inside one transparent owner

Keep the connected outer `ha-card` and native wrapper lifecycle, but make the
glance owner's background, border and shadow transparent/absent. Apply Marao's
normal rounded surface styling individually to glance reading elements. Keep
the optional heading outside the tile grid. Scope selectors to a glance-specific
owner marker so headers, forecasts and appliance details remain equivalent.

Use a centered icon/value/name hierarchy:

```text
At a glance

+------------+  +------------+  +------------+
|   (icon)   |  |   (icon)   |  |   (icon)   |
|            |  |            |  |            |
|   21.5 C   |  |    48%     |  |  1.24 kW   |
| Temperature|  |  Humidity  |  | House power|
+------------+  +------------+  +------------+
```

The drawing is schematic; each gap is 8 CSS pixels and labels wrap. Retain the
semantic name/value relationship even if CSS changes their visual placement.
Use existing Montserrat primary typography/weight for values, quieter labels
and a 48px circular icon area containing the current 28px symbol. Use compact
internal padding (initial target 8px) and theme tokens, without a new palette or
visible focus-only styling. Explicit icon hiding removes its space.

Rendering three separate HA cards was rejected because it would duplicate
configuration, lifecycle and host sizing and change the existing public model.
A second enclosing surface was rejected by the selected sketch.

### 2. Prefer one column per configured reading, based on available host space

Use one, two or three equal columns for the configured count, with no empty
slots. Three tiles across 282px usable width have approximately 88.7px each
after two 8px gaps. A 48px icon plus compact padding fits this space, and names
can wrap. The normal full-width phone case must not inherit the larger minimum
cell width intended for ordinary operating controls.

Use a glance-local responsive rule based on usable host width and current text
size; prefer browser-native CSS and reuse an existing responsive helper only
if it supports the tile capacity without changing other families. Reduce the
whole internal grid to two or one column when enlarged text/zoom or a narrow
HA host needs it. Do not force the outer dashboard to full width, mutate saved
columns, shrink typography or make horizontal scrolling necessary. Restore
preferred columns when capacity returns. A short final row retains regular
column widths and configured order.

Each tile grows for meaningful text, and the internal group uses its necessary
common tile height. Preserve existing outer section sizing/lifecycle contracts;
the transparent owner remains one participating HA card. Reserve concise status
space where needed and use the existing stable-footprint behavior so availability
updates do not rearrange or resize the group at unchanged width/text settings.

A hard three-column rule was rejected because independently authored narrow
hosts and 200% text/zoom still need readable content and 48px controls. Defaulting
to two columns at 320px was rejected because three-across is the explicit outcome.

### 3. Retain the existing state and action owners

Keep `readingMarkup`'s per-entity authoritative values, localized status,
configured/native icons and Activity target binding. Prefer CSS-only changes;
add only the glance-specific owner/structure metadata actually needed.

The affected reading's concise availability reason replaces its own value while
healthy values remain visible. Preserve existing group-level neutral warning
semantics on the visible tile surfaces and keep diagnostic access readable;
do not add a new background around the group or hide all readings behind a
generic problem overlay. Complete loss, disconnect and reported action/content
errors retain their existing shared priority and guards. No state is fabricated
and no error is discarded to improve appearance.

Retain explicit card-level actions without changing targets or adding per-tile
actions. Existing Activity controls remain independent 48px buttons with localized
entity names; their clicks must not propagate into the owner action. Keep press
feedback on actual controls/surfaces, preserving visible tile gaps and haptics.
Retain DOM owners across state updates rather than mounting nested cards.

### 4. Keep authoring and shipped consumers aligned

The initial tile layout retains editor fields, catalog defaults, Python validation and
generation. The follow-up label toggle adds the opt-in behavior described below. Existing native adapters, current templates and historical aliases
must reach the shared glance output with equivalent configuration. Preserve
unknown/raw options and all title/icon/action/HA-layout settings. The historical
v0.5.1 and v0.23.4 inputs referenced by the predecessor remain immutable; no data
conversion or package/config-entry version bump is needed.

Use existing theme/localization and state formatters rather than adding labels
or unit rules. Update `docs/src/content/docs/cards/glance.mdx`, and only existing
glance playground descriptions/examples that describe rows. Reuse the one/three/
unavailable cases in `ha-test/dashboard/views/00-card-test.yaml` and existing
realistic-page usage; no new helper or gallery matrix is required.

Nearby targeted assertions are in `tests/frontend/marao-card-visibility.test.js`
(independent readings, icon visibility, partial warnings and Activity). Review
representative helper consumers if shared markup must change. No runtime code,
test fixture or generated bundle is changed in this planning workflow.

## Risks / Trade-offs

- Three narrow tiles wrap sooner than two -> use compact padding, complete text
  wrapping and a local capacity rule; normal 282px usable width remains three-across.
- Shared reading styles could change other families -> scope to glance and review
  representative header/forecast/appliance output if changing shared markup.
- Transparent outer styling could hide warning or action feedback -> map existing
  semantic treatment onto visible tiles, retain diagnostics and Activity isolation.
- Host equalization could add height -> preserve the authored outer section and
  accommodate required content; do not rewrite global grid behavior for glance.
- Earlier unsynchronized row requirements could contradict tiles -> synchronize
  predecessor then this delta when the completed changes are eventually archived.

## Migration Plan

There are no persisted writes, migrations or backend changes. Before implementation,
capture a fresh task baseline and review concurrent edits. Use the smallest
affected scope for visual review and existing glance assertions if changed markup
or responsive logic warrants them. Browser inspection is optional; no new browser
automation, matrices or performance campaign is part of this change.

After final edits and essential checks, install compatible frontend assets once
using `ha-test/prepare-frontend.js`'s `prepareFrontend()` on disposable
`192.168.0.28`. Use its compatibility/served-asset/readiness checks and leave the
assets installed. Rollback restores the prior matching frontend assets without
rewriting dashboard configuration or helper state. No production access or device
actuation is involved.

Handoff should report actual checks and the test URL with a short manual watch
list: three-across on a normal phone, long labels/enlarged text, partial availability
and Activity icons. Publication is outside scope; any later push/tag/release must
use the separate unit-only `verify:publish` gate.

## Follow-up: Optional reading labels

Add `variables.show_reading_names`, defaulting to true, to the existing glance catalog and native boolean form, with English/Portuguese labels. Pass it only from the glance renderer to the shared reading helper; other reading consumers retain the default. Keep the label as visually hidden semantic content when false, without a visible label row. Group title and icon/Activity accessibility remain independent. Preserve configured custom names and opaque fields through editor edits, and validate boolean values consistently in runtime and JS/Python authoring. Existing and historical inputs omit the field and remain unchanged; no format/version migration is required. Rebuild generated assets and install the final candidate on the disposable instance.
