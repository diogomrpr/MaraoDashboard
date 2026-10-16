# Proposal

## Why

Slider-capable cards currently inherit a shared layout that places their icon below a full-width title. Their icon and title should instead share one header row consistently, including light and fan variants that omit their slider.

## What Changes

- Put the visible title and icon in the same header row for `hc_light_card`, `hc_fan_card`, `hc_cover_card`, and `hc_access_slide_action_card`, including access-action configurations normalized to the strict opener by the runtime.
- Select the layout by card family, independently of whether a slider is rendered, enabled, supported, or usable. Keep state, useful labels, problems, and any slider below the header.
- Keep essential titles wrapping in the remaining header width on narrow phones and enlarged-text profiles. Preserve explicit title/icon hiding and icon-only presentation.
- Amend the existing universal title-width requirement with this explicit family-specific exception. Other families retain their current composition.
- Align the shared runtime, documentation, canonical safe gallery, realistic examples, and focused layout/interaction checks during implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: Modify **Compact summary title width** to require a shared icon/title header for slider-capable card families, regardless of slider presence, while retaining existing reflow and presentation contracts elsewhere.

## Impact

- **Planning baseline:** `e300e1db04ff047fd80b3f2148bdb15e929d9755`. This proposal changes planning artifacts only; its current affected-card set is empty. The pre-existing untracked `optimize-visual-editor-rendering` change is unrelated and must be preserved.
- **Implementation affected-card set:** `hc_light_card`, `hc_fan_card`, `hc_cover_card`, `hc_access_slide_action_card`; includes generated page cards, overview/group/popup instances, native/dashboard preview hosts, manually configured cards, and access-action aliases whose effective runtime kind is the strict opener. Regression representatives cover other consumers of shared `cardStyles()`.
- **Observed:** `MaraoCards.js` uses title-spanning grid rows, binary-card overrides, and a narrow-card stacking override. `_range()` renders ordinary ranges for light/fan/cover and the strict access component for openers. Climate, number, and Wallbox controls are numeric steppers; current media controls use buttons.
- **Assumptions:** Retain the existing title-left/icon-right reading order. A wrapped title remains in the same grid row as its icon. Explicitly hidden content stays hidden.
- **Compatibility:** Presentation-only change. Preserve persisted JSON, defaults, `hc_*` keys, generated Lovelace structures and ownership, public options, native/save/history APIs, and protected/unknown/raw content. Existing saved configurations receive the new runtime presentation without regeneration or migration; no version bump or historical conversion is proposed.
- **Non-goals:** Adding sliders, changing their capability/enable rules, redesigning other card families, adding a layout option, changing actions/security gestures/state semantics, publication, or comprehensive testing.
- **Verification:** Scoped `test:affected` selection with explicit shared-file components, targeted header geometry and mobile typography cases, applicable alignment/value-slider/security checks, then representative visual inspection only on disposable `192.168.0.28`. Planning validation does not establish an implementation pass.
