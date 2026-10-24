## ADDED Requirements
### Requirement: Unified access card settings
The builder SHALL offer one Access family whose settings select automatic, popup, inline opening slide, close/lock tap or security hold. Generated, native and raw runtime instances SHALL share supported behavior. Unsupported entity/mode combinations SHALL report an error. Opening/unlocking SHALL retain strict slide safeguards and risky security actions SHALL retain the 1.2-second hold.

#### Scenario: An administrator chooses an inline opening card
- **WHEN** a lock Access card selects slide behavior
- **THEN** it renders the existing strict opening slider and generates no unused popup

#### Scenario: An administrator chooses a popup
- **WHEN** a lock or access cover selects popup behavior
- **THEN** it opens its guided opening and closing controls

#### Scenario: Existing access aliases are loaded
- **WHEN** saved access opener, close/lock or security action cards have no new behavior setting
- **THEN** their original behavior and authored options remain unchanged, and their editor exposes the unified behavior setting
