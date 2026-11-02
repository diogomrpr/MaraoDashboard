# Spec Delta

## ADDED Requirements

### Requirement: People column configuration
The People visual editor SHALL expose a localized Columns setting for integer values 1 through 6. YAML and generic Marao People descriptors SHALL accept the same top-level option. Omission SHALL mean one column; explicit null, strings, booleans, fractional and out-of-range values SHALL produce localized configuration errors without mutating input.

#### Scenario: A user changes columns visually
- **WHEN** a user selects two columns and saves through Home Assistant
- **THEN** the complete card config contains `columns: 2` and the preview and saved card use that preference
- **AND** `grid_options.columns` retains its separately authored value

#### Scenario: Invalid YAML is supplied
- **WHEN** `columns` is null, `"2"`, true, 1.5, 0 or 7
- **THEN** validation reports a readable localized error and does not silently clamp, coerce or save the value

### Requirement: Lossless people column round trips
Editing People columns SHALL preserve explicit empty membership, member order, local names and icons, unknown card/member fields, native layout and visibility. Composition SHALL forward an explicitly authored preference to the runtime. Unrelated edits SHALL NOT insert the default into a card that omits it; reflow SHALL never write configuration.

#### Scenario: A configured card is composed
- **WHEN** a People card with `columns: 3` is converted for runtime rendering
- **THEN** its runtime People descriptor contains the same preference and members without mutating the source

#### Scenario: Advanced data survives a column edit
- **WHEN** columns change on a card with member overrides, unknown fields, layout and visibility
- **THEN** only the column setting changes, including when membership is explicitly empty

#### Scenario: An older card is edited or cancelled
- **WHEN** a user changes a name on a card without columns, or cancels a column edit through Home Assistant
- **THEN** an unrelated saved edit retains omission, and cancellation leaves the saved configuration unchanged
