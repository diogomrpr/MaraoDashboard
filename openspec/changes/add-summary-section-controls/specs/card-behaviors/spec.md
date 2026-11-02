# Spec Delta

## ADDED Requirements

### Requirement: Ordered summary member sections
Entity Group details SHALL support optional ordered named sections of explicitly assigned members. Each member SHALL appear once; unassigned members SHALL remain in a trailing localized Other section when named sections exist. Without named sections, the list SHALL remain flat. Summary counts SHALL continue using the complete deduplicated membership.

#### Scenario: Members are divided by floor
- **WHEN** a summary assigns lights to Ground floor and First floor and leaves another light unassigned
- **THEN** those sections appear in configured order followed by Other, with member order preserved within each section
- **AND** no entity is discovered or added by its HA floor or area

#### Scenario: A filter empties a section
- **WHEN** Active only hides every member of a configured section
- **THEN** its heading, scoped actions and localized empty explanation remain available
- **AND** filtering neither changes assignments nor removes inactive members from action targets

### Requirement: Summary and section action placement
Controllable summaries SHALL show whole-summary actions below the detail title and before all sections, and scoped actions at the top of each section. Controls SHALL have localized explicit labels, semantic action/scope names, visible 48-by-48 minimum targets and strong haptics. They SHALL wrap at narrow widths and enlarged text without covering close/navigation controls.

#### Scenario: A lighting summary opens on a narrow phone
- **WHEN** the detail sheet has multiple floor sections
- **THEN** Turn on all and Turn off all appear above the sections and at each section heading
- **AND** each control identifies whether it targets the whole summary or that floor

#### Scenario: A read-only summary opens
- **WHEN** a battery summary contains named sections
- **THEN** the ordered sections and normal battery readings appear without fabricated power/action controls

### Requirement: Filter-independent bulk action membership
Whole-summary actions SHALL use all configured members; section actions SHALL use only that section's members, independently of the display filter. Dispatch SHALL use deduplicated explicit entity targets and current availability/capability guards, never area/floor/domain-wide discovery. Skipped members and eligible target counts SHALL be readable before activation. Actions SHALL be disabled when no eligible targets exist.

#### Scenario: Turn on all includes currently hidden lights
- **WHEN** Active only shows one on light while two configured lights are off
- **THEN** whole-summary Turn on all targets all three eligible lights
- **AND** a floor action targets only its assigned eligible lights, never another section or an unconfigured light

#### Scenario: Some targets cannot act
- **WHEN** a scope includes usable, missing, unknown, unavailable or unsupported members
- **THEN** usable supported members remain actionable, excluded members are explained, and no excluded target is sent
- **AND** loading or disconnection disables physical actions using the existing native connection treatment

### Requirement: Explicit domain actions for summaries
Lights SHALL expose explicit Turn on all and Turn off all actions. Climate summaries SHALL expose supported power-on and power-off actions using each member's existing capability rules, without inventing an HVAC mode, temperature or shared setpoint. Unsupported climate targets SHALL be excluded visibly. Bulk actions SHALL NOT use toggle or execute arbitrary per-member alternate action scripts.

#### Scenario: Mixed climate capabilities
- **WHEN** climate members differ in their supported power actions
- **THEN** each bulk power control includes only members supporting that action, retaining individual mode and target controls
- **AND** an ambiguous unsupported start mode is not guessed

### Requirement: Separate summary cover open and close actions
Cover summaries and cover sections SHALL expose separate Open all and Close all controls using explicit supported cover actions. Tap-based Open all SHALL exclude access-classified doors, gates and garages and visibly explain their individual slide requirement. Close all SHALL include supported safe closing targets. Individual access controls SHALL retain their strict slides and cancellation behavior.

#### Scenario: Ordinary blinds are grouped by floor
- **WHEN** Open all or Close all is activated at the summary or floor heading
- **THEN** the explicit corresponding action targets every eligible cover in that scope exactly once, regardless of filtering
- **AND** open-only covers are excluded from Close all

#### Scenario: A garage is mixed with ordinary blinds
- **WHEN** Open all is displayed or activated
- **THEN** the garage is identified as requiring its individual slide and is never included in the tap action
- **AND** a scope with only access covers has no enabled tap-based opening path

### Requirement: Bulk action dispatch and reported failures
Bulk activation SHALL acknowledge immediately, issue each target/action pair at most once and keep observed state HA-authoritative. Reported failures SHALL remain readable at the initiating scope with affected targets and partial results where known. Automatic retries SHALL NOT occur. Previews and native edit mode SHALL remain inert; duplicate summaries SHALL retain independent sheet ownership.

#### Scenario: One service batch fails
- **WHEN** a multi-batch action receives a reported failure after another batch is accepted
- **THEN** the initiating summary or section shows that failure without claiming physical success or rolling back accepted actions
- **AND** successful batches are not automatically resent

#### Scenario: State changes while dispatch is pending
- **WHEN** filtering removes a member after an action starts
- **THEN** the initiating section and feedback remain stable and the state update does not dispatch another action

#### Scenario: A preview toolbar is activated
- **WHEN** the card is in native editing or preview mode
- **THEN** no service call occurs
