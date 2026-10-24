- [x] Record baseline, affected consumers and compatibility acceptance cases.
- [x] Rename active owned identifiers and current documentation/examples.
- [x] Add bounded compatibility resolution across backend, builder/native editors and runtime.
- [x] Verify canonical/legacy equivalence, preservation and relevant safety assertions.
- [x] Install final candidate on disposable 192.168.0.28, preserving source and helper states.

Evidence: 312 selected frontend tests and 298 selected backend tests passed; the final legacy energy-validation assertion passed with all 40 namespace cases. Verification-selector checks: 25 passed. Editor build and HACS boundary passed. No browser/mobile or camera playback checks were run. Existing unrelated JSON/search/energy edits were preserved.

Final installation confirmed on 192.168.0.28: frontend e9677fd30595a3e1, exact authored source hash retained, 219 safe helper states restored and verified. Final backend and served assets match the workspace.

## Automatic upgrade migration v1
- [x] Route supported saved sources through bounded namespace conversion, including groups and recognized owned cards.
- [x] Verify independent expected conversion, automatic setup, exact backups, rollback, read-only preview and repeat-setup idempotence.
- [x] Update compatibility documentation and install final changes on disposable 192.168.0.28 preserving configuration/helper state.

Migration v1 evidence: 128 namespace/legacy/native-storage/recovery checks passed, plus 2 focused automatic-setup/rollback tests and 68 current editor checks. The new independently specified namespace fixture includes groups, native/owned nested cards, opaque content and provenance hashes. Only six known owned card literals in the current v0.5.1 conversion expectation and that expectation hash were updated; historical input/provenance/generated fixtures remain unchanged.

Final installation on 192.168.0.28 migrated its existing source successfully, matched the reviewed namespace conversion, retained an exact pre-migration source/output backup and preserved all 219 safe helper states. Frontend 771e2e88056131b7 includes the previously completed first-click/group-validation fixes. No production deployment or release was performed.
