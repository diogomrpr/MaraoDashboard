# Design

## Context

See proposal.md for motivation and the card-behaviors delta for acceptance. The active native strategy compiles saved source through `frontend_src/compile-dashboard.js`. Its `createMediaPopup()` currently combines the sheet header with generic playback or Apple TV child cards. `pageCard()` emits the summary and `popups()` emits the matching sheet. Popup-link validation runs over the complete compiled page.

The shared runtime in `MaraoCards.js` already owns app launching, bounded seeking, remote short/long commands, haptics and target availability. The Visual editor reads `marao-catalog.json`; `editor-model.js` validates and builds the JSON schema. `MaraoDashboardPanel.js` edits Apple TV options separately. The legacy Python integration is frozen; this work targets native compilation, not a parallel legacy implementation.

## Goals / Non-Goals

**Goals:** Separate media control content from its popup wrapper, add a lossless per-card presentation choice, and keep the existing action owner shared.

**Non-Goals:** A second remote implementation, a generic popup-to-inline framework, new media capabilities, automatic section rearrangement or unrelated pending palette work.

## Decisions

### One optional display value

Store `variables.media_display` as `popup` or `inline`; show localized **Popup** / **On dashboard** labels, including Portuguese. Missing means Popup, evaluated at read time. Opening or saving an unrelated field must not insert the default. Preserve explicit values, unknown fields and all existing Apple TV representations accepted by `appleTVOptions()`.

Expose the selector through the current catalog-backed media form and JSON schema. Validate before compilation and saving. Keep the eager editor within its existing asset budget, using shared field handling rather than another dialog or custom editor flow. A boolean toggle was considered, but two named choices communicate the actual result more clearly.

### Reuse content, vary its container

Extract the existing media child-card composition into a small shared content factory used by both presentations. Popup wraps that content in the current header/sheet; inline composes the existing player-information card and the same controls as one expanded stack at the original card position. Prefer existing native stack/grid components and Marao cards rather than adding a new service-dispatch component.

The inline summary must not inherit an automatic media-popup action, and child controls must not bubble into a surrounding navigation action. Explicit user actions remain stored and apply only to their intended summary/control surface. Do not put a click overlay over the expanded panel. Generic players keep generic playback content; Apple TV uses its existing detection and configured app, remote and volume bindings. App surfaces retain the current 80px size and shared styling from `compact-media-popup-shortcuts`.

### Dedicated Now playing section

Place a clearly identifiable Now playing card/section at the top of the expanded panel, before apps and remote/playback controls. Reuse the existing media-information rendering where possible; this must show the actual current item, not only the player name or a generic player-state tile. Use HA-reported `media_title`, `media_artist`, available album/series or source/app information, and playback state. Show artwork from `entity_picture` when available and enabled by `md_show_background_art`; preserve configured names and artwork preferences. Localize the section label and fallback text in English and Portuguese.

Update visible metadata and artwork from current HA reports without remounting the control stack or cancelling a remote hold. Paused playback retains its reported item with a visible Paused state. With no current media, show a concise Nothing playing state and clear previous item details/artwork. Missing metadata during active playback must not be described as idle: retain the reported playback state and show available details or a readable metadata fallback. Unknown, unavailable or disconnected players use neutral problem feedback and do not present the previous item as current. Missing artwork uses the normal themed surface without a broken image. This adds no metadata polling, media history or new playback/progress controls; existing compact Popup behavior remains unchanged.

Recommend a dedicated one-column section in usage guidance. Do not move a card, change saved columns or force sibling controls to become remote-sized. Preserve the existing section grid rules and use content-driven height; validate that nested inline controls remain usable at narrow widths and enlarged text. The outer page owns scrolling. There is no sheet header close action, modal focus trap, hash navigation or background lock in inline mode.

### Preserve popup ownership

Skip the unused automatic media sheet for an inline occurrence. Keep explicit external definitions and stored popup fields intact. An unused preserved popup hash is not an active navigation link: derived link validation must follow the rendered presentation, while still checking actual authored navigation links. If another card links to an automatic sheet that would disappear, fail preflight with the existing readable missing-link behavior before any save; never silently delete or retarget that link.

Different occurrences of one player keep their own display and remote/app options. Switching back to Popup restores the current automatic identity scheme. Raw Home Assistant cards and externally owned popup content remain independent.

### Keep lifecycle and action behavior shared

Use existing Marao child cards and service guards so preview/edit contexts remain inert, required actual targets are checked and each completed action dispatches once. Keep remote hold cancellation, bounded relative seeking, local error reporting and authoritative state. No service call occurs during composition or page mounting. Retain mounted children on ordinary unrelated updates and release owned listeners/holds when an inline panel is replaced or removed.

## Risks / Trade-offs

- Expanded controls occupy more page space → expose the choice per card and recommend a one-column section; do not change existing defaults.
- Extracting popup content could change targets or commands → compare independently expected generic/Apple TV child actions in existing compiler tests, plus a narrow runtime dispatch/cancellation assertion.
- Removing a generated popup can strand authored links → preflight actual links and reject invalid saves without changing source.
- Duplicate child mounting can duplicate dispatch or lose a hold → retain current child lifecycle and verify one interaction sends once after a relevant update/remount.

## Migration Plan

No format or config-entry migration. Omitted display keeps released popup compilation and source text unchanged; inspect the supported native historical fixtures and reuse their independently specified expected outputs. Add separate new-mode cases rather than rewriting historical provenance.

The option is saved through the existing native-session validation/concurrency/save path. Do not introduce direct dashboard writes, discovery resets or history rewrites. Preserve exact source, owned output and applicable backups before writes using the existing save/installation recovery paths. Invalid/newer input stays untouched. Rollback restores the matching frontend package and exact saved source/owned state when required, retaining recovery data and protecting concurrent edits.

Implementation updates `docs/docs/usage/cards/md_media_card.md`, the applicable quality/coverage notes and safe existing media examples. Use the existing editor-model/panel, native-compiler and media runtime tests for option preservation, popup suppression, independent instances and command parity. Browser/phone appearance remains a manual watch list unless a concrete failure needs diagnosis. Install final applicable assets on disposable `192.168.0.28` through `prepareFrontend()` and verify its served assets/readiness; no production access or camera checks.
