# Spec Delta

## MODIFIED Requirements

### Requirement: Native summaries and generated popups
Home starter summaries SHALL use editable Entity Group cards with explicit members, summary options and popup filters. Converted legacy summaries SHALL preserve their resolved member selection and intended filtering. Climate, access, media and camera cards SHALL retain matching popups and appropriate native controls. Generated popup identities SHALL be unique across page/card instances while retaining compatible explicit references. Automatically created Covers summaries SHALL exclude exhaust-valve covers using ventilation presentation; their cards SHALL remain reachable in their saved pages.

#### Scenario: The primary summary entity is unavailable but another is usable
- **WHEN** the summary and popup are generated and rendered
- **THEN** secondary usable entities remain reachable and partial unavailability is represented

#### Scenario: A light summary is created from Home
- **WHEN** its active-only popup is opened
- **THEN** only active selected lights appear while the summary considers its configured membership

#### Scenario: Two Energy or Media starters use the same entity
- **WHEN** their differently named cards open their respective popups
- **THEN** each opens the correct page/card content with no hash collision or cross-page options

#### Scenario: Explicit overview groups replace defaults
- **WHEN** the legacy saved configuration contains an explicit overview group list
- **THEN** only those groups appear in their configured order, without additional hard-coded light, cover, climate or maintenance cards
- **AND** an explicit empty list suppresses those groups while preserving weather and scenes

#### Scenario: A room contains a blind and an exhaust valve
- **WHEN** the overview is generated
- **THEN** only the ordinary cover belongs to the Blinds summary and popup
- **AND** the exhaust valve retains its ventilation card in the room

#### Scenario: Every configured cover is an exhaust valve
- **WHEN** the overview is generated
- **THEN** no empty Blinds summary is shown and the ventilation cards remain available on their configured room or custom page

## ADDED Requirements

### Requirement: Consistent ventilation defaults and explicit overrides
Generation SHALL select `hc_fan_card` for non-access HA damper covers without an explicit template, and preserve explicit `hc_fan_card` choices for non-access shutters or other covers. Existing fan defaults and ordinary cover defaults SHALL remain unchanged. Original entity IDs, options and ordering SHALL survive regeneration in automatic and fixed-column layouts. Recognized access covers SHALL NOT acquire ordinary ventilation controls.

#### Scenario: A native damper uses default presentation
- **WHEN** a saved room entity has cover domain, damper device class and no explicit template
- **THEN** generation selects the same fan/exhaust card proposed by the builder without changing the HA entity or adding another entity

#### Scenario: A shutter explicitly uses ventilation presentation
- **WHEN** a room or custom-page cover has `template: hc_fan_card`
- **THEN** generated output preserves that template and its slider/name/icon options without forcing it back to a blind

#### Scenario: Explicit ordinary cover presentation is preserved
- **WHEN** a damper has an explicit `hc_cover_card` template
- **THEN** regeneration preserves that user choice rather than replacing the saved template

#### Scenario: Existing cards and layout survive
- **WHEN** a saved dashboard containing fans, ordinary covers and fixed-column mixed content is regenerated
- **THEN** existing fan and cover controls and deliberate content order remain intact

#### Scenario: An access cover has an unsafe ventilation override
- **WHEN** generation receives a recognized door, garage or gate configured as `hc_fan_card`
- **THEN** validation reports the incompatible selection before replacing the valid generated dashboard
