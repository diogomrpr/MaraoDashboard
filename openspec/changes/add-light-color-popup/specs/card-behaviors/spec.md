## ADDED Requirements

### Requirement: Compact light color entry points
Color-capable and temperature-capable light cards SHALL open a picker from their existing icon circle, with a small palette indicator inside unchanged dimensions. They SHALL add no dashboard rows or card height. Default card-body taps and brightness controls SHALL retain their existing behavior, and picker activation SHALL never also trigger the card action.

#### Scenario: A capable light icon is activated
- **WHEN** the user activates the existing light icon circle
- **THEN** its color picker opens without toggling the light or resizing the card
- **AND** the card retains its seasonal state-based background

#### Scenario: An ordinary light has no color or temperature controls
- **WHEN** an on/off-only or brightness-only light is rendered
- **THEN** its existing card behavior remains unchanged and it gains no picker entry point

### Requirement: Compatible light picker hold gesture
A 600 ms hold on a capable light card SHALL open the picker unless a hold action is explicitly configured. Scrolling, movement indicating scrolling, cancellation or loss of availability SHALL cancel the hold. Explicit tap and hold actions, including an explicit no-op hold, and hidden-icon settings SHALL remain preserved.

#### Scenario: A default hold completes
- **WHEN** the user holds a usable capable light card for 600 ms without scrolling
- **THEN** the picker opens once and neither release nor its synthesized click toggles the light

#### Scenario: Scrolling begins during the hold
- **WHEN** a card press becomes a scroll gesture before the hold completes
- **THEN** no picker or light action is dispatched

#### Scenario: Existing actions or hidden icons are configured
- **WHEN** a light card has an explicit hold action, custom tap action or hidden icon
- **THEN** those settings remain unchanged without a migration
- **AND** a hidden icon stays hidden, an explicit hold retains its action, and a body tap retains its configured action

### Requirement: Shared capability-aware light picker
The same light picker behavior SHALL apply to generated, native, dashboard and popup light cards. It SHALL derive controls from Home Assistant's reported light capabilities and temperature limits. It SHALL offer a color wheel where color is supported, a warm-to-cool slider where temperature is supported, the shared brightness control and a concise off indication.

#### Scenario: Supported capabilities differ
- **WHEN** a light reports color support, temperature support or both
- **THEN** the popup exposes only its supported color controls and uses the reported temperature bounds

#### Scenario: The selected light is off
- **WHEN** its picker opens while Home Assistant reports the light off
- **THEN** a concise localized off indication appears and opening sends no service call

### Requirement: Light picker availability and errors
Picker controls SHALL follow Home Assistant's reported state after adjustment. Missing, unknown, unavailable or disconnected targets SHALL disable controls and cancel active adjustment. Reported service failures SHALL remain readable through the shared error handling rather than silently retrying or claiming a successful change.

#### Scenario: Availability is lost during adjustment
- **WHEN** the target disconnects or becomes unknown or unavailable before release
- **THEN** controls disable and no partial adjustment is sent

#### Scenario: A service rejects an adjustment
- **WHEN** Home Assistant reports an error for the completed adjustment
- **THEN** the user sees a readable error and the displayed light state follows the authoritative report
