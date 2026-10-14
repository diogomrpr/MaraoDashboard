## ADDED Requirements

### Requirement: Explicit access opener selection
The builder SHALL offer an Access opener card for lock, cover, button, switch and script entities. Selecting it SHALL preserve the exact binding and options through Visual/JSON edits and generation. Button/switch/script entities SHALL not automatically become access openers.

#### Scenario: An administrator selects a button opener
- **WHEN** the draft is edited, reordered and saved
- **THEN** its strict-slide template and exact entity remain selected

