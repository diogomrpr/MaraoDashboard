# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The conversation's final
48px-button preview is the visual reference; its mock values and interactions
are not a Home Assistant implementation or verification result.

Observed paths:

- `MaraoCards.js` renders current temperature, the shared numeric selector,
  climate state/pending feedback and the existing mode dropdown. It also owns
  the entity-keyed climate request reconciliation used by duplicate controls.
- `frontend_src/native-cards.js::nativeCardGridOptions()` assigns climate cards
  four rows and full-width columns. Its wrapper also forwards HA state and
  composes occurrence-local automatic details.
- `frontend_src/card-composition.js` and `generator.py` build climate cards,
  nested group details and mode popup definitions. The popup currently embeds
  another normal climate card with mode controls forced on.
- `MaraoPopupLayout.js::popupRole()` considers climate cards popup-capable;
  `MaraoPopupManaged.js` preserves functional settings, authored layouts and
  managed ownership. Native popup editing already uses guarded transactions.
- `editor.py::EDITOR_CATALOG`, `frontend_src/card-form-tools.js`,
  `native-card-editor.js`, `editor-model.js`, `page_model.py` and shared native
  source validation connect card fields to saved data and generated output.

The baseline currently requires a full-width climate title and themed mode
dropdown. The two delta specs deliberately change those climate-specific rules;
other card families keep their existing presentation contracts.

## Goals / Non-Goals

**Goals:** apply the same climate behavior in native, generated, grouped and
climate-owned detail contexts; share the selector and request owner; preserve
authored data while adding the two settings.

**Non-Goals:** a second state machine, additional subscriptions, a new card type,
an independently configurable detail renderer, a new popup ownership format,
unrelated numeric-card redesign, or implementation of the future lower-left
feature. That area has no placeholder label, disabled control or fake data.

## Decisions

### 1. Add two options to the existing climate catalog

| Option | Proposed semantics |
| --- | --- |
| `variables.humidity_entity` | Optional `sensor.*` ID. Missing/null/empty means no humidity reading. Clearing the editor removes only this option. Retain unresolved IDs. |
| `variables.enable_popup` | Boolean. Missing means true. False disables built-in popup ownership and default popup opening, without deleting saved references or replacing explicit authored actions. |

Add the picker and toggle to the normal climate card settings, with English and
Portuguese labels. The picker offers humidity sensors through the existing
entity-selector path; runtime validity does not depend on the entity currently
existing in a registry response. Validate the optional ID's domain and the
boolean consistently through native, canonical source and Python generation.

Keep `show_mode_buttons` stored unchanged. With the popup enabled, mode choices
belong in climate details, keeping the dashboard card compact. With the popup
disabled, that existing option controls the inline mode grid; explicit false
still hides it. Expose that inline control only in the relevant settings context
so a stored option does not misleadingly appear to affect popup-enabled layout.
Keep graph, setpoint-label, hidden-field and authored-action options independent.

This additive approach avoids a replacement settings object or format migration.
Removing old options or treating false as missing would lose saved intent.

### 2. Share runtime presentation and the existing target control

Keep `md_climate_card` as the shared runtime owner. Add a private climate-detail
render context conveyed by its popup/native owners. Automatic climate sheets and
managed climate-owned views derive this context from existing popup ownership;
ordinary cards in unrelated custom views keep their normal role. Do not add a
new user-facing display option or persist transient requests/presentation state.

Refactor the existing climate reading/mode/selector markup only as needed to
render the two compositions. Both presentations call the existing numeric-step
and HVAC-mode handlers and use the same selector markup, styling and entity-keyed
request state. The existing scalar/range calculations and capability guards stay
shared. Stop target/button activation from also invoking the card's default tap.

For project-managed climate details, update the generated presentation through
the existing ownership/reconciliation path. Retain authored slot overrides,
suppressed slots, added cards and custom layouts. Never turn opening a popup or
preview into a saved-layout update.

Duplicating the target or introducing a separate details card would make the
card and popup diverge in bounds, pending requests and error handling.

### 3. Let useful content determine height

Use the agreed layout at normal typography:

- A large current-temperature reading, approximately 46px at the normal 18px
  primary font, derived from shared scalable typography tokens.
- Name, current reading, optional humidity and reported activity in the content
  beside the right-hand vertical selector. Keep 8px above and below the selector.
- A selector approximately 60px wide and 134px tall for a scalar target, with
  full-size up/down buttons and the target between them. Approximately 150px is
  the resulting card reference, not a fixed min/max height for every state.

For native climate cards, prefer automatic content rows instead of the family
four-row default while retaining full-width default columns. Respect explicit
`grid_options`, containing section equal heights, graphs, range targets and
supported enlarged typography. Titles and range values wrap or reflow before
controls or essential text are reduced. Do not restyle unrelated numeric cards.

Reuse Marao state colors and light/dark surfaces. Retain stable useful slots
during pending/availability changes; use existing whole-card problem treatment
and error details instead of appending unbounded feedback rows.

### 4. Use the project button geometry for mode choices

Render only the entity's supported HVAC modes in reported order using the
existing MDI mode-icon mapping, named semantic buttons, selected treatment and a
non-color check cue. Each surface is 48 by 48px with a 28px icon and rounded
project button shape. The mockup's icon library is not a runtime dependency.

Prefer one row when the entire set fits. Six buttons need at least 308px with
4px gaps; narrower containers use a compact wrapping grid without shrinking
surfaces, hiding modes or requiring horizontal swipes. Base capacity on the
actual supported count and available content width, not the mock's six modes.
Use native CSS layout rather than adding a polling or measurement loop.

Show a localized `Mode - {mode}` heading. Update it and selected styling from
the existing pending mode while preserving HA-reported temperature and actual
activity. On rejection, target loss or timeout, existing reconciliation restores
the reported setting and retains its readable failure handling.

Climate details retain the existing modal shell: current temperature/humidity
first, mode heading/buttons second, and the identical vertical selector aligned
to the lower right. The left of that last row remains unused. Existing popup
focus, inertness, close action and internal scrolling remain owned by the shared
popup implementation.

### 5. Treat humidity as an independent reported reading

Use the selected sensor's finite 0–100 percentage with existing locale/percentage
formatting. Missing, unknown, unavailable, nonnumeric or out-of-range data uses a
neutral placeholder; do not clamp invalid data into a plausible value. Do not
infer another sensor or switch to a climate attribute when the selection fails.
Humidity itself can show `%`; the temperature unit omission remains unchanged.

Include the humidity ID/report in the runtime's render-dependency signature and
native binding/context inputs. A humidity-only HA update must refresh the
reading; unrelated reports must not rebuild active controls. Changing/clearing
the selection must stop retaining the old reading. No polling, new subscriptions
or humidity history/control service is needed. A humidity problem alone does not
disable an otherwise usable thermostat.

### 6. Keep every composition path and saved contract aligned

Add the catalog fields in `editor.py` and regenerate owned catalog/editor assets
with the existing builds. Align `card-composition.js`, `generator.py`,
`popupRole()`, popup editor availability and nested climate-group handling with
the new popup flag. False must suppress automatic generation as well as default
activation; never leave a dangling default link. Explicit actions continue to
override defaults and are not rewritten by the new flag.

No version bump is needed for the two optional variables. Static compatibility
references include the released v0.5.1 generated climate popup and the existing
v0.21.1 native compiled expectations, which contain the old mode option without
the new settings. Missing options retain compatible defaults. Preserve card
types/entity spelling, unknown fields, explicit false/empty values, names,
selection order, existing external hashes and custom `popup_view` content.

Disabling a popup retains its saved layout/reference and makes built-in ownership
inactive. Re-enabling reuses it through existing checks instead of reseeding it.
Do not bypass missing/ambiguous-source errors. Existing guarded popup writes must
retain exact source backups, staging, atomic replacement and concurrent-edit
protection; no new background migration or startup write is introduced.

### 7. Update the current documentation and focused evidence

Update runtime strings in `MaraoRuntime.js`, editor labels in
`frontend_src/editor-labels.js`, and any affected generator labels through their
existing source/build paths. Keep the climate card documentation and website
playground aligned without embedding fixture data in the shipped integration.
Update the quality guide's climate title, mode-control and sizing rules and the
relevant feature-coverage mapping during implementation; leave baseline specs
unchanged until completed work is synced/archived.

Reuse `marao-climate-card.test.js` for humidity-only updates, mode/target guards
and pending reconciliation; native card/editor tests for defaults, round trips
and popup suppression; and relevant popup-managed tests for off/on preservation.
Use one focused Python catalog/model/generator case for the additive variables
and aligned output. Keep historical source fixtures immutable, and update
independent expected output only where the actual generated contract changes.
These are scoped checks, not a requirement to run every mapped suite.

## Risks / Trade-offs

- **A compact reference becomes a clipping height** → use intrinsic sizing,
  preserve authored layout and let ranges, text or explicit content grow.
- **The two new options affect multiple owners** → use the same validation and
  defaults in native, grouped, generated and managed-popup paths.
- **Secondary humidity changes are skipped** → include that source in the
  existing dependency/signature path and assert a humidity-only update.
- **Popup disabling loses authored work** → deactivate built-in ownership while
  retaining the stored layout, references and normal transaction recovery.
- **The new title conflicts with current documentation** → update the precise
  climate exception; do not generalize it to other card families.
- **Some phones cannot show every mode in one row** → wrap full-size buttons;
  a single row never takes precedence over the 48px minimum.

## Migration Plan

1. Implement against the current worktree while preserving unrelated edits;
   record a fresh task snapshot before software changes.
2. Complete the selected scoped checks and updated safe examples together. Source
   data remains unchanged unless the user explicitly saves configuration. Use
   existing popup transaction backup/recovery for any edited managed layout.
3. Batch-install final applicable code on disposable HA `192.168.0.28`. Catalog,
   backend or fixture edits require `npm run ha:sync`; use lightweight frontend
   sync only if the resulting batch is frontend-only and compatible. One set of
   successful served-asset/readiness checks confirms installation.
4. Hand off the installed dashboard with a short watch list: compact spacing,
   larger current reading, humidity, mode-row wrapping, shared selector, and
   popup off/on. No browser matrix or comprehensive tests are implied.
5. If rollback is needed, restore the affected package and any source/layout
   written by this change together from matching backups, preserving unrelated
   concurrent work. Never restore older package assets over newer saved data.

Publication is outside this proposal. A later push/tag/release must run the
unit-only `verify:publish` gate and required metadata checks, and install the
final release candidate before publication; it does not add integration or full
tests without a separate request.
