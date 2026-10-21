# Design

## Context

See proposal.md for the observed overhead and scope. The implementation path is
agent instructions → task-specific skill → existing source/check map → selected
verification → evidence compared with the user's requested outcome. No builder,
generator, runtime, theme, translation, gallery or saved-format changes are needed.

## Goals / Non-Goals

Make routine decisions faster and more reliable while retaining the existing
quality gates. Do not add a test framework, a generic workflow skill, a new
OpenSpec profile, or a duplicated policy manual.

## Decisions

- Maintain three local skills, informed by MIT-licensed Denys Dovhan HA skills
  and Currents Playwright guidance, instead of installing their full workflows.
  Local source links and license notices distinguish adaptations from upstream.
- Keep the short task router in AGENTS and use the existing OpenSpec guide as
  the canonical workflow documentation. Conditional reference links replace
  mandatory full-document reading; applicable obligations remain binding.
- Preserve the six official tool-owned workflows; regenerate them with 1.14.3.
  Small repairs restoring documented behavior need no new change; substantive
  requirements use the existing spec-driven flow and explicit user intent.
- Keep test selection and evidence validation in the existing runner. Skills
  teach correct usage rather than introducing wrappers or weakening assertions.
- Synchronize only implemented optimize-browser-verification policy, then apply
  this change's workflow requirements. Preserve requirement/scenario names and
  express long details as scenarios. Do not archive unrelated changes.
  Three older scoped-testing MODIFIED blocks also retain the accepted newer
  scenarios: OpenSpec validates active deltas against current baseline scenarios,
  so leaving those blocks stale would fail validation or permit later regression.
  Version 1.14.3 also flags introductory prose that archive would drop from two
  compact-section-card-layouts deltas; move that context into their design without
  changing requirements, tasks, evidence or synchronization order.
- Version only the three custom skill directories through a narrow repository
  ignore exception; the workstation's local exclude otherwise hides all .agents.
  Generated OpenSpec skills remain locally installed, tool-owned artifacts.

## Risks / Trade-offs

- Shorter instructions can omit constraints → retain all binding rules and link
  relevant canonical sections; review the instruction diff and realistic routing.
- Community patterns can conflict with Marao → preserve vanilla custom elements,
  native HA async helpers, climate-unit rules, existing tests and safe fixtures.
- Skills can drift → record upstream provenance, review useful differences on
  intentional updates, and do not overwrite local adaptations automatically.
- Structural validation does not prove better behavior → independently evaluate
  realistic prompts and report selected scope and outcome gaps, without claiming
  unmeasured task-time savings.

## Migration Plan

No public API, persisted format or generated-output migration applies. Update
the existing development CLI and generated skills together. Recovery can reinstall
CLI 1.14.1 and regenerate its six skills, then restore this change's tracked
instruction/spec edits from Git without modifying unrelated work or HA data.
