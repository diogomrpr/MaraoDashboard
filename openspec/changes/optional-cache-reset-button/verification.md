# Verification

- Starting commit: `46f52846624f55e4678a479cf949b8252094151f`; prior slow-camera retirement edits excluded using `/private/tmp/marao-optional-cache-start.json`.
- Three targeted Node checks passed: General form default/persistence/schema validation, native navbar option preservation, main-page row removal and re-enabling.
- Nine targeted pytest cases passed for omitted/false/true settings across legacy formats 0/1 and canonical format 2, including invalid-value rejection, unrelated-field preservation and unchanged source.
- Editor assets rebuilt; reviewed selector plan has no unresolved mappings; OpenSpec strict validation and diff whitespace checks passed.
- Installed final runtime/editor/backend on disposable Home Assistant `192.168.0.28`, one restart. Current asset readiness passed with frontend identity `8ebff35d9b00f2d8`; dashboard source bytes preserved and 195 safe helper states restored. Receipt: `/private/tmp/marao-optional-cache-install.json`.
- Phone/browser inspection remains with the user: toggle General → Show cache reset button, Save & Generate, then confirm the main-page button and its spacing disappear and return. Automatic refresh and navbar-hold handling were not changed.
- No camera tests, full suite, production access or publication performed. Historical test failures remain unchanged.
