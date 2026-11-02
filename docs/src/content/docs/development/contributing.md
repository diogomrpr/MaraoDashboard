---
title: Contributing
description: Make a complete, focused change without disturbing existing configuration.
---

Begin with the requested result and concrete acceptance cases. Record the starting commit, existing dirty work and shared consumers before editing. Preserve unrelated work.

Small fixes that restore documented behavior need no new proposal. New behavior, public/persisted contracts, migrations and substantial cross-layer work use an applicable OpenSpec change. A planning request ends with planning; an authorized implementation continues through its necessary verification and installation.

## Change the shared owner

Trace native editor → validation/composition → runtime → translations/examples. Fix reusable controls at their shared implementation. The frontend stays browser-native; do not bundle third-party Lovelace cards or build a second version of a shared slider, popup or action dispatcher.

Keep unknown fields, explicit empty selections, names, ordering, raw cards and unrelated HA settings. A change to persisted meaning requires an ordered compatibility conversion with exact backups and failure recovery. Do not rebuild a user's dashboard from discovery to avoid migration.

## Add examples and evidence

Update the card reference and fictional scenario when an option or behavior changes. Use the smallest meaningful regression for nontrivial logic. Reuse safe gallery examples; add a case only to demonstrate a new behavior or reproduce a defect. See [testing](../testing/).

Rebuild generated bundles and install final applicable changes on the disposable instance. Compare every requested outcome with the implementation and selected evidence. Passing checks or completed OpenSpec tasks alone do not establish completion.

## Submit

Before a push, tag or release, run the unit-only publication gate. Describe the concrete problem, resulting behavior and actual validation in the pull request. Report known failures and unchecked behavior honestly. Do not publish credentials, household data, camera media or private logs.

Contributions use the repository's existing license. The [contribution guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/.github/CONTRIBUTING.md) and root contract remain authoritative.
