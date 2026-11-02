# Proposal

## Why

The published Jekyll site still describes the retired source builder and mixes old screenshots with newer native cards. Users need accurate released documentation and a way to configure and try every public card before copying its YAML into Home Assistant.

## What Changes

- Replace all published user/developer documentation with Astro/Starlight guides, search, current branding and old-URL redirects.
- Add real-runtime interactive card examples, settings/YAML editing, fictional device scenarios and clean YAML export.
- Make desktop playgrounds use equal-height settings and preview panels, with internal settings scrolling and enough width to keep the preview visible during editing. Keep the preview-first entry and stacked small-screen layout.
- Cover all public catalog cards and separately registered events/navigation features, with a checked behavior manifest.
- Publish only documentation built with a matching stable release; keep project rules, specifications and historical records.

## Capabilities

### New Capabilities
- `interactive-documentation`: Released documentation, behavior coverage, isolated live examples and configuration export.

### Modified Capabilities
None. Existing card-behaviors, navigation-popups and entity-state-actions remain authoritative.

## Impact

Docs site/build/workflow, shared frontend registration/configuration boundaries, packaging migration-guide input, brand assets, example tests and active documentation links. All public cards are preview consumers. Saved native configuration and public types remain compatible; no data migration. No real HA connection, third-party cards, publication, camera transport tests or historical rewrite.

The desktop layout refinement affects only documentation components, styles and guides shared by all card previews. It preserves configuration/export contracts and does not change shipped Home Assistant assets.
