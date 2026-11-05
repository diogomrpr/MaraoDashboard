# Proposal

## Why

The media card currently requires a tap to reach its playback or Apple TV remote controls. Users who keep a player on their dashboard want those controls available immediately, using the same app and remote configuration they already maintain.

## What Changes

- Add a per-media-card **Display** setting: **Popup** or **On dashboard**. Popup remains the default when the setting is absent.
- On dashboard replaces the compact popup entry with an expanded panel containing player information and the existing supported playback controls. Apple TV adds its configured app shortcuts, directional remote and volume controls.
- Include a dedicated **Now playing** card or section above the controls: current title, artist or other reported media details, playback state and available artwork, honoring the artwork setting. Update it live and show clear empty/unavailable states instead of stale media.
- Reuse the same control definitions, service targets, short/long press behavior, artwork and availability/error handling in both presentations. The inline panel has no popup close button, overlay or background scroll lock.
- Recommend placing the expanded panel in a one-column section. Preserve the user's section configuration, card order and other cards rather than rearranging the dashboard automatically.
- Preserve existing saved cards, explicit custom actions, external popup ownership and ordered app options. No source format migration or new dependencies.

Non-goals: redesigning the remote, adding media services, changing app icon sizes, changing other popup families, or modifying the frozen legacy Python integration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: optional dashboard presentation for media detail controls, including localized editor selection, shared controls and compatible popup ownership.

## Impact

Affected cards: `md_media_card`, its generated media/Apple TV control composition and embedded `md_media_app_card` instances. Shared controls retain their current contracts.

The active native frontend path is `frontend_src/compile-dashboard.js`, the catalog-backed Visual/JSON editor and shared Marao runtime. Update its configuration validation/schema, English/Portuguese labels, media usage documentation and narrow existing editor/compiler/runtime tests. Existing published configurations with no display field must retain their source and compiled popup behavior. Raw Home Assistant cards, protected custom content, archived history and unrelated HA settings remain unchanged. This change adds an optional field rather than bumping the source format, package version or config-entry version.

## Follow-up: Tap-only built-in media buttons

Remove the automatically generated 1.2-second long commands and progress feedback from Apple TV directions and Select in both popup and inline content. Each built-in media button sends its ordinary command once per tap. Keep explicit authored custom holds and shared security safeguards; no persisted dashboard rewrite or package/config version change is needed. Align the shared native factory, Python generation and existing safe gallery examples without changing historical fixtures.

## Follow-up: App shortcut feedback and wake

App shortcuts need a default launch action when no custom tap action is supplied. Give enabled app taps one strong haptic, turn on an off player before selecting its app, and skip redundant power-on for an already-on player. Stop after a failed wake or a stale/unavailable owner/target, reporting native errors through the shared action owner. Keep custom explicit tap actions, app sources/artwork and saved configuration unchanged.
