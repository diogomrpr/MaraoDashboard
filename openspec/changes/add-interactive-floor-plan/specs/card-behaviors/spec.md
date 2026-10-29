# Spec Delta

## ADDED Requirements

### Requirement: Image-backed floor-plan light controls
The Floor Plan card SHALL display the configured image with image-relative light buttons and optional strip paths. Each button SHALL toggle only its bound light once per completed activation, use strong haptics and show HA's current state. Runtime image/path interaction SHALL NOT reposition controls or dispatch entity actions.

#### Scenario: Toggle one light
- **WHEN** the user presses an available floor-plan light button
- **THEN** one toggle call targets that exact light, without toggling another light or navigating
- **AND** its button and any strip reflect subsequent authoritative HA updates, including changes initiated elsewhere

#### Scenario: Observe state without relying on color
- **WHEN** a light changes between on and off
- **THEN** its button has a distinct icon or shape treatment as well as state color and a localized accessible current-state name
- **AND** a substantive custom label is retained

### Requirement: Floor-plan strip state rendering
A configured strip SHALL follow its light's authoritative state: off uses a dim visible path, on uses an illuminated line with a soft glow. Valid reported brightness SHALL influence illumination and supported reported color SHALL influence its color. Missing brightness/color SHALL use a stable theme fallback without inventing measurements.

#### Scenario: A colored dimmable strip changes remotely
- **WHEN** HA reports a new on-state brightness and converted color for its light
- **THEN** that strip updates its intensity/color in place while its geometry and button position stay unchanged
- **AND** on/off button state remains distinguishable even at low brightness

#### Scenario: The strip light has no color support
- **WHEN** an on/off-only light or a light lacking usable color metadata is assigned a strip
- **THEN** it uses the theme's active illumination and available authoritative brightness, without missing-color errors or synthetic colors

### Requirement: Floor-plan failures and unavailable lights
Missing, unknown, unavailable and disconnected lights SHALL use disabled neutral button feedback and neutral dashed strip paths. Available lights on the same plan SHALL remain usable. Reported action errors SHALL be readable without discarding the image or geometry. Image loading/failure SHALL be distinct, with explicit retry after failure and no automatic request loop.

#### Scenario: One light is unavailable
- **WHEN** a configured light becomes unknown, unavailable or absent, or HA disconnects
- **THEN** its button cannot dispatch and any strip loses its on-state glow in favor of unavailable feedback
- **AND** other available lights remain operable when HA is connected

#### Scenario: An action or image load fails
- **WHEN** HA rejects a toggle or the image cannot be loaded
- **THEN** readable localized feedback identifies the failure and retains the complete card configuration
- **AND** image retry is explicit and successful recovery restores the current plan without changing button positions

### Requirement: Responsive floor-plan geometry and usable controls
The image SHALL preserve its aspect ratio without cropping, with overlays mapped to its actual displayed bounds. Buttons SHALL remain visibly at least 48 by 48 CSS pixels, contained and operable after resizing/rotation. A localized Lights list SHALL keep every configured toggle reachable when overlays overlap, without moving their saved anchors.

#### Scenario: Rotate a phone or resize the card
- **WHEN** the plan changes between portrait, landscape or an ordinary card width
- **THEN** strip points and button anchors remain aligned to the same image locations and controls remain contained
- **AND** artwork and labels do not obscure the navbar or create horizontal page overflow

#### Scenario: Button placements are too close for a small screen
- **WHEN** touch-sized buttons overlap in the available image area
- **THEN** an accessible Lights action provides the same ordered, live-state toggles with full-size targets
- **AND** opening and closing the list follows existing popup focus, scrolling and navbar-clearance contracts
