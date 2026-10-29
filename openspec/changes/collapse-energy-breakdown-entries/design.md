# Design

## Context

See [proposal.md](proposal.md) for motivation and
[the visual-builder delta](specs/visual-builder/spec.md) for acceptance behavior.

`MaraoDashboardPanel._renderEnergySubEntities` currently mounts a full native
Home Assistant form for every entry. It also renders Power devices and Background
thresholds through separate modes. The energy card editor passes a cloned
`sub_entities` list into this renderer; changes remain private until the card
dialog is applied, and dashboard Save remains the persistence boundary.

Field edits replace contributor objects while retaining their unknown fields;
reordering and deletion rebuild the rendered list. Disclosure therefore needs
identity that survives both operations. Existing page sections already use native
`details`/`summary`, while compact entity rows provide the heading and action
layout to reuse.

## Goals / Non-Goals

**Goals:**

- Add disclosure as editor presentation state without changing contributor data
  or the private-draft callback contract.
- Keep field editing stable while headings update and list order changes.
- Isolate the energy mode of the shared renderer and reuse existing forms,
  controls, localization and theme tokens.

**Non-Goals:**

- A new generic list framework, deferred form-loading system or persisted row IDs.
- Changing validation, energy computation, generated configuration or the shared
  power-device and threshold editing flows.

## Decisions

### Use independent native disclosures within the card dialog

Render each energy contributor in a native disclosure group, reusing the
page-section and entity-row presentation where appropriate. Keep the existing
energy sensor, display name and optional cost sensor form inside that group.
Opening one group does not close another. Existing entries start closed; a new
entry starts open so its required sensor can be selected immediately.

This preserves the current native form integration and gives the heading an
established touch/keyboard disclosure behavior. A separate settings popup was
rejected by the user's inline preference. An exclusive accordion would add an
unrequested restriction when comparing entries.

### Keep disclosure identity local to one dialog

Maintain a small presentation record for each list member, separate from the
serialized contributor object. Carry that record with its member during moves,
retain it when a field edit replaces the contributor object, and remove it when
the member is deleted. Reset records when the card dialog is reopened.

Using the array index would attach expansion to a different entry after a move.
Using the sensor ID would fail for unbound entries or a sensor change. Saved IDs
or expansion options would unnecessarily change the persisted contract.

Disclosure events update only local presentation state: they must not invoke the
configuration-change callback, dirty the dashboard or dispatch an entity action.
Preserve the existing clone/edit/apply/cancel path, including explicit empty
lists and unknown contributor fields. Leave malformed source reporting intact.

### Update headings without rebuilding an active form

Resolve the heading from the display-name override, Home Assistant friendly name
or sensor ID, with a localized placeholder for an unbound entry. Show the sensor
ID as secondary information when available. Update heading nodes after relevant
field changes without remounting the active form, retaining focus and its current
input value. List operations may use the existing rebuild path while restoring
the surviving groups' disclosure choices and a sensible action focus target.

Rebuilding the entire list for every keystroke would risk interrupting native
selectors and text input. There is no need to introduce a separate form lifecycle
or lazy-loading mechanism for this presentation change.

### Keep row actions independent and touch-sized

Place the existing move up, move down and delete buttons in the group header.
Their activation must remain separate from disclosure activation, including native
summary behavior. Retain the existing move boundary guards and single action
dispatch. Use semantic controls and existing localized action labels.

Reuse panel spacing, typography and theme tokens in `frontend_src/panel.css`.
Allow names and the header layout to wrap at narrow widths instead of shrinking
the existing 48-by-48 action targets. Add English/Portuguese strings in
`frontend_src/editor-labels.js` only where the existing vocabulary is insufficient.
An icon-only disclosure without a named heading would make entries harder to
identify and is unnecessary.

### Scope the change at the shared renderer's energy branch

Use the energy mode of `_renderEnergySubEntities` in
`frontend_src/MaraoDashboardPanel.js`; preserve the existing power and threshold
branches. Both hosts of this shared panel receive the same behavior. Reuse the
current `_mountForm` bindings and change callbacks rather than normalizing the
list through a new model.

`validateEnergyOptions` in `frontend_src/editor-model.js` continues to validate
the complete list regardless of disclosure. Existing JSON schema, generator,
runtime cards, storage and APIs need no changes. No migration, new dependency,
entity service call or private diagnostic data is introduced.

Extend the existing editor-panel checks, particularly the private-draft and
ordered-unknown-field regression, rather than creating another test harness.
Reuse existing safe energy configuration in `ha-test` for the user's manual
inspection; no fixture matrix is needed. Update the energy editing guidance in
`docs/docs/installation/configuration.md` and regenerate shipped editor assets
from the editable sources during implementation.

## Risks / Trade-offs

- Header actions also toggle disclosure → isolate button activation and check
  both collapsed and expanded action behavior.
- Expansion moves to another entry after a rename, sensor change or reorder →
  keep presentation identity independent of data objects, sensor IDs and indexes.
- Heading updates interrupt field input → update heading nodes without rebuilding
  the mounted form during ordinary edits.
- Shared renderer changes affect power or thresholds → keep the energy branch
  explicit and check representative existing behavior of the other modes.
- Collapsing a form hides an invalid value → preserve existing validation and its
  readable error path; opening the group must allow correction.
- Long headings compete with actions on mobile → wrap the header layout and keep
  controls at their existing full touch size.

## Migration Plan

There is no data migration: released v0.23.3 contributor structures, missing lists,
explicit empty lists, unknown fields and unrelated card options remain unchanged.
Only disclosure state is new, and it ends with the current card dialog.

During implementation, review the task diff, run the smallest relevant existing
panel checks and rebuild editor assets. Install the final frontend changes once
on disposable Home Assistant `192.168.0.28` with the compatible frontend sync
helper, preserving test configuration. Hand off a short manual watch list for
inline expansion, adding, reordering, deletion and narrow-width use. A broad
browser campaign is unnecessary.

Rollback consists of restoring the previous editor assets through the same
frontend installation path; no saved dashboard conversion or data rollback is
required. This proposal itself changes no runtime files or installed assets.
