## MODIFIED Requirements

### Requirement: Shared light and dark palette
Cards SHALL use Marao semantic surface, state, icon, spacing, radius and typography tokens and remain readable in both themes. The approved Marão landscape palette SHALL use mist and schist surfaces, slate-blue primary controls and seasonal forest green, heather, yellow, orange, earth red, winter blue, gold and peach domain accents. Yellow and orange SHALL remain distinct, and forest green SHALL retain the cleaner green direction rather than the rejected olive treatment. Primary controls SHALL use paired mode-aware foregrounds. Sliders SHALL retain pale mineral tracks, near-white fills, white thumbs and contrasting slate boundaries. Charts SHALL use ten shared mode-aware series colors, including river teal, winter blue, rose and lilac, while preserving explicit overrides. Series colors SHALL meet at least 3:1 against their chart surface in each mode. Status SHALL also use text, icon or shape, except normal room lighting uses background plus accessible state without a visible status row. Normal text SHALL meet 4.5:1 contrast; large text and meaningful boundaries SHALL meet 3:1.

#### Scenario: A pale active slider card is displayed
- **WHEN** the card uses the blue domain highlight
- **THEN** card, track, confirmed fill and target thumb remain visually distinguishable with persistent contrasting boundaries

#### Scenario: A room uses the requested reduced state presentation
- **WHEN** its light states are normal and known
- **THEN** the active/inactive background indicates lighting without a separate visible on/off row and localized semantic state remains available
- **AND** other card families retain their additional visual state cues

#### Scenario: A theme mode changes
- **WHEN** light or dark mode is selected
- **THEN** the landscape surfaces and primary foreground pair remain readable
- **AND** power chart lines, their legends and energy donut shares consume the same shared series palette

#### Scenario: A chart displays more than six configured series
- **WHEN** a power or energy chart displays seven to ten series without explicit color overrides
- **THEN** every series resolves a shared mode-aware landscape color rather than using an unthemed fallback for the extra series
- **AND** existing legend labels and configured color overrides remain intact

#### Scenario: Seasonal palette evidence is documented
- **WHEN** the refined palette is documented
- **THEN** the evidence includes 15 real Marão photo references spanning spring, summer, autumn and winter with sources, credits and capture-date confidence
- **AND** raw extracted swatches remain distinct from UI colors adjusted for contrast and the desired visual identity
- **AND** reference photographs are not bundled into the dashboard runtime
