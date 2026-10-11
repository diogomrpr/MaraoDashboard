# Reconnect confirmation design

## Context

See [proposal.md](proposal.md) for the problem and scope, and
[project-context.md](../../project-context.md) for the dated reproduction and
v0.5.1 publication exception. Existing contracts are in `entity-state-actions`
and `gallery-release-verification`; no requirement delta is needed.

The maintained `checkDisconnected` flow in `tests/test-ha-dashboard-e2e.js`
warms the native notification component online, closes the real WebSocket,
blocks retries during the outage, verifies disabled controls/no offline service,
changes a safe switch on the server, reconnects, and checks authoritative state
and errors. Plain HTTP offline emulation alone is insufficient. Old temporary
diagnostic scripts referenced in private historical notes are not assumed to exist.

## Goals / Non-Goals

**Goals:** Establish whether a stable released HA stack containing the identified
WebSocket fix resolves the native race and passes the existing Marao contract.
Record exact Core/frontend/WebSocket versions and reproducible evidence.

**Non-goals:** Changes to builder, generator, card APIs, shared runtime, theme,
translations or fixture semantics. Do not work around HA subscription failures,
introduce new infrastructure, or extend the previous release exception.

## Decisions

1. **Verify the delivered dependency chain first.** Check official HA Core,
   frontend and WebSocket release/lockfile evidence for inclusion of the upstream
   commit or equivalent fix. A newer Core version alone is not proof. If no
   released build includes it, leave this change open with the checked evidence;
   do not install an experimental dependency or native patch.
2. **Separate native reproduction from Marao behavior.** First use a fresh
   authenticated `/profile` context without opening a Marao dashboard. Warm and
   dismiss a harmless notification online, interrupt the actual transport, block
   reconnect attempts during the outage, and restore it. Collect subscription
   lifecycle, page errors and structured unhandled rejections. Reuse the existing
   Playwright/authentication pattern; add only a focused native-route diagnostic
   if required to make this confirmation repeatable.
3. **Keep application assertions intact.** Run
   `npm run test:ha:e2e -- --disconnect-only` after the native case. The retained
   checks must prove the native warning appears/disappears, no offline action is
   sent, current server state is rendered, and no unexpected recovery exception
   remains. Repeat three independent native and Marao cycles to reduce the chance
   of a misleading single successful race run.
4. **Preserve private evidence and scope.** Use ignored local configuration and
   the shared top-level origin-scoped authentication initializer. Keep raw logs
   and traces private; commit only sanitized version/result summaries. If a Marao
   change becomes necessary, revise this plan and record its consumers before edits.

## Risks / Trade-offs

- **A race passes intermittently** → repeat independent cycles and retain the
  actual fault-injection/subscription evidence rather than accepting a page refresh.
- **An update harms the disposable environment** → verify a backup before updating,
  record installed versions, retain a rollback path, and wait for API/UI readiness.
- **A new HA version introduces another failure** → report and investigate it;
  do not suppress exceptions or weaken the full gate to declare completion.
- **Browser emulation cannot prove physical-phone behavior** → report Chromium
  verification accurately; physical phones and haptic strength are not claimed.

## Migration Plan

When this future task is explicitly applied, verify the allowed disposable target,
take and confirm a backup, then update only to the verified stable HA release.
Record the backup reference privately and restore it if the update cannot reach
readiness. Sync the current workspace through existing preparation, perform the
native and Marao cycles, then run `npm run verify:publish` with `.venv` active.
Visually inspect recovery on the exercised fixture cards after the checks.

Successful confirmation updates the dated context and private diagnostic result,
keeps the error assertions unchanged, and completes the checklist. Any future
push/tag/release still requires its own immediate publication gate and exact-commit
Tests/hassfest/HACS results. This change itself does not publish.
