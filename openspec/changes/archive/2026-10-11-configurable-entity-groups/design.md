# Design

## Context

See `proposal.md` for motivation and the three delta specs for behavior. The
existing catalog/editor assumes a primary `entity_id` (except page shortcuts);
`flattenEntities`, container serialization and generator resolution discard
objects without that shape. Adding a catalog label alone would lose groups.
Overview instead builds special navigation cards and popup files from
`_all_entities`, which deduplicates resolved room membership in room order.
Numeric members bypass `summaryState`, leaving maintenance tied to its first
battery. Popup updates forward HA state to children but do not filter membership.

Read-only browser inspection on the disposable instance confirmed off lights in
the lighting sheet, a 75% maintenance reading, three cover position controls and
thermostat modes/targets. No member action was actuated. Source inspection also
found the cover-template override and climate title-suppression heuristic. These
are observed gaps against the contract, not behaviors to preserve.

## Goals / Non-Goals

**Goals:** One typed descriptor carried intact through builder, validation,
generation, summary and shared popup; explicit memberships; compatibility with
released sources; reusable controls and scoped live updates.

**Non-Goals:** A parallel popup system, HA group entities, new endpoints or
dependencies, nested groups, an aggregation expression language, bulk actions,
or implementation of the separate room-sync/climate-feedback proposals.

## Decisions

### 1. Use one first-class descriptor without a fabricated primary entity

Use catalog/template ID `hc_entity_group_card`, with this additive source shape:

```json
{
  "template": "hc_entity_group_card",
  "id": "living-lights",
  "name": "Living room lights",
  "icon": "mdi:lightbulb-group-outline",
  "entity_type": "light",
  "entities": ["light.main", {"entity_id": "light.accent", "variables": {"enable_slider": false}}],
  "popup_filter": "active"
}
```

Types: `light`, `cover`, `battery`, `climate`; filter: `all` or `active`. Format 1
stores Overview's ordered descriptors in `overview.entity_groups`; the accepted
format-2 page conversion moves them into ordinary editable Home page cards.
Every canonical page accepts the same descriptor in its ordered/grouped card
lists, with a distinct `entity_group` bucket for automatic layout. Member objects reuse the
existing entity option shape, without nested groups or shortcuts. IDs are stable
dashboard-wide safe identifiers, preserved on rename/reorder and regenerated on
duplication; reject collisions before writes. Reserved legacy IDs/hashes remain
available for their converted groups and cannot collide with other popups.

Extend the existing flatten/serialize/ordered-resolution branches and schema to
recognize this explicit shape; do not encode a group as a fake sensor or a
single selected primary entity. Resolve metadata and overrides through current
entity helpers. Members can be chosen globally without creating standalone room
cards; do not expand nested membership into `_all_entities` and thereby alter
unrelated derived Security/Media/Overview content. Deduplicate within a group in
configured order using the existing entity-merging rule; retain independent
occurrences across groups/pages. Preserve unknown fields at group/member level.

### 2. Make the builder an explicit membership editor

Extend catalog metadata and the shared form for a typed multiple-entity selector;
reuse existing HA entity metadata/search and compatible member option forms.
The format-1 Overview controls and room/custom Add card flow use the same form;
format-2 pages expose it through their common card editor. Type changes keep incompatible selections visible and block
save until explicitly resolved. Do not silently clear entities. Retain members'
custom labels/icons/options when editing the list. Missing HA entities remain
saved references with readable warnings; an unavailable entity is not an invalid
document. Unknown/newer schema still follows the shared validation boundary.

Saved explicit lists, including `[]`, are independent of rooms/areas and registry
updates. Use the existing dirty/save/discard workflow. Apply deletion behavior
from the repository's current contract, coordinating with
`remove-card-delete-confirmation` rather than introducing another confirmation
or undo mechanism. Do not add a new menu architecture; reuse the two Add tabs if
`independent-room-entities` has already landed.

### 3. Share activity evaluation between summaries and filtering

Keep existing `summaryState` behavior for old navigation/scene consumers. Add
the minimum typed evaluation needed for Entity Group, used by its summary and
popup filter; do not let numeric readings flow into the generic active-count
heuristic. Derive presentation from all members, not filtered rows:

| Type | Active predicate | Summary |
| --- | --- | --- |
| Light | HA state `on` | Active count, otherwise localized All off |
| Cover | `open` or `opening` | Active count, otherwise localized All closed; retain existing exclusion of `closing` |
| Climate | Enabled HVAC mode, not `off`/unknown/unavailable | Enabled count, otherwise localized All off; `hvac_action: idle` does not mean disabled |
| Battery | Valid percentage below 20 | First configured usable numeric percentage, plus low-battery and unavailable counts when nonzero |

The first valid battery reading preserves current maintenance display for normal
inputs and avoids disabling a usable group because its first member fails. The
low count considers every member, so a secondary low battery is never hidden by
a healthy primary. Use the existing battery 20/80% boundaries and numeric locale
formatting; do not invent an average or conflate sensor values with on/off.
Invalid/missing battery readings count as unavailable, not zero; normal validated
percentage range is 0–100. Legacy battery selection keeps existing metadata and
classification; new selection relies on battery class/template metadata, not
arbitrary sensor-domain compatibility. Preserve legacy name-based candidates in
the compatibility adapter rather than silently dropping them.

Unknown/unavailable members are distinct from inactive ones; retain readable
partial counts and disable physical actions. All unavailable groups are neutral
disabled; an explicit zero-member group is an entity-free opener with a clear
empty sheet. No active members with available state remains a usable inactive
group. Loading has its own status. Existing native connection-warning behavior
and service-target guards remain authoritative. Group summary counts are
essential content even if the separate binary-state presentation change lands.

### 4. Extend the existing popup with scoped live filtering

Generate the standard `custom:marao-popup-card`, associated with its typed group
descriptor and complete member card list. New hashes derive from stable group
IDs; preserve the four existing overview hashes for legacy defaults. Opening
the group only navigates, with existing strong haptics. No member service call is
implicit. Use flat one-column member content; preserve climate detail/modes and
existing height/max-height/column-width behavior.

All mode mounts every member, including neutral disabled unavailable rows.
Active mode uses the same type predicate as the summary. On HA updates, reconcile
eligible children by member identity: retain unchanged instances to preserve
native slider lifetime; safely cancel/remove ineligible children, move focus to
the sheet/close control if necessary, and insert newly eligible children in
configured order. When the list is empty, show localized No active entities or
No entities configured as appropriate. Reuse the existing async render generation
guard and teardown so closing/removing the popup cannot attach stale children.
No polling or new subscriptions are needed beyond HA's existing state updates.

Make group identity explicit in popup configuration so the mode-sheet title
heuristic does not hide the group title merely because it contains climate
cards. Preserve the intentionally suppressed title for actual climate mode
sheets. Reuse existing modal semantics, background inertness, trap/restore,
internal scroll, navbar clearance and safe areas. Prefer a group-only update
branch in the shared popup; never rebuild every popup on each HA state change.

Render members through the existing capability-aware entity path, preserving
configured compatible templates/options and room context from resolved metadata.
Route access covers through the shared strict access slide/safe-close generation;
remove the current force-to-ordinary-cover shortcut. Include any required
secondary popup under the owning view. The summary wrapper must not turn off
the whole group on tap. Room All off remains a separate existing room action.

### 5. Legacy defaults and versioned page compatibility

In legacy format-0/1 sources, absence of `overview.entity_groups` means the existing derived defaults, now
converted to descriptors by one shared server-side helper, not duplicate editor
discovery. Reuse resolved rooms, `_battery_entities`, order, labels and member
options. Lights default to `active` as explicitly requested and already specified
by the baseline; other types default to `all`. Empty defaults are omitted.
The accepted ordered 1→2 conversion materializes those legacy descriptors into
Home page cards, retaining explicit lists, member options, unknown fields and
established popup links. Explicit `[]` suppresses defaults. In canonical format
2, absent or empty group cards mean no groups; runtime and editor must not derive
replacement groups from rooms. Registry changes do not alter saved membership.
First-install starters populate explicit useful groups once through the common
page constructors, without refilling later deletions or saved empty lists.

Administrator reads, previews and dry runs expose a compatible copy without
changing exact source or archives; merely opening the editor is not an edit.
Writable setup/save/generation use the same ordered conversion, validation,
preflight, exact backups and recovery path. Preserve public `hc_*` contracts,
raw/custom content, unrelated ownership and protected YAML. Do not duplicate
the conversion framework or use discovery to overwrite explicit input.

## Risks / Trade-offs

- Group objects could disappear in existing entity-only serialization → Extend
  every model/resolver/schema branch together, with mixed-order round-trip tests.
- Active rows can vanish during input → Preserve eligible nodes; cancel on
  removal/unavailability, relocate focus inside the sheet, and test no late or
  double dispatch. Do not optimistically filter against an assumed device state.
- Battery maintenance previously considered one displayed value → Preserve that
  numeric role while adding counts for secondary warnings/availability. Do not
  add arbitrary numeric sensor groups without defined aggregation semantics.
- Access popup regression → Use safe fake doors/gates and check incomplete,
  vertical and completed strict gestures; do not actuate real access devices.
- Shared helpers can affect many cards → Inventory navigation summaries,
  light/cover/access/battery/climate children and every shared popup consumer:
  scenes, climate modes, media, camera/events, access and energy/history sheets.
  Inspect each affected instance after final checks; if general card layout or
  generic popup foundations change, expand to the full gallery as required.
- Parallel proposals change membership, migration or presentation contracts →
  Rebase this additive descriptor onto accepted implementations without silently
  carrying out their pending tasks. Keep counts/readings, title width and shared
  interaction contracts consistent.

## Migration Plan

1. Maintain provenance-backed released sources (missing group field, explicit
   empty rooms, member options, raw/custom/unknown data), and independently write
   expected resolved descriptors/output. Include explicit groups/empty list,
   invalid mixed inputs, duplicate IDs and registry changes in focused checks.
2. Verify editor load/preview/dry run leave exact source/history/owned state
   untouched. On explicit saves, use current shared validation, preflight and
   exact private source/output/owned-state backups; verify failures preserve or
   recover the previous configuration and protect unrelated concurrent edits.
3. Update catalog, source/schema, generator, shared runtime, translations,
   documentation and fixtures in coherent batches. Build editor assets and run
   focused model/generator/runtime checks; deploy only to `192.168.0.28`.
4. Preserve the disposable configuration privately, exercise the safe gallery
   and realistic groups, verify cleanup, and finish with the required affected
   visual/interaction inspection. No implementation or deployment occurs here.
5. Roll back with the matching prior package plus exact saved source/generated
   output/owned-state baseline. Package-only downgrade can lose explicit new
   group selections because older packages ignore the additive fields.

Maintain upgrade coverage when the pending inventory lands; the live historical
upgrade scenario is reserved for explicit release preparation. Neither OpenSpec
validation nor these future focused checks claims release readiness.
