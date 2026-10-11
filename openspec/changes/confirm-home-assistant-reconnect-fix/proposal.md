# Confirm the native Home Assistant reconnect fix

## Why

Native Home Assistant reconnecting after a real WebSocket outage can reject an
old persistent-notification unsubscribe with `not_found: Subscription not found.`
The upstream fix was identified during v0.5.1 review but has not been confirmed
in a released Home Assistant build on the disposable instance.

## What Changes

- Check official release/dependency evidence for a stable HA build containing
  [the upstream reconnect fix](https://github.com/home-assistant/home-assistant-js-websocket/commit/4c5674c36cc898bbd38abc54b4d89777e37a8496).
- When such a build is available and the future task is executed, take and verify
  a backup before updating only the disposable instance at `192.168.0.28`.
- Reproduce the native `/profile` scenario without Marao and rerun Marao's real
  disconnect/recovery check with its normal error assertions intact.
- Record the tested versions and outcome; run the full publication gate before
  declaring the prior release blocker resolved.

This is planned verification work. No update or verification is executed by
creating this change. Core 2026.10.0 still reproduced the issue on 2026-10-09;
the fix's correspondence to this exact race remains an inference until tested.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This verifies the existing `entity-state-actions` disconnect/recovery and
`gallery-release-verification` publication requirements; it changes no product
contract. `.openspec.yaml` explicitly sets `skip_specs: true`.

## Impact

The change affects the disposable HA version and development evidence. The
existing focused runner is `tests/test-ha-dashboard-e2e.js` with
`--disconnect-only`; shared private authentication/preparation comes from
`ha-test/client.js` and `ha-test/prepare.js`.

**Affected-card set:** application edits are not planned, so the edit set is
empty. Recovery verification exercises Switch + graph, Light + slider, Number,
Arm away · hold and Open-only door safe fixtures; the full gate covers the gallery.
If evidence requires a Marao change, update the plan and affected-card set first.

**Non-goals:** production access, real-device actuation, experimental frontend
replacement, editing native HA code, suppressing exceptions, weakening tests or
publishing a release. The user-approved v0.5.1 exception does not authorize an
exception for a future release.
