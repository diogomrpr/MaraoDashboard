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

Before a push, tag or release, run `npm run verify:publish` for affected unit tests and applicable package metadata validation. Install the final release candidate, including its version metadata, on the disposable Home Assistant before publication. Reuse an already installed exact candidate; installation failure blocks publication.

Release work reuses development integration evidence. It does not authorize new camera playback, browser, upgrade or full-suite testing. Known failures remain failures and unchecked behavior remains unchecked.

Publish documentation only for its matching stable release. The documentation workflow validates source changes before release, then builds the public site with matching prose, catalog, examples and runtime. Do not relabel a development preview as released documentation.
