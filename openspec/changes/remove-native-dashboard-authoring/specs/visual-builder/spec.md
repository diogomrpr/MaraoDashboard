## ADDED Requirements

### Requirement: Generator-only supported authoring
Marao SHALL support authoring through its visual/JSON builder and generator. It SHALL NOT offer Marao entries in Home Assistant's native card picker, standalone configuration editors, entity suggestions or the Community dashboard starter.

#### Scenario: Native dashboard builder discovery
- **WHEN** a user opens Home Assistant's card picker or dashboard creation interface after loading the current Marao resources
- **THEN** no Marao card-picker entries, entity suggestions or Community starter are advertised
- **AND** no Marao standalone configuration form is supplied

#### Scenario: Generator editing remains available
- **WHEN** an administrator edits supported configuration through Marao's visual or JSON builder and generates a dashboard
- **THEN** the editor preserves supported fields and produces the existing generated card and popup contracts
- **AND** camera form helpers, validation and localization remain available

### Requirement: Explicit standalone card retirement
The discontinued `custom:marao-native-*` card types and starter strategy SHALL be unsupported without a compatibility renderer or automatic conversion. Their saved configurations SHALL remain untouched. Surviving shared renderers SHALL remain available to generated dashboards without an authoring-origin restriction.

#### Scenario: Existing standalone dashboard
- **WHEN** a saved dashboard references a removed native card type after upgrade
- **THEN** Marao does not register or render that removed type
- **AND** its saved configuration is not deleted, rewritten or converted

#### Scenario: Generated runtime remains usable
- **WHEN** a user opens a generated dashboard and interacts with its supported cards
- **THEN** shared rendering, generated detail sheets, navigation, theme and camera playback remain functional
- **AND** the runtime does not require standalone wrapper or configuration-editor modules

#### Scenario: Protected custom content references a removed type
- **WHEN** the generator preserves raw or protected custom content containing a discontinued native card reference
- **THEN** it preserves that content under the existing ownership rules
- **AND** preservation does not restore support for rendering the discontinued type
