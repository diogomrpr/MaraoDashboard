# Scope and safe promotion

Inspect the final diff against proposal.json baseline. Record requested card, behavior owner, direct consumers, owned popup/generated roles, intended differences and invariants. The ownership map is a starting point, not automatic proof of impact. Cross-check tests/verification-map.js and actual call sites. Generated native wrappers delegate; distinct custom element names do not imply distinct owners.

Example: target-number styling may affect Climate + its details, Number and Wallbox. Ask: “Apply to all these consumers, only Climate and its details, or a specified subset?” Record the explicit choice with proposal revision and affected consumers. Main-only vs popup-only requires a correspondingly scoped variant. Do not ask again for an unchanged explicit choice.

Before writing main: obtain apply authorization, recompute consumers from the final patch, compare every destination against proposal.hashes and inspect concurrent edits. Safely rebase in the proposal workspace if needed; never overwrite drift. Renew scope approval when intended behavior or affected consumers expand. A nonconflicting rebase can retain approval only when approved hunks and semantic scope are unchanged.

Use git diff/review and git apply --check for the selected reviewed patch, not blanket directory synchronization. Do not include copied baseline files, proposal metadata, generated caches or unrelated source edits. Existing staging belongs to the user.

After application, select minimal affected checks. Shared action/data changes require assertions for affected consumers; routine visual edits do not need an exhaustive matrix. Install applicable runtime changes only on disposable 192.168.0.28 per AGENTS.md. No publishing is implicit.
