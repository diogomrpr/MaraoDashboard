# Spec Delta

## ADDED Requirements

### Requirement: Concise shared summary action toolbars
Whole-group and section action toolbars SHALL omit the persistent sentence repeating action names, eligible counts and skipped-target details beneath their buttons. This SHALL apply to automatic and linked native groups for covers, lights and climate. Buttons SHALL retain localized visible text, accessible scope names and 48-by-48 minimum targets; reported service errors SHALL remain readable.

#### Scenario: A cover summary is opened
- **WHEN** a cover group or section displays its bulk controls
- **THEN** Open all and Close all remain labeled on their buttons with no eligibility/count/skipped sentence below them
- **AND** section headings and individual member states remain visible where configured

#### Scenario: Another toolbar uses the shared behavior
- **WHEN** a lighting or climate toolbar appears in an automatic popup or linked native view
- **THEN** its corresponding power-action buttons use the same concise presentation without a repeated explanatory row

#### Scenario: A service reports a failure
- **WHEN** a bulk action receives a reported service failure
- **THEN** the initiating toolbar displays the readable error without restoring the removed routine sentence or claiming physical success

### Requirement: Concise summary toolbars preserve action safety
Removing toolbar explanatory text SHALL NOT alter configured action scope, eligible-target calculation or dispatch. Filtering SHALL remain independent of action membership. Unavailable, unsupported and disconnected targets SHALL remain guarded; empty eligibility SHALL disable the action. Tap-based bulk opening SHALL continue excluding access points, and native previews SHALL dispatch no physical actions.

#### Scenario: Covers include a garage and unavailable blind
- **WHEN** Open all is activated for a group containing eligible ordinary blinds, a garage and an unavailable blind
- **THEN** only the eligible ordinary blinds receive the explicit opening service once
- **AND** the garage retains its individual strict slide and the unavailable blind receives no command

#### Scenario: A scope cannot act
- **WHEN** no member supports an action or the connection is lost
- **THEN** the corresponding control is disabled without adding a routine eligibility sentence

#### Scenario: A display filter hides inactive members
- **WHEN** a whole-group or section action is activated with inactive configured members hidden
- **THEN** the same deduplicated configured scope and capability checks apply as before the presentation change
- **AND** the action neither discovers additional members nor repeats a completed dispatch
