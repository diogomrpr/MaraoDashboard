## ADDED Requirements
### Requirement: Searchable card catalog
The Add card type tab SHALL offer a localized search field that filters card names and descriptions case- and accent-insensitively, reports empty results, and restores all discoverable cards when cleared. Filtering SHALL preserve card selection behavior and keep legacy aliases hidden.
#### Scenario: Find and select a card
- **WHEN** an administrator searches for part of a card name or description
- **THEN** matching cards remain selectable with their original template identity
#### Scenario: Clear a search
- **WHEN** an administrator clears an unmatched query
- **THEN** the empty message disappears and all discoverable cards return
