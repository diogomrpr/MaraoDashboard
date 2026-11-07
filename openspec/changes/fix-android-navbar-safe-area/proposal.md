# Fix Android navbar safe-area spacing

## Why

The supplied Android screenshot shows Marao's navbar overlapping the system navigation buttons. The shared bottom-gap helper uses a fixed 24px outside iPhone/iPod, ignoring the reported space reserved for Android's system bar; the phone's actual reported inset has not been inspected.

## What Changes

- Add the resolved bottom safe-area inset to the existing 24px gap on non-iPhone devices, preserving the accepted iPhone/iPod calculation.
- Retain live CSS inset resolution and the existing explicit-zero precedence, without guessed device offsets or user settings.
- Keep navbar placement, page clearance, touch barrier, refresh feedback and popup/maintenance spacing on the shared helper.
- Document the Android clearance contract and protect it with the existing targeted navbar regression tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: extend **Floating navbar** to require non-iPhone bottom clearance of 24px plus the resolved safe-area inset, including dynamic and zero-inset cases.

## Impact

Runtime: the shared `MaraoNavigation.js` bottom-gap helper and its existing consumers, including dashboard/standalone navigation, ordinary popup sheets and maintenance. Tests: the existing navbar unit file. Documentation: the dashboard quality guide and this change's artifacts. Existing gallery/realistic pages remain sufficient.

Builder, validation, generator, theme tokens and translations need no edits: no configuration fields, labels, public APIs, generated structures or persisted defaults change. Supported saved configurations retain their data and require no migration. App/Android settings, new dependencies, fixture expansion, browser campaigns and publication are out of scope.
