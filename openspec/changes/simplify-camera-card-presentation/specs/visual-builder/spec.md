# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog-backed selectors and options
Add card SHALL offer the supported Marao catalog and appropriate entity domains,
with common and advanced controls. Applicable names, icons, labels, graph
settings, slider options, power units, climate labels, camera/provider options,
vacuum actions and navigation presentation SHALL reach runtime behavior.
Camera icon/state/label presentation options retired by the minimal camera
contract SHALL remain stored but SHALL NOT be offered as effective controls.

#### Scenario: A custom label or supported advanced setting is saved
- **WHEN** the builder saves a supported option
- **THEN** validation and generation preserve it and the shared renderer honors its documented effect

#### Scenario: A camera uses older presentation settings
- **WHEN** a camera with saved icon, state or label settings is opened in the visual editor
- **THEN** ineffective camera presentation controls are omitted
- **AND** an unrelated edit preserves those saved keys, provider settings, actions and unknown content
- **AND** supported presentation controls for other card families remain available

## ADDED Requirements

### Requirement: Discoverable camera title controls
Camera editing SHALL expose localized Title and Show title controls together
in the basic shared card form. They SHALL edit the existing `name` and
`show_name` fields in both the dashboard builder and native card editor.
Missing visibility SHALL be displayed as enabled without writing a default
merely by opening the form. Explicit false SHALL survive all editor and
generation round trips.

#### Scenario: An existing camera is opened without edits
- **WHEN** its configuration omits `show_name`
- **THEN** Show title is enabled and the preview uses the existing resolved name
- **AND** opening or closing the editor alone does not add fields, dirty the document or save configuration

#### Scenario: The user hides a named camera title
- **WHEN** Show title is turned off
- **THEN** the local draft sets `show_name` to false and the inert preview removes the title row
- **AND** the title text remains stored and editable without starting a stream

#### Scenario: Title settings pass through Visual and JSON
- **WHEN** a title-hidden camera is edited, duplicated, reordered, switched between Visual and JSON, saved and generated
- **THEN** its explicit false value and saved name survive
- **AND** unrelated fields, raw cards, event settings and other occurrences are preserved

#### Scenario: Unsaved title changes are discarded
- **WHEN** the user changes title text or visibility and discards the draft
- **THEN** the saved title configuration returns
- **AND** no Home Assistant entity setting or generated dashboard was changed by the unsaved edit
