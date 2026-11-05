# Tasks

## 1. Display option and compatible editing

- [x] 1.1 Record the implementation baseline, dirty-state snapshot, affected media consumers and acceptance cases; inspect the supported released native inputs and record additive-field compatibility without changing historical provenance or unrelated pending work.
- [x] 1.2 Add the catalog-backed `variables.media_display` selector, English/Portuguese labels, shared validation and JSON schema. Extend the existing editor-model/panel checks for Popup omission, explicit Popup/On dashboard, invalid values and lossless app/remote/custom-field round trips. Document the choices in the media usage page and confirm the editor build stays within its budget.

## 2. Shared media content and dashboard presentation

- [x] 2.1 Extract reusable generic/Apple TV control content from `createMediaPopup()` and retain the current popup wrapper. Add narrow native-compiler expectations for unchanged omitted-mode output, app order, remote/volume targets, bounded seek payloads and authored actions; verify supported historical source/output expectations remain unchanged.
- [x] 2.2 Compile On dashboard as an expanded player-information/control stack at the card's current position, without modal controls or an automatic popup trigger. Preserve section settings and sibling order; add compiler assertions for generic and Apple TV cases, mixed duplicate display modes and no unused automatic media sheet. Update media usage and applicable quality/coverage notes, including the recommended one-column section.
- [x] 2.3 Include a dedicated Now playing card/section above the inline controls, showing HA-reported current title, available artist/media/source details, playback state and enabled artwork. Reuse existing media rendering and add narrow runtime checks for live item changes with mounted controls, paused media, idle/off clearing, incomplete metadata, artwork preferences and neutral unavailable/disconnected feedback. Add English/Portuguese labels and document the section in media usage guidance.
- [x] 2.4 Preserve external popup definitions and stored fields while validating actual rendered links. Add focused compiler/session cases proving a still-referenced removed automatic sheet prevents saving, invalid input leaves source untouched, and switching back restores popup behavior without losing options.
- [x] 2.5 Reuse existing child-card lifecycle and dispatch guards for inline controls. Extend the smallest existing media runtime checks to prove one-call app/remote/volume actions, short/long command cancellation, actual-target availability, inert previews and no dispatch from page mounting or rerendering. Retain the current 80px app surfaces and readable error-details access without adding new service behavior.

## 3. Examples, final checks and installation

- [x] 3.1 Add one inline media example beside the existing Popup example in the disposable card-test gallery and one realistic media-page placement using existing safe helpers, including Now playing. Confirm both live under `/marao-dashboard`, with no real device actuation or test assets in shipped code. Record a short manual watch list for current media details/artwork, inline layout, app sizes and remote use.
- [x] 3.2 Build final assets, review the task diff and scoped check plan, run only the targeted checks needed above, and validate this OpenSpec change strictly. Compare every requested acceptance case with the delivered code/evidence; report any unverified appearance or known failure honestly without a full/browser/camera campaign.
- [x] 3.3 Install all final applicable frontend changes once on disposable `192.168.0.28` through `prepareFrontend()`, preserving source, helper state and independent settings. Confirm served assets/readiness and leave the current installation available; report its URL and required reload. Installation failure means not installed / not ready for test.

## Workflow follow-up

- This proposal authorizes planning only. Implementation starts with a subsequent apply request.
- If publication is requested later, run unit-only `npm run verify:publish` across the release candidate, install its final version metadata and satisfy applicable package checks. Reuse development evidence; do not add integration/full tests without an explicit request.
- Archive only after implementation and verification are complete and the user requests it.

## 4. Follow-up: Tap-only built-in media buttons

Evidence: baseline `7b500719b6318261bd33a2bda13ce6a5e09c6341`, snapshot `/private/tmp/marao-media-tap-1793830866093.json`. Four selected native/compiler/Python checks and editor build/check passed. The current expected outputs remove only the ten reviewed generated holds per native baseline; frozen source/released output bytes remain unchanged. Final current assets are installed on disposable `192.168.0.28` with served-asset/readiness checks. Manual watch: directions/Select send once on tap, show ordinary brief feedback and no hold ring in popup/inline panels. No real-device or full/browser campaign was run; no new release was published.

- [x] 4.1 Remove automatic long actions from shared native and Python media factories, update current safe gallery examples and media documentation, and preserve explicit authored holds and frozen released inputs/outputs. Update independently specified current compiled expectations only for the removed generated holds. Verify both compositions expose only ordinary commands with the existing remote targets using the focused native/Python tests.
- [x] 4.2 Rebuild editor assets, review the actual task diff and scoped plan, validate the delta, and install the final current changes on disposable `192.168.0.28`. Confirm served assets/readiness and hand off a short tap/progress-ring manual watch list.

## 5. Follow-up: App shortcut vibration and wake

Evidence: snapshot `/private/tmp/marao-app-wake-1793831188919.json` captures the prior tap-only media work. Five focused runtime checks passed, including the actual default click binding, one heavy haptic, deferred wake/source order, no redundant wake, wake errors and stale/unavailable/preview guards. Editor build/check, syntax, whitespace and strict delta validation passed. Final frontend assets are installed on disposable `192.168.0.28` with served-asset/readiness checks. Physical vibration and real Apple TV wake/app startup remain manual; no new release was published.

- [x] 5.1 Add default app shortcut source actions and a shared owner wake/source sequence with one heavy haptic, exact targets, readable failures and stale/availability/preview guards. Verify click binding, ordered deferred wake, already-on selection and failed/stale continuation in the existing runtime harness; update app guidance and the capability/design without changing saved configurations.
- [x] 5.2 Review the actual diff and behavior-tier plan against the new baseline, run the smallest targeted checks and editor build/check, validate the delta and install the final batch on disposable `192.168.0.28`. Confirm served assets/readiness and hand off manual vibration and Apple TV wake/app checks.
