# Spec Delta

## ADDED Requirements

### Requirement: Selectable Plex library presentation
Enabled Plex libraries SHALL support `apple_tv.plex.display` values `inline` and `popup`. Omission SHALL preserve existing full shelves. Popup mode SHALL show the approved compact upper composition with real poster references, TV name, title and content reference, without counters or a lower strip. Opening it SHALL show all three shelves in the shared popup without requesting playback.

#### Scenario: Preserve an existing configuration
- **WHEN** an existing Plex configuration omits display or its other settings are edited
- **THEN** full shelves and all bindings, unknown fields and unrelated settings remain preserved

#### Scenario: Choose popup presentation
- **WHEN** the user selects Popup in Plex setup and saves the card
- **THEN** the owned library becomes a compact opener
- **AND** tapping it opens the complete library with the selected TV mapping and no playback command

#### Scenario: Reject an unsupported layout
- **WHEN** display contains any value other than inline or popup
- **THEN** shared validation reports a localized configuration error

### Requirement: Shelf-local Plex failures
Library request and artwork failures SHALL remain local to their affected shelf with a readable error and explicit Retry. Healthy and empty shelves SHALL retain normal styling. Failure of the library root SHALL create an error for each of Continue Watching, Movies and TV Series without applying a red surface to the library or compact opener.

#### Scenario: One shelf fails
- **WHEN** Movies fails while Continue Watching and TV Series load
- **THEN** only Movies has error styling and Retry while healthy shelves remain usable

#### Scenario: All shelves fail
- **WHEN** the library root request fails
- **THEN** each of the three shelves shows its own error and Retry inside a neutral library surface
