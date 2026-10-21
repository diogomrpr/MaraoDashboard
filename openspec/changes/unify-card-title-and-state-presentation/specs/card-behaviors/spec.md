# Spec Delta

## ADDED Requirements

### Requirement: Concise normal binary-state presentation
Semantically binary cards SHALL omit redundant normal-state text and use distinct
backgrounds, configured or native icons and localized accessible state, without an additional round on/off badge. Normal room
lighting alone SHALL use background and accessible state without a visible
count/status or marker under the approved exception. Classification SHALL follow
domain meaning. Loading, transitions, problems, actions, useful readings, other
counts, metadata and substantive custom labels SHALL remain visible.

#### Scenario: A light changes between off and on
- **WHEN** Home Assistant reports either normal light state
- **THEN** the card omits the redundant localized on/off line and distinguishes the state through its background and icon or shape
- **AND** its accessible state, title, available brightness control and confirmed value remain correct

#### Scenario: Another binary entity is displayed through a different card family
- **WHEN** a fan, switch, input boolean, ordinary binary sensor, two-state appliance or binary base/navigation presentation reports a normal state
- **THEN** the same concise presentation applies without a repeated normal-state label
- **AND** configured on/off icons, percentage/power readings and last-updated metadata retain their meaning

#### Scenario: A configured icon is static or hidden
- **WHEN** a binary card other than normal room lighting uses the same configured icon in both states or hides its icon
- **THEN** no extra round on/off badge is rendered and localized accessible state remains available
- **AND** the card does not add a redundant visible on/off sentence

#### Scenario: A binary access entity has a stable state
- **WHEN** a lock reports locked or unlocked
- **THEN** the stable state uses the concise binary presentation with an unambiguous lock-state cue
- **AND** explicit Lock and Unlock action labels, strict opening/unlocking slides and their cancellation behavior remain intact

#### Scenario: A card contains values or more than two semantic states
- **WHEN** a cover reports position or motion, a climate/media/vacuum/security/weather card reports an operational state, or a selector offers two named options
- **THEN** meaningful position, transition, mode, operation, condition or option text remains visible
- **AND** classification is not inferred from having observed only two values or options

#### Scenario: A summary contains useful counts or a partial problem
- **WHEN** a room or navigation summary has active-member counts, numeric readings or unavailable members
- **THEN** those readings, non-lighting counts and partial-problem details remain visible
- **AND** normal room lighting counts/status remain accessible without an automatic visible row or binary marker
- **AND** only a redundant normal binary line such as All off is omitted

#### Scenario: A configured label accompanies the normal state
- **WHEN** a binary card contains substantive custom text or a state-label prefix
- **THEN** substantive custom text remains visible without restoring the redundant state line
- **AND** an empty or dangling prefix is not displayed on its own

#### Scenario: History depicts binary intervals
- **WHEN** a timeline or graph shows past on/off intervals
- **THEN** the history labels and interval meaning remain available
- **AND** omitting a redundant current-state line does not remove temporal information

#### Scenario: Normal room lighting uses its approved background exception
- **WHEN** every configured light is available and the room reports a normal lighting state
- **THEN** any on light selects the active background and all off or no lights selects the inactive background, without an automatic lighting-status/count row or binary marker
- **AND** localized accessible lighting state, useful non-lighting readings and explicit action labels remain
- **AND** availability and reported problems still receive visible non-color reasons and take priority over normal lighting
