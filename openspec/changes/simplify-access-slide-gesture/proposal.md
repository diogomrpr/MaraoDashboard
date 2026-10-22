# Proposal

## Why
The strict opener's progressing fill feels unlike the requested classic iPhone slider, and its fixed drag-start strip does not explicitly follow the whole visible round handle.

## What Changes
- Keep the themed rounded track and round arrow handle, remove progress fill, and fade the concise label with handle travel.
- Allow starting anywhere across the full measured handle, including its outer edges, while rejecting the surrounding track.
- Preserve horizontal intent, cancellation, completion-on-release, authoritative availability, haptics and exactly-once native service routing.

## Capabilities
### Modified Capabilities
- `entity-state-actions`: strict access slide appearance and measured start target.

## Impact
Shared MaraoSlideToOpen runtime used by ordinary/native cards, group sheets and access-action aliases, plus targeted unit fixtures and shared usage/quality documentation. No configuration, generator or migration change. Ordinary value sliders remain unchanged.
