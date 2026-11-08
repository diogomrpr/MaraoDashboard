---
title: Packaging and releases
description: Build a complete HACS frontend graph and publish matching documentation.
---

HACS installs the flat frontend graph in `dist/`. It does not install the retained Python reference tree, development dependencies, test fixtures or documentation playground.

## Build the graph

```sh
npm run build:hacs
```

The build regenerates editor bundles, stages the native frontend and replaces root `dist/` and `hacs.json`. The stable loader reads `MaraoFrontend.release.json`; its content identity and file hashes describe the complete graph. Do not edit generated distribution files or combine assets from different builds.

Build the standalone offline converter with:

```sh
npm run build:converter
```

Release packaging also includes the canonical migration guide. Preserve that dependency whenever documentation moves.

## Release assets

Commit the complete graph with the source and use an immutable release tag. **If any release asset is attached, including the converter, attach every file in `dist/` too.** HACS prefers attached assets once any exist; a converter-only or entry-only release is incomplete. Check names and hashes against the release manifest.

The package is a Dashboard resource, not an Integration ZIP. Historical tags and exact recovery packages remain unchanged.

## Publication gates

Use the release command from a clean, reviewed checkout based on current `origin/main`:

```sh
npm run release -- --version 0.35.0 --notes-file /private/tmp/marao-release-notes.md
```

Choose the appropriate next stable version and write the reviewed release notes first. Keep uncommitted and unrelated work outside this checkout. Node/npm, project dependencies, Python test dependencies, authenticated GitHub CLI (`gh`) access and the configured disposable Home Assistant must already be available. The command derives the repository from the expected Marao origin and creates `codex/release-<version>`; it does not collect pending work automatically. Use `--config /path/to/ignored/ha-test/local.json` when running from an isolated worktree.

Add `--plan` for a read-only overview without builds, writes or HA/GitHub calls. An actual run updates package and lockfile versions, builds the complete package and converter, commits generated version changes, runs the existing serial affected unit gate against the latest stable release, and installs/verifies that exact candidate on disposable `192.168.0.28`. It then pushes a branch/tag, creates a pull request, uploads and hash-verifies every release asset, waits for exact-commit Tests/HACS/hassfest/documentation checks, merges and publishes, then confirms the tagged documentation deployment. No browser or integration suite is added.

The private journal under the Git common directory's `marao-releases/` binds source, notes, candidate identity, checks and assets. Rerun the same command with unchanged notes to resume. Failures retain recovery state and do not move tags or overwrite published assets; an already-published release remains public if its later documentation deployment fails. Resolve the reported issue before retrying. Source changes or an advanced `main` require reconciliation and a freshly verified candidate. If an interrupted process leaves `marao-release.lock` in the Git common directory, verify that no release is running and inspect the journal before removing that stale lock. The command never falls back to a dashboard/fixture reset or full HA preparation.

Before a push, tag or release, run `npm run verify:publish` for affected unit tests and applicable package metadata validation. Install the final release candidate, including its version metadata, on the disposable Home Assistant before publication. Reuse an already installed exact candidate; installation failure blocks publication.

Release work reuses development integration evidence. It does not authorize new camera playback, browser, upgrade or full-suite testing. Known failures remain failures and unchecked behavior remains unchecked.

Publish documentation only for its matching stable release. The documentation workflow validates source changes before release, then builds the public site with matching prose, catalog, examples and runtime. Do not relabel a development preview as released documentation.
