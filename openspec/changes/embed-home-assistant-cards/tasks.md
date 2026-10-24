Implementation authorized by the user on 2026-10-24. Starting commit a7e7b1411b08fb5106498f1eba22fc9f379c5ed2; snapshot /private/tmp/marao-ha-cards-implement.json. Acceptance and shared consumers follow the approved plan and design.

## Proposed implementation
- [x] Confirm installed native picker/editor loading and custom-resource discovery in a small prototype when implementation is authorized.
- [x] Add safe YAML descriptor validation and direct native generation with preserved order.
- [x] Embed the native picker/editor, YAML editing and preview in the shared card workflow.
- [x] Update JSON assistance, translations and usage documentation.
- [x] Verify targeted preservation/invalid-input cases, build and install on disposable HA.

Completed: 80 targeted Node checks and 87 Python preservation/history/conversion checks passed. Native-editor and mixed-grid smoke checks passed on disposable HA 2026.10.0. Final backend/frontend installation and served-asset checks passed; current test configuration and helper states were preserved. Initial panel is 137,885 bytes, below 144 KiB. OpenSpec validation and diff checks passed. Full suites, camera transport, device matrices and third-party installation were intentionally omitted; nothing was published.
