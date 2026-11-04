# Proposal

## Why

The supplied screenshot shows a tiny close glyph inside the full-size button in Marao settings. The button inherits body typography, making the close action harder to recognize than the other popup controls.

## What Changes

- Give the existing Marao settings close control explicit icon typography, proposed at `2rem` rather than inherited body text size.
- Center the glyph inside a non-shrinking button at least 48 by 48 CSS pixels, removing text-button padding that would crowd the enlarged icon.
- Preserve the localized accessible name, close handler, modal behavior and focus restoration.

Acceptance: the close glyph is clearly larger and centered in the settings header; its full touch target remains usable; the title and icon do not overlap on the supported narrow/enlarged-text layouts; closing still dismisses the popup and restores focus. Exact `2rem` sizing is an implementation choice, not a user-specified measurement.

Observed source: `frontend_src/dashboard-settings-dialog.js` renders a text `×` inside `[data-close]` and supplies only the generic button font/padding. The fix belongs in that popup's shared stylesheet and its generated bundle. No application change or installation is part of this planning request; the preliminary local edit and generated output were reverted when the user requested a proposal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a presentation repair under the existing `navigation-popups` close-control, modal-focus and close-clearance contracts. It adds no capability or interaction requirement, so `.openspec.yaml` sets `skip_specs: true`.

## Impact

Affected card set: empty; the affected shared surface is the administrator Marao settings popup, opened through the navbar maintenance menu. Edit `frontend_src/dashboard-settings-dialog.js` and regenerate `custom_components/marao_dashboard/frontend/MaraoDashboardSettings.js` using `npm run build:editor`.

Persisted settings, released configuration formats, local preferences, generated dashboard structures, APIs, defaults, translations and dependencies remain compatible and unchanged; no migration or version bump is required. Existing popup themes and localized labels are reused. No new fixtures, gallery cases, documentation option or regression test is needed for a font/layout-only rule. Existing settings tests remain available if implementation changes behavior unexpectedly.

Non-goals: implementing `consolidate-current-room-settings`, changing other popup families or button sizes, altering access permissions, or redesigning the settings header. The close-icon fix can be batched with that proposal later if both are explicitly applied.

Verification during implementation is source/diff review and bundle freshness, followed by one final compatible frontend installation on disposable `192.168.0.28` using `prepareFrontend()`. Leave routine visual checks to the user with a short watch list; no automated browser or full-suite campaign is required.
