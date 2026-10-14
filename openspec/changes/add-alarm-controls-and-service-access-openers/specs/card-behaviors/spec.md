## ADDED Requirements

### Requirement: Capability-aware alarm controls
An alarm sheet SHALL display authoritative state and only advertised arming modes. Disarm and custom bypass SHALL require a completed 1.2-second hold; other arming modes SHALL use explicit taps. Unsupported, unknown, unavailable and disconnected targets SHALL not dispatch actions.

#### Scenario: A panel supports Away and Night
- **WHEN** its alarm sheet opens
- **THEN** Away, Night and Disarm are offered without unsupported modes

#### Scenario: A disarm hold is cancelled
- **WHEN** the user releases early, moves outside, closes the sheet or loses availability
- **THEN** no disarm service is called

### Requirement: Transient alarm PIN
Required numeric or text codes SHALL use a masked field, remain only in memory and clear after an attempt, closing, target change or disconnection. Codes SHALL not enter saved JSON, generated YAML, notifications or logs. Reported service errors SHALL remain readable without exposing entered codes.

#### Scenario: An alarm rejects a entered code
- **WHEN** a completed action receives an error
- **THEN** the code is cleared and a readable error appears without retry or false state confirmation


### Requirement: Imported appliance action and warning semantics
Dishwasher warnings SHALL recognize configured sensor attention states as well as binary on/off values. Vacuum segment actions SHALL retain explicitly supplied native command data and always target the selected vacuum. Absent command data SHALL retain the existing shorthand.

#### Scenario: The original refill sensor reports confirmed
- **WHEN** a configured salt sensor reports confirmed
- **THEN** the dishwasher displays its warning and attention surface

#### Scenario: An imported vacuum uses structured segment parameters
- **WHEN** its segment action is activated
- **THEN** its native command and params structure is dispatched once to the selected vacuum
