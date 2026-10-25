# Design

## Context

See `proposal.md` for motivation and the confirmed builder-only boundary. The user's clarification excludes hypothetical light history and every optional history combination absent from the current builder.

`editor.py` exposes power history on switches and temperature history on climate cards; graph/toggle-graph types are intrinsically history-capable. `MaraoCards.js` renders a shared `.history-control` extra row when a graph is present except on plain graph cards, which already use primary card activation. That row can become Loading or Retry. The same module already implements a semantic light-icon button, palette indicator, cancellable 600 ms default hold, `_openHistory`, `_openLightColor` and shared `MaraoPopupCard` detail ownership.

The generic renderer accepts manually supplied graph options on additional families, but those are not builder capabilities and do not determine the scope. `MaraoFrigateEventsCard.js` also has textual Details buttons in problem/event-error content; these open extra information rather than actuating a device. `MaraoRuntime.js` provides energy summaries, timelines and access slides, with navigation/recovery controls that serve other roles.

The baseline `Project-owned background history trace` requirement explicitly mentions a separate visible History control. Its delta retains all scenarios and replaces only that presentation contract; the light-picker requirements remain unchanged.

## Goals / Non-Goals

**Goals:** One recognizable secondary-entry pattern, no large History row on eligible cards, preserved primary interaction, mobile touch targets and existing detail sheets.

**Non-Goals:** Additional history capabilities/options, a multi-destination light menu, changing primary destinations or operating controls, gesture-only error recovery, third-party/native-card restyling, new persisted contracts or chart behavior.

## Decisions

### Audit result and affected consumers

| Card/control | Current role and builder support | Planned treatment |
| --- | --- | --- |
| `md_switch_card` graph | Builder Power graph plus Power entity; extra History/Loading/Retry row | Replace normal History row with existing icon-circle pattern and safe default hold; keep loading/error/retry observable |
| `md_climate_card` graph | Builder Temperature graph plus Graph entity; extra History row | Same history trigger; retain thermostat mode, setpoint and slider controls |
| `md_toggle_graph_card` | Builder graph type with related toggle; extra History row | Same history trigger; preserve short-tap toggle and source independence |
| `md_graph_card` | Builder graph type; card tap already opens history when not overridden | Retain primary history tap; use the same compact semantic history icon when a visible secondary entry is needed; no extra row or override of configured actions |
| `md_light_card` | Builder color/brightness controls; no history toggle/source | Keep current direct color icon/default hold; no history or chooser added |
| Fan/exhaust, cover, base/status, sensor, number and Wallbox | No optional history configuration in builder | Do not add history or redesign manually supplied graph combinations |
| Event feed and event error Details | Builder camera popup/event configuration; textual extra-information openers | Use compact information-icon buttons with localized names; retain readable reasons and current detail destination |
| Energy-period card | Primary summary activation opens period detail; arrows change period | Keep primary surface/period navigation; no separate large secondary-info button found |
| Timeline and standalone power history | Primary content plus explicit recovery | Keep chart interaction and Retry; no extra normal detail row found |
| Camera preview, event tiles, media/apps, room/group/security/access/navigation/scene collection | Main destinations, entity operations or navigation | Preserve primary activation; do not turn these into secondary holds |
| Alarm/scene dropdowns, vacuum/media/exhaust actions, numeric shortcuts, sliders | Direct controls, not additional-info openers | Retain controls and strict security safeguards |
| Shared problem/details overlays and access-slide information icon | Compact or existing primary detail access | Retain visible problem cues and safe information access; no new card-body security hold |
| Close/Back, Retry/Refresh and Load more | Modal ownership, recovery or pagination | Preserve explicit controls and their behavior |
| Embedded HA/custom cards | User/native-owned content | Preserve exact configuration and native rendering |

This is a completed source audit, not a task to discover all cards later. Implementation should recheck touched paths if concurrent changes alter them; it should not broaden into unsupported graph variants.

### Reuse the light interaction pattern, with a history destination

For eligible history cards, make the existing visible icon circle a semantic history button with a small chart indicator, localized target name and at least 48 by 48 CSS pixels. Keep icon geometry and layout height stable. Stop propagation so the icon never toggles a switch or changes thermostat state. Keep primary short taps, sliders and dropdowns independent.

Use the existing 600 ms secondary hold binder only when the ordinary card has no explicit `hold_action` (including an explicit no-op) and no mandatory security hold. Cancel on movement/scrolling, pointer cancellation, relevant source loss or lifecycle changes; consume the synthesized click after opening/cancellation. This is not a new 1.2-second security action. Preserve hidden icons rather than forcing them visible; a hidden icon leaves the default hold as the entry only if the user has not explicitly overridden it, matching the existing light contract. Document that overriding both entry paths deliberately removes default secondary access.

A dedicated large row was rejected because it is the reported clutter. A new settings chooser was rejected because the builder does not expose combined light/history behavior. Do not add automatic global gesture routing across every card family.

### Keep secondary content and errors on their existing owners

Reuse `_openHistory` and the existing popup detail stack for standalone and in-popup cards. Preserve lazy imports, Recorder source selection, state/unit formatting, retries, Back/Close, background inertness and focus restoration. A history opener is governed by its actual numeric source, independently of an unrelated toggle target's usability; previews remain disabled.

Separate history entry from its old row's overloaded loading/retry role. Show loading or failure through existing shared graph/problem status, and retain explicit safe retry in the appropriate compact status/detail UI. Removing the row must not turn an error into silent missing history. Compact event Details icons remain usable to inspect errors even when device actions are unavailable; keep the error text visible. Content loading and retry are not service actions.

### Preserve model contracts and keep implementation at the shared owner

Use a small explicit eligible-family decision in `MaraoCard`; do not expand from every `show_graph` the generic renderer happens to accept. Reuse the existing icon-button/hold methods and markup rather than adding a framework or card variant. Generalize a light-specific helper only where necessary to share the same behavior. Keep color capabilities and light-picker dispatch unchanged.

Builder catalog, frontend model validation, Python page model and generator produce the same saved options. No default injection, format bump, migration or new setting is required. Raw cards, unknown keys, names, graph source IDs and custom actions remain untouched. Existing save backup/recovery stays unchanged; no new write mechanism exists. Manual-only graph combinations remain outside the new eligibility rule and are neither promoted nor stripped.

### Documentation, localization and examples

Update switch, climate and toggle/graph usage guidance to describe icon activation/default hold and custom-hold/hidden-icon precedence. Keep light documentation on color only. Reuse English/Portuguese History/Details labels with target-specific accessible names; the icon indicator supplies the visual affordance. Update existing graph-enabled switch/climate and toggle-graph Cases/realistic examples rather than inventing new unsupported history fixtures. Change coverage inventories only when example identities/contracts change.

## Risks / Trade-offs

- Icon activation or hold release could also toggle a device → assert no service from secondary activation and exactly one primary action from a short tap.
- A default hold could steal scrolling or custom behavior → reuse cancellation and explicit-action precedence; retain strict security controls unchanged.
- Hidden-icon/custom-hold combinations lack a default entry → preserve user choices and document precedence rather than restoring a large row or forcing icons.
- Removing the old row could hide loading/retry → retain readable status and explicit retry on existing shared owners.
- Plain graph primary tap could be accidentally removed → preserve its existing main destination and custom actions.
- An all-card audit could grow into a redesign → use the inventory above and the explicit builder-capability boundary.

## Verification and installation

Use small existing Node assertions for icon/hold activation, short-tap dispatch, cancellation, explicit no-op/custom holds, hidden icons, graph-source availability, popup restoration and failed-history retry. Preserve representative unchanged light and access/alarm gesture checks because the touched action binder is shared. Review source changes against the complete audit table, without requiring every family to change. This planning step runs no device, camera playback or broad browser tests.

Before implementation handoff, install final compatible frontend assets once on disposable `192.168.0.28`, preserving current source/helper state. Use full preparation only if actual fixture/backend edits require it. Manual watch list: compact icon discoverability, no extra History row, short tap versus hold, scrolling, and returning from history. Publication is a later separately requested action with the unit-only gate.
