# Chrome authoring audit — 2026-11-07–08

Requested: audit the real Chrome editing experience across the disposable dashboard's examples. This extends the earlier [configuration audit](gallery-authoring-evidence.md); it does not relabel those configuration checks as browser interaction.

Start: `836b277a47d5476868edde00caf8eae93f7360ae`, branch `codex/audit-native-gallery-authoring`, worktree `/private/tmp/marao-release-0-33-0`. Starting dirty snapshot: `/private/tmp/marao-chrome-audit-start.json`. Scope: the shared native editor, legacy grid adapter, nested settings dialogs, popup templates and native picker. Existing unrelated work in the original workspace was preserved.

## Actual browser coverage

Chrome was operated through its visible native UI against **192.168.0.28 only**. Existing cards were opened through their normal native Edit menus. No browser script injection, simulated card renderer or request override was used.

All **46 individual/combined gallery routes** were visited. The combined gallery exposed 97 native Edit controls with no configuration error card at the inspected beginning/end. This is family/flow coverage, not a claim that every state of all 2,464 saved card occurrences received a separate visual inspection.

| Existing editor families | Actual interaction |
| --- | --- |
| Access, Close/Lock, strict opening slider, held Security action, Alarm and Alarm Controls | Open visual editor, change a name, inspect advanced controls, Cancel |
| Battery, Cover, Fan, Light, Number, Sensor, Switch, Wallbox Current | Same native editor/draft check |
| Climate, Media, Media App, Vacuum, Dishwasher, Washing Machine, Weather | Same native editor/draft check |
| Entity Group, Scene, Scene Collection, Room, Navigation, Glance, Summary, Title, retired Header identity | Same native editor/draft check |
| Graph, Toggle Graph, Timeline, native and legacy Energy detail | Same check; legacy period changes remain top-level; invalid YAML disables Save |
| Legacy lights/blinds/climate/maintenance/bubble popup identities and actual standalone popup owners | Visual fields and popup canvas load; parent name/header edits remain drafts |
| Flat and grouped Control Grid | Native child editor, column change, unsupported option error/Save blocking, native group move, YAML → visual, opaque field preservation |
| Stock Entities and Markdown | Native visual editor/change/Cancel |
| People and Schedules on Overview | Native visual editor/change/Cancel |
| Floor Plan | Native entry, dedicated parent/placement/light dialogs, combined parent + nested child + popup Save/reload/reopen |
| Summary Actions and Power History on existing linked/realistic pages | Native scope form and ordered device controls; child Save returns to outer draft; outer Cancel |

All **13 built-in template kinds plus Empty** were selected in Chrome: Climate, Media, Camera, Energy, Security, Access, Scene Collection, Light Group, Cover Group, Climate Group, Battery Group, Graph History and Floor Plan Lighting. Empty immediately exposes native Add section; selecting the family template immediately exposes editable native children. Graph's popup appeared immediately after enabling its history-popup option. Camera checks were configuration-only.

Additional observed flows:

- Popup settings initially collapsed. Existing automatic/linked content remains unchanged until an actual edit.
- Native Add card shows the full HA catalog with public Marao cards first. The independent Marao close/lock button was created with a name and `cover.close_cover`, saved into the popup draft and reopened with those exact values. This did not dispatch a device action.
- Native section Appearance/background and Visibility dialogs work and return to the parent draft. Native child Layout sizing and Visibility controls also work.
- Duplicate opens HA's normal child dialog. Saving the duplicate changes the template dropdown to Custom; deleting that exact duplicate restores the original template name without selecting the template again.
- Invalid child YAML disables its native Save. Child Cancel returns to the unchanged parent draft; outer Cancel discards the complete draft.
- At **320 × 790 CSS pixels**, canvas/Add controls, nested fields and outer Cancel/Save are reachable. HA's code-editor footer label wraps. At **790 × 320**, content scrolls and the footer remains reachable. These are Chrome emulations, not real-phone tests.

## Defects found and repaired

1. Grouped Control Grid leaked `count`/opaque metadata into HA's Grid editor, forcing YAML-only fallback. The adapter now sends only supported native properties and retains group metadata privately through native edits/reordering. Ambiguous identity after destructive cloning refuses the edit rather than losing options. A Chrome literal fixture retained independent `future` fields, order and top-level false values after a native group move.
2. Returning Grid YAML to visual could leave a blank editor because loading completed before connection. Loading now waits for connection; the same Chrome return path renders its native child settings.
3. A nested settings dialog's `closed` event could close the outer card dialog and lose the enclosing draft. The shared dialog boundary now contains that event and closes only its own dialog. Floor Plan parent/light, Apple TV/app and Group/member nested Update flows were rechecked.
4. Portuguese Media options and Add entity labels were English. Both labels now appear translated in Chrome.
5. Chrome flagged Marao text configuration fields without autocomplete metadata. The shared form schema now uses HA's existing `text.autocomplete` selector option, preserving explicitly supplied values. The final fresh Access editor showed no DevTools Issues.

Focused existing Node suites: **92 assertions passed**, serially (`native-card-editor.test.js`, `floor-plan.test.js`). The editor reproducibility check passed after rebuilding. The reviewed affected-file plan is `/private/tmp/marao-chrome-audit-scope.txt`; generated files are build outputs, not an additional independently selected behavior scope. No new test framework or dependency was added.

## Persistence and restoration

The exact starting dashboard was privately backed up in `/private/tmp/marao-chrome-audit-before.json` (mode 0600), SHA-256 `aaf8742437fe4e48a5fcaa5c06e2df744c119dedf5170c496fcdce4e0a8b53c3`.

Actual Chrome outer Save persisted a Floor Plan name, nested light name and customized popup together. Reload/reopen showed the saved values and a clean disabled Save. Independent saved-configuration checks verified popup entity targets and every unrelated field/card/view against the original. Restoration replaced only the affected card, guarded by exact current-card and fresh whole-document comparisons. All later drafts were cancelled. Final dashboard comparison is exactly equal to the starting backup. No image upload, helper reset or real device action was performed.

## Remaining findings and limits

- **Physical dragging is not verified.** Available native input started a drag/ghost but did not produce a completed section move. The same input also failed to reorder sections on HA's ordinary full-page canvas, including the mobile emulation comparison. This suggests an input-tool limitation, but does not prove the popup gesture works. Native group move controls, section editing and layout callbacks passing do not substitute for a completed physical popup drag. Within-section/cross-section card dragging and section reorder still need a human check; no success is claimed.
- Chrome consistently reports three Permissions-Policy warnings for `browsing-topics`, `run-ad-auction` and `join-ad-interest-group`. Direct responses from the disposable HA root, dashboard and configuration page had no Permissions-Policy header. Their origin in this Chrome environment remains unresolved; no extension/security preference was weakened to hide them.
- Opening HA's full native picker produced an upstream Media Control image-color error when its preview chose the intentionally broken-artwork media fixture (`entity_picture` is deliberately invalid), and native Map preview street-label fallback diagnostics. These observations are retained, not reported as a clean console pass. The final fresh Access visit had those diagnostics absent, **0 failed requests / 190**, no application exception and no DevTools Issues; the three policy warnings remained.
- Floor Plan's existing overlapping-marker warning remains visible with its alternative Lights list. Geometry was not silently changed to remove that source warning.
- Early UI-control misses (incorrect indentation matching/offscreen or emulated input targeting), attempting Graph templates before enabling history, and expecting selecting an already matching template to create a draft were check-setup errors. They were corrected and rechecked; they are not counted as product regressions. Accessible YAML text may be viewport-limited and was not used to infer missing saved fields.
- No camera playback/transport, real security/device actuation, real-phone gesture, exhaustive theme/text/zoom matrix or every-occurrence Save test was performed. This audit is not an unqualified full-runtime pass.

## Installed handoff

Final compatible frontend installed through `prepareFrontend()` with package metadata **0.33.1**, graph **`30001407758950199665fee75eb42de037aa96023bb326d55d526575f9b0cd6b`**, **103 assets**. Installer served-asset/readiness checks passed. Chrome's Network panel showed that exact graph's `MaraoNativeCardEditor.js` loaded **200 OK**.

Task-owned DevTools was closed; original Keep log=false, undocked preference and device emulation off were restored (original responsive size 400 × 790 retained). Chrome is left at the existing safe Lock access card's native editor, clean Save disabled, popup settings collapsed. No release, push or tag was requested or performed.

Native API references used for the bounded fixes: [HA form](https://github.com/home-assistant/frontend/blob/20260930.2/src/components/ha-form/ha-form.ts), [HA text selector](https://github.com/home-assistant/frontend/blob/20260930.2/src/components/ha-selector/ha-selector-text.ts), [HA sortable](https://github.com/home-assistant/frontend/blob/20260930.2/src/components/ha-sortable.ts). No upstream source was bundled or patched.

## Remaining-findings follow-up — 2026-11-08

User request: fix any known issues remaining from the audit. Starting commit remains `836b277a47d5476868edde00caf8eae93f7360ae`; the preceding installed audit fixes were already in the working tree. Snapshot: `/private/tmp/marao-known-issues-start.json`.

- Inspected the actual popup-owned `ha-sortable` through Chrome Elements → Properties, without executing browser scripts. Its live `_sortable.options.group.name` has the private `marao-popup-…-card` prefix. Initial live group isolation works; a mock-only property assertion was not used to infer it. This does not establish completed physical dragging, which remains unchecked.
- Chrome Network's actual dashboard response headers also omit Permissions-Policy. The same three warnings remain on the normal authenticated HA page; a clean incognito HA login page showed none. This comparison does not identify the exact source. No matching header/feature configuration exists in Marao's source, and there is no supported Marao change established for these browser warnings. Browser security/extension settings were not changed.
- Traced the picker image diagnostic to HA's `hui-media-control-card` preview selecting `Marao Dashboard Test Media Error`, deliberately configured first with invalid artwork. The independent gallery failure case and its recovery helper remain intact. HA's own picker/Map renderer was not replaced or patched to suppress its diagnostics. A raw public-manifest diagnostic visit also triggered Chrome's default `/favicon.ico` request returning 404; that is distinct from the normal dashboard's explicitly configured icon resources.
- Re-ran the existing native editor and Floor Plan suites: **92 assertions passed**, serially. Read-only checks matched the served release manifest and exact hashes for the native editor, native cards and native bootstrap to the installed fixed build. The complete saved dashboard still equals the pre-audit backup.

No further reproducible Marao defect was established in these remaining findings, so no additional runtime change or redundant installation was made. The existing five audit repairs remain installed at graph `30001407758950199665fee75eb42de037aa96023bb326d55d526575f9b0cd6b`. All diagnostic windows were closed; Chrome was returned to the clean existing Lock card editor. Physical popup dragging still requires human confirmation; the unresolved native/browser diagnostics remain recorded rather than reported as fixed.
