# Spec Delta

## MODIFIED Requirements

### Requirement: Climate mode and target controls
Climate SHALL separate reported temperature/activity, requested mode and numeric target, using unitless temperatures and mode-aware colors. Controls SHALL honor graph/mode/setpoint options. Multiple modes SHALL open enabled climate details; single-mode activation SHALL retain direct on behavior. Requests SHALL appear by the next frame and remain pending until reconciled, without inventing reported measurements or activity.

#### Scenario: A multi-mode climate card is activated
- **WHEN** an available climate entity exposes multiple supported modes and its built-in popup is enabled
- **THEN** default card activation opens its climate details with supported mode choices
- **AND** no device command is dispatched merely by opening the details

#### Scenario: A temperature or mode change has delayed confirmation
- **WHEN** a usable thermostat receives an accepted target or supported HVAC mode request
- **THEN** the requested value or mode appears immediately with localized pending feedback
- **AND** measured temperature and actual heating/cooling activity are not fabricated

#### Scenario: A single-mode thermostat is turned on
- **WHEN** its available default direct action requests its supported mode
- **THEN** the requested mode has the same immediate feedback and reconciliation as a mode-sheet button

#### Scenario: A thermostat is turned off before its report arrives
- **WHEN** an available thermostat receives an explicit supported off-mode request
- **THEN** its requested mode, label and mode-selection treatment display off immediately with pending feedback
- **AND** reported temperature and actual equipment activity remain unchanged until Home Assistant updates them

#### Scenario: A thermostat switches between supported modes
- **WHEN** an available thermostat receives a request for another supported HVAC mode
- **THEN** its requested mode, label and mode-selection treatment update immediately with pending feedback
- **AND** the control does not wait for service acknowledgement or entity confirmation

#### Scenario: The target arrows are activated
- **WHEN** an available supported target is adjusted from the card or its details
- **THEN** one completed activation changes it by the entity-supported step within its bounds, using the latest shared request
- **AND** the activation does not also open a popup or trigger a card-level action

#### Scenario: The thermostat uses a temperature range
- **WHEN** supported range targets are shown or adjusted
- **THEN** both targets and their existing mode-specific adjustment semantics remain available in the card and details
- **AND** an incomplete or unsupported range does not dispatch an invented scalar target

## ADDED Requirements

### Requirement: Compact climate readings and selector
Climate cards SHALL emphasize current temperature beside optional humidity and a rounded vertical up/target/down selector at the right. Title and activity SHALL fit beside that selector when space permits, with 8px above and below it. Temperatures SHALL omit degrees and units in visible and accessible text. Graph, custom-label and hidden-field options SHALL retain their meanings.

#### Scenario: A full-width climate card renders at normal text size
- **WHEN** a typical scalar-target card has no explicit larger sizing or additional content
- **THEN** its height follows the selector plus its vertical spacing instead of an unconditional four-row reservation
- **AND** its current temperature is visibly larger than the previous normal climate reading
- **AND** name, current temperature, configured humidity and actual activity remain distinguishable from the target

#### Scenario: A card has additional supported content
- **WHEN** a graph, long title, range target or enlarged typography needs more room
- **THEN** the card grows or reflows without clipping readings, shrinking essential text or reducing touch controls

### Requirement: Optional climate humidity sensor
Climate settings SHALL offer an optional humidity sensor selection stored as `variables.humidity_entity`. The card and climate-owned details SHALL use that selected sensor's reported percentage. Unset, null or empty selection SHALL hide humidity without an empty slot. Selection SHALL remain stored through missing or unavailable readings; no fallback sensor or fabricated percentage SHALL be substituted.

#### Scenario: A humidity sensor reports a valid value
- **WHEN** the selected humidity sensor reports a finite percentage within 0 through 100
- **THEN** the same localized humidity value appears in the card and its climate details
- **AND** changing only that sensor's report refreshes the displayed reading

#### Scenario: A selected humidity reading cannot be used
- **WHEN** the selected sensor is missing, unknown, unavailable, nonnumeric or outside the percentage range
- **THEN** its humidity slot shows a neutral unavailable reading instead of stale or invented humidity
- **AND** a usable primary thermostat retains its own enabled controls and availability state

#### Scenario: The user clears the humidity selection
- **WHEN** the humidity picker is cleared and the card is saved
- **THEN** only that selection is removed and the humidity slot disappears from the card and built-in details
- **AND** unrelated configuration, explicit options and custom layout content remain unchanged

### Requirement: Optional climate popup configuration
Climate settings SHALL expose `variables.enable_popup` as a boolean. Omission SHALL mean enabled. False SHALL suppress built-in climate popup generation and default popup activation while retaining the target selector. Supported mode buttons SHALL then appear inline unless explicitly hidden. Authored actions, saved popup references and custom layouts SHALL remain preserved; this toggle SHALL govern built-in behavior rather than rewriting explicit actions.

#### Scenario: An older card omits the new options
- **WHEN** a supported saved climate card has no popup toggle or humidity selection
- **THEN** its existing automatic popup availability, single-mode direct behavior and explicit actions remain available under the new presentation
- **AND** no source rewrite or humidity slot is required

#### Scenario: The built-in popup is disabled
- **WHEN** `variables.enable_popup` is false
- **THEN** no automatic climate sheet is created or opened by default activation
- **AND** the card retains its target selector and inline supported modes, except where `show_mode_buttons` is explicitly false
- **AND** no generic more-info fallback substitutes for the disabled built-in sheet

#### Scenario: A popup is re-enabled
- **WHEN** the popup toggle changes from false to true
- **THEN** the prior custom popup reference and authored layout are available again without reseeding or deleting them
- **AND** inline mode controls return to their compact popup-enabled placement

#### Scenario: Invalid settings are submitted
- **WHEN** a supplied popup toggle is not a boolean or a nonempty humidity selection is not a sensor entity ID
- **THEN** editing and generation reject the invalid value with a localized error rather than silently replacing it
- **AND** the saved source remains unchanged on failure

### Requirement: Climate details composition
Climate-owned details SHALL place current temperature and configured humidity at the top, supported HVAC modes next, and the same rounded vertical target selector at the lower right. Its geometry, steps, bounds, pending feedback and availability SHALL match the card's selector. The lower-left area SHALL contain no new feature or placeholder. Explicit custom popup content SHALL retain its authored layout.

#### Scenario: Built-in climate details open
- **WHEN** the user opens automatic or project-managed climate details
- **THEN** readings precede the mode controls and the target selector is aligned at the right below them
- **AND** the card and popup share current readings and pending settings for their thermostat
- **AND** modal focus, internal scrolling and close behavior remain available

#### Scenario: Existing custom popup content is used
- **WHEN** a card points to an authored external sheet or an edited popup layout
- **THEN** its saved content, ownership, order and references are preserved
- **AND** opening or previewing it does not regenerate or overwrite that layout

### Requirement: Icon-only climate mode choices
Mode choices SHALL use named semantic buttons with 48-by-48 CSS pixel surfaces and 28px icons, without visible per-button text. Only supported HVAC modes SHALL appear, in reported order. A localized heading such as `Mode - Heat` SHALL identify the selected or pending mode. Selected treatment SHALL include a non-color cue and remain consistent with the existing shared pending lifecycle.

#### Scenario: Every mode fits in one row
- **WHEN** the available width contains all supported full-size mode buttons and their gaps
- **THEN** every mode appears once in one row without stretching button surfaces

#### Scenario: The phone is too narrow for one row
- **WHEN** all full-size supported modes cannot fit in one row
- **THEN** the buttons reflow into a compact grid preserving their order and dimensions
- **AND** no destination is hidden, clipped, put behind a swipe or made smaller

#### Scenario: A mode is selected
- **WHEN** the user completes activation of a supported available mode button
- **THEN** one HVAC-mode request is sent with strong haptic feedback
- **AND** the localized heading and selected treatment reflect the shared requested mode while pending
- **AND** rejection or expiry restores the latest reported mode and retains readable failure feedback

#### Scenario: Availability or capabilities change before activation
- **WHEN** a mode is removed, the thermostat loses availability or Home Assistant disconnects before the button is activated
- **THEN** the action is disabled or refused without a device request
- **AND** the control retains its semantic mode name and neutral problem treatment
