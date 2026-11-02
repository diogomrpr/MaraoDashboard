# Spec Delta

## ADDED Requirements

### Requirement: Fan exhaust action icons
Cover-backed fan/exhaust cards SHALL show distinct opening and closing icons inside their supported Open and Close buttons, alongside existing localized visible labels. Each button SHALL retain its target-specific accessible name and a visible touch surface of at least 48 by 48 CSS pixels. Icons SHALL not create separate actions or focus targets.

#### Scenario: Both exhaust actions are supported
- **WHEN** a non-access exhaust cover supports Open and Close
- **THEN** both buttons display distinct action icons with their localized labels in the shared fan presentation
- **AND** native, generated, generic and popup instances use the same action presentation

#### Scenario: Only opening is supported
- **WHEN** an exhaust cover supports Open without Close or position control
- **THEN** the Open button has its opening icon and label without an unsupported Close button or slider

#### Scenario: The layout is narrow or text is enlarged
- **WHEN** the card is viewed at 320 CSS pixels or with 200% text
- **THEN** action icons and labels remain contained and readable, allowing wrapping or vertical growth without shrinking touch targets

### Requirement: Exhaust icons preserve action semantics
Adding action icons SHALL preserve capability filtering, neutral disabled availability, preview inhibition, haptics, exactly-once cover dispatch and access-cover restrictions. Ordinary fan entities SHALL retain their existing toggle and speed controls without gaining cover actions. Authored card settings SHALL remain unchanged.

#### Scenario: An icon is tapped
- **WHEN** a user taps the opening or closing icon within an enabled exhaust action button
- **THEN** its corresponding cover command dispatches once to the original cover entity without triggering a card-level action

#### Scenario: The target is unavailable or unsafe
- **WHEN** a configured target is unknown, unavailable, missing, disconnected, in preview or recognized as an access cover
- **THEN** the icons do not enable any action forbidden by the existing guards

#### Scenario: A normal fan is shown
- **WHEN** a saved fan card targets a fan entity
- **THEN** its existing main icon, settings, toggle and supported speed behavior remain unchanged with no Open/Close actions
