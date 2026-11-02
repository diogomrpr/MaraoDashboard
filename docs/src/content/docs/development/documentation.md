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
