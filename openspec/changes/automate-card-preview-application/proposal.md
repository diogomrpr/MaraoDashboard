## Why

Approved real-runtime documentation previews still require manual patch promotion, selected checks and disposable installation. Connect the existing steps in one command and make it the required agent path when the user asks to apply a reviewed preview.

## What Changes

- Add `npm run card:apply -- --task ID` with a read-only `--plan`.
- Bind application to the exact reviewed revision, source patch, selected unit tests and approved consumer scope. Refuse drift and preserve unrelated edits/staging.
- Retain private before-file backups and an application receipt; reuse the existing build and frontend installer for disposable `192.168.0.28` without changing dashboard configuration.
- Update AGENTS.md, the card-design skill and development documentation to require this command for future approved applications.

## Capabilities

### Modified Capabilities

- `gallery-release-verification`: approved preview application and installation workflow.

## Impact

Developer scripts, documentation, instructions and targeted Node tests only; affected card-family set is empty. No runtime behavior, persisted HA configuration, release process, dependencies or production deployment changes. Existing preview manifests acquire review metadata only when explicitly prepared for application; no HA migration is needed. Backend/fixture/dependency changes remain outside this frontend promotion command.
