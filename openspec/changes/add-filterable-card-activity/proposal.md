# Proposal

## Why

An inline last-update or last-activation timestamp gives little context about what happened. Replace that metadata with a consistent icon-opened Activity popup showing meaningful recorded events, with useful date/property filters and the existing Marao appearance.

## What Changes

- Review all 38 catalog roles, their native/current/historical aliases, composed child cards and standalone runtime surfaces; record the complete disposition in `design.md` rather than leaving the audit for implementation.
- Remove automatic sensor Updated metadata and semantically identified last-pressed/last-activated state timestamps wherever they are currently displayed. Add the shared Activity icon action to those surfaces and all access-card variants requested by the user. Preserve operational state, explicit labels and meaningful date/time values.
- Show newest-first events grouped by day: observed state changes, recorded presses/activations, recognized problems and availability changes. Keep requests distinct from reported results and avoid attributing physical passage to a person merely because they initiated a command.
- Include explicitly linked feedback entities, as confirmed by the user, through an optional `variables.activity_entities` entity list. Do not discover or guess a gate's contact/obstruction sensors from names or proximity.
- Provide Today, Yesterday, Last 7 days and Custom range plus event-type filtering. Offer source and initiator filters only when applicable metadata exists. Date selection retrieves the selected period rather than filtering only a recent batch.
- Reuse Marao's modal sheets, circular icon controls, Montserrat typography, semantic colors and 48px touch targets. Keep a stationary title/close/filter header above an internally scrolling timeline.
- Preserve safety gestures, configured actions, existing chart/color-picker entry points, hidden icons and saved content. Update the native editor/catalog, shared validation/composition, documentation, safe examples and narrow tests together.

Confirmed: combined activity for the opener and explicitly associated feedback sensors; icon activation; themed timeline with date/property filters; review and coverage of every existing timestamp-metadata consumer. Proposed defaults: Today, compact event rows, bounded calendar-day queries, and transient filters. This proposal authorizes planning only, including where the user's wording says implement.

## Capabilities

### New Capabilities

None; extend the existing card and history boundaries.

### Modified Capabilities

- `card-behaviors`: semantic activity-metadata replacement, independent safe icon activation and explicit related-source configuration across the audited card set.
- `camera-history-content`: recorded activity normalization, evidence-based attribution, themed event timeline, bounded date queries, property filters and truthful loading/coverage/error states.

## Impact

The audit identifies the unconditional sensor Updated line and the shared HA state formatter's button/input-button/scene activation timestamps. Direct scope is the sensor and four access roles; conditional scope includes timestamp-bearing status/base, switch/scene collection children and glance reading surfaces. Every other catalog role is reviewed in the design matrix, including dates that must remain visible. Do not limit this work to a hand-picked gate card or remove dates from forecasts, schedules, charts, camera event lists or primary timestamp-sensor measurements.

Runtime work reaches `MaraoCards.js`, its shared reading/state/icon paths and the existing popup owner, with an on-demand activity module/model. Configuration follows `editor.py`, `MaraoSource.js`, `frontend_src/native-card-editor.js`, `card-composition.js`, authoring metadata and applicable retained generation. Use authenticated HA Activity/Logbook and state-history APIs; no new recorder, privileged endpoint, database or external card is planned. Numeric sensors require history support because HA Activity omits many numeric entities.

Compatibility is additive: omit related entities to keep the primary source only; preserve explicit empty lists, field order, unknown options, raw cards, custom actions, popup assignments and native layout. Existing dashboard/source/config-entry versions and released inputs remain unchanged; no migration or source rewrite is intended. Validate the new field without dropping unresolved authored references or overwriting old documents.

Non-goals: replaying security commands from history, inferring physical identity, recording synthetic past events, adding new tracking/history retention, replacing numerical graphs or existing camera timelines, or changing arbitrary user-authored timestamps. Security/privacy and data-preservation checks remain focused; camera playback remains outside automated validation.

Implementation completion includes essential scoped checks and final installation on disposable `192.168.0.28`. No application edits, installation or publication occur during this proposal.
