# Standalone Plex library

## Why
Plex Library has a dedicated documentation page but can only be configured as a child of a Media player card. Users must be able to add the library itself.

## What changes
- Add the public native `custom:marao-plex-library-card` identity and picker/editor entry.
- Select an Apple TV and configure Plex/Rivulet through Plex setup without media controls.
- Reuse the existing library renderer for inline shelves and compact popup mode, including all owned library sheets.
- Copy standalone YAML from the existing documentation gallery; stop substituting a child renderer for a Media card.

## Compatibility and scope
The additive type reuses `entity_id`, `name` and `apple_tv.plex` with unchanged defaults, references and opaque data. Existing released Media card YAML and its embedded Watch section remain supported and are never rewritten. This changes the prior owned-only design by adding independent placement. The runtime owner, playback validation, cancellation, privacy and shelf errors remain shared. No backend service or persisted migration is introduced. Legacy source generators may preserve the native card as authored raw YAML; their old Media descriptors retain their existing behavior.

## Acceptance
The picker lists Plex library; its native editor exposes Apple TV and Plex setup. Both display modes compose only the library, without a Now playing summary or remote controls. Multiple standalone cards provide TV switching. Gallery exports load the actual public type. Existing Media configurations still compose their owned section unchanged.
