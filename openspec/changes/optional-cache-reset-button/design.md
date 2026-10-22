## Context

Starting commit: `46f52846624f55e4678a479cf949b8252094151f`. Prior test-retirement edits are outside this task.
The shared navbar owns the page-flow refresh row. Both legacy and canonical generators emit its configuration; native cards forward it unchanged.

## Decisions

Use optional `show_cache_reset: boolean` at dashboard level and on navbar cards. Omission means true. Only serialize the setting into generated navigation when explicitly present, preserving old generated structures. Validate explicit values as booleans. The editor displays the default without writing until an edit. Disabling removes the entire row, so no spacing remains. Automatic updates and navbar hold remain independent.

## Verification

Targeted assertions cover default/enabled/disabled rendering and row cleanup, editor persistence, invalid JSON, legacy/canonical generation and native editor preservation. Install current changes once on disposable HA `192.168.0.28`; hand off phone inspection. Do not run the retired slow-camera test.
