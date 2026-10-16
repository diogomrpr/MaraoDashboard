# Spec Delta

## MODIFIED Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly, auto-scale for at most six routes, retain
circular active icons and visible 48px targets, and use iPhone safe-area insets.
It SHALL preserve the accepted lowered iPhone offset and remain below popups.
Its spacer SHALL keep the final page card reachable above navigation.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned
- **THEN** device-derived safe-area clearance is used without adding an unrelated universal bottom gap

#### Scenario: Six routes fit horizontally
- **WHEN** the available safe width accommodates six full-size links with their padding and gaps
- **THEN** all six appear in configured order in one compact floating row with circular active icons

#### Scenario: Six routes need more than one row
- **WHEN** six routes cannot fit in the available safe width
- **THEN** the navbar uses balanced rows without shrinking controls, hiding destinations or requiring horizontal scrolling
- **AND** normal 320px presentation uses three links per row while narrower zoomed layouts can reflow further

#### Scenario: Navigation changes height
- **WHEN** wrapping, zoom, orientation or available width changes the navbar height
- **THEN** page clearance updates to keep the last control reachable above it without waiting for a periodic refresh
- **AND** popups remain layered above the bar with usable internal scrolling and close controls

## ADDED Requirements

### Requirement: Consistent navbar capacity across hosts
Generic and native Marao navbar cards SHALL accept up to six configured routes and reject more than six with a localized readable error, without truncation. Empty navigation and existing route fields SHALL retain their behavior. Native preview SHALL remain non-navigating, ordinary HA dashboards SHALL retain their shell and administrator editing SHALL remain outside the six route entries.

#### Scenario: A native navbar has six routes
- **WHEN** its Visual or YAML configuration contains six valid entries
- **THEN** the editor, read-only compiler and renderer retain all six in order
- **AND** the separate administrator Edit control does not replace an entry

#### Scenario: A seventh route is configured
- **WHEN** more than six routes reach a generic or native navbar configuration path
- **THEN** the configuration reports the six-route limit instead of rendering only a subset

#### Scenario: Previewing or leaving a navbar
- **WHEN** the native preview is used or navigation leaves its dashboard
- **THEN** preview cannot navigate and the existing shell ownership/restoration behavior is preserved
