## ADDED Requirements

### Requirement: Downloaded read coverage
Energy, power, graph history, activity, weather forecasts and Plex browsing SHALL retain usable saved content, preserve its dates or folder identity, and show localized offline availability for requested data the downloaded dashboard lacks. Reconnection SHALL refresh the active selection and online failures SHALL remain visible.

#### Scenario: A requested period extends beyond the snapshot
- **WHEN** a user opens or changes a date range that has missing saved data
- **THEN** the card identifies unavailable coverage, keeps valid observations dated and permits navigation to covered periods

#### Scenario: Forecasts expire or a Plex folder was never saved
- **WHEN** forecast dates expire or an uncached folder is opened while disconnected
- **THEN** the affected surface explains the unavailable data and preserves navigation to usable content
