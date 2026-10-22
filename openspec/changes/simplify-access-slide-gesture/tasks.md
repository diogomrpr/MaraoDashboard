# Tasks

- [x] 1. Update the shared access-slide presentation/start target and relevant fixtures, document the new behavior and verify focused pointer/touch safety and native routing.
- [x] 2. Review the scoped diff and affected plan, validate/build and install current frontend assets on disposable 192.168.0.28 with served-asset/readiness checks.

Starting commit: `036190cd3e7227c73a7608180036484bad87449b`. Dirty-state snapshot: `/private/tmp/marao-unlock-slider-start.json`. Prior unrelated changes remain preserved. Shared consumers include normal and native access cards, explicit opener aliases, group/popover instances and safe open-only controls.

## Completion evidence

The 15 selected access/slide tests passed serially: pointer and touch starts across the round handle, measured targets after taller layouts, track rejection, horizontal intent, partial/cancelled/outside releases, disabled/disconnected targets, haptic milestones, native service routing and one dispatch. The security test harness now imports the editor model normally so its relative dependency resolves; this fixes the selected check's pre-existing data-URL loading failure. Existing visual assertions confirm the 54px target, same-row label layout and absent progress fill. Syntax/diff checks and strict OpenSpec validation passed. The reviewed access-label/security plan has no unresolved mappings; broad/browser suites were not run. Final current frontend assets were installed on disposable `192.168.0.28`, and served-asset/readiness checks passed without resetting dashboard configuration/helper state. Physical-phone gestures/appearance remain for the user's manual check.
