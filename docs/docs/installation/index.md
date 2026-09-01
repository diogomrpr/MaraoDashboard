---
title: Installation
layout: page
nav_order: 1
---

# Installation

Marao Dashboard is distributed as a HACS custom **Integration**. Its visual
dashboard relies on seven independently maintained HACS **Dashboard**
repositories.

Install in this order:

1. Install the [dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }}).
2. [Download Marao Dashboard]({{ '/docs/installation/downloads.html' | relative_url }})
   as a custom HACS Integration.
3. Restart Home Assistant and [add the Marao Dashboard integration]({{ '/docs/installation/configuration.html' | relative_url }}).
4. Open the Marao Dashboard Editor, review the imported entities, then select
   **Save & Generate**.

Marao creates a YAML-mode dashboard because its generated files use Home
Assistant YAML include directives. The visual Marao editor remains the source
of truth for generated content; it is separate from Home Assistant's standard
dashboard editor.

Create a Home Assistant backup before installation or upgrade, especially when
you already have custom `frontend` or `lovelace` configuration.
