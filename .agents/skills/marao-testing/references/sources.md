# Sources and local adaptations

This project-maintained skill adapts community guidance; it is not an official
Playwright skill or an unmodified upstream installation.

- Upstream: `currents-dev/playwright-best-practices-skill`, branch `main`, retrieved and reviewed 2026-10-19.
- Verified revision: `283d5cbc5d11aac1abda058b16ad22c317d54dc0`; upstream skill metadata version `1.2`.
- [Skill](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices/SKILL.md): activity-based reference selection.
- [Locators](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices/core/locators.md): semantic locators and scoped filtering.
- [Assertions and waiting](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices/core/assertions-waiting.md): bounded observable readiness and waits registered before actions.
- [Fixtures and hooks](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices/core/fixtures-hooks.md): isolated state, minimal setup, and owned cleanup.
- [Debugging](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices/debugging/debugging.md): relevant DOM, network, and trace evidence before changing assertions.
- License: [MIT, Copyright © 2026 Currents Software Inc.](https://github.com/currents-dev/playwright-best-practices-skill/blob/283d5cbc5d11aac1abda058b16ad22c317d54dc0/LICENSE.md), retained in [LICENSE.txt](../LICENSE.txt).

Marao supplies its existing scoped runner, pytest/Node layers, shared Playwright
helpers, disposable-target controls, and validated evidence reuse. The adaptation
omits unscoped `npx playwright test`, blanket repeated runs, retries/quarantine,
parallel defaults, TypeScript or `@playwright/test` adoption, private shadow
selector syntax, network-idle readiness, and credential-bearing diagnostics.

For maintenance, compare the pinned references with upstream. Cross-check API
changes against [Playwright documentation](https://playwright.dev/docs/api/class-page)
and the pinned local dependency. Merge useful advice into the existing harness;
do not import the upstream test architecture or replace repository test policy.
