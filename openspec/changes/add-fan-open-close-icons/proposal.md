# Proposal

## Why

The fan card's cover-backed exhaust-valve variant currently shows text-only Open and Close buttons. Distinct action icons will make those controls easier to recognize at a glance.

## What Changes

- Add distinct opening and closing icons to the existing exhaust-valve action buttons across native, generated, generic and popup instances using the shared fan renderer.
- Retain the localized visible Open/Close labels and target-specific accessible names. Adding icons alongside labels is the planning assumption; no icon-only conversion is proposed.
- Preserve capability filtering, disabled states, touch target sizes, haptics, service dispatch and access-cover safeguards.
- Update the fan usage documentation to describe the action icons; reuse existing safe exhaust examples.

Non-goals: adding Open/Close to `fan.*` entities, new actions or settings, user-configurable action icons, replacing the main fan icon, or changing access controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: visible action icons for supported exhaust-valve Open/Close controls.

## Impact

Affected card set: the cover-backed `md_fan_card` / `custom:marao-fan-card` variant. Ordinary fans retain on/off and speed behavior. The shared markup and styles live in `custom_components/marao_dashboard/frontend/MaraoCards.js`; the existing `coverActions` branch renders the labels and `data-exhaust-action` buttons. Keep its event handlers and guarded `_coverAction` dispatch unchanged. Review adjacent Wallbox styles because the button surface rule is shared.

The completed but unarchived `support-exhaust-valve-controls` change defines existing ventilation behavior; its requirements remain prerequisites, not newly claimed published baseline. This delta adds presentation requirements to the existing `card-behaviors` capability without rewriting that change or the separate people-columns proposal.

Saved-release and generated-contract compatibility is preserved: no JSON fields, defaults, schemas, generator output structures, entity identities or migrations change. No editor, builder, Python generator, translation keys or theme changes are required; reuse existing localized labels, native HA icons and theme tokens. Unknown fields and authored card/icon settings remain untouched. Existing ventilation dispatch tests in `tests/frontend/marao-security.test.js` provide behavior reference; this presentation-only task does not require a new test campaign or fixtures.

Planning baseline: commit `cf4662333dd6223c761e698f4131a197d67e19a7`. The working tree contains unrelated software and planning work; preserve it. This workflow writes planning artifacts only and does not install software.
