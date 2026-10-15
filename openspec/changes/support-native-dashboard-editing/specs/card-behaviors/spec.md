## ADDED Requirements

### Requirement: Standalone native detail parity
Native cards SHALL own automatic detail sheets with existing media, climate, alarm, access, camera, group and history behavior. Duplicate cards SHALL have independent automatic sheets; explicit external popup references SHALL not create extra sheets.

#### Scenario: Duplicate media cards open details
- **WHEN** differently configured instances are opened
- **THEN** each exposes its own remote and app options without popup collisions

### Requirement: Inert native previews
Native previews and edit mode SHALL prevent service dispatch and fullscreen effects while preserving readable authoritative state. Published security gestures and transient PIN clearing SHALL remain unchanged outside previews.

#### Scenario: An access control is previewed
- **WHEN** gestures are attempted in an editor preview
- **THEN** no physical service is dispatched and the native editor remains usable
