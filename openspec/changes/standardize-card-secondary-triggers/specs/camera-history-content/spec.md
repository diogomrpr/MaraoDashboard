# Spec Delta

## MODIFIED Requirements

### Requirement: Project-owned background history trace
Graph-enabled cards SHALL use the shared Marao 24-hour trace from Recorder history
and authoritative live numeric state, without nested native history-graph or external
card resources. Optional line/fill/color/background tint SHALL preserve readable
primary content. Empty or failed history SHALL leave the trace neutral, not fabricate a flat line.

#### Scenario: History is empty while the live sensor is valid
- **WHEN** a graph card renders
- **THEN** the current reading and any control remain usable with a localized empty state and neutral background trace

#### Scenario: A toggle graph opens history
- **WHEN** the user activates its History control
- **THEN** the numeric source's detail opens without dispatching a toggle or the configured card action
- **AND** its actual toggle target retains independent state and availability handling

#### Scenario: Additional project-owned background history trace contracts
- **WHEN** a numeric graph card renders with configured history options
- **THEN** Compact previews SHALL remain non-interactive. Builder-supported switch/climate history and toggle graphs SHALL provide a compact icon-circle History trigger, without an additional full-width History row or replacement of primary card actions. Dedicated graph cards SHALL retain their primary history activation.

## ADDED Requirements

### Requirement: Compact history triggers preserve detail behavior
Changing the history opener SHALL preserve configured source selection, lazy chart loading, empty/loading/error states, explicit retry, graph formatting and current popup ownership. Opening history SHALL send no device service. Back and Close SHALL restore the parent content, scroll and focus to the current opener. Preview cards SHALL remain non-interactive.

#### Scenario: A switch graph uses a separate power entity
- **WHEN** its new icon or default hold opens history
- **THEN** the sheet shows the existing configured power source rather than the switch's binary state
- **AND** no toggle request is sent

#### Scenario: The shared history sheet closes
- **WHEN** the user returns from history in a group popup or standalone card
- **THEN** parent content and scroll remain intact and focus returns to the matching compact trigger or valid fallback

#### Scenario: History fails to load
- **WHEN** the graph request or chart import fails
- **THEN** the existing readable failure and explicit retry remain available without a device action
- **AND** the error is not concealed by removing the large History row
