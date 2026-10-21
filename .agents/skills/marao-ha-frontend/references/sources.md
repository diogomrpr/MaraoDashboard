# Sources and local adaptations

This project-maintained skill adapts community guidance; it is not an official
Home Assistant skill or an unmodified upstream installation.

- Upstream: `denysdovhan/agents`, branch `main`, retrieved and reviewed 2026-10-19.
- Verified revision: `49965622f3b083d1620443e05a37968c7447570f`. No upstream skill version is declared.
- [Home Assistant card skill](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/skills/home-assistant-card/SKILL.md): preserve the existing custom-element architecture and use HA APIs deliberately.
- [Card patterns](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/skills/home-assistant-card/references/card-patterns.md): configuration/state separation, lifecycle-safe rendering, complete editor events, unknown keys, and service capabilities.
- License: [MIT, Copyright (c) 2026 Denys Dovhan](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/LICENSE), retained in [LICENSE.txt](../LICENSE.txt).

Marao adds its native JavaScript/Shadow DOM source boundaries, shared controls,
intentional climate request sharing, draft preservation, and mobile acceptance.
The adaptation omits repeated documentation refetch, broad build/test defaults,
framework/helper adoption, and replacement of existing editors with a new form
API. Marao's climate formatting and UI contract take precedence over general
formatting or upstream frontend styling suggestions.

For maintenance, compare these pinned files with upstream and merge relevant
advice after checking the official custom-card API and supported HA frontend.
Keep repository-specific behavior and provenance; do not overwrite the local
skill with upstream or install a third-party card as part of an update.
