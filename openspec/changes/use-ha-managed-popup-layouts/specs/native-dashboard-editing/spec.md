# Spec Delta

## ADDED Requirements

### Requirement: Native popup layout selection
Popup-owning native Marao cards SHALL offer Automatic or an existing same-dashboard Sections view as their popup layout. Saving SHALL preserve unknown card/member fields, native layout/visibility and prior automatic options. Selecting a view in a draft SHALL NOT create views or operate entities; native Save/Cancel SHALL remain authoritative.

#### Scenario: A saved detail view is selected
- **WHEN** a user selects a Sections view as Popup layout and saves the native card
- **THEN** the card references that view without duplicating its content or changing unrelated settings
- **AND** removing the reference deliberately restores the retained automatic configuration

### Requirement: Explicit editable popup creation
Administrators SHALL be able to explicitly create a dedicated Sections subview from an automatic popup and bind its unambiguous invoking card in one native dashboard save. Creation SHALL retain exact recovery data, recheck current dashboard/card identity and refuse stale, ambiguous, unsupported or unauthorized contexts before writes. Preview, loading and opening alone SHALL remain read-only.

#### Scenario: A group becomes editable
- **WHEN** an administrator activates Create editable layout for an automatic group popup
- **THEN** one new view preserves its sections, selected members, options, filtering and controls, and the invoking card references it
- **AND** duplicate or concurrent ambiguous matches never cause another card to be replaced

#### Scenario: A save outcome is uncertain
- **WHEN** HA reports a creation failure or concurrent configuration change
- **THEN** the exact original/proposed documents remain available for recovery and no blind retry appends another view

### Requirement: Native popup layout editing ownership
Edit layout SHALL close the popup and open its source view in HA's normal editor for authorized administrators. HA SHALL own per-card width/height, placement, sections, visibility and membership. Later rendering, resource updates and registry changes SHALL NOT regenerate or refill that view. Existing unrelated views/navbar configuration SHALL remain unchanged.

#### Scenario: Cards are resized and moved
- **WHEN** a user saves two half-width cards of different heights in the native source view
- **THEN** reopening the popup renders that saved layout using HA's sizing rules
- **AND** deletion or explicit empty sections stay saved after reload
