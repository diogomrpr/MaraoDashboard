# Proposal

## Why

The existing alarm card shows state without the original dashboard's arm/disarm controls. The shared strict access slide dispatches only lock and cover services, so a button-based building-door opener cannot be imported safely.

## What Changes

- Add a generated alarm sheet with supported arming modes, a deliberate disarm/custom-bypass hold and transient masked PIN entry.
- Expose the existing strict-slide template for explicit button, switch and script openers, preserving lock/cover behavior and generic entity defaults.
- Convert the user's mounted YAML dashboard into a private format-2 builder import using Marao/native cards, retaining distinct bindings and documenting presentation differences.
- Align the builder, validation, generator, runtime, translations, safe gallery, documentation and focused checks.

## Capabilities

### New Capabilities

None; extend the existing dashboard contracts.

### Modified Capabilities

- `card-behaviors`: supported alarm modes and transient PIN controls.
- `entity-state-actions`: domain-correct service openers and safe alarm actions.
- `visual-builder`: explicit service-opener selection and editable alarm sheet options.
- `dashboard-generation`: alarm sheets and stable opener descriptors without changing format 2.

## Impact

Starting commit: `1ec055c69afa3ba8d8911b6b78cb24e115253a3a`. Preserve the unrelated edit to `ensure-safe-dashboard-upgrades/tasks.md`.

Affected-card set: `hc_security_card`, internal alarm controls, `hc_access_slide_action_card`, `hc_access_card` and lock/cover access actions. Also cover hc_dishwasher_card and hc_vacuum_card: preserve recognized sensor refill warnings and the original native vacuum command parameters during conversion. Shared route/visibility cancellation also covers security/media holds and light/fan/cover slider consumers; scoped native slider regressions cover both phone families. No dependencies or new endpoint are required.

Compatibility is additive: keep dashboard format 2 and existing explicit/unknown/raw/custom configuration; existing alarm descriptors gain an owned sheet unless their explicit action overrides it. Historical conversion inputs remain unchanged, with independent expectations for generated alarm sheets. No production writes, original secrets, publication, comprehensive tests or unrelated queued feature implementation are included.
