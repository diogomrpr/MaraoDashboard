# Sources and local adaptations

This project-maintained skill adapts community guidance; it is not an official
Home Assistant skill or an unmodified upstream installation.

- Upstream: `denysdovhan/agents`, branch `main`, retrieved and reviewed 2026-10-19.
- Verified revision: `49965622f3b083d1620443e05a37968c7447570f`. No upstream skill version is declared.
- [Integration skill](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/skills/home-assistant-integration/SKILL.md): local-first workflow and targeted official API lookup.
- [File-to-document routing](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/skills/home-assistant-integration/references/core-integration-files.md): read only sources relevant to the actual change.
- License: [MIT, Copyright (c) 2026 Denys Dovhan](https://github.com/denysdovhan/agents/blob/49965622f3b083d1620443e05a37968c7447570f/LICENSE), retained in [LICENSE.txt](../LICENSE.txt).

Marao adds its Python 3.14/executor boundaries, administrative API, generation,
configuration preservation, and existing test routing. The upstream default Bronze
quality audit, repeated documentation refetch, scaffolding, and unrelated tool
preferences are intentionally omitted. They would expand ordinary task scope.

For maintenance, compare the pinned files with upstream, verify API advice against
the official documentation and supported HA version, and merge relevant changes.
Do not replace the local skill wholesale or infer that a newer upstream commit
requires changing Marao's runtime dependencies.
