## ADDED Requirements

### Requirement: Stable card geometry across state changes
Marao-owned dashboard and popup cards SHALL keep their configured layout footprint
across loading, ordinary state updates, availability problems, reported errors and
recovery at a constant width and text size. Secondary feedback SHALL replace
existing content instead of appending rows. Loading SHALL reserve useful content
with placeholders. Cards SHALL remain compact and reflow for viewport, typography
and explicit configuration changes without shrinking touch controls.

#### Scenario: An entity becomes unavailable
- **WHEN** a previously rendered entity loses availability
- **THEN** a concise unavailable label replaces unnecessary details
- **AND** its card keeps its dimensions and actions remain guarded

#### Scenario: Asynchronous data arrives
- **WHEN** loading finishes or fails
- **THEN** the content replaces a matching placeholder without shifting later cards

#### Scenario: A message is longer than the compact slot
- **WHEN** an error exceeds its normal space
- **THEN** the compact card provides full details on tap without growing

#### Scenario: The user explicitly reveals more content
- **WHEN** the user loads more camera events or changes card configuration
- **THEN** the relevant content may reflow; background state updates do not grow it

#### Scenario: Compact choice and event controls
- **WHEN** a climate, weather or camera-events card renders
- **THEN** climate modes use the themed dropdown and forecasts use one scrolling row
- **AND** the event viewer retains a bounded scrolling viewport while individual previews load
