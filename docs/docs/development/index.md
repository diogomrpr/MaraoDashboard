---
title: Development
layout: page
nav_order: 3
---

# Development

Marao Dashboard combines a Home Assistant custom integration, a local editor,
generated YAML, project-owned card templates, and a theme. Keep changes in the
smallest relevant layer and add a regression test for behavior changes.

- Follow [Local development]({{ '/docs/development/local-development.html' | relative_url }})
  to build, test, and sync to a disposable Home Assistant instance.
- Follow the [Dashboard quality contract]({{ '/docs/development/dashboard-quality.html' | relative_url }})
  for binding mobile UI, interaction-safety, accessibility, and release rules.
- Follow [Theme design]({{ '/docs/development/theme.html' | relative_url }})
  when adding or changing theme variables.
- Follow [Template design]({{ '/docs/development/template.html' | relative_url }})
  when editing the reusable `hc_*` Marao card variants.

Development and release builds must contain only Marao-owned frontend code.
