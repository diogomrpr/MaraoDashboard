# Spec Delta

## ADDED Requirements

### Requirement: Consistent energy history presentation
Configured energy unit and precision SHALL apply consistently to current readings and existing numeric labels/scales in generated history sheets. History samples SHALL convert before bounds are calculated, retaining full precision; only visible text SHALL be rounded. Chart shape and period navigation SHALL retain existing semantics. Each sample's source unit SHALL be respected, and incompatible samples SHALL NOT be combined as equivalent measurements.

#### Scenario: An energy period card and its sheet use kilowatt-hours
- **WHEN** the source reads `2500 Wh` and the card selects `kWh` with two decimal places
- **THEN** the card shows `2.50 kWh` and its sheet's numeric bounds use equivalent converted values and the same unit/precision

#### Scenario: Different samples round to the same text
- **WHEN** full-precision history values differ but the selected display precision rounds them equally
- **THEN** chart geometry still reflects their actual converted differences rather than a fabricated flat trace

#### Scenario: A configured graph uses a distinct history entity
- **WHEN** the live entity reports watts and the history entity reports kilowatts
- **THEN** each value is converted from its own metadata to the configured compatible target before presentation

#### Scenario: Historical samples contain incompatible units
- **WHEN** a requested conversion cannot interpret some samples in the target dimension
- **THEN** the sheet reports the incompatibility without drawing a misleading mixed-unit line or altering recorded history

### Requirement: Formatting preserves history request lifecycle
Display-option changes SHALL reuse available raw history without new requests solely for formatting. Unit or precision changes SHALL NOT alter period selection, request identity, controls or authoritative state. Existing loading/empty/error/availability states and stale-response cleanup SHALL remain intact. Source-unit changes SHALL invalidate derived presentation without converting already-converted data again.

#### Scenario: Precision changes after history loads
- **WHEN** the same card and period change from two to zero decimal places
- **THEN** labels rerender from the retained numeric history without another Recorder request or resetting the selected period

#### Scenario: A formatted history request completes after entity replacement
- **WHEN** the old request resolves
- **THEN** existing stale-result protection discards it rather than showing the old entity's values under the new unit

#### Scenario: Loaded history is empty or failed
- **WHEN** formatting options are applied
- **THEN** the existing readable empty/error state remains and no graph values or retry loop are fabricated
