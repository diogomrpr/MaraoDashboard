## ADDED Requirements

### Requirement: Backend availability in a downloaded companion
Service controls SHALL use the optional read-only `window.__dashboardConnection` value and `dashboard-connection-changed` event when present. A connecting or offline backend SHALL prevent device commands and successful command feedback. Ordinary Home Assistant pages SHALL retain native connection checks.

#### Scenario: Replay keeps the local socket open
- **WHEN** the companion backend disconnects while saved entity states remain readable
- **THEN** commands are disabled, saved data and navigation remain usable, and reconnect enables eligible controls without replaying an interaction
