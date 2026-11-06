## Context
See proposal.md for the accepted scope. Starting commit is fa71c7a33798b32480eab41bfad6f038e8b1ebf9. The workspace already contains unrelated popup/editor changes. The consolidated preview is .card-design/e551e952-5b00-4f1b-a5ed-fa6033c526f5, served at port 49942; its private baseline captures the main dirty state when it was created.

## Goals / Non-Goals
Promote the reviewed source hunks, preserve unrelated work and install once on disposable 192.168.0.28. No publishing, production operations, new framework/dependency, dashboard reset or comprehensive browser campaign.

## Decisions
Use a baseline-aware three-way patch for each reviewed source file, with exact before-file backups and a dry promotion plan. Do not copy the preview directory or generated bundles; rebuild generated assets from merged source. All 39 selected destinations merged cleanly during preflight.
Keep shared numeric controls, slider gestures, dropdowns, popup shell and authorization paths. Scope visual variants by family; the optional dropdown multi-selection defaults off for other consumers. Preserve unknown fields and explicit omissions through native composition, JavaScript validation and Python metadata/model validation.
Weather owns static CSS scenery and read-only forecast content; the existing popup handles focus/inertness. Forecasts use supported native subscription types and are cancelled on close.
Schedule editing uses a serialized autosave queue with validation, stable timer identity and latest-draft retention. On/off is optional timer metadata; omission retains existing on/duration behavior. Generated controller output remains unchanged when no off timers require the new branch. Explicit off actions retain the native schedule admission checks. No old record is bulk rewritten or deleted.
Update canonical editor metadata, source authoring validation, translations, documentation and meaningful existing tests; retain compatibility registration for Header. Energy simulation changes remain test/documentation data only. No fake entities are added to shipped code.

## Risks / Trade-offs
- Baseline drift or unrelated dirty work → compare original hashes and three-way merge; retain exact before-file backups and staging.
- Autosave races/failure → serial queue, stable IDs, newest draft retained, close flushes and failures remain open.
- Resource/controller compatibility → preserve omitted action, older durations and old generated output; use focused schedule assertions.
- Unsupported weather forecasts → capability gating, readable empty/errors, no synthetic runtime values.
- Local frontend package differs from generated assets → rebuild and verify current served assets during installation.

## Migration Plan
No versioned stored-data migration is needed. Promote only reviewed hunks, build and run scoped checks, then use prepareFrontend() for a compatible native installation; use ha:sync only if compatibility/backend changes require it. Helpers and native dashboard configuration remain untouched. Installation helpers retain staged recovery data on failure. Before rollback, restore the affected source/package together with any actually changed owned data; never overwrite concurrent dashboard edits. Leave successful current assets installed for user testing.
