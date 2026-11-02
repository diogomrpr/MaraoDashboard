# Camera streams and recorded events

Camera cards use explicit Home Assistant entities. `entity_id` selects the dashboard stream and event identity; optional `variables.popup_stream_entity` selects popup video and otherwise falls back to that entity. Native card forms expose camera selectors and preserve other options. Composition places an untitled camera above the shared recorded-events browser.

Playback uses HA's `ha-camera-stream`, its native WebRTC/fallback behavior and authenticated signaling. Marao does not discover quality variants, probe speed or implement an HLS engine. Fullscreen reuses the native video where supported, with the existing full-window dialog fallback, and restores listeners/controls on exit without forcing orientation.

Each stream occurrence owns its async work. Visibility, inert state, removal and changed targets release playback resources. Retired results must not reactivate an old host. Per-offer signaling ownership and cancellation remain separate from the primary HA connection. Do not read or patch private player engine fields.

Marao owns the visible poster and loading/retry presentation. Metadata/theme updates retain active media. Autoplay rejection exposes Start live view; reported terminal errors remain readable. Do not hide errors or claim a playing event alone proves decoded video advancement.

Standalone and popup events share `MaraoFrigateEventsCard.js` and `MaraoEventModel.js`. Source contexts, merged identities, bounded metadata/preview requests, filters and detail restoration stay shared. Frigate, Protect and native Netatmo metadata have different timestamp/type availability; retain unknown metadata without parsing localized titles into invented facts.

## Verification boundary

Camera playback and transport acceptance are permanently manual-only under the root contract. Do not run synthetic live/slow-link/latency, HLS transport, native handoff or cancellation checks, including inside full or upgrade runs. Keep configuration, provider metadata, security and data-preservation checks where relevant. Existing accepted transport diagnostics remain historical exceptions, not passing tests.

Safe synthetic fixtures can support a user's manual work, but only the disposable instance at `192.168.0.28` is authorized for agents. Never inspect production cameras or actuate privacy controls. Public documentation examples use fictional metadata and sample assets; they do not prove network playback or real-phone behavior.
