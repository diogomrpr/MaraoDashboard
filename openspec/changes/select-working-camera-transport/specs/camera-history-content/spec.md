## ADDED Requirements

### Requirement: Authorized camera transport fallback
Camera cards SHALL retain working HA-native live playback and SHALL try a compatible authorized provider live path for the selected camera after playback failure or a bounded wait without advancing video. Inline, popup and preload consumers SHALL share selection and cleanup. Source identity SHALL be positively associated with the selected camera; clients SHALL NOT guess other entities, embed credentials or alter server security.

#### Scenario: Native playback advances
- **WHEN** the native video advances
- **THEN** it remains selected without probing a provider or replacing its player

#### Scenario: Native playback fails for a Frigate camera
- **WHEN** the native player fails or times out and that camera advertises a usable authenticated Frigate MSE path supported by the browser
- **THEN** the failed player is released and the same camera plays through that path
- **AND** live success requires advancing video rather than an image, recording flag or transport handshake

#### Scenario: All paths fail
- **WHEN** all eligible live paths fail or time out
- **THEN** the card explicitly labels its snapshot/error and offers the existing retry
- **AND** no exhausted path loops on unrelated state updates

#### Scenario: Camera changes or the owner leaves
- **WHEN** the selected camera changes or playback becomes ineligible
- **THEN** native sessions, sockets, buffers, timers and URLs are released and late work cannot mount media
