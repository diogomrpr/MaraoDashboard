# Proposal

## Why

Popup members currently use Marao-owned layouts, so HA's native card width/height and placement editor cannot control them. Users want to edit a normal HA Sections detail view and see that same saved layout inside the popup.

## What Changes

- Add an optional same-dashboard `popup_view` reference to native popup-owning cards and explicit popup configurations. Render that view with HA's existing view/Sections host inside Marao's existing modal sheet.
- Provide a Popup layout selector in the native card editor and administrator Create editable layout / Edit layout actions in the popup. Explicit creation seeds one dedicated Sections subview from current content and binds the invoking card in one native dashboard save; merely opening/previewing cards never writes.
- HA owns widths, heights, placement, visibility, sections, additions and deletions after linking. No runtime regeneration overwrites native edits. Returning to automatic layout deliberately removes the reference while preserving the prior automatic configuration.
- For linked Entity Groups, derive compatible summary membership and whole/section actions from the saved view cards, including members hidden by native visibility. Seed existing section headings, controls, member options and filtering into the native view; retain shared access safeguards.
- Preserve popup title/close, scrolling, modal focus, column-width centering, native edit inertness and normal navbar behavior. Edit layout closes the popup and opens the source view in HA editing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `native-dashboard-editing`: selecting, explicitly creating and editing a popup's authoritative Sections view with lossless native saves.
- `navigation-popups`: rendering saved native view content inside the existing modal shell and handling edit/missing-source lifecycle.
- `card-behaviors`: linked Entity Group membership and action scopes follow native saved cards and preserve existing dispatch safety.

## Impact

Baseline: `cf4662333dd6223c761e698f4131a197d67e19a7`, package 0.24.4, 2026-11-02. Preserve all pre-existing dirty work, including the three implemented feature changes, native editing fixes and camera proposal. Snapshot: `/private/tmp/ha-managed-popup-layout.json`.

Observed: native cards already support HA grid sizing; `MaraoGroupDetails.js` forces one column and the shared popup owns its child rendering. HA's registered `hui-view` host accepts a saved view through its lovelace/index/hass properties and owns Sections/card lifecycles. This native internal boundary needs a focused compatibility check on the disposable installed HA; no HA source is imported, bundled or patched.

Affected consumers: shared popup, native wrappers/composition/editor, group summary/actions, localization, documentation and safe examples. Existing popup-owning families can select an existing Sections source; only explicitly chosen popups change. No camera transport verification is introduced.

Compatibility is additive: omitted `popup_view` preserves existing behavior and persisted source/envelope/compiler versions. Supported released native descriptors retain unknown settings, raw/native cards and explicit emptiness. Creation backs up the exact dashboard, checks current ownership/configuration, appends the source view and patches only the unambiguous invoking card. Unsupported/ambiguous/missing sources are readable errors, never reset or discovery instructions. Uncertain saves retain recovery data and require readback rather than blind retry.

Non-goals: a second layout editor, automatic conversion of every popup, cross-dashboard references, native editor controls inside a live popup, third-party cards, production changes, full testing or publication. The current user request authorizes both this proposal and its implementation.
