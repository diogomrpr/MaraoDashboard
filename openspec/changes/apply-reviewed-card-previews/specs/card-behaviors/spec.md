## MODIFIED Requirements
### Requirement: Header, glance and forecast detail
Saved Header cards SHALL remain compatible, while Header SHALL be hidden from new-card pickers and documentation. Headers SHALL retain localized date in HA's time zone plus optional person and
air-quality readings. Glance SHALL support one through three independently named
and icon-configured readings, preserving usable readings when another is unavailable.
Weather SHALL show a large current temperature, localized condition and available wind, humidity and pressure directly on static condition scenery, without a top-right weather icon. Its shared popup SHALL show supported hourly and up-to-seven-day daily forecasts through native subscriptions, with localized values, explicit errors and lifecycle cleanup. `show_forecast: false` SHALL suppress forecast entry; missing data SHALL NOT be invented. Current and forecast readings SHALL display whole numbers without mutating reported data; optional current metrics SHALL wrap naturally without empty slots. With no explicit custom action, tapping the card SHALL open a forecast popup using matching condition scenery and native subscription capabilities.

#### Scenario: A glance contains an unavailable secondary reading
- **WHEN** the card renders its configured readings
- **THEN** the unavailable reading is explicit and other readings remain visible

#### Scenario: Weather supports hourly and daily forecasts
- **WHEN** the forecast popup is opened
- **THEN** the user can choose hourly and seven-day views supported by the entity
- **AND** subscriptions are released when the popup closes

## ADDED Requirements
### Requirement: Dishwasher reading presentation
Dishwasher SHALL show circular reported progress, integrated remaining-time and program indicators and a program-specific icon. Remaining time SHALL use an hourglass icon. The optional Show reading labels setting SHALL hide captions visually while preserving values, semantic names and warnings; omission SHALL preserve labels.

#### Scenario: Labels are disabled
- **WHEN** show_reading_names is false
- **THEN** indicator values, icons and semantic names remain without visible captions
- **AND** invalid progress remains neutral rather than becoming a false zero

### Requirement: Alarm mode presentation
Alarm Controls SHALL offer only Dropdown and Grid layouts, with omitted layout rendering Dropdown without rewriting configuration. Each mode SHALL have its own icon and the selected mode SHALL show color plus a non-color selection cue. Existing authorization, PIN, availability and dispatch guards SHALL remain.

#### Scenario: An existing configuration omits layout
- **WHEN** it renders
- **THEN** Dropdown is shown and the saved configuration is unchanged

### Requirement: Camera event timeline filters
Camera Events SHALL use one chronological timeline with smaller times below event icons. Filter headings SHALL use camera, event-type and clock icons, retaining selected values and semantic names. Routine archive-scope and per-source-count notices SHALL be omitted; actual loading failures and empty results SHALL remain readable.

#### Scenario: Filtering loaded events
- **WHEN** a filter changes
- **THEN** the selected values remain visible and apply to the loaded event set
- **AND** provider errors are not concealed by removing routine notices
