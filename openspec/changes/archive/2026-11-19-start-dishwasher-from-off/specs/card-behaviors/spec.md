## MODIFIED Requirements

### Requirement: Dishwasher cycle sheet
A visible control on the Dishwasher card SHALL open its own bottom sheet. The sheet SHALL show the reported appliance state, progress, finish time or remaining duration, active program and refill warnings when applicable. The native editor SHALL expose optional bindings for program selection, power, start delay, wash options, door state, remote permissions, child-lock status and Stop.

#### Scenario: Prepare and start
- **WHEN** the dishwasher is already on and the user chooses a program or configures supported cycle options
- **THEN** the card sends only the requested setting and waits for the appliance to confirm the selected program
- **AND** Start requires explicit enablement, a ready and connected appliance, a closed or locked door and a confirmed program from its Home Connect selected-program control
- **AND** configured power and remote permissions must permit the action before the card asks Home Connect to start the selected program

#### Scenario: Choose a program while the dishwasher is off
- **WHEN** a connected Home Connect dishwasher reports power off and offers programs
- **THEN** the sheet lets the user choose a program locally without sending an appliance command
- **AND** a single explicit Start can wake the dishwasher using its configured Home Connect power switch
- **AND** the card waits for reported power on and Ready, checks the chosen program, door, connection and configured remote permissions again, and submits at most one start for the chosen program
- **AND** failed or expired requests or lost interlocks cannot start a cycle later without a new Start from the user

#### Scenario: Follow or stop a cycle
- **WHEN** a cycle is active
- **THEN** the sheet displays reported cycle information and disables power-off and program selection
- **AND** when a usable Stop button is configured, a separate confirmation is required before sending Stop

#### Scenario: Monitoring-only configuration
- **WHEN** a dashboard has only the existing operation and reading bindings
- **THEN** the card and sheet show the reported readings, and those bindings authorize no appliance commands
