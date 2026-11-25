## ADDED Requirements

### Requirement: Fast dashboard camera startup

Camera tiles SHALL retain a lightweight snapshot during startup, choose an eligible source without opening concurrent streams, and try an alternative after a short bounded wait. The selection SHALL consider recent successful decoded-frame startup for the same source and browser session.

#### Scenario: A Frigate camera supports go2rtc

- **WHEN** the tile starts without a recent successful transport preference
- **THEN** its authorized Frigate transport is attempted before native Home Assistant playback

#### Scenario: A configured low source fails

- **WHEN** the configured alternate fails or does not advance video within the short startup window
- **THEN** the failed player is released and the card tries the primary camera
- **AND** the original event entity and independent popup video are preserved

### Requirement: Optional camera quality and source

Native editing and YAML SHALL support Auto, Low, and High. Auto and Low SHALL prefer an explicitly configured low source where eligible, while High SHALL use the primary entity. Omitted fields SHALL remain valid and SHALL NOT require migration.

#### Scenario: A card has no advertised or configured variant

- **WHEN** the user selects Low
- **THEN** the card remains usable with its primary camera source instead of guessing a substream or claiming to resize the stream
