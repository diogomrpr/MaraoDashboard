## Why
The builder exposes Access, Access opener, Close or lock and Security action as separate choices despite sharing access controls. Users need one card whose settings choose its behavior.

## What Changes
- Offer one Access card with automatic, popup, slide, close/lock and security-hold behaviors.
- Keep existing saved template IDs as supported aliases, hidden only from new-card pickers.
- Preserve strict opening/unlocking sliders, safe closing taps and deliberate security holds.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `card-behaviors`: unified access presentation and legacy compatibility.

## Impact
Shared builder/native catalog, validators, generator, runtime, translations, docs and safe gallery. Existing released JSON remains unchanged; no migration or data rewrite. Alarm detail controls and ordinary blind position cards remain separate. No dependency or new gesture.
