# Implementation evidence

- Starting commit: `e300e1db04ff047fd80b3f2148bdb15e929d9755`.
- Changed presentation: `hc_light_card`, `hc_fan_card`, `hc_cover_card`, `hc_access_slide_action_card`, including `hc_access_*` configurations normalized to a strict opener for `lock.unlock` or `cover.open_cover`.
- Hosts: generated and manual `custom:marao-card` instances, overview/group children, page and access popups, and native cards/previews that load the same renderer.
- Other shared-renderer consumers retain their existing layout: base, header, title, weather, glance, navigation, room, access summary/close/lock/hold, alarm/security, sensor, battery, switch, scene, number, Wallbox current, climate, media/app, vacuum, dishwasher, washing machine, graph and toggle graph. Timeline, energy-period and camera-event renderers retain their separate title contracts.
- Compatibility: runtime/CSS only; saved JSON, defaults, keys, public APIs, generator ownership/structures, raw/protected/unknown content and history remain unchanged. No conversion or live preserved-install upgrade proof is needed for this path.
- Unrelated work preserved: the untracked `optimize-visual-editor-rendering` change.

## Verification results

- `npm run ha:sync:dry-run`: passed; no remote writes.
- `npm run test:affected -- --base e300e1db04ff047fd80b3f2148bdb15e929d9755 --component slider-headers`: **19/19 passed**, serially. Seven offline checks cover shared card rendering, strict-slide/haptic/cancellation safety, value-control targets, gallery/helper fixtures and scope selection. Twelve live checks cover nine header profiles, iPhone/Android value sliders and safe security/openers.
- Header profiles, each in light and dark: normal iPhone, normal Android, 320px, iPhone landscape, Android landscape, bold, 200% text, 200% browser zoom, bold plus 200% text. Geometry includes explicit slider omission, unsupported capabilities, hidden fields, legacy strict openers, 120px card containers and a mutation proving that a missing header layout fails the check.
- Page/popup/native coverage: canonical Cases and value-slider sheet; realistic Living Room; native example page and its read-only light preview. The latter two hosts were checked in both themes at normal iPhone size. Existing title assertions remain active for unaffected representative families.
- Existing live value-slider checks passed for 40 rendered ranges per phone/theme with focused native gestures, confirmed/target independence, stable input lifetime, cancellation and single dispatch. Safe alarm/openers passed in both themes. No real security/safety device was actuated.
- Final visual review after the covering check: slider-absent light, capability-absent fan in dark mode, narrow strict opener, unchanged navigation composition, realistic room light, native dark preview, bold/200% long title and a lighting popup. Titles wrap beside the icon, controls remain contained and neutral problem cues remain below the header. Captures are private.
- Private final report: `tests/.artifacts/verification/run-fZAax4/report.json`; `passed: true`, `verified_cleanup: true`. Loaded frontend identities were verified and safe helper cleanup completed. The final capture pass reported no console warnings/errors or failed resources.
- During development, the new geometry runner exposed its own premature navigation and popup measurement timing. It now waits for network settling before navigation and for sheet entrance animation before measurement. Raw failure captures remain private; no failure filter, relaxed 48px threshold or product workaround was introduced.
- `openspec validate align-slider-card-headers --strict --no-interactive` and whitespace/link checks passed. The earlier repository-wide strict audit's existing long-requirement warnings in `gallery-release-verification` and `repository-workflow` remain unrelated and unchanged.
- Omitted: full suite, exhaustive gallery/mobile matrix, historical/preserved-install upgrades, reconnect scenarios and physical-phone inspection. This presentation-only change does not alter persisted/generated contracts. No publication or archive was performed.
