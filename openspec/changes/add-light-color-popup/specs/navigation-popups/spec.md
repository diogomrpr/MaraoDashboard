## ADDED Requirements

### Requirement: Marao light color detail sheet
The light picker SHALL use Marao's existing slide-up sheet presentation, with the light name, close control, themed content and existing modal focus, inert-background and scroll behavior. Its code SHALL load only when first opened; loading or load failure SHALL remain visible without sending a light action.

#### Scenario: A dashboard light picker opens for the first time
- **WHEN** a supported light's picker entry point is activated
- **THEN** the Marao sheet opens with its name and close control while picker code loads on demand
- **AND** opening or closing the sheet sends no light update

#### Scenario: Picker loading fails
- **WHEN** the picker cannot load
- **THEN** a readable failure and explicit retry are offered in the sheet without acting on the light

### Requirement: Light detail returns to its group list
Opening a light picker from an existing group popup SHALL show a detail view with Back. Returning SHALL restore the group list's scroll position and invoking control without reopening or resetting the parent popup. Closing SHALL preserve the shared modal cleanup and focus restoration behavior.

#### Scenario: A scrolled group list opens a light detail
- **WHEN** a user opens a member's picker and then activates Back
- **THEN** the same group list returns at its previous scroll position with focus restored to that member's invoking control
- **AND** no light service is called by navigation
