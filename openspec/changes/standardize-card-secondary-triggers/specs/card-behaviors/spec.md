# Spec Delta

## ADDED Requirements

### Requirement: Compact secondary information entry points
Builder-supported secondary history and detail openers SHALL use semantic icon controls following the light-color icon-circle pattern, without an extra full-width text-button row. History SHALL use a chart indicator and a localized accessible name. Controls SHALL retain at least 48 by 48 CSS pixels and stop activation from invoking the primary card action. Readable problem reasons SHALL remain visible.

#### Scenario: A switch exposes power history
- **WHEN** its power graph is enabled through the builder with a configured source
- **THEN** tapping its history icon opens that source's existing history sheet without toggling the switch
- **AND** no large History row is rendered

#### Scenario: A climate or toggle-graph card exposes history
- **WHEN** a builder-supported temperature graph or toggle graph is displayed
- **THEN** the same compact history entry pattern opens its configured numeric source
- **AND** mode selection, setpoints and the related toggle action remain independent

#### Scenario: Additional error information is available
- **WHEN** a project-owned card offers an extra Details opener alongside a readable problem reason
- **THEN** the opener uses a compact named information icon instead of a large textual detail button
- **AND** the reason and recovery actions remain visible and reachable even when the device action is disabled

### Requirement: Compatible default secondary hold
Cards with a builder-supported history detail SHALL offer the same cancellable 600 ms default body hold used for light colors, only where no explicit hold action or mandatory security gesture exists. Short taps SHALL retain primary behavior. Opening a secondary view SHALL consume release and synthesized click without dispatching the primary action. Explicit holds, including no-op holds, and hidden-icon choices SHALL remain preserved.

#### Scenario: A switch history hold completes
- **WHEN** the user holds its usable card for 600 ms without scrolling and no explicit hold is configured
- **THEN** its history opens once without toggling the switch on release or synthesized click

#### Scenario: The gesture becomes scrolling
- **WHEN** movement, pointer cancellation, navigation, hiding or loss of the relevant history source interrupts the default hold
- **THEN** no history sheet or primary device action is triggered by that cancelled interaction

#### Scenario: An explicit hold or hidden icon is configured
- **WHEN** a card has a custom hold action, an explicit no-op hold, or hidden-icon configuration
- **THEN** those choices remain unchanged without forced visible icons or rewritten actions
- **AND** a hidden history icon leaves the default hold available only when it has not been explicitly overridden

### Requirement: Secondary triggers respect exposed capabilities
This change SHALL apply history-trigger changes only to switch and climate history offered by the builder and dedicated graph/toggle-graph cards. Light color behavior SHALL remain unchanged. It SHALL add no light-history controls, Color/History chooser or history options for other families. Primary actions, security gestures, selectors, period navigation, content items, recovery and pagination SHALL retain their roles.

#### Scenario: A normal light or sensor card is rendered
- **WHEN** the builder offers no history configuration for that family
- **THEN** this change adds no history trigger or new history setting
- **AND** a capable light's icon and default hold continue to open its color picker directly

#### Scenario: The full card catalog is audited
- **WHEN** a visible control operates a device, selects a value, navigates a primary destination, retries a failure or loads more content
- **THEN** it is retained in that role rather than replaced with a secondary-info gesture
- **AND** access open/unlock remains strict-slide-only and risky security holds keep their existing duration
