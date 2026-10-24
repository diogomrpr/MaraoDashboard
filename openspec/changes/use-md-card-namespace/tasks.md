- [x] Record baseline, affected consumers and compatibility acceptance cases.
- [x] Rename active owned identifiers and current documentation/examples.
- [x] Add bounded compatibility resolution across backend, builder/native editors and runtime.
- [x] Verify canonical/legacy equivalence, preservation and relevant safety assertions.
- [x] Install final candidate on disposable 192.168.0.28, preserving source and helper states.

Evidence: 312 selected frontend tests and 298 selected backend tests passed; the final legacy energy-validation assertion passed with all 40 namespace cases. Verification-selector checks: 25 passed. Editor build and HACS boundary passed. No browser/mobile or camera playback checks were run. Existing unrelated JSON/search/energy edits were preserved.

Final installation confirmed on 192.168.0.28: frontend e9677fd30595a3e1, exact authored source hash retained, 219 safe helper states restored and verified. Final backend and served assets match the workspace.
