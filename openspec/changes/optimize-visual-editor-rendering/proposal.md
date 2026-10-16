# Proposal

## Why

Opening the Visual editor creates controls for every page, and ordinary card changes rebuild the entire Visual view. A read-only sample of the current build found about 150–170 ms between starting a full rebuild and two subsequent animation frames, rising to roughly 700 ms with a simulated 4× CPU slowdown; this repeated work makes mobile editing feel slow.

## What Changes

- Refresh only the affected sections, page headers, navigation or dependent controls after a local edit, preserving unrelated mounted controls, focus and scroll position.
- Initially expand only the saved landing page, as explicitly selected by the user. Show every page header immediately, create section/card controls when its page opens, and remove those body controls when it closes. Allow multiple pages to be expanded deliberately.
- Keep expansion state within the panel session across ordinary edits, page reordering/renaming and Visual/JSON switches. New or duplicated pages open for editing without closing other pages.
- Keep the complete draft in the existing shared model, including unopened pages; mounting and collapsing content never changes configuration, dirty state or saved output.
- Add focused DOM-lifetime, interaction, preservation and performance coverage, adapting the existing measurement helper to canonical format-2 pages and safe current examples.

Only fixes 1 and 2 from the exploration are included. Metadata payload/API changes, entity-search optimization, serialization changes, Monaco redesign, a new frontend framework, viewport virtualization, persisted editor preferences and generated dashboard rendering are non-goals.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: require bounded page-body mounting, landing-page-only initial expansion, targeted updates and complete draft preservation independent of mounted controls.

## Impact

Planning baseline: `e300e1db04ff047fd80b3f2148bdb15e929d9755` (clean working tree before scaffolding). Apply must record its actual starting commit again. The diagnostic sample used matching frontend fingerprint `a573d0101830bb15` on 2026-10-16: 14 pages, 103 editor card rows and about 12,400 elements including native control shadow trees. Collapsing every page still left all 103 rows mounted. These are limited Chromium measurements on the disposable instance, not physical-phone results or promised future timings.

Primary implementation: `frontend_src/MaraoDashboardPanel.js`, its rebuilt assets and existing panel styles/labels only where needed. Supporting work: editor panel/model/drag checks, `tests/measure-ha-editor.js`, `tests/verification-map.js`, editor usage guidance and `ha-test/` safe examples. The model, server validation/generator and existing history/migration paths remain the authority for document preservation; avoid changing them to implement presentation state.

Affected-card set: every occurrence rendered by the shared Visual page/section row, including catalog entity cards, groups, headings, scene collections and page shortcuts, with duplicate references remaining independent. Raw Lovelace cards and unknown options must survive without being mounted as visual rows. Runtime card implementation affected set: empty.

Compatibility: preserve dashboard format 2, config-entry/package version semantics, ordered arrays/grouped source compatibility, names, IDs, popup references, options, explicit emptiness, unknown/raw/protected content and saved history. No source-format, management API, generated ownership or installation migration is proposed. Expansion and DOM bookkeeping remain panel-local and never enter serialized JSON. Existing validation, explicit save, backups, generation recovery and discard/restore boundaries remain intact.

Verification will select the affected editor, drag/JSON continuity and configuration-preservation checks, run serially, and inspect representative safe mobile layouts only on `192.168.0.28`. This proposal does not request deployment, publication, comprehensive testing or historical live upgrade replay.
