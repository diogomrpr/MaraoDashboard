# Proposal

## Why
The white-temperature control is a color scale, not progress. Users also want an optional active card background matching the light without larger cards.

## What Changes
- Hide only the temperature slider fill, retaining its gradient, thumb and dispatch behavior.
- Add per-light `variables.use_light_color`, default false, to the shared generator/native catalog.
- Use authoritative HA RGB (including converted white temperature) for enabled, on lights; choose contrasting text/icons. Preserve neutral off/problem states and fallback palette.

## Capabilities
### Modified Capabilities
- `card-behaviors`: optional reported-color light backgrounds and temperature-scale presentation.

## Impact
Shared light cards, lazy picker, editor catalog, EN/PT labels and docs. All generated/native/popup consumers share the runtime. Starting commit a7e7b1411b08fb5106498f1eba22fc9f379c5ed2; clean baseline /private/tmp/marao-light-background.json. Existing variable forwarding and unknown-field preservation keep released configurations unchanged; absent/false means legacy appearance, no migration or version bump. Verify small targeted color/option assertions and install once on disposable 192.168.0.28; no release or browser matrix.
