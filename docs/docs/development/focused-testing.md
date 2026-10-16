---
title: Focused testing
layout: page
parent: Development
nav_order: 3
---

# Focused testing

Use the smallest checks covering the implementation and its shared consumers.
This is the default during development, versioning, CI and release preparation.
A release request does not request the full suite or parallel execution.

```sh
npm run test:affected -- --plan
npm run test:affected
```

Record the starting commit before an implementation batch. After its final edit,
use `--base <starting-commit>` to include completed commits as well as staged,
unstaged, deleted and untracked files. Without a base, ordinary checks compare
the working tree to HEAD. CI supplies its event range explicitly. Publication
compares the whole candidate to the previous release, even on a clean checkout.
It resolves published stable releases through the existing GitHub CLI, excluding
unpublished tags; supply `--base <verified-released-ref>` when that metadata is
unavailable. CI uses its read-only repository token for this lookup.

For shared files, review the diff and declare the component being changed:

```sh
npm run test:affected -- --base <ref> --component slider --plan
npm run test:affected -- --base <ref> --component slider
```

The selector expands slider consumers to light, fan and cover. Other components
and available options appear in `npm run test:affected -- --help`. Unknown paths
and ambiguous shared changes fail with a scope message. They never trigger a
full-suite fallback. Add the missing mapping rather than skipping the file.
Documentation-only changes need no application deployment or browser tests.

Use `--component scroll` for native card-surface lifecycle changes. Its WebKit
and Chromium regressions update cards after scrolling the realistic Maintenance
sheet, its 32-card Cases counterpart and the dashboard page. They cover both
themes with selected phone, narrow, landscape and enlarged-text layouts.
Playwright WebKit is additional engine coverage, not physical iPhone proof.

Unit/static checks run before browser work. A compatible browser batch prepares
the safe disposable installation once. Each job receives a private artifact
directory and validates the prepared assets, saved source and fixture ownership.
An ordinary batch receipt is distinct from real preserved-install upgrade proof.
Existing individual test commands remain available for focused debugging.

Browser checks sample materially distinct affected families and options. Layout
changes select relevant normal, narrow, enlarged-text/zoom and landscape cases.
Actions still assert dispatch and cancellation; migrations still assert data
preservation and recovery. Visibility alone cannot replace those checks. Inspect
representative changed components after the final edit/check, without reviewing
every equivalent card or scrolling image. Save failure screenshots; exhaustive
success screenshots require an explicit diagnostic request.

## Explicit parallel and comprehensive runs

Only run these when requested:

```sh
npm run test:affected -- --parallel
npm run test:full -- --parallel
```

Preview all registered checks without executing them with
`npm run test:full -- --plan`. Use `--offline` for CI/local offline checks only;
that result does not claim live browser or upgrade coverage.

Parallel mode allows up to three independent jobs. Browser contexts, results and
artifacts stay isolated. Builds, deployment, dashboard saves, shared helper
mutations, restarts and historical restoration remain exclusive. They cannot run
alongside dependent readers. No extra dashboard or Home Assistant instance is
created. Default execution, including mobile profile traversal, remains serial.

## Scoped releases and evidence

Ordinary browser batches use built-in SSH file hashing without a remote Python
installation. Preserved-install scenarios additionally require Python 3 and the
generator's libraries in the configured SSH shell. Missing prerequisites fail
before expensive work; the runner does not install remote tools automatically.

`npm run verify:publish` and `npm run verify:release` require affected checks and
applicable exact-commit CI. Packaging/editor asset/HACS/hassfest checks apply to
their changed inputs. Selected failures and known relevant violations block
publication. The approved native reconnect exception remains narrowly scoped,
with raw evidence and an expiry check whenever it is applied.

UI-only releases do not automatically replay historical installations. Persistence,
migration, generated-output ownership or installation changes require matching
preserved-install checks for affected baselines, independent expected data,
recovery and verified cleanup. If a shared conversion affects all supported
formats, every affected baseline is included. The comprehensive mobile/feature
and historical suite remains an explicit option.

Private versioned reports record the baseline, candidate, selected checks and
consumers, excluded checks, input hashes, timings, failures and cleanup. Unchanged
successful checks can be reused; changed code, tests, selection, target, source or
fixtures invalidate the corresponding proof. Final publication binds validated
evidence to the clean candidate commit. Focused results never mean the full suite
passed. Existing historical reports remain immutable.
