## ADDED Requirements

### Requirement: Dashboard language and regional formatting
Marao-owned card and editor copy SHALL support English and Portuguese (Portugal). Text SHALL follow the Home Assistant interface language, with English fallback for an unsupported language. Number and date formatting SHALL respect the Home Assistant locale and explicit formatting preferences. Regionless Portuguese formatting SHALL use Portuguese (Portugal).

#### Scenario: A Portuguese Home Assistant profile opens Marao
- **WHEN** Home Assistant supplies Portuguese through its language or locale settings
- **THEN** Marao-owned labels, states, actions, instructions, accessible names, and error summaries use European Portuguese
- **AND** a regionless Portuguese formatting locale uses Portuguese (Portugal)

#### Scenario: A dashboard has user-authored names
- **WHEN** a different language displays a saved dashboard
- **THEN** its built-in interface uses the selected supported language and configured names and labels retain their saved spelling
