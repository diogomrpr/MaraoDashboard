## Context

The shared navigation runtime owns the main-page cache button and administrator Maintenance menu. Native strategy metadata already supplies the actual dashboard root and collision-safe editor path only to administrators.

## Decisions

Use the existing main-page row and its 48px circular controls with an inline pencil SVG, localized name and no visible label. Recheck current admin status, visibility setting, current main view, route metadata and modal/edit/preview eligibility on click. A page action uses its visible row as the eligibility target, so deliberate empty navigation does not disable the separate shortcuts. Keep all configured routes intact.

Share the two button field definitions between General settings, validation and JSON schema. Copy only explicitly supplied flags into compiled navbar configuration. Missing values remain missing in saved/source conversion; display defaults are true. Merely opening settings does not write defaults. Put localized hold guidance with the adjacent toggles. Maintenance editor access remains available when the pencil is hidden; regular users retain direct hold refresh.

## Compatibility

Released v0.22.0–v0.22.4 sources remain valid without rewriting. The new optional boolean preserves explicit false, unknown fields, explicit empty navigation and exact current-format source text through conversion. No migration or native write/authorization change. Existing HA authorization remains authoritative; hiding a button is not a data-privacy boundary.

## Verification

Baseline a486471752832993e8828dfff1465483ca9d5008; dirty snapshot /private/tmp/editor-shortcut-toggle.json. Preserve prior climate icons, lock state and modal fixes and unrelated duplicate files. Existing editor/navbar/compiler assertions cover omission/false, independent controls, localization, current-role guards, actual route navigation, empty navigation and source preservation. Build within the existing eager budget and install final assets on disposable 192.168.0.28. No broad browser, camera or upgrade campaign.

## Applied evidence

99 existing editor/navbar/compiler assertions passed serially, including independent flags, false/omission preservation, English/Portuguese labels, current-role guards, nonempty/empty navbar eligibility and existing Maintenance behavior. All three affected changes validate strictly. Build passed at 147448 / 147456 eager JS bytes. Final graph e385282347f4c31a0e82a12ac34eeb30ba7d5ce66412eb7d6def5e9e7064d84f installed on disposable 192.168.0.28; served assets/readiness confirmed. Browser checks verified the visible 48px SVG pencil, internal navigation to the actual editor and visibly rendered hold guidance beside both toggles. No source saves or entity actions were exercised. Browsers/watch closed; physical-phone and regular-user browser testing remain manual.
