---
name: marao-card-design
description: Preview changes to Marao card appearance, behavior or configuration, or create card families, using isolated real-runtime documentation galleries. Use for requests such as changing a Climate font. Apply shared changes only with explicit consumer scope.
---
# Marao card design

Default to an isolated preview, not main-runtime implementation or HA installation.
1. Run `npm run card:context -- <card> --intent <style|behavior|config|new-card>`.
2. Ask only for missing design values or a genuinely ambiguous target. Climate title, measured value, target number and whole-card font are different scopes.
3. Run `npm run docs:design -- --card <slug>`. Record its task ID, workspace and URL. Reuse via `--task <id>`; never overwrite a proposal when source drift is reported.
4. In that workspace, use bounded reads at the reported anchors. Edit the actual shared owner, save and review the automatically refreshed gallery. Never edit generated bundles or duplicate mockups.
5. Update `proposal.json`: increment `revision`; set `changeKind` to `shared-owner`, `family-variant`, or `family-branch`; record `affectedConsumers` including detail/member roles. Record explicit scope in `scopeDecision` with behavior, consumers and proposal revision. Keep `designApproved` separate from `applyAuthorized`. Explain affected families and owned details. A shared file alone is not a shared behavior: `.body.climate-card .current-temperature` is scoped; `.number-stepper` is shared.

## Before applying
Read [apply.md](references/apply.md). A visual approval is not permission to broaden shared effects. Ask all listed consumers vs requested family vs a meaningful subset before applying shared behavior or separating one family from a shared default. An earlier explicit answer for the same behavior/consumer set counts; reask if semantic scope expands.

Only the requested family includes its owned details unless the user specifies main-only, popup-only or a configured instance. All-consumer changes modify the base once. Selected-only changes use existing selectors/tokens/internal variants, never cloned renderers or action state machines. Do not add a public option solely for an internal styling difference. Preserve shared safety, availability, cancellation and exactly-once dispatch contracts.

“Looks good” approves a preview; “apply this to Climate only” can authorize design, scope and apply together. For every authorized application, use `npm run card:apply -- --task <id>` as described in [apply.md](references/apply.md). It promotes the reviewed patch, runs the selected minimal checks and installs through the existing disposable-HA helper. Preserve unrelated work and staging; never copy a workspace directory over main or bypass the command with ad-hoc sync. Resolve conflicts or missing editor/configuration wiring in the preview before recording its final review. Preview work itself does not deploy; applying does not publish a release.

Treat reused dependency symlinks as read-only: never run npm install or modify node_modules in a proposal. Caches belong to the workspace. For a new name, `card:context -- <name> --intent new-card` returns neighboring families; obtain source context from the selected neighbor. Tracked tests and OpenSpec references are included; unrelated untracked files are not.

For new families, read [new-card.md](references/new-card.md) only when needed. Configuration of an existing card should use the existing authoring tools instead of creating a renderer.
