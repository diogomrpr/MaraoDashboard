# Proposal

## Why

The reviewed Plex design needs a compact library opener as an alternative to full dashboard shelves. A failed shelf currently colors the entire library, obscuring healthy content.

## What Changes

- Apply the reviewed poster-stack opener, without counters or a lower strip, and open the complete existing library in its normal popup.
- Add an optional `apple_tv.plex.display` choice: `inline` or `popup`, preserving full shelves when omitted.
- Keep all request and artwork errors local to their shelf; a failed library root produces three distinct shelf errors.
- Add the dedicated Plex documentation reference and real-runtime fictional galleries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Plex library presentation and shelf-local error handling.

## Impact

Plex renderer/model, Media composition, existing Plex options editor, authoring metadata, documentation and scoped checks. No dependencies or migrations. Existing disabled Plex settings, bindings, unknown fields, custom popups and unrelated settings remain intact. Compared against v0.33.4: omission keeps full shelves, with mode edits saved only through explicit native edits. All actions, server/profile selection and private artwork boundaries are preserved.
