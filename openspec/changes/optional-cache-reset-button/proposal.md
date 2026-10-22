## Why

The main-page cache reset button is always visible. Administrators need a dashboard editor toggle to hide this optional recovery shortcut.

## What Changes

- Add the boolean `show_cache_reset` setting to General, defaulting to enabled when omitted.
- Carry explicit settings into generated navigation and expose the same option in the native navbar editor.
- Hide the button and its space when disabled; retain automatic refresh and navbar-hold recovery.

## Capabilities

### Modified Capabilities
- `visual-builder`: optional cache reset control.
- `navigation-popups`: main-page refresh visibility.

## Impact

Editor, JSON validation/schema, generation, shared navigation, translations and targeted tests. Existing released configurations require no migration; omission retains current behavior.
