---
title: Documentation and examples
description: Keep references, settings and real card previews aligned with each release.
---

This site uses Astro and Starlight. Guides live under `docs/src/content/docs`; card reference pages are generated from the current catalog and reviewed example manifest. Preview fixtures are fictional and remain outside the shipped Home Assistant package.

## Add or change a behavior

Update the shared catalog/validation where appropriate, then the card's example definition. Each public card needs a reference, valid native configuration and named scenarios for materially distinct capabilities, states, actions and option shapes.

Describe the behavior the example demonstrates. Include loading, empty, unknown/unavailable and reported-error states when the card supports them. Do not multiply equivalent numbers or colors just to increase the example count. Existing gallery cases are useful input, but they do not replace reviewing actual current behavior.

The public type and saved fields must match the product. Use `entity_id` for native card bindings. Keep simulation states, scenario controls and website metadata out of exported YAML. Preserve unknown fields and explicit emptiness when a settings form patches the draft.

## Shared sources

The dashboard setup guide renders `docs/examples/dashboard.yaml`, which is also checked as executable configuration. The migration page renders the canonical plain Markdown recovery guide used by release packaging. Keep those single sources aligned rather than copying snippets between pages.

Use the actual card runtime for previews. Website-specific forms share configuration rules, while a bounded simulated HA layer supplies fictional responses. Unsupported native editing, third-party cards and camera transport need visible explanations, not fake success.

The site and playground controls use Montserrat and the shipped Marao light/dark theme. `prepare-site.mjs` generates the theme variables from the canonical theme YAML; change that source rather than maintaining a second palette. Keep settings hidden until Open playground is selected.

`settings-options.js` supplies searchable choices from catalog enums and fictional context, including entity domains, compatible units, sources and views. Keep numeric choices typed and preserve member descriptors/order. The shared picker uses the browser's Popover top layer so the settings scroller cannot clip it. MDI suggestions load on demand from the locally generated icon catalog; custom values never query a user's Home Assistant.

Wide playgrounds give settings and preview one bounded panel height, with an independent settings scroller and persistent editor tabs/actions. Keep the preview at a mobile width; the iframe fills the desktop panel while tall content scrolls inside it. Smaller layouts use natural stacked scrolling. The page outline hides only while desktop playground mode is active.

The preview's `home-assistant` host is a direct child of the frame body, matching Home Assistant. Popups rely on this boundary to make the background inert while keeping the dialog interactive. The frame grows for popup content in standalone/stacked layouts; desktop panels retain their height and use the popup's internal scroller.

## Review and publication

Build the site and run the documentation checks for catalog coverage, valid examples, links and export boundaries. Inspect a representative interactive flow when changing the playground. Use the same source revision for prose, catalog and preview assets.

The public site follows stable releases only. Changes can be built and reviewed before release, but do not deploy an unreleased runtime under a released version label. There is no Upcoming edition. Keep project rules and historical records in the repository; the website is a current reference, not a rewritten test-history archive.

A stable release automatically dispatches the documentation workflow on `main`, which checks out that exact release tag before building and publishing. This keeps deployment on the branch allowed by the `github-pages` environment. Manual publication uses the same workflow with `release_tag` set to the latest stable tag; stale or prerelease targets are rejected.

## Card design workflow

All public card references show real-runtime behavior galleries above their configuration playground. Wide rows place the description beside a mobile-width card. Visible examples and three offscreen examples preload; reserved heights prevent loading jumps. Published assets are built from the documented stable release, with fictional HA data and explicit simulation limits.

For a design request run `npm run card:context -- climate --intent style`, then `npm run docs:design -- --card climate`. The latter reports an isolated workspace/task ID and loopback URL. Reuse it with `--task ID`; source drift is reported without overwriting proposals. Edit actual scoped runtime sources there; they rebuild automatically while the baseline playground stays frozen.

Use `$marao-card-design` or ask naturally, for example “change the Climate current-temperature font size.” Shared source ownership must be inspected before applying. Confirm all affected consumers, selected family including owned details, or a subset. A visual approval alone does not authorize broader shared effects. Implementation in main requires explicit apply, conflict review, targeted checks and the existing disposable-HA installation rule.

Once the preview is complete and application is authorized, use `npm run card:apply -- --task ID`. The card-design skill describes recording the reviewed file list, consumer scope and minimal tests in `proposal.json`; `--plan` reports the patch digest and source conflicts without applying or contacting Home Assistant. The apply command preserves staging and unrelated work, retains private before-file backups, rebuilds, runs the selected checks serially, and installs runtime changes through the existing helper on disposable `192.168.0.28`. It verifies served assets and keeps the saved dashboard. Failed checks/installations remain incomplete and can be retried; further preview/scope edits invalidate the recorded review. Documentation/test-only patches skip runtime installation. Release remains a separate explicit step.
