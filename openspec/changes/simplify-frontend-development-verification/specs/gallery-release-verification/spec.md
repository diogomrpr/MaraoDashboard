## MODIFIED Requirements

### Requirement: Current-workspace disposable preparation
Ignored `ha-test/local.json` SHALL supply URL, administrator token, explicit
disposable acknowledgement and SSH connection. `ha:sync:dry-run` SHALL report the
plan without writes or HA contact. Full preparation SHALL build/deploy the current workspace, install safe fixtures, generate one dashboard and verify readiness. Frontend development preview SHALL synchronize only frontend files to an existing compatible installation, reload Marao when changed and verify served identities. It SHALL NOT reset helpers, explicitly invoke dashboard generation or restart HA. Normal entry reload SHALL retain its existing lifecycle, including applicable generated-output/history updates.

#### Scenario: A frontend-only change is prepared
- **WHEN** the focused development preview prepares current workspace assets on the allowed disposable instance
- **THEN** frontend files are synchronized and Marao reloads when changed before the real HA page refreshes
- **AND** native HA controls and icons remain real, with no helper reset, explicit generation call or HA restart
- **AND** successful synced assets remain installed after inspection or preview closure
- **AND** its development evidence does not replace publication or upgrade checks

#### Scenario: Integration or fixture Python changes
- **WHEN** preparation detects restart-bound code
- **THEN** it restarts the disposable HA and waits for readiness before tests continue

### Requirement: Meaningful focused checks
Development SHALL use the reviewed visual, behavior or focused tier for the changed contract and shared consumers. Presentation-only development SHALL require targeted current visual inspection, with relevant difficult layouts. Behavior SHALL add the smallest covering assertions. Publication SHALL retain affected unit/static/browser coverage, including applicable alignment and slider checks. Test-only and documentation-only changes SHALL not trigger unrelated application suites or device actions. Visibility checks SHALL NOT replace required action, security, migration or recovery assertions.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** its focused verification runs
- **THEN** presentation-only development inspects representative affected alignment and relevant difficult layouts
- **AND** publication retains the runner's 0.5 CSS-pixel alignment tolerance

#### Scenario: A card label changes without persistence or gesture changes
- **WHEN** the selected verification runs
- **THEN** development inspects the rendered localized label and only text layouts relevant to the edit
- **AND** unrelated camera, slider, reconnect, editor-save and historical live-upgrade checks do not execute

## ADDED Requirements

### Requirement: Persistent focused frontend preview
Development SHALL offer persistent preview of selected components on the real disposable dashboard or supported editor, using current installed assets and native HA components. Watch SHALL serialize rebuild, frontend sync and browser refresh while preserving route and viewport. Asset, resource and console failures SHALL remain visible. Preview SHALL NOT imply automated acceptance or release readiness.

#### Scenario: A presentation edit is saved
- **WHEN** the focused preview is watching a compatible prepared installation
- **THEN** the latest workspace frontend files are synchronized to HA and the same view refreshes
- **AND** unrelated cards and profile matrices are not traversed

#### Scenario: Preview closes
- **WHEN** the preview browser closes
- **THEN** watch stops and the last successfully synchronized assets remain installed
- **AND** no continuous background synchronization or package rollback is started

#### Scenario: Frontend preview cannot safely proceed
- **WHEN** backend compatibility, ownership or an active deployment cannot be verified
- **THEN** preview stops before synchronization and explains the required preparation
- **AND** it never resets source, fixtures or helpers as a fallback

#### Scenario: Inspection fails after a successful sync
- **WHEN** a visual or browser check reports a defect in successfully synchronized current assets
- **THEN** the defect remains visible and the latest assets remain installed for correction
- **AND** routine cleanup does not restore an older package, while safe helper restoration and genuinely failed-operation recovery remain required

#### Scenario: A selected component is absent
- **WHEN** the requested preview has no matching rendered component
- **THEN** it reports missing scope rather than claiming a successful inspection
