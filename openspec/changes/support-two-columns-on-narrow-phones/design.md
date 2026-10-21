# Design

## Context

See [proposal.md](proposal.md) for the report and scope. Planning started at
`68a9deb96ffd5164949ac6c20f040beed57d654d` with unrelated dirty files already
present. The release checkout at `fe1d5fc6b5bf3ab2b7515fb06dcb871da34c2f9c`
uses the same column-capacity calculation. The user's phone is a Samsung Galaxy
A35 5G; its actual viewport and display settings remain unmeasured.

Ownership at the original planning baseline:

| Boundary | Observed behavior |
| --- | --- |
| Shared runtime | `MaraoCards.js:controlGridStyles()` uses a 172px floor and a primary-font multiplier of 9.5. `MaraoControlGrid._layout()` repeats those numbers for explicit group placement. |
| Theme and host | The theme defines 18px primary text and 15px masonry card margins. The viewport width is not the section width; Home Assistant host spacing and safe areas also matter. |
| Builder/model | `roomPageTemplate()` in `frontend_src/editor-model.js` starts the Rooms template with `columns: 2`. Existing section controls store the preferred maximum, not a guaranteed count at every width. |
| Generation | `generator.py:_page_view()` and `_automatic_section()` preserve fixed columns or group metadata. Automatic full-width groups must not become two-column groups. No new output is needed. |
| Embedded hosts | Native wrappers retain their host sizing; Marao popup/group styles reuse the shared grid CSS. Some groups deliberately set one preferred column. Native Home Assistant grids remain independently owned. |
| Checks | `tests/mobile-devices.js` uses a generic 360px Android viewport. `control-grid-checks.js` checks geometry and restoration after narrowing to 180px, but can pass when the original layout was already one column. |

At an 18px primary font, the original minimum was `max(172, 18 * 9.5) = 172px`,
requiring `172 * 2 + 8 = 352px` of section width. Reducing only the 172px floor
would leave the 171px font-derived minimum and would not solve the target widths.

The completed but unarchived `compact-section-card-layouts` change supersedes
older 174px height rules and retains responsive preferred columns. This change
adds concrete width acceptance to that behavior. Preserve its compact layout,
section-wide equality and existing 172px-cell height reference when later
synchronizing specs; narrower cells may grow taller.

## Goals / Non-Goals

**Goals:** keep one section-capacity policy across CSS and JavaScript, make
ordinary phone layouts use their selected two columns, and preserve mounted
controls and accessibility reflow.

**Non-Goals:** device detection, a new density preference, a content-measuring
layout engine, narrower global page margins, changes to saved grouping, or
restyling third-party card internals.

## Decisions

### 1. Adjust both limits at the shared grid owner

Use one internal policy definition to feed the CSS minimum and JavaScript
capacity calculation. The initial implementation used a 156px fixed floor and
primary-font multiplier of 8.5, requiring 320px of usable width at 18px text.
Its 322px section at a 360px viewport left only 2px of spare width. Following
the user's report that their device still shows one column, lower the shared
floor to 136px and the multiplier to 7.5, retaining the existing 8px gap and
preferred-count cap. This requires 280px of usable width at normal typography
and supports a 282px section within the existing margins of a 320px viewport.
These are implementation constants, not a public setting. Both paths must
agree at fractional widths and on text-size changes.

The expected arithmetic for that choice is:

| Usable section width | Primary text | Preferred count | Effective count | Cell width |
| --- | --- | --- | --- | --- |
| 279.5px | 18px | 2 | 1 | 279.5px |
| 280px | 18px | 2 | 2 | 136px |
| 282px | 18px | 2 | 2 | 137px |
| 322px | 18px | 2 | 2 | 157px |
| 346px | 18px | 2 | 2 | 169px |
| 352px | 18px | 2 | 2 | 172px |
| 282px | 36px | 2 | 1 | 282px |
| 322px | 36px | 2 | 1 | 322px |
| 346px | 18px | 1 | 1 | 346px |

This is a design calculation, not rendered proof. Validate actual outer cards,
text and controls before accepting it. If a shared card cannot contain its
content, repair its wrapping/containment at that owner while preserving sizes;
do not weaken the two-column acceptance by silently restoring the old threshold.

Changing only CSS would conflict with JavaScript group spans. Forcing two columns
through a viewport media query would ignore narrower embeddings and larger text.
A Galaxy-specific branch would not cover other phones with the same usable
space. Reducing page margins would alter unrelated navigation and safe-area
geometry instead of fixing the conservative cell sizing.

### 2. Let existing card content reflow within the narrower cell

Retain the current compact header's wrapping behavior and content-driven height.
Do not shrink typography, icons, controls, padding indiscriminately, or essential
labels. Room names remain fully readable with contained decorative imagery and
a distinct 48px lights-off button. Numeric, climate and other detailed content
keeps its existing internal reflow and readable problem states.

Strict access retains its 64px minimum track and 54px thumb, wrapping localized
label and established gesture safeguards. A narrower slide's physical travel
changes, so verify completion and cancellation with real simulated touch input
on safe fixtures, not just visible geometry. Preserve ordinary slider feedback,
guarded holds and exactly-once dispatch.

All cards in one logical section still share its necessary height. A long title
can therefore make that section taller; this is an accepted consequence of the
existing equality contract. Do not move detailed cards or invent sections.

### 3. Preserve source, generated output and host ownership

Keep `columns`, `groups`, their defaults and the generator's output structure
unchanged. Preserve one-column preferences, automatic full-width groups,
independent sections, incomplete rows, saved order and raw configurations.
Responsive layout must not call `setConfig()` to remount children or rewrite
saved JSON. Keep native card sizing APIs and unrelated Home Assistant containers
unchanged.

Existing editor controls remain sufficient. Update configuration help/docs to
explain two-column support at ordinary phone widths and reflow for larger text.
If visible editor help changes, use its existing localization path, including
Portuguese. Do not add a phone-model selector or force-layout override.

### 4. Test the desired count as well as containment

Extend `marao-control-grid.test.js`, `test-control-grid-local.js` and
`control-grid-checks.js` rather than creating another test harness. Use independent
expected column counts at the specified section widths; include a failure case
showing that the old threshold cannot satisfy the new acceptance.

In the existing browser runner, retain the 360px Android profile and add a narrow
384px width case scoped to this feature. Do not relabel Pixel browser metadata
as a measured Galaxy A35 or expand every unrelated test's device matrix. Exercise
the realistic Rooms page with normal host margins and record its actual viewport,
section width, primary font size and rendered columns. Do not set the section
to the full viewport width merely to make the check pass.

The follow-up extends two-column acceptance to the existing 320px profile and
282px usable sections. Check both sides of the new 280px boundary, doubled-text
reflow and restoration, representative room/control content, and safe strict
access cancellation/completion at the narrower width. Keep earlier completed
evidence historical; select fresh checks for the changed sizing inputs without
expanding unrelated device coverage or claiming physical-phone verification.

Use representative safe gallery sections: room/navigation summaries; an odd
mixed-control group with a later long title/problem; strict access; and mixed
automatic full-width/two-column groups. Reuse existing detailed-card cases to
check the shared-owner impact without a Cartesian family/state matrix.

Include normal/bold two-column proof at the supported target widths,
200% text, bold plus 200% text, 200% zoom, representative iPhone geometry and
Android/iPhone landscape. Inspect normal-to-enlarged-to-normal transitions,
fractional boundary widths and mounted-control identity. Use one reference theme
for equivalent geometry and representative appearance in both themes. Include
alignment and existing slider/access checks wherever narrower cells affect them.

Update the canonical Cases gallery and realistic Rooms fixture under `ha-test/`,
plus the configuration guide, dashboard quality guide and relevant coverage map.
Review `control-grid` scope in `tests/verification-map.js`; this runtime-only
change must not accidentally become a full historical upgrade or mobile audit.

## Risks / Trade-offs

- **The A35 uses a different effective width or larger display setting** ->
  use available space rather than its model; record the tested widths and do not
  claim physical-phone verification. User-provided measurements can add a case.
- **Titles and strict-slide labels grow vertically** -> preserve full text and
  controls, verify long Portuguese/English cases and accept necessary height.
- **CSS and JavaScript disagree at a boundary** -> share policy inputs and
  measure actual group placement near the boundary, including fractional widths.
- **More compact cards expose a hidden hit-area overlap** -> exercise room
  navigation versus lights-off, sliders and guarded actions with safe fixtures.
- **Testing accepts one column again** -> explicitly assert two visible columns
  at the supported sizes before checking gaps, containment and restoration.

## Migration Plan

No source migration, generated-wrapper change or saved-default write is required.
Existing installations and matching previous assets understand the same data.
Implementation records its own baseline and affected consumers, verifies
preservation with existing generation/model checks, then deploys compatible
assets only to disposable `192.168.0.28` after exact backup.

After scoped checks, inspect representative final layouts and restore the
disposable package and any fixture/configuration state changed during testing.
A UI rollback restores the prior package; any changed test data is restored from
its exact backup as well. Publication is a separate request using scoped gates.
If implementation changes persistence, output ownership or installation behavior,
reassess migration and scoped preserved-install evidence rather than assuming
this runtime-only assessment still applies.
