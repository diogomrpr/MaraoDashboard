## ADDED Requirements

### Requirement: Optional cache reset shortcut
The dashboard editor SHALL offer a General toggle labelled Show cache reset button. The optional boolean `show_cache_reset` SHALL preserve explicit false through Visual/JSON editing, save and generation. Missing settings SHALL retain the enabled behavior without migration. Native navbar editing SHALL expose the equivalent option.

#### Scenario: Administrator disables the shortcut
- **WHEN** the administrator disables the toggle and saves
- **THEN** navigation configuration contains `show_cache_reset: false`
- **AND** unrelated dashboard fields remain unchanged

#### Scenario: An existing configuration omits the option
- **WHEN** the editor opens the configuration
- **THEN** the toggle is enabled by default
- **AND** opening the editor alone does not alter the source
