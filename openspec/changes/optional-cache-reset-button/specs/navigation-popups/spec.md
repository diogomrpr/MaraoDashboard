## ADDED Requirements

### Requirement: Configurable main-page cache reset visibility
The shared navbar SHALL render the main-page cache reset row only when `show_cache_reset` is not false. Disabling it SHALL remove both the button and its reserved row. Automatic refresh and navbar-hold recovery SHALL remain available.

#### Scenario: The shortcut is disabled
- **WHEN** the main page is displayed with `show_cache_reset: false`
- **THEN** neither the button nor its top spacing is rendered

#### Scenario: The shortcut is enabled
- **WHEN** the option is true or omitted
- **THEN** the existing button is available only on the main page and scrolls with its content
