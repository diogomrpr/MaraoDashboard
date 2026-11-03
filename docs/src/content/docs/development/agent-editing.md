---
title: Editing with an agent
description: Use installed-version metadata and a local read-only planner with ha-mcp.
---

Marao provides installed-version card metadata, a native JSON Schema and a local read-only planner for agents using ha-mcp. The client needs Node 24 or newer to run the planner. Installing Marao does not add MCP tools automatically.

Start from the registered resource's adjacent `MaraoFrontend.release.json` and follow its `authoring` index. This identifies matching metadata, schema, guide, module and standalone CLI assets, covered by the manifest's SHA-256 hashes.

The CLI accepts JSON through stdin and returns JSON through stdout:

```sh
node planner.mjs describe < /dev/null
node planner.mjs validate < validation-request.json
node planner.mjs plan < planning-request.json
```

Use the full [authoring guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/docs/docs/development/agent-authoring.md) for request/response examples, popup ownership and the hash-checked ha-mcp workflow. The same guide ships with each installed package, so agents can use the instructions matching that version.

Parent settings own popup behavior; native Sections views own layout and custom cards. The planner reconciles both before producing one bounded patch. It preserves unknown fields, deliberate deletions and prior-family customizations. Source creation or adoption requires an explicit `popup_edits` request.

Read fresh configuration, plan locally, review the complete changes, save through ha-mcp with the unchanged configuration hash, then read back. Invalid plans have diagnostics and no save payload. Keep original and proposed documents privately until the write is confirmed. The CLI never connects to HA, handles credentials, actuates devices or writes files.
