# Verification

- Task snapshot: `/private/tmp/marao-input-dropdown-start.json`; prior cache-setting and slow-camera retirement edits remain outside this task.
- Three targeted existing Node checks passed: both selector domains with 1/5/200 options; selected value, escaping and native dropdown markup; exactly-once service dispatch with reported-value retention; invalid/unavailable/disconnected no-dispatch behavior; readable service failures.
- Syntax checks, diff whitespace review and strict OpenSpec validation passed. Reviewed selector plan has no unresolved mappings. Updated existing browser consumers to use select options; did not execute browser suites.
- Installed with `prepareFrontend()` on disposable HA `192.168.0.28`, served-asset/readiness checks passed, frontend identity `4081e0081efdfff7`. Receipt: `/private/tmp/marao-input-dropdown-installed.json`.
- Manual watch list: open an input-select dropdown on the phone, confirm the current choice and scrolling through a long list, then select an option and confirm the HA state updates. Mobile operating systems own their native option picker appearance.
- No browser/phone inspection, camera tests, full suite, production access or publication performed.

## Themed dropdown correction

- Snapshot `/private/tmp/marao-themed-select-start.json` excludes earlier work. Replaced the prior native picker with the actual shared Marao dropdown extracted from the power-history period menu. No native select remains on selector cards.
- Seven targeted offline checks passed: selector domains and 1/5/200 options; authoritative selection and exactly-once dispatch; unavailable/disconnected behavior; readable service errors; actual retained-menu DOM placement during rerenders; bounded floating-menu positioning and cleanup; existing power-period keyboard/outside/Escape/retained-focus behavior.
- The menu uses theme tokens and native popover layering for clipping clearance, with custom buttons and a bounded scrolling options list. Preserving its attached DOM prevents popover dismissal and scroll reset during state updates.
- Editor/chart assets rebuilt, scoped plan has no unresolved mappings, syntax/whitespace checks and strict OpenSpec validation passed. Updated existing browser consumers but did not run browser, mobile or camera suites.
- Installed final frontend on disposable HA `192.168.0.28`; current served assets/readiness passed with frontend identity `a6560513a1475156`. Receipt: `/private/tmp/marao-themed-select-installed.json`.
- Manual watch list: themed option appearance and placement on the phone, scrolling through long lists, selected-option marking, outside/Escape dismissal and power-period picker operation. No real-phone appearance or browser integration check was performed.
