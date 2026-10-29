# Proposal

## Why

Media-page app shortcuts were made compact, but generated Apple TV popups still use a separate native two-column grid. Six apps therefore occupy three oversized rows inside the sheet.

## What Changes

- Use the existing responsive Marao control grid with three preferred app columns in generated media popups.
- Reuse the existing logo-only 80px minimum and narrower-host reflow.
- Cap visible app surfaces at 80px square with rounded corners, centered inside their cells, following the user's 2026-10-28 size refinement.
- Preserve ordered app names, sources, launch actions, availability feedback and remote controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Compact three-column media-popup app shortcuts, consistent with media-page app sections.

## Impact

Generator presentation defaults, camera-independent media documentation, and targeted generator expectations. Existing saved inputs remain supported without conversion; no app configuration fields change. Owned popups regenerate through the normal integration lifecycle. Explicit manually authored grids retain their selected columns. Archived generated history remains unchanged.
