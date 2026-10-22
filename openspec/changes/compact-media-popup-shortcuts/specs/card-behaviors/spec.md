# Spec Delta

## MODIFIED Requirements

### Requirement: Media and Apple TV controls
Media SHALL show localized player state and optional readable background artwork,
with generated generic playback or Apple TV popups. Apple TV SHALL support configured
remote, optional volume remote and compact app shortcuts in three preferred columns,
reflowing on hosts too narrow for the existing 80px logo-cell minimum. Icon-only controls
SHALL retain semantic names. Relative rewind/forward SHALL compute authoritative
position plus elapsed playback, then clamp to duration and send numeric data.
App cards SHALL use `hc_media_app_card` and select the configured source.
App shortcuts SHALL show full-card square app artwork without a visible title or
normal player-state line, retaining semantic app names and visible problem reasons.
Bundled brand artwork SHALL include MEO (also recognized as MEO Go); unknown apps
SHALL retain their configured icon. Saved source values and custom names remain unchanged.

#### Scenario: Rewind is requested near the start of playback
- **WHEN** the relative offset would be negative
- **THEN** exactly one seek uses a numeric target clamped to zero


#### Scenario: A media popup contains six app shortcuts
- **WHEN** the popup has room for three 80px app cells and their gaps
- **THEN** its six shortcuts form two rows using the shared responsive app layout
- **AND** their names, source values, order and launch actions remain intact

#### Scenario: App shortcuts respond as buttons
- **WHEN** an enabled shortcut is hovered with a pointer
- **THEN** it shows a hand cursor, a themed edge over its artwork and a slight lift
- **WHEN** an enabled shortcut is pressed with pointer or touch input
- **THEN** it shows the themed edge and a short compression, while disabled shortcuts receive no interactive treatment
