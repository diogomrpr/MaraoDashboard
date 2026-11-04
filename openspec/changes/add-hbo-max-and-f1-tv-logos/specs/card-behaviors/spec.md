# Spec Delta

## ADDED Requirements

### Requirement: HBO Max and F1 TV automatic artwork
Marao SHALL recognize the exact media app sources `HBO Max` and `F1 TV` and display their corresponding bundled logos. Matching SHALL use existing case/punctuation normalization and exact normalized aliases. Supported aliases SHALL include `Max`, `HBO Max: Stream Movies & TV` and `F1 TV: Stream F1® Live`. Artwork matching SHALL NOT rewrite the source used to launch an app.

#### Scenario: An existing HBO Max shortcut has no override
- **WHEN** a saved shortcut has source `HBO Max` and an omitted or empty logo override
- **THEN** it shows the bundled HBO Max artwork automatically
- **AND** its display name, player target and exact launch source `HBO Max` remain unchanged

#### Scenario: An existing F1 TV shortcut has no override
- **WHEN** a saved shortcut has source `F1 TV` and an omitted or empty logo override
- **THEN** it shows the bundled F1 TV artwork automatically
- **AND** its display name, player target and exact launch source `F1 TV` remain unchanged

#### Scenario: A verified alias identifies one of the new brands
- **WHEN** a source is `Max`, `HBO Max: Stream Movies & TV` or `F1 TV: Stream F1® Live`, including case/punctuation-normalized equivalents
- **THEN** the corresponding HBO Max or F1 TV artwork is selected
- **AND** the original source string remains the launch value

#### Scenario: An unrelated source resembles an app name
- **WHEN** a source is `HBO`, `F1` or another unrecognized value without an explicit logo choice
- **THEN** it retains the configured icon fallback without a partial-name or prefix match
- **AND** an unrelated recognized display name does not override an explicit unrecognized source

### Requirement: HBO Max and F1 TV selectable logos
The existing App logo chooser SHALL additionally expose `HBO Max` with ID `hbo-max` and `F1 TV` with ID `f1-tv` for standalone and nested media app shortcuts. Existing fields, Automatic and all eight prior brands SHALL remain supported with their original IDs and relative order. Explicit choices SHALL retain the current source-independent behavior and normal problem/availability precedence.

#### Scenario: A user selects one of the additional logos
- **WHEN** a user chooses `hbo-max` or `f1-tv` through standalone `variables.app_logo` or nested app `logo`
- **THEN** that choice is accepted, persists through an ordinary native card save and renders in standalone, popup and inline app shortcuts
- **AND** app order, custom names/icons, exact sources, actions, unknown fields and native layout/visibility remain preserved

#### Scenario: Existing and automatic settings are loaded
- **WHEN** a saved configuration uses an existing logo ID, an omitted/empty override or an explicitly empty app list
- **THEN** those settings remain valid and are not rewritten or repopulated
- **AND** returning a new explicit logo choice to Automatic restores the existing source-matching behavior

#### Scenario: Artwork is selected in a disabled shortcut
- **WHEN** an app shortcut with either new logo has a missing, unknown, unavailable or disconnected target
- **THEN** the current neutral problem presentation and disabled action guards take precedence
- **AND** no logo selection or rendering dispatches a device action

### Requirement: Distributed HBO Max and F1 TV artwork provenance
Both new logos SHALL be included in the installed Marao package and its HACS distribution, without external runtime artwork requests or household/test-instance files. Artwork provenance SHALL document the publisher/app identity, source page and exact image URL, actual retrieval date, ownership notes and any image preparation consistently with existing bundled app artwork.

#### Scenario: A user installs the ordinary distribution
- **WHEN** a user installs Marao through its existing supported package without separately adding logo files
- **THEN** both automatic matches and both explicit logo choices resolve to artwork supplied by that installation
- **AND** all eight original logo choices remain available

#### Scenario: A maintainer reviews the new assets
- **WHEN** a maintainer reads the bundled artwork sources document
- **THEN** each new image has traceable publisher provenance and its actual retrieval/preparation details
- **AND** metadata lookup or artwork download is not performed while the dashboard runs
