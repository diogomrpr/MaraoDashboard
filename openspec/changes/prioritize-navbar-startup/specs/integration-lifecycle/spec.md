# Spec Delta

## ADDED Requirements

### Requirement: Independent navigation and recovery bootstrap
Marao SHALL initialize navigation and frontend recovery through a minimal critical path independent of optional cards, history, media, event providers and editors. Localized feedback, gesture ownership and recovery protections SHALL work on that path. An optional-resource failure SHALL remain diagnosable without disabling the critical surface or triggering automatic reload loops.

#### Scenario: A content dependency is withheld
- **WHEN** optional module requests are blocked after HA provides a saved navbar configuration
- **THEN** the navbar can initialize, show localized hold progress and request explicit recovery without those modules
- **AND** optional loading starts only after the critical navigation/recovery components are registered, without delaying their configuration or interaction

#### Scenario: Content initialization rejects
- **WHEN** optional content initialization fails after navigation is ready
- **THEN** its resource/error evidence is retained and the affected content exposes readable failure feedback
- **AND** navigation remains usable without an unhandled rejection terminating the critical startup path

#### Scenario: Recovery is attempted while offline
- **WHEN** an eligible hold completes but the bounded server-reachability check fails
- **THEN** localized retry feedback is displayed and usable cached content, sign-in and preferences are preserved
- **AND** there is no automatic reload, integration restart, server mutation or entity service call

#### Scenario: Unsaved work exists before optional modules load
- **WHEN** frontend recovery is requested while the host reports unsaved edits
- **THEN** recovery is blocked with localized save/discard guidance before cache eviction or navigation
- **AND** the protection does not depend on loading an optional editor bundle

### Requirement: Compatible versioned critical resources
The critical bootstrap and its dependencies SHALL use the server's current content fingerprint and retain existing entry URLs and generated/native navbar contracts. Setup, reload and unload SHALL preserve owned-resource lifecycle behavior. Startup optimization SHALL NOT rewrite saved dashboards, preferences or historical data, require dashboard regeneration, or introduce third-party runtime dependencies.

#### Scenario: An existing installation loads the new frontend
- **WHEN** an unchanged released generated or native dashboard loads after the new package is correctly registered
- **THEN** its existing navbar type, ordered routes, labels, icons, options and unknown configuration fields remain usable without regeneration or source conversion
- **AND** intentionally empty navigation remains empty

#### Scenario: Frontend assets change
- **WHEN** a refreshed document loads after the server registers updated frontend contents
- **THEN** critical and deferred Marao assets use the same current fingerprint
- **AND** only one implementation owns each existing navbar custom-element name and its refresh operation

#### Scenario: Integration registration ends or is replaced
- **WHEN** the integration reloads or unloads
- **THEN** owned frontend entry registrations are replaced or removed through the existing lifecycle without duplicate or orphaned registrations
- **AND** unrelated resources and HA settings remain untouched

#### Scenario: Explicit recovery completes
- **WHEN** a successful hold refreshes a correctly deployed frontend
- **THEN** the existing bounded native/web recovery returns to the same origin, path, query and fragment with sign-in and preferences retained
- **AND** saved source, generated output, protected custom content and historical snapshots are unchanged
