# Spec Delta

## ADDED Requirements

### Requirement: Independently collapsible Visual sections
Each Visual editor section SHALL offer a semantic disclosure header, initially expanded. Collapsing SHALL hide its card content and Add card control while retaining the numbered header and section tools. Sections SHALL operate independently without changing the draft, dirty state, saved data or page expansion. Add section SHALL remain outside.

#### Scenario: Collapse and reopen a populated or empty section
- **WHEN** the administrator activates a section disclosure by touch or keyboard
- **THEN** its content hides or reappears without changing any source data or another section
- **AND** section tools remain independently operable and do not toggle disclosure

#### Scenario: Retained sections are updated
- **WHEN** a section is reordered or its page is collapsed/reopened, or unchanged Visual/JSON tabs are switched
- **THEN** its disclosure choice follows the same section in the retained draft
- **AND** newly encountered sections start expanded; accepted document replacements may reset disclosure

#### Scenario: A drag is interrupted by collapse
- **WHEN** section disclosure changes during an active drag
- **THEN** the uncommitted drag is cancelled without a move, save or entity action
- **AND** hidden section content is not offered as a visible drop target

### Requirement: Number-only section badges
Visible section headings SHALL use the current one-based section number in a compact badge without the word Section. The disclosure SHALL show an open/closed chevron and retain a localized Section N accessible name. Headers and existing controls SHALL remain usable at mobile widths with visible interaction targets of at least 48 by 48 CSS pixels.

#### Scenario: Sections are reordered
- **WHEN** a section changes position
- **THEN** its badge and accessible name reflect its current number while its own disclosure choice remains independent
