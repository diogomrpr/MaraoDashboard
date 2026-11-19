# Start a dishwasher from its power-off state

## Why

The cycle sheet currently requires a separate power-on action before a program can be chosen. A dishwasher that reports its available programs in standby can accept a single explicit request to wake and start the chosen cycle.

## What changes

The sheet remembers the program choice locally while power is off. Start uses the existing dishwasher bindings to turn on the appliance, waits for Home Assistant to report that it is ready, then starts the intended cycle once. Existing monitoring configurations and the powered-on workflow keep their current behavior.
