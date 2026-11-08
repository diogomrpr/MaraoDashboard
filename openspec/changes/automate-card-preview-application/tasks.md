# Tasks

- [x] Implement the reviewed-patch plan/apply command with approval binding, drift checks, recovery records and the existing build/installer.
- [x] Wire the package command, isolated preview tooling, AGENTS.md, card-design skill and documentation so future apply requests use it.
- [x] Verify the selected promotion/preservation/failure cases and command plan, review scoped changes and validate this change. Tooling-only work requires no HA redeployment or release.

Evidence: 12 targeted apply/design-workflow tests passed, including an actual child-process unit check and an injected installer boundary. The CLI read-only plan succeeded against the existing Plex preview and reported its destination drift without changing source or HA. Syntax, skill links, scoped diff checks and strict OpenSpec validation passed. Unrelated existing workspace edits were excluded from verification; no card behavior or HA assets changed.
