# Batch implementation evidence

- Starting commit: `e300e1db04ff047fd80b3f2148bdb15e929d9755`.
- Scope: All catalog card occurrences rendered by the shared Visual page/section editor, including groups, headings, scenes and shortcuts; raw cards and unknown fields remain preserved in the complete draft. Runtime card affected set for this editor change is empty.
- Preserve the pre-existing completed `align-slider-card-headers` implementation and all other working-tree changes. A private pre-edit patch and editor baseline assets were retained.
- Compatibility: runtime/editor presentation only; preserve saved format/defaults/options, unknown/raw/protected content, generator ownership, history and management APIs.
- User instruction: implement the entire selected batch before running any tests. Early-check tasks are therefore verified after implementation, without dropping their assertions. Baseline editor timing will be captured after implementation but before deploying the new editor.

## Results

- Canonical page headers, section bodies, General and navbar now have explicit refresh boundaries. Current-coordinate delegated actions retain unrelated controls. Closed page bodies are removed; a fresh session mounts only the landing body, while new/duplicated pages open for editing.
- Expansion remains outside serialization and reconciles surviving unique IDs/unchanged paths across accepted documents. Complete unopened raw/empty/grouped/nested content, duplicate occurrences, references and unknown fields remain preserved. Lifecycle/revision guards and native drag cancellation remain active. Busy completion retains boundary-disabled controls.
- Panel/model/generation checks, nine mobile editor geometry profiles, touch interaction and native drag/cancellation, JSON continuity, page save/reload/repeat generation and focused icon alignment passed in both themes. Touch expansion runs in the normal interaction selection; geometry-only setup uses the native semantic header action. Failure captures/diagnostics were retained privately. Final manual review included 320px and bold-plus-200% editor captures.

### Paired editor measurements

Same private valid format-2 fixture (16 additional uniquely identified pages, 12 safe cards per page), iPhone context and three serial cold/warm samples per CPU rate. Both phases verify the actual served editor hash and unchanged saved source; fixture hashes match. The candidate harness activates the native header event before counting body controls. Baseline pages were already mounted, so expansion/reopen costs are reported for the candidate separately rather than treating eager queued work as deferred expansion. Delays include two animation-frame boundaries and are not paint measurements.

| CPU / cache | Native ready before → after | Mounted rows before → after | Local delete before → after | Candidate first expansion / reopen |
| --- | --- | --- | --- | --- |
| Normal / cold | 590 → 416 ms | 295 → 8 | 406 → 20 ms | 92 / 21 ms |
| Normal / warm | 531 → 295 ms | 295 → 8 | 394 → 25 ms | 79 / 20 ms |
| 4× / cold | 2240 → 1442 ms | 295 → 8 | 1812 → 91 ms | 445 / 62 ms |
| 4× / warm | 2007 → 1077 ms | 295 → 8 | 1698 → 81 ms | 366 / 57 ms |

Closed candidate bodies retain zero controls; opening the large page adds exactly 12 rows; local edits retain General controls. Raw timing/long-task/resource samples are private in `tests/.artifacts/editor/timings-before.json` and `timings-after.json`.

- Final serial affected selection: `slider-headers,battery-groups,access-label,editor-rendering`, based on the recorded starting commit. All **54/54** selected checks passed; `tests/.artifacts/verification/run-x56rXx/report.json` records `passed: true` and `verified_cleanup: true`. Current check inputs and capture hashes were revalidated after the benchmark helper correction. The previous header work remains intact.
- Rebuilt editor assets obey the existing byte/import budgets and reproducibility check. Read-only deployment preview, focused Python generation/migration coverage, fixture checks and strict validation of this change passed. Deployment and all live work used only disposable `192.168.0.28`.
- Saved formats/defaults, API and generation ownership remain unchanged. No persisted-data migration was introduced. Exact saved source/helper restoration was verified after automated preparation, timing and final inspection.
- Selected Chromium mobile emulation covers 320px, iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold-plus-200% and both themes. No full suite, 26-profile matrix, historical live upgrades, physical-phone or Safari inspection was run. No push, release, spec sync or archive was performed.
