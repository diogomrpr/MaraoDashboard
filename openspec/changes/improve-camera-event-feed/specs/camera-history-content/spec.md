# Spec Delta

## ADDED Requirements

### Requirement: Filterable full-width camera event timeline
Camera event lists SHALL use one full-width column with a compact timestamp and event-type heading outside and above each preview. A localized All filter and filters for available event types SHALL remain reachable at the top of the events section while scrolling. Filters SHALL apply to the complete bounded metadata list before progressive display, preserve provider order, and expose their selected state.

#### Scenario: Filtering events beyond the first visible batch
- **WHEN** the user selects an event type represented only among older loaded metadata
- **THEN** matching events appear in the feed in provider order without requiring other types to be scrolled past
- **AND** each preview has its timestamp and type above it, outside the media

#### Scenario: Narrow phone filter bar
- **WHEN** available event types exceed the screen width
- **THEN** the bar scrolls horizontally with full-size touch controls and its selected filter remains usable

### Requirement: Progressive event previews with stable navigation
The event feed SHALL reveal older entries in small batches and load preview media only near the viewport, with reserved preview space. Existing configured limits SHALL remain the total maximum. Returning from detail SHALL restore filter and feed position. Pending work SHALL be bounded, deduplicated, and invalidated on replacement, refresh, disconnection or removal; failed previews SHALL remain readable without automatic retry loops.

#### Scenario: Opening a populated event feed
- **WHEN** the provider returns event metadata
- **THEN** the feed becomes usable without waiting for all preview URLs to resolve
- **AND** offscreen previews are deferred until approached and older entries are progressively revealed within the configured maximum

#### Scenario: Returning from an older filtered event
- **WHEN** the user opens an event after filtering and scrolling, then activates Back
- **THEN** the same filter, revealed entries and scroll position are restored

#### Scenario: Preview finishes after refresh or removal
- **WHEN** a deferred preview request finishes after its feed was replaced or disconnected
- **THEN** it cannot alter the current feed or start further requests
