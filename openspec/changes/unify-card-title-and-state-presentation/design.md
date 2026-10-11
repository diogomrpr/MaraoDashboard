# Design

## Context

See `proposal.md` for the observed mobile problem and affected-card set. The three delta specs define the presentation contract. This is a shared foundation change, so every Marao card family is affected, even when its normal state text is retained.

The end-to-end path is the Python editor catalog/validation (`editor.py`) and editable builder (`frontend_src/MaraoDashboardPanel.js`, `editor-model.js`) → saved configuration → `generator.py` domain/template and popup construction → shared runtime/theme/localization → Cases and realistic generated views. There is no need for a new user setting or schema. Raw Marao cards must behave consistently with generated ones.

Current implementation points:

- `MaraoCards.js`: `cardStyles()` gives most cards a `title icon` grid, climate modes use another competing title row, and Wallbox uses `title control`. Navigation alone uses `title title`. Number controls occupy the icon area; media apps and title/glance variants have separate layout rules. `_render()` appends state text according to `show_state`; custom prefixes are concatenated with it. `stateAppearance()` returns only an unavailable flag for unknown/unavailable, and rendering often reduces opacity. Media artwork applies colors later, so problem precedence must cover it too.
- `MaraoDashboard.js`: timeline and energy-period cards have independent headers, history status and surfaces; native camera wrappers are also assembled here. Timeline retains historical interval labels. English/Portuguese runtime translations already exist here.
- `MaraoFrigateEventsCard.js`: both event-card variants use a flex header with refresh/back competing with the title. Loading/empty/error and availability statuses already exist, but errors mostly change message text rather than the whole card.
- `callServiceWithNotification()` catches reported errors into one native notification. Its fulfilled promise also covers skipped/failed calls, so it cannot be treated as successful dispatch. Callers include `performAction()`, slider/number/climate/option actions and camera actions in `MaraoDashboard.js`.
- `generator.py` maps binary sensors, lights, switches/input booleans, fans and locks to reusable card templates. `editor.py` exposes existing labels, icons, custom colors and appliance options. Preserve these configurations rather than stamping one-off flags into generated cards.

## Goals / Non-Goals

**Goals:** apply one semantic presentation policy through existing renderers; retain their native controls, authoritative data, configured content and safe interaction contracts; make error priority explicit and testable.

**Non-Goals:** introduce a card framework, per-instance presentation toggles, a saved state history, polling, an optimistic implementation or replacement controls. Do not modify popup/navbar layout except to accommodate their card content. Do not rewrite raw Home Assistant-native or third-party cards.

## Decisions

### 1. Put visible titles in their own first row

Change the shared base, climate-mode and Wallbox grids so the title spans all content columns. Below it, retain the best existing arrangement of icon, state, stepper, controls and readings; remove empty rows when normal binary text is omitted. Update narrow container rules so they cannot move the icon back alongside or above the title. Give separate timeline, energy and event headers the same title-first/full-width policy, with refresh/back/period controls below. Keep intended title-hidden/icon-only variants centered and do not derive icon-only intent from newly omitted state text.

Full width means card content width minus existing padding, not edge-to-edge text. Retain scalable Montserrat tokens and essential wrapping. A smaller shared baseline size is permissible only if focused measurements demonstrate a need and readability is preserved; per-title auto-shrinking and forced single-line clipping are rejected. The measured lost 64px comes from layout, so restore that space first.

### 2. Classify binary state by semantics

Use existing domain, template and entity data to determine whether the current state is one of two normal states. Keep the minimal classification in the shared renderer/presentation logic and reuse it in separate renderers where necessary; do not classify arbitrary strings or infer a state space from the last two observations.

| Presentation | Normal binary handling | Essential content retained |
| --- | --- | --- |
| Light, fan, switch/input boolean, ordinary binary sensor | Hide redundant on/off or domain-equivalent line | Brightness/speed, power, last-updated metadata and configured labels |
| Washing-machine or another supported appliance explicitly using a running/idle binary contract | Hide redundant normal-state line; recognize faults separately | Any configured readings and operation cues |
| Lock in stable locked/unlocked state | Hide redundant stable-state line | Distinct lock-state icon/shape, Lock/Unlock actions, transition text and strict slide safety |
| Base/header/navigation variants | Follow the represented entity's semantics; omit redundant zero/All off line | Date/person/AQI, active counts, numeric readings and partial-member details |
| Toggle graph | Use the actual toggle's binary state for surface/cue, not the numeric graph entity | Numeric value, units, history and graph status |
| Glance, timeline and other informational composites | Apply binary treatment only to a redundant current normal-state line | Named independent readings, historical interval labels and usable partial content |
| Cover, climate, media/camera, vacuum, alarm/security, weather, numeric/battery, selector/scene options | Preserve meaningful position/transition/mode/operation/condition/value/option text | Existing capability-dependent controls and localized details |

A normal state retains its background distinction and a visible non-color cue, except for the user-approved room-only normal-lighting presentation. Room lighting uses the active/inactive background without an automatic status/count row or binary marker; localized accessible lighting state, useful non-lighting readings and visible availability/fault details remain. This exception does not apply to other card families or problem states. Reuse existing on/off or native domain icons; if a static/hidden icon cannot communicate the difference, add a small consistent state shape/marker within existing card content. Keep configured domain identity and supply localized accessible current state independently of visible normal-state text. Action names remain action names; do not replace `Unlock` with an unlabeled glyph. Numeric or operational content that happens to have two options is not automatically binary.

`show_state: true` does not restore redundant binary text; it continues to allow useful nonbinary state content. `show_state: false` continues to hide normal state content but cannot conceal a problem reason. Preserve stored configuration and substantive custom labels. Prefix-only text must not become a dangling `Status:` line after state omission. Do not rely on generated `show_state: false` as the fix, because that would miss raw cards and hide availability reasons.

### 3. Resolve problem priority before applying normal appearance

Reuse existing recognized availability, connection, target, summary, history and event status inputs. Produce the smallest explicit presentation result needed by the existing renderers, with shared theme tokens for neutral availability, partial warning and fault/error surfaces. No independent global state store is needed.

Priority is complete availability/disconnection → reported domain/action/content error → partial availability warning → loading → normal domain appearance. Preserve distinct readable reasons when several problems coexist. Primary entity failure is complete availability for an ordinary entity card; a missing remote or optional graph source is a partial/control/content problem when usable primary content remains. Empty history/no-events is not failure. Initial lack of `hass.states` means initializing, not a missing-device fault. Entityless headings do not gain status solely because they lack an entity.

Apply problem variables after normal domain/custom colors and decorative media/weather artwork so the whole surface changes and remains readable. Keep visible icons/cues and text; opacity alone is insufficient. Disable actions by their actual targets, not by an undifferentiated error flag. Retain readable valid readings and safe retry/back/navigation. Clear media that existing unavailable/privacy handling already requires clearing; do not introduce private media caching.

Recognize established error states such as vacuum `error`, dishwasher attention/error and configured abnormal alerts using existing domain/configuration semantics. A string-valued sensor saying `error` without a recognized contract is not enough. Preserve the configured-alert-only priority rule. Use English/Portuguese localization for missing/disconnected/partial/action/content reasons and semantic names; render reported details through the existing escaping path.

### 4. Keep service errors local to the initiating card

Extend the existing centralized service path minimally with opt-in outcome/error reporting to the initiating card. Preserve current return/error behavior for existing callers and the one native notification. Distinguish skipped, dispatched-success and reported-failure; never infer success from an already caught error. Wire all card action paths, including child actions, sliders, options, hold/strict-slide completion and camera actions, through this ownership where they dispatch services.

Keep only card-local reported-error data and the identity of the current configuration/request. Clear on an explicit successful later retry or configuration replacement; late callbacks from obsolete requests/configurations cannot overwrite newer outcomes. Remove local lifecycle references on disconnection/removal, while retaining existing notification reporting. An unrelated HA update or a timeout must not silently clear a reported failure. Availability takes surface priority while the error remains logically separate. No automatic retry or duplicate dispatch is introduced.

The pending `fix-climate-feedback-delay` proposal also needs opt-in service outcomes. If it is implemented first, reuse its reporting rather than adding a second helper. This change adds error appearance and preserves the pending request-versus-reported observation contract; it neither implements that future change nor modifies its artifacts. Existing authoritative-state and single-notification requirements remain intact.

### 5. Align generation, documentation and coverage

Inspect catalog/help/defaults and generated templates for assumptions that normal state text is always visible; adjust only affected descriptions/defaults/assertions. No entity/config migration is needed and no user JSON fields are dropped. If builder source changes, rebuild its shipped output through the existing build command and check it.

Update `docs/docs/development/dashboard-quality.md`, the card usage docs affected by binary presentation and `docs/docs/development/test-gallery.md`. Extend `ha-test/cases.json` and existing helper/fixture generation with materially distinct active/inactive, missing/unknown/unavailable/disconnected, partial, reported-action-error and content-error examples. Keep existing controls/options/transition examples visible, with representative examples on realistic generated pages of the one `/marao-dashboard` dashboard. No shipped fake entities, new dashboard roots or Cartesian combinations of equivalent colors/labels.

Existing focused checks are `marao-card-visibility`, `marao-climate-card`, `marao-text-scale`, `marao-history-cards`, `marao-frigate-events-card` and `gallery-cases` frontend tests, plus generator/gallery Python tests where changed. Add assertions to these suites for classification, error precedence/recovery/late responses, meaningful content and title geometry; avoid a new framework. Browser checks must compare title width with content width, not just look for a CSS selector.

## Risks / Trade-offs

- Taller cards and changed grids can shift touch controls or popup height → inspect all affected families, both themes and full supported mobile/text/zoom matrix, including gesture cancellation and internal popup scrolling.
- Removing state words could make custom/static icons ambiguous → keep an explicit non-color cue and accessible state, and retain essential operational/action text.
- Neutral/error styles could mask usable summary data or recovery controls → separate surface severity from target guards and exercise mixed-availability fixtures.
- Normal/custom colors or artwork may override problem contrast → apply problem appearance last and assert light/dark contrast plus visual precedence.
- Shared service outcome changes could duplicate notifications or conflict with planned climate feedback → preserve the centralized call site, request ownership, existing caller contracts and focused single-dispatch regression checks.

## Migration Plan

Implement in coherent layout, normal-state and problem-state batches using only safe fixtures on disposable `192.168.0.28`. Before each deployment run the focused checks and deployment dry run; after each batch inspect every affected family, then perform the full final gallery pass after the last edit/check. Preserve configured titles, icon/color/label fields, explicit entities and unrelated work. Roll back by restoring the prior runtime/theme/generated assets; there is no storage migration.

The final pass covers 320px plus representative iPhone/Android portrait/landscape, light/dark, normal/bold/200% text/200% zoom/bold plus 200% text. Run alignment for shared icon-only layouts, existing slider checks for preserved interactions, and e2e screenshots/accessibility for the shared foundation. Treat warnings, error cards, failed resources, exceptions and repeated requests as defects rather than suppressing them. Real-phone/Safari inspection is additional evidence when available, not a claim made by browser emulation. Publication is outside this change; any later push/tag/release requires `verify:publish` and the repository's release checks.
