## Decisions
Starting commit: `46f52846624f55e4678a479cf949b8252094151f`. Preserve prior cache-button and test-retirement work using `/private/tmp/marao-input-dropdown-start.json`.

Use the shared Marao dropdown extracted from the power-history period picker, with theme colors, Montserrat, a visible dropdown indicator and minimum 48px controls. Use semantic buttons/menu-item radios and a bounded scrolling menu. The browser popover primitive places the themed menu above card clipping boundaries; no native select picker is used. Both supported domains share the existing validated service method. After a selection, retain the reported HA value until authoritative state updates. Unknown, unavailable and disconnected controls remain disabled.

## Verification
Update existing option-count and dispatch assertions for the dropdown, including a large option list. Keep browser consumers accurate without running their suites. Install with the compatible frontend sync helper; hand off phone picker appearance.

## Themed menu correction

Snapshot `/private/tmp/marao-themed-select-start.json` records the prior dirty state. Shared consumers are input-select/select cards, native wrappers and the power-history period picker. Preserve an attached open scene menu across state updates; never reparent a showing popover. Clean up outside/keyboard/viewport listeners when owners are removed. Changing the option list may rebuild the menu. No persisted configuration or service contracts change.
