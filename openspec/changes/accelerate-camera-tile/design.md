## Playback

Use the released shared player and existing native and Frigate transport adapters. Try one source at a time. Use Frigate first for cold tile playback where the entity and browser support it, while popup playback retains its independent binding. In the same browser session, prefer a recently successful, quicker transport for the same source and quality. Remember timings only after video advances. Do not persist or share playback metadata or signed URLs. Bound attempts with alternatives, and preserve the existing final-attempt timeout and retry.

## Configuration

Use optional `variables.stream_quality` (auto, low, high), `variables.low_stream_entity` or `variables.frigate_low_stream`. Auto and Low prefer the alternate low source when configured. High uses the primary camera only. Home Assistant camera state does not expose reliable ranked Frigate resolutions. Use an explicitly assigned entity or Frigate stream name on the primary camera's authenticated instance. Leave unconfigured cards and event bindings intact. The generated popup remains independent from tile options.

## Validation

Test source selection, exact signed route, and configuration round trips without opening streams. Install the candidate on disposable HA. The project's camera verification policy leaves actual Safari startup timing, decoded resolution, and missing or slow live-source recovery to manual playback.
