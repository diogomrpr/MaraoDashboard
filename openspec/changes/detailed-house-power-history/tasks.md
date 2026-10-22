# Tasks

## 1. Detailed chart

- [x] 1.1 Add calendar week boundaries, bounded Recorder loading and power normalization/selection helpers; verify DST/period navigation, spikes, units, gaps and stale cancellation with targeted data tests.
- [x] 1.2 Add a stable power-history controller and multi-series shared chart presentation, including sticky selector/arrows and selected-device values; verify targeted controller/renderer behavior and document Recorder limits.

## 2. Configuration and popup integration

- [x] 2.1 Add ordered power-device fields to catalog, Python/JavaScript validation, JSON schema, native editor and visual builder; verify preservation, invalid bindings and schema/editor assertions, and document configuration.
- [x] 2.2 Register the lazy power-history popup card and update House Power generation/History activation across legacy, canonical and native paths; verify direct detailed output and preserved non-power behavior with targeted tests, and keep one safe example accurate.

## 3. Installation

- [x] 3.1 Review the scoped final changes against acceptance, validate OpenSpec, run essential targeted checks, and install final current changes on disposable 192.168.0.28 with source/helper preservation and asset/readiness confirmation.

## Scope notes

Starting commit: `036190cd3e7227c73a7608180036484bad87449b`. Earlier camera, refresh-spacing, media-popup and shortcut-background edits are already dirty and remain preserved outside this task's verification. Baseline snapshot: `/private/tmp/marao-house-power-start.json`. No publication or comprehensive testing is requested.

## Completion evidence

Targeted Node checks passed for power loading/controller, shared history data/chart, editor model and native editor; subsequent power/chart checks passed (21), power-device validation passed (1), shared graph/history checks passed (15), and existing energy-breakdown editor coverage passed (1). Targeted Python generation/preservation checks passed (9). Editor build, diff whitespace checks and strict OpenSpec validation passed. The affected-scope plan reviewed `chart-details,energy,native,editor-ui`; broad unrelated mappings were not run.

Installed the final current backend, frontend and safe fixture changes on disposable `192.168.0.28` with one necessary restart. The preparation helper confirmed generated-dashboard readiness and current served assets. The existing dashboard source was staged and compared after JSON normalization, with only the intended safe House Power example devices added; saved helper states were restored and verified. Local fixture source was restored after staging. No source-format migration or release was needed. Real-phone visual inspection remains with the user; Recorder retention limits available detail.

## 4. Neighboring periods follow-up

- [x] 4.1 Prefetch the four neighboring periods in both directions for day/week/month only after selected-period rendering, reuse pending/cached results, and bound/cancel background work; verify ordering, first-load priority, navigation reuse, freshness and cancellation, then install compatible frontend changes on disposable 192.168.0.28.

Follow-up baseline: `/private/tmp/marao-power-prefetch-start.json`; starting commit unchanged. This extends only the power controller, its tests and usage documentation; prior installed changes stay intact.

Follow-up evidence: all 13 power-history tests passed, including deferred start, calendar/DST neighboring order for all three filters, pending/cached navigation reuse, bounded eviction, background error isolation, cancellation and current/just-ended snapshot freshness. Editor build, strict OpenSpec validation and diff whitespace checks passed. The reviewed affected plan has no unknown mappings; checks unrelated to the prefetch controller were not repeated. Compatible frontend-only installation on `192.168.0.28` passed served-asset/readiness checks, preserving configuration and helpers without a full preparation/reset. Chart appearance and physical-phone inspection were unchanged/not performed.

## 5. Themed time-unit options and warmed first pages

- [x] 5.1 Replace the native picker with a themed semantic button/menu, retain focus/selection and dismissal handling, and warm every unit's first page before the active unit's neighbors; verify menu interactions, pending/cached switching, preserved first pages and neighboring-unit behavior.
- [x] 5.2 Review scoped changes, validate/build and install compatible current frontend assets on disposable 192.168.0.28 with asset/readiness checks.

Baseline: `/private/tmp/marao-power-filter-start.json`; starting commit remains `036190cd3e7227c73a7608180036484bad87449b`. Affected runtime owner is the shared power-history controller for day/week/month. No persisted/configuration contracts change; prior unrelated installed edits remain preserved.

Follow-up evidence: 15 targeted power-history checks passed, including themed menu focus/selection/dismissal, current-unit pending/cached switching, preserved first pages, nearest-period loading for all units, freshness, errors and stale cancellation. Editor build, diff checks and strict OpenSpec validation passed; the reviewed chart-details plan has no unresolved mappings. Compatible frontend-only installation passed served-asset/readiness checks on disposable `192.168.0.28`, preserving installed configuration/helpers. No browser/physical-phone inspection or broader suite was performed; appearance remains for the user's phone check.
