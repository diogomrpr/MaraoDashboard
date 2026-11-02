---
title: Local development
description: Set up tools and install current changes on the disposable Home Assistant instance.
---

Use the repository's locked Node dependencies. The project supports Node 22 or newer; the documented workstation uses Node 24 LTS and Python 3.14.

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r tests/requirements.txt
```

Python is needed for legacy/backend/fixture checks, not to run the installed frontend package. Browser inspection needs the existing Playwright/browser setup only when that inspection is selected.

## Build source-owned bundles

Edit editor behavior in `frontend_src`, then run:

```sh
npm run build:editor
```

Runtime modules in the editable frontend directory are source files. Do not hand-edit generated editor bundles or release files. `npm run check:editor` detects generated drift; `npm run build:hacs` assembles the complete frontend graph.

## Configure the disposable instance

Development connection details belong in ignored `ha-test/local.json`: the disposable URL, administrator token, explicit disposable acknowledgement and SSH connection. Keep credentials and private evidence out of commits and reports.

Agents may operate only **192.168.0.28**. Use safe gallery entities, never real locks, doors, alarms, camera privacy controls or other physical security devices. Keep one `/marao-dashboard` dashboard with its realistic views and Cases gallery.

Use `npm run ha:sync` for initial preparation or changed backend/fixtures. It preserves ordinary dashboard configuration and batches restart-bound fixture work. Do not use full preparation for a compatible frontend-only change.

## Install frontend-only changes

After final edits and essential local checks, call `prepareFrontend()` from `ha-test/prepare-frontend.js` for direct sync without opening a browser:

```sh
node -e 'require("./ha-test/prepare-frontend").prepareFrontend().catch(error => { console.error(error.message); process.exitCode = 1; })'
```

The helper verifies compatibility, installed assets and readiness. If browser inspection is already needed, use the existing scoped preview command instead:

```sh
npm run ha:preview -- --component slider-headers --watch
```

Choose a real reviewed component ID from `tests/verification-map.js`; the example scope must match the change. Watch mode is useful only while editing/previewing. Frontend preview does not reset safe helpers or restart HA.

Leave final successful assets installed for the user. If installation fails, report **not installed / not ready for test** with the blocker. Documentation-only changes with no runtime effect need no HA deployment.

The [canonical local guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/docs/docs/development/local-development.md) contains the detailed private setup and recovery workflow.
