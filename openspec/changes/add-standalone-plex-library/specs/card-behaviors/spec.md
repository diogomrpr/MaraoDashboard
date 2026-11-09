## ADDED Requirements

### Requirement: Independently configurable Plex library
Marao SHALL expose `custom:marao-plex-library-card` in the native card picker and native editor, with Apple TV selection and Plex setup. It SHALL reuse the shared Plex renderer and playback/availability/cancellation/privacy contracts. Full inline shelves and a compact opener with owned full-library popup SHALL both work without a Media player card. Existing Media-owned Plex configurations SHALL retain their behavior and data without migration.

#### Scenario: Add a library directly
- **WHEN** the user adds Plex library and configures an Apple TV with Plex or Rivulet
- **THEN** only the library is rendered, in the chosen inline or popup layout
- **AND** no Media player or remote controls are required

#### Scenario: Existing Media configuration is retained
- **WHEN** an existing Media card has apple_tv.plex configured
- **THEN** its library remains present and all saved options and unknown fields remain unchanged

#### Scenario: Documentation exports the real public card
- **WHEN** the user previews or copies a Plex library example
- **THEN** the gallery uses the standalone native card and exported YAML uses its public type
