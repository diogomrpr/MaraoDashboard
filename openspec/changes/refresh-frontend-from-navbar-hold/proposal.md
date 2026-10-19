# Proposal

## Why

An open mobile dashboard can retain outdated frontend files after an update, and users currently have to find platform-specific refresh or cache-reset controls. A three-second navbar hold should refresh the current device to the frontend served by Home Assistant while preserving sign-in, settings and the current page.

## What Changes

- Add a three-second continuous hold on the horizontal Marao navbar, including its route icons and overflow toggle, with visible localized progress and strong haptic requests at start and completion.
- Refresh once on completion; retain ordinary tap navigation and overflow behavior, cancel interrupted gestures, and prevent the completed hold from also activating its underlying control.
- Require Android Companion, iOS Companion and mobile browsers to have a refresh path. Prefer supported native cache clearing on iOS; use feature-detected web-cache cleanup and fresh navigation on Android, browsers and other compatible hosts. An unavailable or ineffective native handoff must have a bounded web fallback.
- Preserve authentication, preferences, saved configuration and the same page, query parameters and fragment. Protect unsaved work and leave other devices and the server unchanged.
- Add focused recovery/gesture checks, canonical gallery coverage and a realistic-page example, with honest separation of automated bridge coverage and actual app/device inspection.

Observed: `MaraoNavbarCard` already owns generated/native navbar links, overflow and lifecycle cleanup, but has no refresh hold. Marao already registers content-fingerprinted frontend URLs. Proposed: a client-only recovery action shared by those hosts. Assumption: the server has completed deployment and is registering its current frontend resources; a client refresh cannot repair an incomplete server deployment.

Non-goals: erasing every operating-system/browser cache, deleting site data or authentication, changing dashboard configuration, restarting/reloading the HA integration, changing routes or adding a persistent navbar slot, recovering a blank page where the navbar cannot run, or implementing an automatic update system.

## Capabilities

### New Capabilities

None. The behavior extends existing navigation and integration lifecycle capabilities.

### Modified Capabilities

- `navigation-popups`: Specify the navbar hold, feedback, cancellation, click isolation and lifecycle behavior across generated/native hosts.
- `integration-lifecycle`: Specify client frontend recovery, platform fallbacks, current-page/sign-in preservation, bounded failures and fresh resource loading.

## Impact

- Shared runtime: `custom_components/marao_dashboard/frontend/MaraoCards.js` and `MaraoDashboard.js`, including existing English/Portuguese runtime catalogs; a small shipped recovery helper may be extracted if needed for meaningful tests. No third-party card or dependency is required.
- Consumers: generated `custom:marao-navbar-card` and native `custom:marao-native-navbar-card`, including standalone native placement. Preview/editing hosts remain noninteractive. Navbar-adjacent overflow, modal and fullscreen contracts are regression boundaries; entity-card behavior is unchanged.
- Builder/validation/generator: retain current navbar descriptors, ordered routes, saved keys and generated YAML. No option, default, management API or migration is planned. Existing supported release inputs and historical snapshots remain byte-for-byte untouched by this action.
- Verification/documentation: extend navbar/recovery unit and browser checks, `tests/verification-map.js`, `ha-test/` examples, usage/update guidance and the source/check inventory during implementation.
- Planning baseline: starting commit `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`; pre-existing working-tree changes are outside this proposal. This planning-only edit has an empty affected-card set. The implementation affected-card set is the two navbar hosts above and their shared overflow presentation.

Success means loading the latest frontend available from the server on the requesting device. Complete deletion of all browser/OS-managed cache bytes is not a portable guarantee. Existing sign-in/preferences storage, source JSON, generated output, history and unrelated HA settings are preserved; no persisted-format conversion or live historical-upgrade exercise is required by this UI-only scope.
