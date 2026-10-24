## Design
Keep `hc_access_card` as the single discoverable family. Store `variables.access_mode` (`auto`, `popup`, `slide`, `close`, `hold`). Resolve it read-only to the existing runtime templates, reusing all gesture/service safeguards. Preserve legacy IDs, unknown fields, explicit actions, identity and order; an absent mode keeps legacy behavior. Unsupported mode/entity combinations fail validation.

The shared catalog exposes the same setting to dashboard and native editors and keeps aliases registered but hidden from creation. Validation and generation share effective-role resolution; raw runtime cards resolve the same setting before rendering. Localized labels use existing HA form selectors. Existing compact geometry and seasonal colors remain unchanged.

No persisted conversion or migration writes occur, so no recovery operation is introduced. Install the candidate preserving the disposable configuration and helpers. Validate native/page generation and raw runtime configuration with targeted tests; phone gestures stay manual.
