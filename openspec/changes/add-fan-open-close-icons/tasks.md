# Tasks

## 1. Shared exhaust action presentation

- [x] 1.1 Record the apply starting commit, acceptance cases and existing dirty work; capture `npm run test:affected -- --snapshot /private/tmp/marao-fan-action-icons.json` before software edits. Verify scope covers the cover-backed fan renderer and adjacent shared Wallbox button styling while preserving unrelated work.
- [x] 1.2 Add distinct decorative opening/closing icons inside the existing exhaust action buttons in `MaraoCards.js`, retaining localized visible labels and accessible target names. Scope layout styles to exhaust actions. Verify by code review that touch targets remain at least 48px, labels can wrap, and capability filtering, button listeners, haptics and guarded dispatch remain unchanged.
- [x] 1.3 Update `docs/docs/usage/cards/md_fan_card.md` to describe the action icons. Review existing safe exhaust/open-only gallery and realistic examples for accuracy; verify that they already exercise this shared renderer and change examples only if necessary to demonstrate the result. No new fixtures or icon-markup tests are required.

## 2. Verification and installation

- [x] 2.1 Review the actual task diff, then select the fan presentation scope with `test:affected --since /private/tmp/marao-fan-action-icons.json --tier visual --component fan --plan`. Verify acceptance by code review and provide a manual watch list for icons with labels, narrow/enlarged-text layout, supported-only actions and disabled states. Browser inspection is optional; if dispatch code changes, run only the existing targeted ventilation assertion in `marao-security.test.js` and report the reason.
- [x] 2.2 Install final frontend changes once on disposable `192.168.0.28` using direct `prepareFrontend()`. Verify installed assets/readiness, preserve safe helper state, and leave the current assets installed. Report any blocked installation as not installed / not ready for test.
- [x] 2.3 Compare each acceptance scenario with implementation and actual evidence, then hand off the test URL and short manual watch list. Verify that no production connection, real-device actuation or unrequested integration campaign occurred; distinguish reviewed behavior from manual checks still left to the user.

## Workflow follow-up

- Archive only after implementation and selected verification are complete, coordinating the existing ventilation delta before baseline synchronization.
- Before any separately authorized push, tag or release, run unit-only `npm run verify:publish`; additional integration or full tests require an explicit request.

## Completion evidence

Implemented in the shared owners and installed on disposable `192.168.0.28` on 2026-11-02. The final frontend sync verified current served assets; owned examples were installed with exact dashboard backup and concurrent-edit protection. Selected frontend checks passed across the batch, plus 11 focused Python configuration/generator checks. OpenSpec strict validation and whitespace review passed. Routine phone appearance/gestures and camera playback remain manual; no browser matrix, full suite, publication or production operation was performed.

Chrome follow-up (2026-11-02): visually verified distinct Open/Close icons with localized labels on binary exhaust cards and reviewed open-only/neutral cases in the safe fan gallery. No device action was dispatched.
