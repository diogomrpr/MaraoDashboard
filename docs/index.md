---
title: Marao Dashboard
layout: home
nav_order: 0
---

# Marao Dashboard

Marao Dashboard turns a visual, editable JSON model into a coordinated Home
Assistant YAML dashboard. It provides overview and room views, responsive card
templates, pop-up controls, a theme, and local version history.
{: .fs-6 .fw-300 }

## Start here

1. [Install the seven dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }}).
2. [Download Marao Dashboard with HACS]({{ '/docs/installation/downloads.html' | relative_url }}).
3. [Configure and generate the dashboard]({{ '/docs/installation/configuration.html' | relative_url }}).

## How it works

The Marao Dashboard integration adds an admin-only editor to Home Assistant.
Use it to choose rooms and entities, configure card variables, and add optional
Security, Energy, Wallbox, and Media pages. **Save & Generate** writes the YAML
dashboard while retaining marked hand-written card sections.

Camera support is available as one of the generated card types. It can show a
live Home Assistant feed and open recent events from Frigate or the official
UniFi Protect integration.

Third-party cards are ordinary, independent HACS Dashboard downloads. Marao
does not bundle or silently replace them; see the dependency page for resource
configuration, upgrade cleanup, and troubleshooting.

## Help and development

- Review the [card documentation]({{ '/docs/usage/cards/' | relative_url }}) for
  manual YAML and variables.
- Use the [update guide]({{ '/docs/installation/update.html' | relative_url }})
  before moving to a new release.
- Report reproducible problems in the project's GitHub issue tracker.
- Read the [development guide]({{ '/docs/development/' | relative_url }}) before
  contributing code or templates.
