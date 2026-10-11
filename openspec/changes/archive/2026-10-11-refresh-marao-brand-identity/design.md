# Design

## Context

See [proposal.md](proposal.md) for motivation and [brand identity requirements](specs/brand-identity/spec.md) for acceptance.

Observed consumers are separate today: `custom_components/marao_dashboard/brand/{icon,logo}.png`, `docs/assets/images/{logo,favicon}.svg`, and generic sidebar icons in `const.py` and generator defaults. Jekyll already references the documentation assets through `docs/_config.yml`. README and the documentation landing page do not currently display a logo. The editor's `_renderShell` in `frontend_src/MaraoDashboardPanel.js` contains a text heading without artwork.

The runtime already registers `window.customIconsets.marao_dashboard` in `frontend/MaraoDashboard.js`. Keep its existing functional paths and compatibility registration intact. The frontend directory is served locally and recursively fingerprinted. Editor source/CSS is built into the shipped frontend; its `assets/` directory is generated and checked for unexpected files, so handwritten brand SVGs must live outside that managed directory.

The existing theme provides blue `#7BADE6`, navy `#284D7D` and pale `#EFF6FF`, with darker surfaces such as `#0F1722`. No theme tokens need changing. Existing `mobile-theme-layout`, `repository-workflow`, `integration-lifecycle`, `visual-builder` and `dashboard-generation` contracts continue to govern the implementation.

## Goals / Non-Goals

**Goals:** One small, maintainable vector asset family with platform-compatible exports; consistent identity placement; a readable mobile editor header; preservation of configured icons and existing functional glyphs.

**Non-Goals:** A general branding framework, logo editor, new paid tool/dependency, asset CDN, external brands-repository submission, card redesign, global theme changes or an automatic migration of user-selected icons. This proposal creates no artwork or runtime changes.

## Decisions

### 1. Use original flat vector geometry with two levels of detail

Draw a restrained group of approximately three angular peaks. Use the existing palette and a few broad facets. The supplied image is reference material only; do not import, trace or ship its stock artwork. Center **Marao** across the mountains as actual transparent negative space. Convert the Montserrat-based lettering to vector outlines and apply an SVG mask or equivalent path subtraction; a background-colored text overlay would fail on different surfaces.

Create a simplified square mark from the same silhouette for favicon/integration icons, and a monochrome path for the native Home Assistant sidebar. The small mark intentionally omits lettering and fine facets. Retain vector shapes for scalable consumers; this avoids requiring bitmap upscaling or a font request to render the logo. Raster-only branding would be simpler initially but would make future resizing and transparent lettering harder to maintain.

### 2. Keep editable sources in the served frontend and export only required variants

Use `custom_components/marao_dashboard/frontend/brand/` for canonical full-logo and compact-mark SVG sources, including explicit dark variants where needed. This location is shipped and served by the existing integration, but does not conflict with the editor's generated font/worker assets. Use relative, versioned asset URLs derived from the editor module URL, following its existing stylesheet cache-version pattern.

Replace the existing documentation SVG paths with derived copies so Jekyll configuration remains stable. The favicon uses the simple mark and can adapt to the browser's color scheme. Export transparent square icon and rectangular logo PNGs into the existing integration `brand/` folder, with the supported light/dark and standard/high-resolution filenames. Document chosen dimensions and preserve aspect ratio and clear space. Reuse installed Playwright/browser rendering for raster export; a small export command is sufficient, with no extra image dependency or general pipeline. Documentation copies and PNGs must be traceable to the canonical SVGs.

Home Assistant supports custom integrations' local brand images from 2026.3 onward and gives them precedence over remote images; native UI obtains the authenticated asset URLs. Keep that native path rather than introducing a custom branding endpoint or storing tokens in artwork URLs. Older Home Assistant consumers and external catalogue caches may not reflect local assets; this change makes no external publication claim. See the [official brand image documentation](https://developers.home-assistant.io/docs/core/integration/brand_images/) and [supported local filenames](https://developers.home-assistant.io/blog/2026/02/24/brands-proxy-api/).

### 3. Wire owned identity surfaces without changing semantic icons

| Consumer | Integration approach |
| --- | --- |
| Native integration/configuration identity | Replace packaged `brand/` exports; let Home Assistant serve them. |
| Editor sidebar | Add one namespaced mountain mark to the existing custom iconset and reference it from the panel icon constant. Verify registry availability on first load. |
| Dashboard sidebar default | Use the same mark for the starter default and missing-icon fallback in the generator. Preserve every nonempty explicit icon, including an older generic default already saved as a user configuration value. |
| Editor header | Add a compact decorative mark beside the existing heading; keep the heading and subtitle, responsive wrapping and action space. Edit source/CSS and regenerate committed output. |
| Documentation header/favicon | Replace current SVGs at their existing paths and verify the rendered Jekyll result. |
| README/documentation landing page | Place the full logo once at the introduction using repository/Jekyll-compatible image URLs and useful alternative text. Preserve existing content and the single approved README attribution. |

Do not replace the navbar's home icon, room/category icons, gallery action icons or any entries already in the functional icon map. No schema or new user setting is needed: builder validation already accepts string icon identifiers and persists configured values. Branding adds no translated action label; reuse existing localized headings/subtitles and preserve the proper product name.

### 4. Validate the specific paths and keep fixtures proportional

Before implementing, record the affected-card set as empty and list the affected branding surfaces above. If a shared card/layout contract unexpectedly changes, revise the set and required checks before editing it.

Use existing setup/fingerprint and generator tests for registration/default behavior and preservation of explicit icons, `build:editor`/`check:editor` for generated parity, and the existing package boundary check for shipping assets. Add only a focused asset check for valid SVG/PNG formats, expected theme variants, matching derived SVG copies and required exports. Browser checks must verify the brand mark on a cold load as well as a refresh, not just check that the icon string is present.

The intended change adds no supported card behavior, so it does not require duplicate gallery cards or fake entities. Update only the safe disposable dashboard root icon where needed to show the new identity; existing Cases and realistic product examples retain their semantic icons. If a card behavior or shared icon-only layout changes during implementation, update canonical Cases and realistic examples together and run `test:ha:alignment` as required by the repository contract.

Render documentation with the existing Pages build command, `bundle exec jekyll build --destination ../_site` from `docs/`, and inspect the output through a local browser. Inspect brand artwork at 16/32px, integration icon/logo sizes and the README/docs placements in light and dark contexts. For changed editor branding, cover the existing 320px, iPhone/Android portrait/landscape profiles with all five text/zoom modes. Preserve control geometry, title wrapping, accessible names and original aspect ratios. Investigate any failed resource or console exception.

## Risks / Trade-offs

- [Cutout letters disappear at small sizes] → Use the name-free mark below the full logo's documented minimum width; establish that width through visual inspection.
- [Navy becomes unclear on dark surfaces] → Use a light/dark asset pair from the same geometry and check both, including transparent lettering over the actual background.
- [Sidebar requests its custom icon before registration] → Verify a cold application load and panel navigation using the existing loading mechanism; fix ordering at its shared root if necessary without rewriting functional icon registration.
- [Native brand and external catalogue caches show old artwork] → Verify packaged files and authenticated native responses, refresh/restart the disposable instance when needed, and describe the observed consumer limitations instead of claiming publication.
- [Asset copies drift] → Document the small deterministic export process and check derived copies against the canonical source.

## Migration Plan

No data migration is required. Change only absent/default icon selection for newly created configurations; saved explicit icons remain untouched. Preserve domain, dashboard URLs, entities, custom YAML and stored history.

After focused checks, run the deployment dry run and synchronize only to disposable `192.168.0.28`. Confirm the served fingerprint, then perform final visual inspection of every affected branding surface and any cards added to the revised affected set. No physical action needs exercising for a logo change. Keep screenshots free of sensitive configuration.

Revert the branding commit/assets and regenerate editor output to roll back; no entity or configuration restoration is needed. Publishing is separate: before any push, tag or release, `verify:publish` and exact-commit GitHub Tests, hassfest and HACS checks must pass. The unresolved native reconnect follow-up remains separate and its historical one-release exception does not authorize a new release.
