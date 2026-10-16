# Spec Delta

## ADDED Requirements

### Requirement: Critical battery color survives partial availability
A battery-group summary with a known valid level below 20 SHALL retain its battery-red surface during partial member unavailability. This combined presentation SHALL keep localized unavailable-member detail and the low-battery cue visible and the popup reachable. Complete unavailability or disconnection SHALL remain neutral and disabled; reported errors SHALL retain their established priority. Other partial-problem treatment SHALL remain unchanged.

#### Scenario: A critical member and an unavailable member coexist
- **WHEN** a battery group has a valid 10% member and another missing, unknown, unavailable or invalid member
- **THEN** the summary tile retains the threshold-red battery background instead of the generic partial-warning background
- **AND** low-battery and availability counts/reasons remain visible and readable in the current theme
- **AND** the group remains reachable without enabling actions on an unavailable member

#### Scenario: The critical member recovers or disappears
- **WHEN** no valid member remains below 20 while partial unavailability remains
- **THEN** the existing shared partial-warning presentation applies again with current readings and availability details
- **AND** the prior red severity does not linger or turn invalid data into a replacement critical reading

#### Scenario: The entire group loses usable state
- **WHEN** all members become unusable or HA disconnects while a red group is visible
- **THEN** neutral unavailable/disconnected treatment replaces the threshold background and entity-dependent actions are disabled
- **AND** recognized failure reasons and HA's native connection warning remain authoritative

#### Scenario: An actual reported error is present
- **WHEN** an existing recognized action or content error affects the battery-group card
- **THEN** its normal shared error reporting and surface priority remain effective, subject to complete-availability priority
- **AND** threshold coloring neither hides the error nor reclassifies missing data as a service failure

#### Scenario: Another card family has a partial problem
- **WHEN** a light, cover, climate or other non-battery summary has an unavailable member
- **THEN** its existing problem surface, readable reason and action guards remain unchanged
- **AND** the critical-battery composition is not applied by title, icon or popup path
