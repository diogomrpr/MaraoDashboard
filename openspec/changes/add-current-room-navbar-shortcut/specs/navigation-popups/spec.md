# Spec Delta

## MODIFIED Requirements

### Requirement: Floating navbar
The navbar SHALL float compactly in a single horizontal row, retaining circular active icons, visible 48px targets and iPhone safe-area insets. It SHALL use one shared bottom-gap calculation for navbar positioning, fallback page clearance and popup internal padding: at least twice the previous gap, with a 24px minimum and twice the lowered safe-area offset on iPhone. It SHALL remain below popups. Its spacer SHALL keep the final page card reachable above navigation. Configured route lists SHALL have no product-level count cap; destinations exceeding the available width SHALL remain reachable through the rightmost overflow toggle. When Current room is enabled, its first slot SHALL be reserved before partitioning ordinary routes, except at one-slot widths where More SHALL expose the location entry and every ordinary route.

#### Scenario: A phone has a home-indicator inset
- **WHEN** the navbar is positioned
- **THEN** the shared bottom gap is at least 24px and at least twice the lowered device-derived offset; popup cards receive the same internal bottom spacing

#### Scenario: All configured destinations fit
- **WHEN** available safe width accommodates every configured route and any reserved location slot at full control size
- **THEN** the bar shows the location slot when enabled followed by ordinary routes in configured order without an overflow toggle

#### Scenario: Destinations exceed the available width
- **WHEN** configured routes exceed the full-size slots remaining after any reserved location slot
- **THEN** the rightmost slot becomes More and preceding ordinary slots show the initial configured routes
- **AND** every remaining ordinary route is in the overflow menu exactly once, without wrapping the horizontal bar, shrinking targets or truncating the saved list

#### Scenario: Only one control fits
- **WHEN** available safe width fits one control and there are multiple destinations including any enabled location entry
- **THEN** the bar contains More and all destinations remain reachable in its menu

## ADDED Requirements

### Requirement: Automatic location identity
An enabled Current room shortcut SHALL resolve the signed-in HA user to exactly one linked person, unless a local override is selected. Missing or ambiguous account links SHALL retain a disabled placeholder and SHALL NOT guess identity from names or other users. Account changes SHALL immediately invalidate the preceding identity and location.

#### Scenario: Two owners use the same dashboard
- **WHEN** two accounts each have a unique linked person and configured Bermuda sensor
- **THEN** each client resolves its own person's room using the shared dashboard settings

#### Scenario: Identity cannot be resolved
- **WHEN** no person or multiple persons match the account, or identity is still loading
- **THEN** the slot remains present with the appropriate localized description and no room/Away navigation

### Requirement: Local person override
Users SHALL be able to select an explicit person for this browser and return to Automatic without administrator dashboard writes. Overrides SHALL be scoped to the HA origin, dashboard and signed-in account; changing one client SHALL NOT change another. A missing override target SHALL disable location navigation until corrected rather than silently following someone else.

#### Scenario: A shared tablet follows a selected person
- **WHEN** a user selects another person through local location preferences
- **THEN** this client follows that person's configured sensor, retains the choice across reloads when storage is available, and leaves shared settings and other clients untouched

#### Scenario: Returning to automatic identity
- **WHEN** the user selects Automatic
- **THEN** the override is removed and the linked person for the current account is resolved again

#### Scenario: Local storage is unavailable
- **WHEN** a local choice cannot be persisted
- **THEN** it applies for the current session with readable persistence feedback and no shared-setting write

### Requirement: Bermuda room destinations
Current room SHALL consume the selected person's configured Bermuda Area sensor and match its current `area_id` to an explicitly configured page in the active dashboard. The shortcut SHALL use the destination page's name/icon with localized fallbacks, update from HA state and navigate once on explicit activation only. It SHALL NOT infer current location from registry assignment or last-seen history.

#### Scenario: The person moves between mapped rooms
- **WHEN** the current Area sensor changes to another mapped area while presence is home
- **THEN** the shortcut updates its label, icon and target without changing the current page, saved routes or neighboring slot positions
- **AND** tapping opens the currently resolved page once with existing navigation haptics

#### Scenario: An area has no usable destination
- **WHEN** a detected area has no mapping or its page was deleted
- **THEN** the slot remains present and disabled with a localized explanation rather than creating or guessing a page

### Requirement: Stable location fallback and Away page
The enabled location slot SHALL persist through loading, unknown, unavailable, unmapped and away states. No usable room SHALL show a neutral away-style icon with a state-specific accessible name. An optional Away destination SHALL activate only for a valid selected person reporting `not_home` or a named non-home zone. Unknown/unavailable identity, presence, room data or disconnection SHALL NOT by themselves enable Away navigation.

#### Scenario: Presence confirms away
- **WHEN** the selected person's authoritative presence reports outside home and a valid Away page is configured
- **THEN** the slot shows Away and tapping opens that page, even if the room sensor retains a previous room

#### Scenario: Room detection is lost while home
- **WHEN** presence reports home but Bermuda reports no current area, unknown or unavailable
- **THEN** the neutral placeholder stays disabled and does not offer the Away destination

#### Scenario: There is no Away destination
- **WHEN** presence confirms away but no valid Away page is configured
- **THEN** the Away placeholder remains visible and disabled

#### Scenario: Presence or connection is unavailable
- **WHEN** selected presence is unknown/unavailable or HA is disconnected
- **THEN** location navigation is disabled without showing the last room as an actionable current location

### Requirement: Additive location configuration
Administrators SHALL configure location enablement, person-to-sensor associations, area-to-page mappings and an optional Away page through shared Marao settings. Omitted configuration SHALL preserve existing navigation. Saves SHALL retain ordinary route order, explicit emptiness, unknown fields and unrelated dashboard content, reject invalid configuration without writing and retain existing stale-save protection.

#### Scenario: Existing settings are edited
- **WHEN** location configuration is added, changed or disabled on a dashboard with custom routes and unrelated native content
- **THEN** those fields remain unchanged, cancellation leaves stored settings untouched, and disabling restores ordinary route partitioning

#### Scenario: Invalid or stale settings are saved
- **WHEN** a location mapping is malformed, settings are newer than supported or another client changed the dashboard
- **THEN** Save reports an error without replacing saved content or inventing defaults
