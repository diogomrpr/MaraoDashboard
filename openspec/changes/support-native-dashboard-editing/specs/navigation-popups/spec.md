## ADDED Requirements

### Requirement: Native editing with Marao navigation
Native starters SHALL retain the Marao theme and at most five floating navbar routes, with administrator edit access outside those entries. Native editing SHALL restore its toolbar; leaving Marao SHALL restore the normal shell.

#### Scenario: Native editing starts
- **WHEN** the administrator uses Edit dashboard
- **THEN** HA's existing editor or Take control flow opens with its native controls unobstructed

#### Scenario: A Marao card is added to an ordinary dashboard
- **WHEN** that dashboard has no Marao navbar
- **THEN** its native shell remains unchanged
