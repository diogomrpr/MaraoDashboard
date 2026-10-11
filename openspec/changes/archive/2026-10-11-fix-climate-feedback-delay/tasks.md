# Tasks

The confirmed user symptom is mode/on-off delay. Prioritize that path; temperature stepping below addresses the independently reproduced rapid-tap defect.

## 1. Climate request feedback and stepping

- [x] 1.1 Align `AGENTS.md` and the dashboard quality guide with the explicit climate-only requested-setting exception; record the complete affected-card set, including every shared service-helper consumer. Verify wording preserves authoritative measurements, availability, security and single-dispatch rules without altering unrelated work.
- [x] 1.2 Add the minimal entity-shared climate overlay and opt-in service outcomes at the existing native service boundary. Cover `_adjustNumber`, `_setClimateMode`, single-mode default actions and explicit native climate service actions. Add focused tests for immediate preview before service settlement, rejection/skipped dispatch and unchanged non-climate notifications/guards; run the relevant existing frontend test files and retain one centralized native service-call site.
- [x] 1.3 Base repeated temperature steps on requested settings and handle mode/target shape changes using reported capabilities. Verify 21 → 21.5 → 22 → 22.5 with three calls, decreases/reversals, decimal precision, aliases, bounds and low/high gap preservation in `tests/frontend/marao-climate-card.test.js`; verify unsupported/missing targets create no fabricated settings or calls.
- [x] 1.4 Render requested modes and unitless targets with compact English/Portuguese pending feedback, retaining measured temperature/activity, haptics, touch size and focus. Add rendering/action coverage for duplicated cards and mode sheets in existing frontend tests; document the requested-versus-reported distinction in the climate quality-guide section and verify existing builder/generator configuration needs no new setting.

## 2. Confirmation, errors and lifecycle

- [x] 2.1 Reconcile mode and single/range target independently on matching reports, rejection, disconnect/target loss and the 30-second deadline. Add clock-controlled tests for delayed acknowledgement versus delayed confirmation, mismatching reports, failure once, old responses/timers after newer input, simultaneous mode/target changes and no retries; verify the focused tests pass and availability still blocks requests before preview.
- [x] 2.2 Subscribe/unsubscribe duplicate climate cards with existing configuration/lifecycle hooks and clean timers/listeners when appropriate. Verify popup closure preserves a remaining card's request, opening a sheet reflects pending settings, unrelated updates do not reset intent/deadlines, entity changes/removal clean state, and reload/recovery begins from reported state in existing frontend lifecycle tests.

## 3. Safe fixture and live-browser coverage

- [x] 3.1 Extend `ha-test/custom_components/marao_test_climate/` with deterministic delayed acknowledgement, delayed confirmation, rejection, no-confirmation and corrected-value behaviors without changing default fixtures. Add focused fixture tests for isolated instances and single/range targets; document fixture controls in the existing local-development guide and verify no test-only code enters the shipped integration.
- [x] 3.2 Update canonical Cases definitions and safe entity generation with materially distinct pending/error variants, plus a representative delayed thermostat on a realistic generated climate page of `/marao-dashboard`. Verify fixture/YAML generation and the deployment dry run; keep existing single/multi-mode, unknown/unavailable and dual-target coverage visible.
- [x] 3.3 Extend existing live Playwright climate checks, first covering off → supported mode, mode → off and mode → another mode: selected mode, label and pending feedback must update before delayed service/state confirmation, without inventing measured temperature or actual activity. Then verify rapid temperature taps accumulate, calls dispatch once, duplicate cards agree and confirmation/rejection/expiry restore the correct display. Deploy only to `192.168.0.28`, run the focused climate checks using safe fixtures, and inspect request/console/resource diagnostics without suppressing defects.

## 4. Final affected-card integration validation

- [x] 4.1 Run the smallest relevant automated checks after the last edit, including service-helper regression checks and the existing icon-only alignment check if any such layout changed. Then make the final visual and interactive pass over every affected climate variant and every affected shared-helper consumer on disposable `/marao-dashboard`: both themes; 320px, iPhone/Android portrait and landscape; normal, bold, 200% text, 200% zoom and bold plus 200% text. Verify spacing, centering, clipping, readable pending/errors, control sizing, focus and popup behavior. Fix any defect, rerun focused checks and repeat this final inspection; record verified profiles without claiming real-phone testing.

## Workflow follow-up

- Review and archive/sync only after implementation and verification are complete; this planning change does not alter the baseline yet.
- Before any push, tag or release, run `npm run verify:publish` against the disposable instance and require GitHub Tests, hassfest and HACS validation for that commit. Publishing is a separate request; do not waive the existing native reconnect checks.
