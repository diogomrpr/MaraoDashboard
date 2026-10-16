# Design

## Context

See [proposal.md](proposal.md) for the requested behavior and affected consumers, [card requirements](specs/card-behaviors/spec.md) for threshold aggregation and [problem requirements](specs/entity-state-actions/spec.md) for the agreed mixed-state rule. Design is included because a normal-color change alone would still be masked by the shared partial-problem surface.

The relevant path is:

- `editor.py` and `frontend_src/editor-model.js` retain battery group membership and member options. No new editor field or validation rule is needed.
- `generator.py:_entity_group_card` emits a `hc_entity_group_card` with battery type and summary entity IDs. `_entity_group_popup` emits the separate filtered member sheet. Native/preview hosts use the same runtime. Preserve these generated structures and stable hashes.
- `MaraoCards.js:entityGroupState` deduplicates members, validates numeric readings with `batteryReading`, counts levels below 20 and returns the first usable percentage. That percentage is a documented display contract and must not become the minimum merely to obtain a color.
- Individual battery presentation already uses red/yellow/green thresholds in `stateAppearance`. Group presentation instead uses the navigation kind, losing battery thresholds. The renderer applies normal appearance only when no problem exists; `cardProblem` and `problemStyle` currently choose the general partial-warning surface.
- Current theme tokens provide battery foreground/background colors for both themes, while localization already provides low counts, availability counts and member reasons. Existing visibility/palette tests and safe group browser checks are suitable extension points.

## Goals / Non-Goals

**Goals:** Reuse the existing valid-reading and palette rules, compute severity independently from display readings, and compose critical severity with real availability information at the shared renderer boundary.

**Non-Goals:** A general severity engine for all domains, sorting members, changing popup filtering, replacing the displayed percentage, persisting derived values, new configuration or custom CSS-color ranking. Do not redesign member cards or other summaries.

## Decisions

### 1. Extend the existing aggregate with the color-driving reading

Calculate the lowest valid battery percentage during the existing deduplicated member pass and expose it only in the runtime aggregate. Keep `reading`, `state`, low count, unavailable list and label semantics intact. Loading, empty and wholly invalid inputs have no minimum; valid zero is critical, never a fallback for missing data. Use authoritative HA updates and existing rerender dependencies; do not poll or cache severity independently of its members.

Reuse the existing battery threshold/palette calculation for both ordinary batteries and battery-group default appearance, extracting a small shared helper only if necessary. Derive color from battery-group type and its members, never `Maintenance`, the icon, reserved ID or popup path. The aggregate considers all configured members before popup filtering. Numeric severity is independent of member custom color strings; existing member color overrides and settings remain untouched. Keep existing explicitly supported card-color override handling rather than inventing a new priority or setting.

Alternative: use the first displayed percentage or synthetic group `on`/`off`. Neither represents yellow/green secondary batteries or the worst level. Scanning rendered popup rows would also depend on whether the popup is open and filtered.

### 2. Resolve battery severity and problems together

Keep actual problem detection, kind, reasons, member identities and counts. Resolve the effective surface and its readable text/icon palette together at the shared group rendering boundary, including the actual background property used by problem surfaces. Do not merely set a CSS variable afterward: the existing problem background and inherited text colors would otherwise win or leave inconsistent contrast. Do not suppress the problem, relabel it as a service error, or change global warning/error theme colors.

Use the following ordered presentation policy:

| Condition | Effective treatment |
| --- | --- |
| HA state not loaded | Existing loading treatment |
| Disconnected or no configured member usable | Existing complete neutral disabled treatment; an explicitly empty group retains its current empty behavior |
| Existing recognized reported action/content error | Existing error surface and reporting, subject to complete-availability priority |
| At least one valid reading below 20 | Existing battery-red palette, including when a partial-availability warning is also present |
| Partial availability without a known critical reading | Existing shared partial-warning palette and readable detail |
| All usable, minimum from 20 to below 80 | Existing battery-yellow palette |
| All usable, minimum at least 80 | Existing battery-green palette |

The user explicitly agreed that known red remains red with another unavailable member. Treat that as the narrowly scoped battery-group composition of an actual critical level and partial problem, while preserving all other problem priorities. Update quality guidance to make this composition explicit rather than treating it as an accidental normal-color override. Red alone is not sufficient feedback: retain low-battery counts and localized availability reasons. Returning from critical to noncritical must remove the combined red surface and restore the current applicable policy.

Alternative: globally make red override problems, mark every unavailable battery as zero, or convert a partial warning to an invented error. These would hide actual availability semantics or affect unrelated families.

### 3. Preserve stored configuration and host parity

Keep all derived minimum/severity data out of saved JSON, generated YAML and history. Source conversion, protected/raw content, selections, member options and hashes are unchanged. Use existing supported historical/converted Maintenance inputs and independent expected configurations to prove the persisted transformation is identity; do not rewrite archived fixtures or change the generator just to duplicate a runtime decision.

The same renderer must cover generated Overview cards, independently named battery groups, duplicates and native/preview hosts. The popup shell and each battery member retain their present backgrounds and controls. Other group types and ordinary navigation cards retain their current state/problem behavior.

### 4. Prove aggregation and final rendered surface

Extend existing `marao-card-visibility` and palette tests with independently specified expectations for first-75/secondary-10, yellow-only and green-only groups, duplicate IDs, threshold boundaries, valid zero, decimal values, invalid/out-of-range inputs, empty groups and member-order permutations. Assert existing displayed readings/counts separately from the new color-driving reading. Test recovery and membership removal, not only initial construction.

For mixed availability, test known-red plus unknown/missing/invalid, no-red plus partial warning, full loss, disconnect and actual reported-error priority. Assert the rendered surface, text/icon colors, low/availability reasons and popup reachability; checking an unused appearance helper alone would miss the current problem-style override. Include negative cases for other group families and unchanged individual battery overrides.

Extend the existing safe group browser selection with live helper updates and computed-color comparisons against matching ordinary battery cards in the same theme. Keep membership/order/filter fixed or deliberately varied per scenario, verify transitions without reopening, and restore exact helper states afterward. Sample a native/preview duplicate through existing infrastructure where available without adding another dashboard. Select only needed group/color/problem checks in `verification-map.js`, preserving concurrent shared-file work.

Use canonical Cases and the realistic Overview/Maintenance example for materially different red/yellow/green and mixed-unavailable states. Reuse safe helpers; avoid generating equivalent color/value combinations as an exhaustive matrix. Inspect both themes and relevant narrow/enlarged-text layouts for contrast and readable combined reasons. No physical action or service dispatch is needed to open or inspect the group.

## Risks / Trade-offs

- Displayed 75% beside a red tile may seem surprising -> retain the existing first-usable display contract and visible secondary low count; changing the display itself would be a separate decision.
- A stale minimum keeps a recovered tile red -> derive from current members each render and test recovery/removal/reordering.
- Partial problem styling masks red or leaves unreadable text -> compose surface and foreground together, then assert computed rendered colors in both themes.
- Invalid values create false critical alerts -> reuse `batteryReading` validation and keep invalid data in availability reporting only.
- Shared problem or palette edits affect other families -> bound the composition to battery groups and retain negative regression tests and current concurrent header work.

## Migration Plan

No persisted-format/API/config-entry migration, generated ownership change or new recovery mechanism. Current supported saved/converted configurations retain independently expected JSON, member options and popup references; the requested change is runtime presentation only.

During later implementation, preview scoped checks and the existing read-only deployment dry run, then deploy compatible UI changes only to `192.168.0.28`. Retain existing exact private source/generated/owned-state backups and preflight/recovery for fixture preparation, restore helper states, verify cleanup and protect concurrent unrelated edits. Layout/color observation itself remains read-only. Final inspection follows focused automated checks and loaded asset fingerprint verification.

Rollback restores the matching prior UI package; if safe preparation changed saved data, restore its exact saved source/generated/owned-state backup with the matching package. Report rollback failures. Live preserved-install proof is conditional on an actual persistence/ownership/upgrade change and would require revising this plan; publication, full-suite and parallel testing remain separate requests.
