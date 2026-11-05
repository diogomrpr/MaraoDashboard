# Tasks

- [x] Add the shared transparent barrier and preserve overflow dismissal.
- [x] Document the touch boundary and preview/popup behavior.
- [x] Run the targeted navbar unit check and review the task diff.
- [x] Install current applicable assets on disposable HA `192.168.0.28`.

Evidence: 24 navbar unit tests passed; task diff and whitespace reviewed.
`prepareFrontend()` confirmed installation and asset readiness, version
`7ca2119f5f54718c37336019a8b63d30ae5920f5b7ac01d3588d74132375366e`.
Unrelated pre-existing edits were excluded from task verification. No browser or
real-device interaction check was performed.

Manual handoff: tap beside/below the bar, use navbar/More, scroll the final card
above navigation, and operate an open popup. No browser matrix is required.
