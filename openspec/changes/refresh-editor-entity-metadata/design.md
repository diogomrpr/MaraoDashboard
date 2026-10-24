# Design

Home Assistant's supplied `hass.entities`, `hass.areas` and `hass.devices` collections already follow registry events. Compare their identities and state membership counts in the existing panel setter; ordinary value changes update native forms without discovery requests. Reconnection also invalidates metadata.

Debounce discovery for 500 ms. Wait for older metadata work before requesting a fresh snapshot, discard obsolete queued callbacks, and cancel timers when the panel disconnects. Keep the existing request, validation, error and Retry paths.

Update only open candidate-result regions and JSON assistance after metadata arrives. Search input, native forms, local group members, Visual/JSON drafts and scroll remain mounted. Registry updates never add cards to the dashboard automatically.

Verify with scoped panel tests and one disposable helper creation while entity search remains open. Remove the helper afterward and verify the saved dashboard is unchanged.
