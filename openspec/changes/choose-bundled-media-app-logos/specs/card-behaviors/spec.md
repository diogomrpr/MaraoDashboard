# Spec Delta

## MODIFIED Requirements

### Requirement: Media and Apple TV controls
Media SHALL show localized player state and optional readable background artwork,
with generated generic playback or Apple TV popups. Apple TV SHALL support configured
remote, optional volume remote and compact app shortcuts in three preferred columns,
reflowing on hosts too narrow for the existing 80px logo-cell minimum. Icon-only controls
SHALL retain semantic names.

#### Scenario: Rewind is requested near the start of playback
- **WHEN** the relative offset would be negative
- **THEN** exactly one seek uses a numeric target clamped to zero

#### Scenario: A media popup contains six app shortcuts
- **WHEN** the popup has room for three 80px app cells and their gaps
- **THEN** its six shortcuts form two rows using the shared responsive app layout
- **AND** their names, source values, order and launch actions remain intact

#### Scenario: App shortcuts respond as buttons
- **WHEN** an enabled shortcut is hovered with a pointer
- **THEN** it shows a hand cursor, a soft themed shadow around its rounded surface and a slight lift
- **WHEN** an enabled shortcut is pressed with pointer or touch input
- **THEN** it shows a softer outer shadow and a short compression, while disabled shortcuts receive no interactive treatment

#### Scenario: Additional media and Apple TV controls contracts
- **WHEN** a configured media player or app shortcut is rendered or activated
- **THEN** Relative rewind/forward SHALL compute authoritative
position plus elapsed playback, then clamp to duration and send numeric data.
- **AND** App cards SHALL use the current Media app role (`md_media_app_card`, retaining supported historical `hc_media_app_card` compatibility) and select the configured source.
- **AND** App shortcuts SHALL show full-card square app artwork without a visible title or
normal player-state line, retaining semantic app names and visible problem reasons.
- **AND** Bundled brand artwork SHALL include MEO (also recognized as MEO Go); without an explicit logo choice, unknown apps SHALL retain their configured icon.
- **AND** Saved source values and custom names remain unchanged.

## ADDED Requirements

### Requirement: Selectable bundled media app logos
Every Marao installation SHALL offer an App logo chooser for standalone Media app cards and nested media app shortcuts. It SHALL include Automatic, Netflix, Spotify, YouTube, Disney+, Prime Video, Apple TV, Plex and MEO. Artwork SHALL be supplied by the installed package without external image requests or disposable-instance assets. Control labels SHALL be localized.

#### Scenario: A new user configures a standalone shortcut
- **WHEN** a user opens the native editor for a Media app card after installing Marao
- **THEN** all eight named logos and Automatic are available without file uploads, manual asset URLs or another card package
- **AND** selecting a logo is reflected in the card preview without dispatching a source command

#### Scenario: A nested shortcut is configured
- **WHEN** a user adds or edits an app in a media card's Apple TV options
- **THEN** the same logo choices are available
- **AND** the selected logo is used by that app in both popup and inline media layouts

### Requirement: Independent media app artwork selection
An explicit `variables.app_logo` on a standalone app card or `logo` on a nested app entry SHALL select the corresponding bundled logo independently of the launch source. Allowed IDs SHALL be `netflix`, `spotify`, `youtube`, `disney-plus`, `prime-video`, `apple-tv`, `plex` and `meo`. An omitted or empty choice SHALL retain automatic matching; unsupported nonempty choices SHALL produce a readable configuration error without rewriting saved data.

#### Scenario: A custom source uses a bundled logo
- **WHEN** a shortcut with source `Custom TV app`, custom name and configured fallback icon selects `netflix`
- **THEN** the shortcut shows the packaged Netflix artwork and its associated normal app surface
- **AND** activating it once sends the original source `Custom TV app` to the original player exactly once
- **AND** the semantic name still uses the configured name and availability problems still take precedence over brand presentation

#### Scenario: Automatic restores existing artwork behavior
- **WHEN** a user changes an explicit logo choice to Automatic
- **THEN** the explicit override is cleared and artwork is matched from the source using existing aliases, including MEO Go
- **AND** an unrecognized source uses its configured fallback icon without substituting a logo based on an unrelated custom display name

#### Scenario: A logo identifier is unsupported
- **WHEN** a nonempty unsupported logo identifier is supplied in YAML
- **THEN** a readable configuration error identifies the invalid choice
- **AND** the saved value is not replaced, used as an arbitrary image URL or interpreted as a launch source

### Requirement: Lossless media app logo configuration
Logo edits SHALL preserve source strings, custom names/icons, app order, explicit empty lists, actions, native layout/visibility and unknown fields. Older configurations without logo options SHALL retain their existing presentation without migration or automatic dashboard writes. Shared composition and supported generation paths SHALL carry explicit logo choices into rendered app shortcuts.

#### Scenario: A saved shortcut has no logo option
- **WHEN** an existing released configuration is rendered or opened in the native editor
- **THEN** its existing automatic logo or configured-icon fallback remains unchanged
- **AND** opening or rendering alone does not insert an option or rewrite the saved dashboard

#### Scenario: Only an app logo is changed
- **WHEN** a user saves a logo choice on a standalone or nested shortcut that also has unknown fields and custom settings
- **THEN** only the requested logo choice changes in the complete emitted configuration
- **AND** cancelling an unconfirmed edit leaves the saved configuration unchanged

#### Scenario: App options are composed into controls
- **WHEN** media shortcuts with explicit logo choices are composed for inline, popup or supported generated presentation
- **THEN** each rendered shortcut retains its logo choice, source, name, fallback icon and original position
- **AND** an explicitly empty app list remains empty
