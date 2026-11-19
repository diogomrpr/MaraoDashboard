# Dishwasher cycle controls

## Why

The Dishwasher card already showed cycle progress and refill warnings. A user with a compatible Home Connect dishwasher also needs to choose a program, prepare the next wash and stop a running cycle from the dashboard.

## What Changes

- Open a mobile sheet from the Dishwasher card to see appliance status and use its configured controls.
- Offer the programs reported by the appliance. Optional bindings expose power, start delay, wash options, remote permissions, child-lock status and a confirmed Stop action.
- Require explicit start permission and check the reported appliance state before sending the Home Connect start command. Existing monitoring configurations retain their readings and authored actions.
- Demonstrate selection, start and confirmed stop with simulated entities in the documentation and disposable test gallery.
