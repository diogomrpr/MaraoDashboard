---
title: JSON format migrations
layout: page
parent: Development
---

# JSON format migrations

The shared browser conversion engine is in
`custom_components/marao_dashboard/frontend/MaraoSource.js`. The dashboard strategy,
builder and offline converter must use this engine rather than creating separate
conversions. Source-format numbers are independent of Marao release versions,
Home Assistant storage versions, native-envelope versions and compiler contracts.

When existing JSON needs a change in structure or meaning:

1. Increment `SOURCE_VERSION` and append one `N → N+1` entry to
   `SOURCE_MIGRATIONS`. Keep every earlier entry and format number.
2. Convert a private input copy using the source format's established semantics
   and supplied context. Preserve explicit emptiness, ordering and unknown fields.
   Do not call HA, discover replacement content or read mutable latest defaults.
3. Return the new shape with the old working marker: the chain advances that
   marker only after the step succeeds. Validate the target before offering output
   or saving. A failure must never expose a successful partial document.
4. If information is genuinely required, return a structured `SourceError` with
   the missing-input code and path. The converter asks a simple localized question
   and retries with retained answers; the migration itself has no UI.
5. Add independently written adjacent-step expectations and historical-to-current
   expectations. Keep historical inputs and earlier step expectations unchanged.
   Run the scoped source/compiler checks, including explicit empty, malformed,
   future, missing-context and failure cases.

Compatible optional settings and unchanged-format releases need no migration.
Historical defaults belong to their migration step; changing the current catalog
must not alter an older step's result. Correct a diagnosed historical conversion
bug with an explicit regression case rather than silently regenerating fixtures.

Historical native `title`/`views` documents use an adapter whose target is fixed
at format 2. They then enter the normal chain at 2. Never change the adapter's
target to the latest format without implementing that conversion: adding a future
`2 → 3` step must automatically apply to native imports too.

Run the narrow development checks serially:

```sh
node --test --test-concurrency=1 tests/frontend/native-source.test.js tests/frontend/native-compiler.test.js
.venv/bin/python -m pytest -q tests/components/marao_dashboard/test_frontend_compiler.py
```

The Python compiler comparison is a differential oracle. Frozen modern release
inputs, provenance and independently specified native targets are recorded in
`ha-test/upgrade/fixtures/native-baselines.json`. Independent JSON
expectations remain necessary; matching two implementations alone does not prove
the intended behavior. These checks do not publish, deploy or establish upgrade
acceptance on Home Assistant.

## Optional protected content in format 2

A page may retain protected custom cards as ordered `custom_content` entries:

```json
{
  "yaml": "- type: markdown\n  content: Saved custom content\n",
  "popup_hash": "#page-home-door-popup"
}
```

Omit `popup_hash` for page-body content. A supplied popup must already exist on
that page. The compiler appends these cards before generated popups/navigation,
or to the chosen popup body. It retains the supplied YAML string, comments and
unknown fields in source; rendering uses validated parsed cards. Imports extract
only a complete, correctly ordered protected custom region. Secret/include and
unknown YAML tags are refused; no external files or expressions are evaluated.
This is an optional addition to format 2, with no conversion of existing meaning.

Known old owned asset addresses remain unchanged in source and resolve to the
installed content-identified frontend graph when compiled. The generated owned
asset inventory comes from the build. Unknown old server files and retired
Marao service calls block conversion, with locations rather than content values.
Private-setting hints likewise report locations only and cannot find every
secret. Native imports still require an explicit source-visibility review.

### Additive floor-plan descriptors

`md_floor_plan_card` adds image references and per-light geometry to source format
2 without rewriting historical sources. Optional `variables.full_page` applies
only to that new descriptor. Old inputs retain their compiled output. Image files
are HA-owned assets outside source exports; never delete them when a draft/card is
cancelled, copied or removed. A downgrade restores the matching package and exact
pre-feature source, retaining native image assets and recovery data.
