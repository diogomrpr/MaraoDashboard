# Tasks

## 1. Shared light entry points

- [x] 1.1 Add capability-aware icon and 600 ms default hold entry points in the shared light card without changing geometry, seasonal backgrounds, brightness or explicit actions; verify focused capability, hidden-icon, custom-action and hold/scroll cancellation assertions.
- [x] 1.2 Document the new icon/hold behavior and ordinary-light compatibility beside Brightness in the light-card guide; review the rendered text and changed links against actual behavior.

## 2. Picker controls and popup lifecycle

- [x] 2.1 Implement the lazily loaded color wheel, bounded warm-to-cool control, shared brightness control and localized off/loading/error states; verify capability variants, no action on open/cancel, one final update, off-to-on, availability guards and authoritative state reconciliation with focused tests.
- [x] 2.2 Integrate the picker with the shared Marao sheet and group detail/Back lifecycle; verify parent scroll/focus restoration, lazy-load failure/retry and cleanup without a light action.
- [x] 2.3 Reuse existing safe light examples, adding fixture capabilities only if required, and keep gallery/realistic-page examples accurate; verify their configuration exposes the feature without real-device actions or saved-data changes.

## 3. Focused integration and installation

- [x] 3.1 Review the actual diff against the approved acceptance cases and affected consumers, run the selected targeted checks serially, and confirm card dimensions and popup return behavior; record actual evidence and any remaining manual phone gesture checks.
- [x] 3.2 Install final applicable changes on disposable `192.168.0.28` through the compatible frontend helper, using full preparation only if fixtures require it; verify served assets/readiness, preserve test configuration/helper state and leave the installation ready for the user.

## Workflow follow-up

- Do not publish or archive as part of implementation. Any later push, tag or release requires the unit-only `npm run verify:publish` gate and final-candidate installation; additional integration/full checks require an explicit request.

## Development evidence

- Focused local 390px browser check passed: equal card/icon dimensions, lazy loading and retry, ordinary/hidden icons, body tap, 600 ms hold, scroll/movement cancellation, configured actions, one final color/temperature/brightness call, cancellation, service errors, disabled states, group Back scroll/focus/title restoration, active-only group retention, and late-load cleanup.
- Nine picker tests, four shared-slider tests and 42 selected existing light/slider/hold/popup/history tests passed. Two assertions were updated for the extracted slider styles and parameterized hold duration; security hold timing remains checked at 1200 ms.
- Safe fixture YAML passed Home Assistant template-light schema and preservation assertions. No camera, full-suite or mobile-matrix testing was run. Physical iPhone/Android gesture feel remains a manual check.
- Pre-existing seasonal theme/background changes remain intact. No saved configuration schema or generator contract changed.
- Installed frontend `000e84dd0ab21828` with the safe color-light fixtures on `192.168.0.28`. Full preparation and served-asset/readiness checks passed; original dashboard source, Home Assistant configuration and all 213 existing helper values were restored and verified.
- Home Assistant 2026.10.0 restored the fixture's former brightness-only capabilities at startup. One native template reload repaired the mismatch; subsequent installation checks confirmed HS/color-temperature support and 2000–6250 K limits. The upstream template-light restore path explains the mismatch; no fixture or shipped integration workaround was needed.
