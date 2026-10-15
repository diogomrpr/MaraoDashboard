# Design

## Context

See proposal.md for scope and starting commit. Generic Marao cards already share renderers and interactions. Python's page-card and popup factories contain the complete composition; the native storage importer recognizes released builder documents. Existing frontend registration loads one content-versioned runtime module.

## Goals / Non-Goals

Provide full native configuration without a second implementation of popup/safety behavior. Preserve all released builder sources and output ownership. No dashboard conversion, synchronization or ongoing discovery after Take control.

## Decisions

Shared service dispatch also checks Home Assistant's current access classification.
Opening/unlocking and ambiguous access toggles require a completed strict slide;
normal blind actions and explicit closing/locking remain usable. This closes a
configuration/metadata race without changing stored formats or valid released
slide interfaces. Legacy `service_data` is retained as an action-data alias.

- Generate a frontend catalog from editor.py and build a small shared native editor in frontend_src with HA forms/selectors and structured repeaters. Thin native adapters reuse current generic components. Unknown fields are retained by patching only controlled fields.
- Share Python's validated card/popup composition through authenticated read-only native/card and native/starter commands. Their inputs are explicit client configuration and registry metadata available through native HA APIs; no builder source/history is read. A native card compiles once per configuration/metadata identity, cancels obsolete responses and offers explicit retry on failure. This avoids duplicating media/alarm/group composition in JavaScript.
- Automatic popup identities are live-instance identities, never entity-only keys; explicit supplied hashes remain external references. Reuse existing modal, focus, scroll, slider and action components. Preview clients disable service readiness and navigation within rendered controls while retaining history reads.
- Register a dashboard strategy through the native Community picker. Its generated output uses the existing discovery snapshot and explicit native adapters in expanded Sections. HA Take control saves the full output and owns all later changes.
- Mark native starter output with marao mode native/version 1. All builder write paths reject native-owned destinations, and legacy adoption skips marked native output or new aliases. Preserve existing format 2 and generated contract; no historic source transformation is needed.
- Scope fullscreen to a live navbar and its owning native view; expose an admin edit action outside its five routes. Native preview/edit mode restores shell chrome. Cards without a navbar do not change the shell.

## Risks / Trade-offs

- Compilation races or repeated requests → identity-bound requests, stale-response rejection, explicit retry, cleanup tests.
- Lost advanced settings → generated metadata, field patches, independent expected round-trip data for every catalog role.
- Security regressions in previews → shared service guards, real safe dispatch assertions, transient PIN checks.
- Ownership mistakes → early migration/setup/restore tests and exact unchanged native/legacy sentinels.

## Migration Plan

Ship additive types/assets and read-only commands. Keep legacy generic configurations and generated YAML intact. New native documents have their own ownership version. Back up exact disposable registration/storage/source/output before sequential native tests, restore package and data together after failure, and verify cleanup. No archives are rewritten. Release preparation requires scoped preserved-install proof for changed lifecycle/ownership inputs and verify:publish/verify:release; it does not implicitly request comprehensive checks.
