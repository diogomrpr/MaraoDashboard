## Why

The user wants direct editor access beside Clear cache on the main page again, using a pencil icon, plus independent visibility settings and guidance for the existing navbar hold alternative.

## What Changes

- Add an administrator-only pencil shortcut beside Clear cache, enabled by default and using the actual configured editor route.
- Add optional boolean `show_editor_button` (omitted means enabled) beside `show_cache_reset` in General settings, with localized three-second navbar hold guidance.
- Keep the administrator Maintenance menu and regular-user direct refresh hold independent of both buttons.
- Supersede only the no-permanent-editor-shortcut placement clause from `admin-navbar-maintenance-menu`; retain its role and action guards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: configurable main-page shortcuts with current administrator/route/modal checks.
- `visual-builder`: independent shortcut toggles, source/schema validation and localized alternative guidance.

## Impact

Native source/model/schema, General settings, compiler navbar metadata and shared navigation runtime; English/Portuguese labels and configuration docs. No Python change to the frozen legacy integration. No source-format, envelope or compiler-contract version change.
