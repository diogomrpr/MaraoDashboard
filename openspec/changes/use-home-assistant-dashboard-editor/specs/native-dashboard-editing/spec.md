# Spec Delta

## MODIFIED Requirements

### Requirement: Native card collection
Every published Marao card family SHALL be available by name in HA's native picker with compatible entity suggestions, visual configuration and native layout sizing. Existing generic runtime types SHALL remain supported. HA SHALL own the ordinary dashboard's views, sections, card placement, visibility and save workflow.

#### Scenario: A light is added natively
- **WHEN** an administrator selects Marao Light
- **THEN** compatible entity and brightness options are available without YAML or the Marao builder

#### Scenario: Native customization applies to an individual card
- **WHEN** an administrator resizes a Marao card, sets its visibility or moves it beside a native card in a Sections view
- **THEN** HA saves and applies those choices to that card independently
- **AND** no dashboard-level generator replaces them on reload or resource update

### Requirement: Lossless visual configuration
Native forms SHALL expose current supported settings and preserve unknown fields, explicit emptiness, order, names, options and structured command data across edits and Visual/YAML switches. Confirming changes SHALL emit a complete card configuration; cancellation SHALL leave the saved card unchanged. Changing a local display name SHALL NOT rename an HA entity.

#### Scenario: Advanced data survives an edit
- **WHEN** a vacuum name is edited alongside structured segment parameters and unknown fields
- **THEN** only the edited field changes

#### Scenario: Layout and visibility survive a card edit
- **WHEN** a card with native layout, visibility and unknown options is edited visually and through YAML
- **THEN** those options survive while the requested card setting changes
- **AND** cancelling a later dialog restores its previously saved configuration

### Requirement: Independent native starter
Explicit starter creation or conversion SHALL produce ordinary stored views and cards owned by HA. Later registry changes, rendering, restarts and package updates SHALL NOT refill saved or deleted content. The retired builder SHALL NOT remain a second editable source for that dashboard.

#### Scenario: A starter is taken over and emptied
- **WHEN** a converted or explicitly created starter has its cards removed and HA restarts
- **THEN** it stays empty and unrelated dashboards remain unchanged

## ADDED Requirements

### Requirement: Specialized card configuration parity
Native Marao editors SHALL retain the current supported configuration for groups, room membership, scenes, graphs/thresholds, energy units/cost/contributors, current shortcuts, media apps/remotes, vacuum commands, camera providers and access/alarm controls. Editors SHALL use localized labels and compatible native selectors without requiring the retired dashboard builder.

#### Scenario: An energy contributor is configured
- **WHEN** an administrator opens an energy card's configuration
- **THEN** existing contributors start collapsed with their name and entity ID
- **AND** each expands inline independently, new entries open, and move/delete actions retain order and values
- **AND** expansion alone is not saved or treated as a configuration change

#### Scenario: Explicit membership remains explicit
- **WHEN** a saved room or group has selected members, per-member options or an explicitly empty membership
- **THEN** native editing preserves those choices and later registry changes do not insert members

#### Scenario: Current shortcuts are edited
- **WHEN** supported number or input_number charging shortcuts are configured
- **THEN** their names, values and order survive saving
- **AND** only the shortcut matching the authoritative usable current value has its selected palette color

### Requirement: Native floor-plan editing
The native floor-plan editor SHALL support HA image upload, visual light-button placement, strip-path editing and per-light configuration opened by selecting its marker. Placement controls SHALL remain near the image preview. Numeric coordinates SHALL remain available in YAML without appearing as visual-editor fields.

#### Scenario: A light strip is added visually
- **WHEN** an administrator uploads an image, places a light marker and draws its strip path
- **THEN** the saved card shows authoritative light state and the configured illuminated strip
- **AND** tapping the marker at runtime toggles that light once when available

#### Scenario: The floor plan fills a page
- **WHEN** a floor-plan card is configured for full-page use in a native Panel view
- **THEN** its image and controls use the available viewport while respecting shared navbar clearance
- **AND** the native card editor remains usable with the same placement configuration

### Requirement: Native editing lifecycle
Marao SHALL follow HA's card-dialog, dashboard-save and raw-configuration workflows. Native edit mode SHALL retain HA's toolbar, layout/visibility controls and native editor presentation. Marao controls SHALL remain localized and touch-usable; stock HA editor internals SHALL NOT be restyled into the retired builder.

#### Scenario: An administrator enters edit mode
- **WHEN** native editing is opened from Marao navigation
- **THEN** the HA toolbar and card controls are available without a covering navbar or fullscreen override
- **AND** leaving edit mode restores the configured viewing appearance

### Requirement: Retirement of active builder authoring
Ordinary native configuration SHALL be the sole editable source after conversion. The old Visual/Monaco editor, Save & Generate flow, builder-specific draft guarantees and automatic page-link repair SHALL cease to be authoring features. Read-only historical rendering and conversion SHALL NOT silently write or replace the native dashboard.

#### Scenario: An old editor bookmark is opened
- **WHEN** a user follows the former internal editor path
- **THEN** an administrator receives conversion or native-editor guidance without a second active builder
- **AND** ordinary users receive no write controls and saved dashboard content remains unchanged

#### Scenario: A native page path changes
- **WHEN** an administrator changes a view path using HA
- **THEN** native view configuration is authoritative
- **AND** unresolved explicit Marao navbar destinations are identified for correction without resurrecting or regenerating the deleted path
