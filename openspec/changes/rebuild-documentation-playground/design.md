# Design

## Context

See proposal.md. Current public types come from the native catalog/composition plus events/navbar. Native forms depend on HA; shared validation and patching are reusable. Packaging copies the migration guide, and tests read setup YAML and brand images from docs. Starting commit: cf4662333dd6223c761e698f4131a197d67e19a7. Dirty baseline: /private/tmp/marao-docs-rebuild.json.

## Goals / Non-Goals

Deliver complete new guides and real Marao previews with simulated device behavior. Preserve rules/history and configuration contracts. Do not create a general HA emulator, connect an account, publish unreleased features or recreate HA-owned editing/video transport.

## Decisions

- Card pages start with the live preview and an Open playground button. Scenario, appearance, language and configuration controls appear only in playground mode. Exiting preserves draft and preview state without remounting the frame.
- Astro/Starlight static site with MDX and vanilla JavaScript interactive islands; keep GitHub Pages base path. Prefer this to a second React application or continued Jekyll customization.
- Shared catalog and explicit scenario manifest drive references, settings and coverage. Curated fictional fixtures remain outside shipped code. Distinct capabilities/states/options receive examples; equivalent value permutations do not need duplicates.
- Real runtime inside a script-only sandboxed iframe, trusted bundled code, restricted assets and no network connections. Structured messages carry configuration. Synthetic hass methods own state/service/history/event responses; unknown operations visibly fail. Navigation/asset boundaries simulate side effects.
- Website forms use shared configuration validation/patching; YAML remains an advanced route for every supported field. Preserve unknown/empty fields. Invalid drafts retain last valid preview and disable valid-config export.
- Documentation and settings controls use Montserrat and variables generated from the shipped Marao light/dark theme. Use rounded fields, native switches and segmented tabs consistently across card pages.
- Searchable choice controls cover catalog enums, icons, domain-filtered fictional entities and member lists, energy units/precision/periods, event providers, view paths, media sources and known service/translation suggestions. Fixed choices preserve numeric types; open suggestions retain custom values. Multiple choices preserve descriptor metadata and order. Free text, colors and arbitrary structured configuration remain editable. The native Popover top layer keeps the dropdown outside the bounded settings scroller; load the installed MDI icon catalog only on demand.
- When the playground has at least 760px of content width, place Settings/YAML on the left and the preview on the right. Give both panels one bounded height: approximately 80% of the viewport, capped at 900px and reduced to reserve room for the site header and playground controls. Keep a usable minimum on short windows. Scroll the settings body independently, retaining tabs, Copy/Reset and feedback outside that scroller. The preview fills its panel with a maximum 400px card viewport; tall content and popups scroll inside the frame without stretching the card.
- On desktop, hide the right-hand page outline while the playground is open and let the article use the recovered width. Opening brings the playground below the site header. Closing restores the outline without replacing the frame or losing drafts. Below the content-width breakpoint, retain a natural stacked layout and page scrolling.
- The preview app host is a direct body child, matching HA's popup inert boundary. In standalone/stacked previews the frame height includes open popup content; in the bounded desktop layout the frame viewport constrains the popup's existing internal scroller. Simulated light reports reconcile RGB, HS and temperature mode after color edits.
- Match prose, catalog, examples and runtime revision. CI builds on affected changes; Pages deployment requires the matching stable release. English guides and EN/PT preview controls; no Upcoming or version archive.

## Risks / Trade-offs

- HA-owned components cannot run independently: show clear limits for native editors, arbitrary cards and camera transport; keep Marao controls real.
- Removing docs can break packaging and rule links: retain required migration content, update active consumers, and generate public redirects before removing old site files.
- Simulation could accidentally navigate/load user URLs: allowlisted adapters and frame CSP isolate it; test action and export boundaries.

## Migration Plan

Build new site alongside old files, complete guides/examples, update dependencies, then remove old published content/tooling. No saved dashboard migration. Shared runtime edits receive focused regressions and one final compatible sync to disposable 192.168.0.28. No push/tag/release is requested.

Desktop refinement baseline: cf4662333dd6223c761e698f4131a197d67e19a7, dirty-state snapshot /private/tmp/marao-docs-desktop-panels.json. All card references share the playground owner. Acceptance covers independent settings scrolling with a stationary preview, equal panel heights, reachable YAML/export and popup controls, preview-first entry, and stacked narrow layouts. Documentation-only changes require no HA installation.
