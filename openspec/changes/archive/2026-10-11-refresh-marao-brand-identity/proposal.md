# Proposal

## Why

Marao currently has older house-shaped branding in its documentation and packaged integration images, while its sidebar entries use generic icons. It needs one original mountain identity that matches the dashboard's existing blue palette and is recognizable across the application and documentation.

## What Changes

- Create an original group of mountain peaks in Marao blue, navy and pale highlights, using the supplied image as direction rather than copying its stock artwork.
- Make the full logo spell **Marao** through transparent lettering cut out across the mountains. Use a simpler mountain mark without lettering for small icons and a monochrome equivalent for Home Assistant's icon system.
- Replace the documentation logo/favicon and integration branding images; add the shared identity to the README, documentation landing page and editor header. Use the mountain mark for the editor sidebar entry and the default dashboard sidebar icon.
- Keep explicitly configured dashboard icons and all functional device, weather, navigation and action icons unchanged. The user confirmed that this change concerns **logo and branding icons only**.
- Keep assets vector-based where supported, provide native Home Assistant PNG exports, and document their source, export process and placement. Check light/dark readability and mobile header layout.

The proposed default is a small group of angular peaks with restrained facets and centered cutout lettering. Exact geometry is a design choice to be reviewed during implementation; the name-free small mark is intentional because lettering cannot remain readable at favicon sizes.

## Capabilities

### New Capabilities

- `brand-identity`: Original Marao logo, small branding marks, asset ownership, consistent placement and readability across owned identity surfaces.

### Modified Capabilities

None. Existing `mobile-theme-layout`, `integration-lifecycle`, `dashboard-generation`, `visual-builder` and `repository-workflow` requirements remain in force; this change adds branding without changing their functional contracts.

## Impact

- Runtime: packaged `brand/` PNGs, new SVG assets under the frontend, the existing custom icon registry, sidebar constants/default generation and the editable editor header/style with regenerated editor output.
- Documentation: existing `docs/assets/images/` assets and Jekyll configuration, README, documentation landing page and a short asset usage/export guide.
- Checks: relevant setup/generator tests, editor build checks, package boundary checks, asset validation and focused browser inspection. Existing dependencies and native Home Assistant branding support suffice; no paid service, third-party card or new test framework is required.
- **Affected-card set: empty** for this planning change and the intended branding-only implementation. Branding surfaces are the affected UI set; card layouts, tokens and functional icon paths are unchanged. Recalculate this set before implementation if a shared card component or layout must change.
- Preserve stored configuration, custom YAML, entities, routes, domain and the README's single approved attribution. No automatic conversion of user-chosen icons, theme redesign, logo insertion into every card, functional icon redesign, reconnect fix, external brand submission or publication is included. Any deployment/inspection during implementation uses only disposable `192.168.0.28`; future publishing still requires the existing release gate and resolution of relevant known defects.
