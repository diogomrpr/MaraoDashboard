# Proposal

## Why

Released v0.28.1 resolves Current room through a person, its Home/Away state and its shared Area sensor mapping; even the local browser preference selects a person. This cannot directly bind an iPhone, tablet or Companion WebView to its own selected Area sensor when devices share an HA account or that account has no linked person.

## What Changes

- Add an explicit **Area sensor for this device/browser** selector under **Marao settings → Current room → This browser**. Preserve the existing administrator-only editing boundary; no person setup is required for this selection.
- Persist the explicit sensor in a versioned browser-local preference scoped to HA origin, dashboard and signed-in account within that browser/WebView storage partition. The account identifies a privacy namespace, not the location source. Separate devices using the same account can retain different choices.
- Make the selected device sensor authoritative: resolve its current `attributes.area_id` through the existing shared room-to-page mappings without person matching, person-list lookup or Home/Away gating. An unrelated person's Away state cannot override this mode or open the legacy Away page.
- Retain the visible neutral shortcut for missing, unknown, unavailable or unmapped sources and invalid/deleted destination pages. State updates change the shortcut only; navigation occurs once on an explicit tap.
- Apply local selection immediately, independently of shared dashboard Save/Cancel. Provide explicit clearing/reset to an unconfigured neutral choice without silently falling back to another source; returning to legacy person tracking after direct-mode opt-in requires a deliberate mode choice.
- Preserve released shared person mappings, room mappings, Away configuration, existing local person strings and authored dashboard content. Use a separate preference namespace and compatibility path rather than automatically converting any person mapping into a device sensor.
- Show **this browser/WebView → selected sensor → current area ID → mapped page** diagnostics, together with source-specific corrective guidance and honest local-storage persistence feedback.
- Document that device means a browser/WebView storage context, not a globally identified physical device: reloads and normal restarts retain the choice while storage survives, but separate apps/profiles/origins, private browsing and cleared data require separate setup.

Observed: the current source and the local `v0.28.1` tag both persist only a person ID and let person presence override room resolution. `consolidate-current-room-settings` is complete and improves placement/diagnostics but retains that person dependency; there is no active change for direct device sensor binding. This proposal intentionally adds direct selection and keeps the released resolver as a labelled compatibility mode.

Acceptance includes `sensor.iphonix_area` resolving on an account with no linked person, two clients on one account choosing different sensors, reload retaining each choice, a person's Away report not hiding a valid device-room reading, and invalid/deleted sensor references staying neutral and repairable. Editing remains available only to administrators under the existing settings contract; this proposal does not change account roles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: direct client sensor selection, source precedence, browser-local persistence/reset, compatibility with legacy person preferences, diagnostics and unchanged settings authorization.

## Impact

Affected card set: `custom:marao-navbar-card` and the automatic dashboard-wide navigation surface. Shared consumers are `MaraoLocation.js`, `MaraoLocationPreferences.js`, `MaraoNavigation.js`, dashboard settings and its read-only draft preview, plus the navigation/setup/troubleshooting documentation and existing navbar/settings tests.

The shared `marao.navbar.current_room` format, page mappings, normal route order, explicit emptiness, unknown fields, generated/native content and authorization remain unchanged. Only a new versioned local preference is introduced; dashboard-format, shared-settings and HA config-entry versions need no bump. Legacy data remains exact and readable, with no automatic person-to-sensor conversion and no rewrite on read. Local updates require preflight and scoped recovery before replacement; invalid/newer records must not silently fall back to person tracking.

No backend endpoint, device registry identity, fingerprinting, third-party card, geolocation request, external service or runtime dependency is required. Non-goals are cross-device cloud sync, automatic physical-device recognition, new tracking providers, person/account editing, non-admin settings access, new Away inference and automatic page redirection. This workflow creates planning artifacts only; it does not implement, deploy, commit or access any HA instance.
