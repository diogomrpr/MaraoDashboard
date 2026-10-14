## ADDED Requirements

### Requirement: Strict service-based access openers
Explicit button, switch and script access openers SHALL use the same strict slide as locks and covers. Completion SHALL dispatch the selected entity's native press, turn-on, unlock or open service once. Taps, vertical intent, incomplete travel, cancellation and unusable targets SHALL dispatch nothing; generic entity defaults SHALL remain unchanged.

#### Scenario: A building-door button slide completes
- **WHEN** horizontal intent and valid completion are established and the target remains usable
- **THEN** button.press is dispatched once to that exact button

#### Scenario: A script opener is unavailable
- **WHEN** the script becomes unavailable before completion
- **THEN** the slide cancels without calling script.turn_on

