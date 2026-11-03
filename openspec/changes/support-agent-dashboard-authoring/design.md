# Design

## Context

See proposal.md. Native cards use `card-composition.js` and the shared source validator; `popup-management.js` already plans without I/O. The browser coordinator observes confirmed saves and may perform a second source save. The frontend is a flat HACS Dashboard graph with a stable release manifest. Current documentation examples contain configuration separately from demo state; only configuration and field descriptions enter authoring metadata.

## Goals / Non-Goals

**Goals:** One portable installed-version contract and one shared reconciliation implementation. Keep normal runtime loading and saved formats unchanged.

**Non-goals:** A new writer, MCP server, backend, framework, editor callback, popup export UI or third-party dependency. No live-instance operation or implicit ha-mcp installation.

## Decisions

- Generate native JSON Schema and card descriptions from the current catalog, native type mapping, audited effective defaults and documented field/example configs. Do not ship fixture states. Keep additional properties allowed; schema describes known fields while existing validators enforce cross-field/action rules. Include supplemental navbar/events and generic aliases. Do not reuse the source-format schema.
- Add a pure authoring core, separately bundled as an on-demand ESM asset, and a self-contained Node CLI `.mjs`. CLI commands are `describe`, `validate` and `plan`. JSON stdin/output only; exit nonzero for invalid requests. No HA or filesystem APIs are imported into the core.
- Plan request: `{original, proposed, config_hash, context, popup_edits}`. Context supplies dashboard root, language and an explicit entity metadata array. Popup edits name an exact owner JSON Pointer in the proposed document. Results include contract version, validity, diagnostics and ownership; successful results additionally include reconciled `config`, a literal RFC 6902 `patch` and the unmodified `config_hash`. Hashes are opaque; the local planner cannot verify freshness.
- Validate ordinary dashboard structure, root settings, recognized native/generic cards and popup reference/version/ownership boundaries. Unknown non-Marao cards remain opaque while recognized HA card containers are traversed. Reject unsupported Marao types instead of silently treating misspellings as custom. Missing entity context is an error for plans, not an implicit empty discovery result. Preserve inputs by cloning; explicit popup edits call the existing conservative creation/adoption planner, then reconcile all managed sources before building one save payload.
- Diff object properties with escaped JSON Pointers; replace changed arrays as complete arrays to preserve order and avoid shifted indices. If granular output exceeds 100 operations, coalesce changed top-level members. If that still exceeds the bound, return blocking diagnostics. Never issue move/copy or split one plan into multiple writes. A repeated plan over the reconciled document yields an empty patch.
- Add a stable authoring index and manifest reference resolving relative to the installed resource directory. Include package version, contract version, metadata/schema/guide/core/CLI filenames; all payloads are covered by existing release file hashes. No authoring asset is imported by the dashboard entry point. The CLI embeds version-matched descriptions and validators, so it runs after downloading that one asset locally.
- Guide documents parent-owned bindings, layout-owned presentation, explicit popup creation, exact baseline retention, hash-checked MCP saves, readback and conflict handling. ha-mcp does not automatically discover or invoke this planner; clients need local Node execution. No global CAS or automatic recovery promise.

## Risks / Trade-offs

- External concurrent writers → use fresh MCP hashes, one coherent patch and authoritative readback; keep original/proposed locally and do not retry blindly.
- Metadata drifting from runtime → generate from existing owners and test registration/example parity; reuse runtime validation rather than duplicate safety rules.
- Generic raw cards and newer metadata → preserve opaque data, reject unsupported owned contracts, never infer management from appearance.
- Whole-array patches are larger → preserve exact arrays and use the external full-document hash; no extra patch library or index-shifting interpreter is needed.

## Migration and Release

Additive authoring contract 1; no persisted migration, default insertion or installation-time dashboard writes. Root settings and popup metadata remain version 1. Review v0.26.1 and immutable historical popup fixtures; reuse existing preservation tests with independent expectations. No new UI/theme/translations or gallery fixtures are required because behavior is local authoring only. Publish v0.27.0 after scoped Node/docs/package checks, full-candidate unit-only publication validation and final versioned installation on disposable 192.168.0.28. Rollback can restore package alone when no saved data was edited; external authored data needs its retained baseline and compatible package, with concurrency comparison before any restoration.
