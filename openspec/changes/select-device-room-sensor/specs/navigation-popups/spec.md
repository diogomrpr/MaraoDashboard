# Spec Delta

## ADDED Requirements

### Requirement: Explicit client Area sensor selection
An administrator SHALL select a current Area sensor for this browser/WebView in Marao dashboard settings without configuring a person or shared person-to-sensor association. The selection SHALL apply only to the current client scope, independently of shared dashboard Save/Cancel. Missing or invalid sensor references SHALL remain visible and repairable rather than being replaced automatically.

#### Scenario: An iPhone account has no linked person
- **WHEN** an administrator whose account has no linked person opens Current room settings on an iPhone and selects `sensor.iphonix_area`
- **THEN** that browser/WebView uses the selected sensor directly when shared Current room is enabled
- **AND** an empty or absent shared person mapping does not prevent selection or resolution

#### Scenario: A local choice is made alongside shared edits
- **WHEN** the administrator selects a local sensor and then closes settings without saving an edited shared room/page mapping
- **THEN** the local sensor choice remains applied while the unsaved shared draft is discarded
- **AND** the local choice sends no shared dashboard save or entity service call

#### Scenario: A selected sensor is deleted or invalid
- **WHEN** an authored local sensor reference is missing, malformed or unavailable
- **THEN** settings display its saved reference and localized correction guidance with a neutral shortcut
- **AND** the administrator can intentionally correct or clear it without selecting a person or silently following a different sensor

### Requirement: Device sensor is authoritative for room resolution
Explicit device-sensor mode SHALL use only the selected sensor's current `attributes.area_id` and the shared room/page mapping to determine its room. Person matching, account-person linkage, person presence, legacy overrides and Away destinations SHALL NOT gate or override this mode. Sensor mode SHALL NOT infer current room from registry assignment, location history or another entity.

#### Scenario: Person presence contradicts a valid device reading
- **WHEN** the selected sensor reports a usable mapped area while an account-linked person reports Away, unknown or unavailable
- **THEN** the shortcut resolves the selected sensor's mapped page
- **AND** no person lookup is required and no person-based Away destination replaces it

#### Scenario: There are no person entities
- **WHEN** the client has an explicit selected Area sensor and HA exposes no person entities or person records
- **THEN** valid sensor state and a room/page mapping remain sufficient for room resolution
- **AND** failure or absence of the person-list API has no effect on this mode

#### Scenario: Direct sensor mode loses its room reading
- **WHEN** its selected sensor becomes missing/unknown/unavailable, its current area ID is unusable, or its area has no valid page
- **THEN** the shortcut remains a neutral disabled placeholder for that unresolved stage
- **AND** it does not substitute a previous room, legacy person source or Away page

### Requirement: Browser-scoped durable sensor preferences
The client preference SHALL persist across reloads and normal browser/app/HA restarts while the same browser/WebView storage survives. Scope SHALL include HA origin, dashboard and signed-in account within that storage context; the account is a privacy namespace, not location identity. Independent client storage contexts SHALL retain independent selections even when their HA account is identical.

#### Scenario: Two devices share one account
- **WHEN** an iPhone and tablet use the same HA origin, account and dashboard but select different Area sensors in separate browser/WebView storage contexts
- **THEN** each follows its own selected sensor and changing one does not overwrite the other

#### Scenario: A browser or app is reopened
- **WHEN** the client reloads, restarts its browser/Companion app, or reconnects after an HA restart with its storage intact
- **THEN** the same sensor selection is restored without person setup or reselection

#### Scenario: The account or dashboard changes
- **WHEN** the signed-in account, HA origin or dashboard changes
- **THEN** the preceding scope's selection and late callbacks cannot affect the new scope
- **AND** returning to the original scope reads its own retained preference

#### Scenario: Two tabs share the same client storage
- **WHEN** a deliberate preference update is made in another tab sharing the same storage area and preference scope
- **THEN** other active tabs reconcile to the current saved preference without affecting other scopes
- **AND** separate tabs are not misrepresented as independently identified physical devices

### Requirement: Honest storage identity and persistence feedback
Settings SHALL explain that the association belongs to this browser/WebView storage context, not a globally identified physical device. Separate browsers, profiles, app storage and origins SHALL require separate selection. Storage denial/failure SHALL produce readable persistence feedback; a deliberate memory-only choice SHALL never be represented as durably saved or copied into shared dashboard configuration.

#### Scenario: Local persistence fails
- **WHEN** the administrator selects a sensor but browser storage cannot retain the update
- **THEN** the deliberate choice can apply for the current document lifetime with clear until-reload feedback
- **AND** any preceding durable value remains unchanged and no shared save is used as a persistence substitute

#### Scenario: Preferences cannot be read
- **WHEN** storage access fails and no deliberate in-memory choice exists for the active scope
- **THEN** the shortcut is neutral and settings explain the storage problem
- **AND** failure to read a possible device selection does not silently enable person tracking

#### Scenario: Site data or browser context changes
- **WHEN** site/app data is cleared or the user opens another browser/profile/origin
- **THEN** Marao does not claim that the physical device automatically retains or transfers the old association
- **AND** setup guidance explains the storage boundary and the need to select the intended sensor again

### Requirement: Explicit clear and legacy restoration
Clearing/resetting a direct client sensor choice SHALL leave an explicitly unconfigured neutral source for that scope, without silently activating person tracking or another sensor. Returning to released person tracking SHALL require a deliberate legacy-mode choice after direct-mode opt-in. Only this client's scoped preference SHALL change; shared mappings, legacy values and unrelated browser data SHALL remain intact.

#### Scenario: A device sensor is cleared
- **WHEN** an administrator clears the selected sensor or resets this client's selection
- **THEN** the slot becomes a neutral unconfigured placeholder immediately and remains so after reload
- **AND** an existing person override or automatic account link does not become active as a side effect

#### Scenario: Legacy tracking is deliberately restored
- **WHEN** the administrator explicitly selects legacy person tracking
- **THEN** the preserved released person choice/automatic association and its existing presence/Away rules apply
- **AND** this mode is visibly identified as legacy and does not claim to identify the viewing physical device

### Requirement: Lossless compatibility for released location preferences
Upgrading SHALL preserve exact shared person/room/Away configuration and legacy local person values without automatic person-to-device conversion. A client with no new preference and readable legacy state SHALL retain its released behavior until explicit opt-in. New preferences SHALL be versioned, preflighted and recoverable; malformed or unsupported records SHALL never silently fall back to person resolution.

#### Scenario: An existing v0.28.1 client is upgraded
- **WHEN** the client has released shared mappings and a stored person override but no direct-sensor preference
- **THEN** its existing behavior and exact saved values remain unchanged and are labelled legacy
- **AND** no direct sensor is inferred, assigned to another client or written on read

#### Scenario: A client opts into sensor mode
- **WHEN** the administrator explicitly selects a device Area sensor
- **THEN** the new local preference takes precedence while existing person keys, shared mappings and unrelated authored content remain unchanged
- **AND** recoverable prior local state is retained before replacement, with failed writes leaving durable state intact

#### Scenario: Released Automatic has no local person key
- **WHEN** shared legacy person mappings exist but the client has neither a new preference nor a stored legacy person override
- **THEN** the released Automatic path is identified as legacy compatibility and the direct sensor selector remains unselected
- **AND** no sensor is prefilled, assigned to the viewing device or persisted from that person's mapping

#### Scenario: A preference record is unsupported or malformed
- **WHEN** a newer unsupported preference version or malformed preference is encountered
- **THEN** resolution stays neutral with readable recovery guidance and no automatic legacy fallback
- **AND** ordinary reads/edits preserve unsupported newer data; intentional repair of malformed supported data retains its prior raw value

### Requirement: Existing settings permissions govern device preferences
Device sensor selection, clearing and legacy-mode changes SHALL retain the current administrator-only Marao settings boundary and context guards. Runtime resolution SHALL use only entities available to the current HA account. New local choices SHALL NOT alter account roles, shared-save authorization or entity access, and stale callbacks SHALL NOT mutate preferences after ownership or administrator access is lost.

#### Scenario: A regular user opens the dashboard
- **WHEN** a non-administrator uses Current room
- **THEN** an existing scoped preference can resolve against that account's readable entities
- **AND** no new settings or local-preference editing access is granted

#### Scenario: Access or ownership changes during selection
- **WHEN** role/account/dashboard ownership changes or the settings owner closes before a pending local update completes
- **THEN** the stale update cannot persist or apply a sensor choice for the preceding context
- **AND** the preceding source cannot remain an actionable route in another account's scope

### Requirement: Direct sensor diagnostics and manual navigation
Sensor-mode diagnostics SHALL show this browser/WebView, its selected sensor, current area ID and mapped page or specific unresolved stage, with localized correction guidance. Saved-state diagnostics and draft previews SHALL share resolution rules while previews remain read-only. Sensor changes SHALL update the shortcut without redirecting the page; explicit activation SHALL validate and open the current same-dashboard target once.

#### Scenario: A selected sensor moves between rooms
- **WHEN** its current area ID changes between configured valid rooms
- **THEN** diagnostics and the shortcut update to the current mapped page
- **AND** the page being read stays open until the user explicitly activates the shortcut

#### Scenario: A destination is missing or outside the active dashboard
- **WHEN** the shared mapping points to a deleted view, another origin/dashboard or an invalid destination
- **THEN** the selected source is retained, diagnostics identify the invalid mapping and navigation remains disabled
- **AND** no page is guessed, created or opened automatically

#### Scenario: Shared mappings are previewed but not saved
- **WHEN** an administrator edits room/page mappings while a direct sensor is selected
- **THEN** the labelled draft preview uses that same sensor and the draft mappings without writing
- **AND** live navigation continues using saved shared mappings until Save
