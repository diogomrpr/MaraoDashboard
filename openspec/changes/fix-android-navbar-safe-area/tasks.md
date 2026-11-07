# Tasks

## 1. Shared spacing fix

- [x] 1.1 Add the resolved bottom inset to the non-iPhone 24px gap, preserve iPhone/iPod and explicit-zero resolution, extend the existing navbar regression and update the quality guide; verify the shared consumers in the diff and run only `node --test tests/frontend/marao-navbar-card.test.js` plus strict validation of this OpenSpec change.

## 2. Installation and handoff

- [x] 2.1 Install the final frontend on disposable `192.168.0.28` with `prepareFrontend()`; verify its successful installed/current-asset/readiness result while preserving dashboard configuration and safe helpers.
- [x] 2.2 Compare the requested acceptance cases with the actual diff and selected evidence, and deliver the test URL with a manual watch list for Android buttons, gesture navigation and reachable page/popup controls; clearly state that physical-phone verification was not performed.

## Workflow follow-up

- Keep this change unarchived until the user requests finalization. Physical-phone feedback remains a manual handoff, not claimed automated evidence.
- Publication is outside this task. Before any later push/tag/release, run the unit-only `verify:publish` gate; no additional integration/full tests are implied.
