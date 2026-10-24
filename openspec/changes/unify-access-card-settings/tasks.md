## 1. Consolidation
- [x] Inspect variants, record compatibility and acceptance cases.
- [x] Unify discoverability and behavior settings across builder/native editors.
- [x] Resolve settings through shared validation, generation and runtime while preserving safety.
- [x] Update documentation and a safe gallery example.
- [x] Run targeted compatibility and safety unit checks and review the task diff.
- [x] Install current changes on disposable 192.168.0.28 preserving configuration and helpers.

Evidence: editor build and diff checks passed; 162 selected JavaScript tests and
197 pure Python compilation/model tests passed. Four unrelated HA lifecycle/API
cases were excluded; the HA pytest plugin stalled during import, so the pure
checks ran without that plugin. Existing dependency deprecations remain.
Installation served frontend `143ad326eda1dd14`; the authored configuration hash
and 219 safe helper values matched the backup after restoration. A transient
connection failure during initial restoration was recovered before handoff.
Browser and physical-phone gesture inspection were not run; existing strict
slide/hold implementations are reused. No release was requested.
