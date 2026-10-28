## ADDED Requirements

### Requirement: Main-page shortcut settings and alternative guidance
General settings SHALL place Show editor button beside Show cache reset button with localized guidance describing the three-second navbar Maintenance alternative. The optional `show_editor_button` field SHALL accept only booleans, default to enabled when omitted, preserve explicit false through Visual/JSON and native conversion/compilation, and appear in JSON schema. Merely opening settings SHALL not write defaults or change saved source.

#### Scenario: Existing source omits the new flag
- **WHEN** a released supported source is opened or converted without `show_editor_button`
- **THEN** the editor toggle displays enabled while the original source omission and unrelated fields remain intact until an explicit edit

#### Scenario: User hides the editor shortcut
- **WHEN** the user disables Show editor button and saves
- **THEN** false survives editor round trips and compilation and hides only the pencil shortcut
- **AND** the adjacent cache toggle and navbar hold behavior remain independent

#### Scenario: Guidance and invalid values
- **WHEN** General settings are displayed in English or Portuguese
- **THEN** both toggles and the three-second navbar alternative have localized names and guidance
- **WHEN** the new flag has a non-boolean value
- **THEN** validation rejects it without replacing the source
