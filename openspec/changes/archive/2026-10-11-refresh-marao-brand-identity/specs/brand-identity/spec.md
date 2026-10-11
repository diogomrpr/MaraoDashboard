# Brand identity spec delta

## Purpose

Give Marao a recognizable original mountain identity across its application and documentation, with readable branding for both large and small placements.

## ADDED Requirements

### Requirement: Original mountain identity
Marao SHALL use an original group of mountain peaks with the existing blue, navy and pale theme colors as its branding. The design SHALL preserve the name Marao and SHALL NOT reuse the supplied stock artwork or introduce a replacement product name.

#### Scenario: Full logo presentation
- **WHEN** a user views the full Marao logo
- **THEN** it presents a recognizable group of mountain peaks in the established palette and the name Marao
- **AND** it contains no stock watermark or borrowed artwork

### Requirement: Transparent wordmark and compact mark
The full logo SHALL display Marao as transparent lettering cut out across the mountain shape, without needing a locally installed font. Small branding icons SHALL use a simpler version of the same mountain silhouette without lettering that becomes illegible at their intended size.

#### Scenario: Cutout on different backgrounds
- **WHEN** the full logo appears on its supported light and dark backgrounds
- **THEN** the background shows through the letter shapes and the name remains readable

#### Scenario: Small icon rendering
- **WHEN** the brand appears as a 16px or 32px favicon or a Home Assistant sidebar icon
- **THEN** the mountain mark remains recognizable without clipped edges or unreadable lettering

### Requirement: Consistent owned branding surfaces
The same mountain identity SHALL appear in the README, documentation header, documentation landing page, favicon, integration branding, editor header, editor sidebar entry and default dashboard sidebar icon. Native integration branding SHALL provide square icons and rectangular logos with light and dark presentations on Home Assistant versions that support packaged brand images.

#### Scenario: Documentation and application comparison
- **WHEN** a user opens the repository documentation, editor and native integration information
- **THEN** each owned branding placement presents the same mountain identity in the appropriate full or compact format

#### Scenario: Default dashboard identity
- **WHEN** a dashboard is created without a user-specified icon
- **THEN** its sidebar entry uses the compact Marao mark

### Requirement: Functional icons and user choices are preserved
Branding updates SHALL preserve explicitly configured dashboard icons, existing functional device, weather, navigation and action icons, stored configuration, custom YAML, entities, routes and integration domain. Logo placement SHALL NOT add branding to every card or replace task-specific navbar icons.

#### Scenario: Existing configured icon
- **WHEN** an existing dashboard with an explicitly configured icon is loaded or saved
- **THEN** its configured icon and unrelated configuration remain unchanged

#### Scenario: Functional navigation
- **WHEN** a user navigates product pages or opens device controls after the branding update
- **THEN** their semantic icons and interactions remain unchanged

### Requirement: Readable accessible branding placement
Branding SHALL preserve readable essential text, unclipped artwork, existing control touch sizes and usable layout across the supported mobile profiles and both themes. Decorative logos beside an existing product name SHALL avoid duplicate accessible announcements; a logo that alone conveys identity SHALL have an accessible name.

#### Scenario: Mobile and enlarged text
- **WHEN** branding surfaces are viewed at 320px and representative iPhone/Android portrait and landscape sizes with normal, bold, 200% text, 200% zoom or bold plus 200% text
- **THEN** branding does not overlap titles or controls, introduce horizontal overflow or reduce interactive targets below 48px by 48px

#### Scenario: Accessible product identity
- **WHEN** the editor header presents its name alongside a decorative mountain mark
- **THEN** the existing heading conveys the product identity without a duplicate logo announcement

### Requirement: Self-contained consistent assets
Marao SHALL ship its own branding assets, provide scalable artwork for vector-capable consumers and raster exports for native integration branding, and document their editable sources and export process. Branding SHALL load without external artwork or font requests, embedded persistent credentials, broken resources or changes to existing functional icon definitions.

#### Scenario: Packaged integration assets
- **WHEN** the integration distribution is installed and the editor and sidebar first load
- **THEN** required branding files and the brand icon definition are available without missing resources or console exceptions

#### Scenario: Reproducing exports
- **WHEN** a maintainer follows the documented export process from the editable source
- **THEN** the resulting documentation images and integration images represent the same current mountain design, including transparent lettering and theme variants
