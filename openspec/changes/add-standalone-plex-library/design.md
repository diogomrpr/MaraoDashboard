# Design

Register the new catalog identity through the existing native wrapper. Compose directly to MaraoPlexWatchCard and reuse its existing sheet lifecycle. Keep the established apple_tv.plex shape, avoiding conversion or duplicate playback implementation. A missing library shows the existing setup guidance; Plex setup requires an enabled configuration and validates before Save. Existing Media setup keeps its optional enabled toggle. Include the independent type in same-server target discovery. Documentation uses the real native wrapper rather than a preview-only child substitution.

Starting commit: 331292ccdb94ded3384d6f68ff5a24b5c4a85243. Work only in the isolated card preview. Consumer scope: standalone Plex library and owned library popups; compatibility with existing Media library sections. No deployment or release is authorized by the preview request.
