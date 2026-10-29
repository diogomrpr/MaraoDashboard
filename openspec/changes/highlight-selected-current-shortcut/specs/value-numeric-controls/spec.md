# Spec Delta

## ADDED Requirements

### Requirement: Selected current shortcut accent
Wallbox current shortcuts for `number` and `input_number` entities SHALL use
neutral surfaces unless selected by the reported value. Selected shortcuts SHALL
use their existing positional blue, teal or gold accent, visible outline and
semantic pressed state. When no shortcut matches or the entity is loading,
unknown, unavailable or disconnected, no shortcut SHALL show a selected accent.
Labels and selection cues SHALL remain readable in both Marao themes.

#### Scenario: An input number matches a shortcut
- **WHEN** the available input-number entity reports 12 and the shortcuts are 6, 12 and 16
- **THEN** the 12 shortcut has its teal accent, selected outline and pressed state
- **AND** the 6 and 16 shortcuts have neutral surfaces and are not marked selected

#### Scenario: A number entity changes its reported current
- **WHEN** the available number entity changes from 6 to 16 with shortcuts 6, 12 and 16
- **THEN** the 6 shortcut returns to neutral and the 16 shortcut gains its gold accent and selection cues
- **AND** the state update itself dispatches no service action

#### Scenario: The current is between configured shortcuts
- **WHEN** the available entity reports 10 with shortcuts 6, 12 and 16
- **THEN** every shortcut is neutral and unselected
- **AND** all existing shortcut actions remain available

#### Scenario: A shortcut is tapped before confirmation
- **WHEN** the entity reports 6 and the user taps the 12 shortcut before Home Assistant reports a new value
- **THEN** the existing single-dispatch action and immediate press feedback remain intact
- **AND** selection stays on the reported value until Home Assistant updates it

#### Scenario: The numeric target cannot be used
- **WHEN** the target is loading, unknown, unavailable or disconnected
- **THEN** every shortcut has no selected accent or pressed state
- **AND** the existing availability guards and neutral disabled treatment remain in effect

#### Scenario: Shortcut configuration and geometry are retained
- **WHEN** an existing card is displayed after the styling change
- **THEN** its configured shortcut values, order, labels, unit and optional empty list remain unchanged
- **AND** controls retain their existing mobile layout and visible touch targets of at least 48 by 48 CSS pixels
