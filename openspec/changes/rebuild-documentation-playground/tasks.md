# Tasks

## 1. Site and release lifecycle
- [x] 1.1 Replace Jekyll with Astro/Starlight, branding, search and navigation; verify production build and public redirects.
- [x] 1.2 Restrict publication to matching stable releases and add source-aware build checks; verify workflow and local build metadata.

## 2. Runtime playground
- [x] 2.1 Render real cards in an isolated simulated HA environment with bounded actions/assets; verify representative state changes and isolation assertions.
- [x] 2.2 Add synchronized settings/YAML, scenarios, themes/locales, reset and clean copy; verify round trips, invalid drafts and preservation.

## 3. Complete references and guides
- [x] 3.1 Provide checked configuration/scenario coverage for every public card plus events/navbar; verify catalog coverage and all example configs.
- [x] 3.2 Rewrite all published guides and preserve migration, project guidance and packaging dependencies; verify internal links and affected package/example tests.

## 4. Integrated acceptance
- [x] 4.1 Inspect a complete playground flow in Chrome, fix observed defects and verify final build.
- [x] 4.2 Run focused shared-runtime regressions, sync applicable final assets to disposable HA and compare all acceptance cases with evidence.

## 5. Desktop playground refinement
- [x] 5.1 Bound desktop settings/preview panels to one viewport-based height and add an independent settings scroller with persistent tabs and actions.
- [x] 5.2 Recover desktop outline width while editing, preserve preview/drafts on exit and retain natural narrow-layout scrolling; update the playground guide.
- [x] 5.3 Build and validate the updated documentation, inspect settings scrolling and a light popup in Chrome, and record acceptance evidence.

## 6. Searchable setting choices
- [x] 6.1 Review all exposed fields and supply context-aware choices for enums, icons, entities/lists, energy formatting and other known suggested values.
- [x] 6.2 Add one themed searchable dropdown with keyboard controls, unclipped positioning and custom/multiple value preservation.
- [x] 6.3 Verify choice filtering, typed YAML and descriptor preservation with targeted assertions; build and inspect the search flow.

## Completion evidence (2026-11-02)

- Searchable settings: reviewed all public exposed field definitions. The shared picker covers catalog enums, all icon fields, entity/domain lists, compatible energy units, numeric precision/columns, periods, providers, view paths, media sources, known services/translation keys, provider identifiers and charging shortcuts; behavior/appearance/language selectors share it. Free text/colors and arbitrary structured configuration retain their appropriate editors. The locally generated 7,447-icon MDI catalog loads only on demand. Thirteen targeted editor/example/choice tests pass, including typed YAML, default clearing, filtering, explicit emptiness and descriptor/order preservation. Chrome confirmed visual icon filtering outside the settings scroller, exact-match keyboard selection updating preview/YAML, multi-selection and Escape, and numeric column export. Final build/link/search checks cover 223 pages and 163 redirects. Snapshot /private/tmp/marao-docs-searchable-settings.json excludes pre-existing work; all task changes are documentation-site assets, with no HA deployment or publication required. No full suite or device matrix was run.
- Desktop refinement: equal-height panels use a viewport-based height capped at 900px and reserve surrounding header/control space. Settings scroll between persistent tabs and export/reset actions; the mobile-width iframe fills its panel. Desktop editing recovers the page-outline width, while the existing narrow stacked layout and mounted draft/frame remain intact. Chrome confirmed scrolling to the final setting without moving the preview, YAML selection, and an operable light popup (temperature changed to 4251 K). Source review confirmed the close/reopen and narrow-layout paths; no browser width matrix was run. A general field selector was corrected so it no longer overrides the YAML editor's intended minimum height. The final production build checked 223 pages, 163 redirects, links and search; strict OpenSpec validation and diff whitespace checks pass. This task changed documentation-site files only and requires no Home Assistant deployment.
- Theme and light-popup refinement: documentation and parameter controls use Montserrat and variables generated from the canonical shipped light/dark theme, with rounded fields, switches, tabs and buttons. The preview app now matches HA's direct-body host boundary so popup inertness does not disable the dialog; popup content expands the frame and simulated color/temperature reports remain coherent. Seven targeted simulation checks pass. Chrome confirmed operable color/temperature controls, the full popup, live name editing and themed settings in both appearances. The site build and internal-link checks pass. No shipped HA assets changed.
- Quiet-preview refinement: removed service/navigation action narration, scenario helper text, duplicate preview captions and Navbar instructions. Loading, actual errors and unsupported-operation feedback remain. Six targeted simulation checks and the site build/link checks pass; Chrome confirmed that toggling the light changes its presentation without adding a label. No shipped HA assets changed.
- Preview-first refinement: editing and scenario controls are hidden on initial load. Open/Exit playground toggles them without resetting configuration or the frame. The production build, link checks and Chrome open/edit/exit flow passed; this documentation-site-only change needs no HA deployment.
- Starting dirty snapshot and source hash review preserve existing feature work; no shipped runtime, backend or editor source changed during this task. The preview adapts host boundaries at documentation build time only. Documentation/tooling-only changes require no Home Assistant deployment.
- Production build: 62 content pages; 223 HTML pages checked including 163 legacy redirects, internal destinations and Pagefind search. New site replaces the old Jekyll published tree; canonical project guidance, historical records and migration source remain.
- Fifteen focused documentation tests pass: all 37 public references/317 scenarios validate, YAML round trips preserve unknown/empty fields, invalid drafts reject, personal entity IDs retain fictional profiles, navbar exports dashboard settings, simulated service/history/event/schedule operations remain isolated, manifest requests are allowlisted, and publication rejects mismatched/prerelease tags. Existing setup-example and canonical-brand assertions also pass.
- Chrome inspection on the final local build confirmed parameter edits update the actual card, YAML synchronization, simulated light interaction, last-valid preview/disabled copy on invalid YAML, Reset and Copy YAML. In-app browser additionally confirmed Navbar Away navigation stays in the demo and exports the top-level settings block. The observed Navbar ownership and update-request defects were fixed; subsequent preview has no new warning/error entries.
- Release-only Pages workflow reviewed; no push, release or publication performed. Local preview remains at http://127.0.0.1:4321/MaraoDashboard/.
- No full suite, real-phone matrix or camera playback/transport testing. Selector plan included unchanged runtime families through test/packaging mappings; selected checks follow the reviewed task hunks rather than running those unrelated suites.
