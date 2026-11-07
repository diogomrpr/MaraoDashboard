# Navigation and popups delta

## MODIFIED Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly in a single horizontal row, retaining circular active icons, visible 48px targets and device safe-area insets. It SHALL use one shared bottom-gap calculation for navbar positioning, fallback page clearance and popup internal padding: 24px plus the resolved bottom safe-area inset outside iPhone/iPod, preserving the existing iPhone/iPod gap of max(24px, twice the resolved bottom inset minus 40px). Insets SHALL resolve dynamically from the Marao override, locally inherited Home Assistant inset, then browser environment inset with a zero fallback; an explicit local zero SHALL remain authoritative. It SHALL remain below popups. Its spacer SHALL keep the final page card reachable above navigation. Configured route lists SHALL have no product-level count cap; destinations exceeding the available width SHALL remain reachable through the rightmost overflow toggle.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned on iPhone or iPod
- **THEN** the shared bottom gap retains max(24px, twice the resolved bottom inset minus 40px); popup cards receive the same internal bottom spacing

#### Scenario: Android reports a positive bottom inset
- **WHEN** an Android app or browser reports a resolved bottom safe-area inset of 48 CSS pixels
- **THEN** the navbar bottom sits 72 CSS pixels above the viewport bottom, leaving a 24px gap above the system navigation area

#### Scenario: The host already protects the bottom edge
- **WHEN** a non-iPhone host explicitly supplies a local bottom inset of zero, even if a lower-priority source reports a positive inset
- **THEN** the navbar retains a 24px gap without applying the lower-priority inset a second time

#### Scenario: No bottom inset is available
- **WHEN** a non-iPhone device has no positive resolved bottom safe-area inset
- **THEN** the navbar retains the existing 24px bottom gap

#### Scenario: Insets change while the dashboard is open
- **WHEN** the reported bottom inset changes on a non-iPhone device
- **THEN** navbar positioning updates to the current inset plus 24px without editing or reopening the dashboard

#### Scenario: Shared bottom clearance follows navigation
- **WHEN** the device's resolved bottom safe-area inset changes
- **THEN** the touch barrier, refresh feedback, page clearance and popup/maintenance internal padding remain consistent with the shared navbar gap
- **AND** popup content and the final page card remain reachable, without adding navbar height inside sheets that cover navigation

#### Scenario: All configured destinations fit
- **WHEN** available safe width accommodates every configured route at its full control size
- **THEN** the bar shows those routes in one row in configured order without an overflow toggle

#### Scenario: Destinations exceed the available width
- **WHEN** the configured routes exceed the number of full-size slots the bar can display
- **THEN** the rightmost slot becomes More and preceding slots show the initial configured routes
- **AND** every remaining route is in the overflow menu exactly once, without wrapping the horizontal bar, shrinking targets or truncating the saved list

#### Scenario: Only one control fits
- **WHEN** the available safe width fits one control and there are multiple routes
- **THEN** the bar contains the overflow toggle and all routes remain reachable in its menu
