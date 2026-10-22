# Proposal

## Why
Availability warnings repeat long entity names and grow otherwise compact cards. Group summaries become dominated by an unavailable member even when useful devices remain.

## What Changes
- Keep partial group, legacy summary and room-light counts/palettes without unavailable counts or member-error rows.
- Use concise localized availability status on individual cards, without affected entity names. Complete unavailability shows only that status while preserving retained errors for recovery.
- Preserve disabled actual-target guards, full-loss neutral states, unknown/missing/disconnected distinctions, useful readings, popup member statuses and reported faults/action/content errors while usable.

## Capabilities
### Modified Capabilities
- `entity-state-actions`: compact availability presentation.

## Impact
Shared MaraoCards state/problem helpers, direct cards and runtime consumers, usage/quality documentation and targeted Node coverage. No persisted config, editor, generator or migration changes.
