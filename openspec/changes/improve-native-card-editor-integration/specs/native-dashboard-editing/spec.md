# Spec Delta

## ADDED Requirements

### Requirement: Card-specific native help
Every public Marao card registration SHALL expose the matching published card reference through HA's native Help action. Links SHALL use stable documentation routes independent of installed asset identities. Opening Help SHALL NOT modify configuration or activate a device.

#### Scenario: A card's Help action is opened
- **WHEN** a user opens Help from a Marao Light or Camera Events editor
- **THEN** the corresponding Light or Camera Events reference opens
- **AND** no dashboard save, source selection or device service is dispatched

#### Scenario: An installed package changes identity
- **WHEN** Marao's frontend assets are rebuilt or updated
- **THEN** the card Help destinations remain valid documentation routes
- **AND** hidden compatibility identities are not added to the public picker

### Requirement: Trustworthy native creation defaults
New-card defaults SHALL prefer compatible, available entities from HA's ordered unused candidates, then its ordered fallback candidates. Explicit candidate pools SHALL NOT be bypassed by scanning unrelated state. Missing, unknown or unavailable candidates SHALL be skipped. Exhausted pools SHALL produce an editable setup draft without guessed entities, sources or collection members.

#### Scenario: An available fallback follows an unusable candidate
- **WHEN** unused candidates contain an unavailable light and fallback candidates contain an available compatible light
- **THEN** the initial Light card binds the available fallback
- **AND** another light in the state registry is not selected instead

#### Scenario: A secondary supported domain is unused
- **WHEN** an unused compatible damper cover and an already-used fan are offered for a Fan card
- **THEN** the compatible unused candidate is preferred before the used fallback
- **AND** an access cover is never substituted for a normal fan or cover control

#### Scenario: No usable candidate exists
- **WHEN** both candidate pools are empty or contain only missing, incompatible, unknown or unavailable entities
- **THEN** the new card remains an editable unbound setup draft with localized guidance
- **AND** no unrelated state is discovered and no invented media source or collection membership is inserted

### Requirement: Semantically appropriate native suggestions
By entity suggestions SHALL use sufficient role-specific domain, device-class, unit and capability evidence. Generic compatibility alone SHALL NOT recommend specialized roles. Every suggested configuration SHALL retain the exact selected entity and existing action safeguards. Missing evidence SHALL omit the specialized suggestion while preserving its normal By card configuration path.

#### Scenario: A temperature sensor is selected
- **WHEN** the selected sensor reports temperature metadata and no appliance or energy role
- **THEN** generic sensor and applicable numeric/history suggestions remain available
- **AND** energy-period, weather-sensor fallback, dishwasher and washing-machine suggestions are absent

#### Scenario: A genuine energy sensor is selected
- **WHEN** the selected sensor has a recognized energy unit consistent with its device class
- **THEN** a valid energy-period suggestion is available for that exact sensor
- **AND** contradictory or missing role evidence does not create a guessed specialized binding

#### Scenario: A person is selected
- **WHEN** an existing person entity is selected
- **THEN** a People suggestion contains that person alone in its ordered member list
- **AND** no redundant primary entity field or additional discovered person is inserted

#### Scenario: An access point or incomplete app source is selected
- **WHEN** the selected entity is an access cover, lock or media player without a known app source
- **THEN** suggestions preserve the supported strict access behavior
- **AND** ordinary tap-based access opening or an invented app source is not suggested

### Requirement: Proven effective defaults in native editing
Marao SHALL declare only audited context-independent defaults whose omission matches their literal runtime value. On hosts consuming these declarations, omitted values and equal declared literals SHALL compare as effectively unchanged. Other explicit values, unknown data and structural changes SHALL remain distinguishable. Native Save/Cancel SHALL remain authoritative on all supported hosts.

#### Scenario: A setting returns to its omitted default
- **WHEN** a supported host consumes effective defaults and a user changes an omitted boolean setting away from and back to its proven default
- **THEN** the dialog recognizes no effective configuration change
- **AND** closing does not produce a false unsaved-change prompt or save the dashboard automatically

#### Scenario: A genuine draft contains distinct explicit data
- **WHEN** a user changes an explicit false, null, empty collection, action, target, unknown field, layout, visibility or popup ownership value
- **THEN** effective-default handling does not erase the distinction or dismiss a genuine draft
- **AND** Save and Cancel retain their native behavior and complete configuration preservation

#### Scenario: A host does not consume default declarations
- **WHEN** an older supported HA host does not use the effective-default callback
- **THEN** Marao retains that host's normal dirty-state and Save/Cancel behavior
- **AND** it does not patch native classes, disable warnings or claim native default-equivalence support

### Requirement: HA-language picker metadata
Marao-owned picker names and descriptions SHALL use HA's selected language once available, with browser language as an initial fallback. Subsequent newly created picker/editor surfaces SHALL use the current HA language. Refreshing metadata SHALL preserve registration identity, callbacks, other custom cards, active drafts, saved names and entity names.

#### Scenario: Browser and HA languages differ
- **WHEN** the browser language is English and HA's selected language is Portuguese
- **THEN** a newly opened Marao picker/editor shows Portuguese registration names and descriptions
- **AND** an existing custom card name is not translated or rewritten

#### Scenario: HA's language changes after registration
- **WHEN** HA's language changes and a new picker/editor surface is opened
- **THEN** Marao's registration text uses the new language without duplicate registrations
- **AND** suggestion callbacks and Help links remain intact, third-party metadata remains untouched, and existing dialogs are not forcibly remounted

### Requirement: Reproducible gallery authoring
Every supported current gallery card SHALL have a native-picker creation route and effective visual settings for its authored behavior. Existing legacy runtime details SHALL expose an editor without rewriting their saved identity, field aliases or unrelated options. HA SHALL retain outer Save/Cancel ownership; incompatible configurations SHALL remain correctable without weakening access safeguards.

#### Scenario: A user recreates an access popup
- **WHEN** the user adds Access for a lock and selects its built-in popup template
- **THEN** the editable native canvas contains an unlocking slider and safe locking button
- **AND** the full native child picker exposes independent Marao opener, close/lock and held Security action cards

#### Scenario: Effective gallery options are edited
- **WHEN** a user changes supported appearance/actions, a graph history source or energy page/detail presentation
- **THEN** the visual editor emits the complete updated parent configuration and the runtime uses that setting
- **AND** omitted defaults, aliases, opaque options and unrelated child data are preserved

#### Scenario: Existing detail and container cards are edited
- **WHEN** a user edits a timeline, energy/power detail, standalone popup, popup group action or legacy grouped grid
- **THEN** the shared or native visual editor exposes its effective settings and preserves its saved type
- **AND** grouped grids use HA's native stack/grid controls and popup contents use the existing independent Sections draft

#### Scenario: An incompatible example is corrected
- **WHEN** a legacy Light example is bound to a generic sensor instead of a Light entity
- **THEN** its primary entity can be corrected through the native selector
- **AND** the current gallery uses the existing compatible unknown/unavailable Light helpers instead of relaxing Light validation

#### Scenario: A guarded Lock example is recreated
- **WHEN** Security action is selected with a lock entity
- **THEN** its complete security hold dispatches only lock.lock to that selected lock
- **AND** opening services, alternate targets and secondary opening triggers are rejected in source and runtime validation
