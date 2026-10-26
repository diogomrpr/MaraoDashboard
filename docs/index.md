---
title: Marao Dashboard
layout: home
nav_order: 0
---

# Marao Dashboard

<picture>
  <source media="(max-width: 300px)" srcset="{{ '/assets/images/favicon.svg' | relative_url }}">
  <img src="{{ '/assets/images/logo.svg' | relative_url }}" alt="Marao Dashboard mountain logo" width="312" height="168" style="max-width:100%;height:auto">
</picture>

Marao Dashboard turns a visual, editable JSON model into a coordinated Home
Assistant native dashboard. It provides editable pages, project-owned cards,
pop-up controls and coordinated light/dark styling without a Marao Python backend.
{: .fs-6 .fw-300 }

**v0.22.0 is breaking.** Existing Integration installations need the
[one-time manual migration](docs/installation/native-migration.md), including
backup, offline JSON conversion and re-adding the same repository as Dashboard.
Do not update the old Integration entry in place.

## Start here

1. [Download Marao Dashboard with HACS]({{ '/docs/installation/downloads.html' | relative_url }}).
2. [Configure and generate the dashboard]({{ '/docs/installation/configuration.html' | relative_url }}).

## How it works

Install the HACS **Dashboard** package on stable HA 2026.10.0 or newer. Its
Visual/JSON editor lives under the native dashboard root. Use it to choose rooms
and entities, configure cards and edit Security, Energy, Wallbox and Media pages.
**Save & Generate** validates locally and saves through native HA storage. Native
source is readable to authenticated users; review private values before importing.

Camera support is available as one of the generated card types. It can show a
live Home Assistant feed and open recent events from Frigate or the official
UniFi Protect integration.

Marao owns the generated card runtime. Other custom cards installed in the
same Home Assistant instance remain independent and untouched.

## Help and development

- Review the [card documentation]({{ '/docs/usage/cards/' | relative_url }}) for
  manual YAML and variables.
- Use the [update guide]({{ '/docs/installation/update.html' | relative_url }})
  before moving to a new release.
- Report reproducible problems in the project's GitHub issue tracker.
- Read the [development guide]({{ '/docs/development/' | relative_url }}) before
  contributing code or templates.
