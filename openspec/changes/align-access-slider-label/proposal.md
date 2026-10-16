# Proposal

## Why

The strict access slider places its label above its drag thumb on narrow cards, as shown by the reported Security-page example. Its text and thumb should stay beside each other inside the track at every supported mobile size.

## What Changes

- Keep the label to the right of the resting thumb, vertically centered in the same horizontal row, including tracks at or below the current 240px breakpoint.
- Reserve space for the existing circular thumb; let localized text wrap within the remaining width and the track grow vertically as needed, without clipping, overlapping, shrinking text or stacking the label above the thumb.
- Apply the correction in the shared strict-slide component for page, popup, group and native-host consumers.
- Add positive label/thumb alignment checks and representative safe narrow/enlarged-text examples, retaining existing access gesture, haptic, availability and single-dispatch guarantees.

This changes the text/thumb composition inside the slider. Card title/icon headers are covered by the separate `align-slider-card-headers` change. Changing label wording, access state semantics, gesture thresholds, service behavior, ordinary value sliders, persistence or introducing a layout setting is outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-theme-layout`: add an explicit same-row label/thumb layout requirement for strict access sliders, including narrow tracks and enlarged text.

## Impact

Planning baseline: `e300e1db04ff047fd80b3f2148bdb15e929d9755`. Planning affected-card set: empty; only this change's artifacts are written. Existing header implementation edits and the separate editor-performance proposal must be preserved. Apply must record its actual starting commit and complete affected consumer set.

Observed root: `MaraoSlideToOpen` in `custom_components/marao_dashboard/frontend/MaraoDashboard.js` has a `max-width:240px` container rule that adds 72px of bottom label padding and anchors the thumb at the bottom. The normal rule instead reserves space on the label's left and centers the thumb vertically. Existing accessibility checks reject text/thumb overlap but do not reject a vertically stacked composition.

Implementation affected-card set: all `marao-slide-to-open` instances, including `hc_access_slide_action_card`, opening/unlocking aliases normalized to that effective kind, open-only access members and their generated page/group/popup and native-host instances. This covers lock, cover and service-based openers using the same strict component. Ordinary light/fan/cover numeric ranges and safe close/lock tap controls retain their behavior.

Expected implementation is a small shared style correction plus focused alignment/security/layout checks, source/check mapping, quality/usage guidance and canonical safe fixture expectations. Existing localization and theme tokens remain authoritative. No dependency, editor option, API, source-format, default, generated YAML/ownership or config-entry migration is required; supported saved configurations receive the presentation correction without regeneration or data changes.

Verification will select relevant access-slider geometry, strict gesture/cancellation and alignment checks, run serially and inspect representative layouts only on disposable `192.168.0.28`. This planning request does not authorize implementation, deployment, publication or comprehensive tests.
