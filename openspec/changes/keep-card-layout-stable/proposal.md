## Why

State changes currently insert error, pending and metadata rows, remove controls,
and exchange charts for shorter loading messages. This moves nearby cards and can
clamp the dashboard's scroll position.

## What changes

- Keep each configured card's composition stable across loading, ordinary updates,
  missing/unavailable entities, reported errors and recovery.
- Replace secondary information with concise feedback; expose full details on tap.
- Reserve the normal plot/control footprint during asynchronous work.
- Apply the same rules inside sheets. Deliberately expanding event lists remains
  allowed. Screen width, text size and explicit configuration changes still reflow.

## Capabilities

### Modified capabilities
- `mobile-theme-layout`: stable state-dependent card geometry.

## Impact

All Marao-owned card families, native wrappers, section grids and popup consumers.
No persisted fields, service contracts, generated ownership or migration changes.
Existing saved configurations retain their selections, customizations and actions.
Third-party/raw native HA cards remain owned by their original implementations.
No release, new dependency, or blanket fixed card height is included.
