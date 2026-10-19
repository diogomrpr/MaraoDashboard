# Design

## Context

See `proposal.md` for the user goal, scope and compatibility boundary. This design is needed because a new bundled dependency, shared popup behavior and history lifecycle all change together.

The existing end-to-end path is:

```text
saved card/options --> generator or native wrapper --> MaraoCard
                                                        |
                                            Recorder + live state
                                                        |
                                               compact SVG trace

energy card --> existing period popup --> Recorder --> basic SVG line
```

`MaraoCards.js` owns graph source selection, availability, history requests, formatting helpers, entity actions and the popup shell. `_graphMarkup` currently selects up to 240 evenly distributed records; that can lose narrow extrema, and one value is extended into a flat line. `MaraoDashboard.js` owns energy-period history, navigation, unit conversion and popup touch containment. Its energy render replaces the entire inner tree. Neither path owns an interactive chart instance today.

The builder catalog already exposes graph sources, visibility, colors and energy formatting. The generator preserves public options and emits period popups. Native wrappers reuse these same project components, with preview mode intentionally non-operational. No new saved option or generated popup is necessary for the chosen feature.

`MaraoPopupCard` already supplies column-width sheets, inert background, focus containment/restoration, safe areas and route cleanup. It currently switches configured popups by hash and replaces child content; opening a second popup from a child would remove that child and its state. The global scroll guard also intercepts touch movement. These shared roots must support history, rather than adding a second modal implementation.

The existing esbuild process generates local frontend assets, carries license notices and checks reproducibility. Integration fingerprints cover the frontend tree, which is served under `/marao_dashboard_static`. HACS rejects development dependencies, fixtures and `vendor/` folders inside the shipped integration.

## Goals / Non-Goals

**Goals:** clean mobile detail, exact point inspection, useful bounded windows, correct full-resolution summaries, stable updates and one shared local renderer across existing numeric graph consumers. Preserve actions, saved configuration, history semantics and the accepted mobile/popup contracts.

**Non-Goals:** a general chart builder, inline gesture-heavy dashboard charts, new graph settings, multi-series charts, energy-consumption calculations, binary timeline replacement or statistics APIs. Keep existing compact previews inexpensive; Chart.js is for opened numeric details. Pinch/pan and long-range statistics can be considered separately after this first feature is used.

## Decisions

### 1. Bundle selected Chart.js modules and load detail on demand

Add an editable `frontend_src/history-chart.js` entry that exports the shared detail renderer, and a small `frontend_src/history-data.js` for independently testable data/window helpers. Extend the existing build with generated `MaraoHistoryChart.js` and `MaraoHistoryData.js` assets and the required Chart.js/transitive license notices. Pin the reviewed Chart.js release and lockfile; do not install anything during this planning workflow.

Register only the line controller/elements, numeric scales and required fill/decimation support. Use numeric epoch timestamps on a linear x-axis and native `Intl` formatting with HA locale/time zone; this avoids introducing a date adapter just for labels. Render exact selected values and timestamps as native DOM content outside the canvas, so the Chart.js floating tooltip plugin is unnecessary in this version.

The light data helper can load with the graph runtime; the Chart.js bundle loads only when a detail body mounts. Copy the parent's frontend fingerprint query into dynamic module URLs, deduplicate concurrent imports and provide explicit retry after a failed load. Use no CDN, external card registration, HA-private chart imports or global `Chart` variable. The static namespace/fingerprint already serves new frontend files; do not change integration setup or HA configuration merely to register the library.

Alternative: import `chart.js/auto` into the main dashboard or adopt the zoom plugin now. Rejected because every dashboard would pay for unused controllers or gesture dependencies. Chart.js documents selective registration, click-only events and value-coordinate conversion in its [integration](https://www.chartjs.org/docs/latest/getting-started/integration.html) and [interaction](https://www.chartjs.org/docs/latest/configuration/interactions.html) guides.

### 2. Preserve compact previews and use a deliberate History action

Every configured consumer of the existing `showsGraph` path gains a separate 48px History control. Normally use a short localized label; intentional icon-only cards retain an icon-only History control with a localized internal name. Keep titles full-width and place controls below them. Never replace a configured tap/hold, climate mode popup or toggle action. Guard and stop the History event at its actual control, with strong button haptics and the graph source's own availability checks.

Native/generated/raw-config paths all reuse this runtime behavior without changing stored keys. Native editor previews neither open operational sheets nor request history. The History control remains useful for a valid graph source even when a separate toggle target is unavailable, while actual toggle actions stay disabled. Unknown/disconnected graph sources receive neutral disabled history controls; history errors retain the existing explicit retry path.

The initial interaction layout is:

```text
graph card                  detail sheet
+---------------------+     +-----------------------------+
| Current reading     | --> | Title / Back          Close  |
| compact trace       |     | Selected time      Value    |
| [History] [control] |     |                             |
+---------------------+     |         line chart          |
                            |                             |
                            | [1h] [6h] [24h]             |
                            | [Previous reading] [Next]   |
                            | Minimum / Maximum / Summary |
                            +-----------------------------+
```

Energy summary cards keep their existing open action; their existing period detail body mounts the same chart renderer. Preserve day/month navigation instead of introducing a second independent period model.

Alternative: make the decorative background directly interactive. Rejected because it competes with toggles, sliders and card navigation and leaves insufficient space for readable mobile labels.

### 3. Extend the shared sheet with transient detail content

Add a small runtime content/drill-in API to `MaraoPopupCard`. For a page card, retain a transient popup host outside the card's replaceable `ha-card` content so ordinary renders do not destroy its sheet. Feed it current HA/source snapshots from the owner and release it on actual owner/view removal. Do not add a generated popup config or serialized chart setting.

When History originates inside an existing sheet, keep the parent's mounted child content in a hidden, inert container while showing the chart within that same modal shell. Continue required HA updates to retained children. Back restores the parent content, previous scroll position and matching History control; Close releases all retained content and restores the original dashboard opener. Keep the retained structure limited to the history drill-in, not a general navigation-stack framework.

Use namespaced transient browser-history state on the current route to represent the detail entry without rewriting configured popup hashes. Reconcile browser Back/Forward, popup switching and route replacement through the shared shell. Forward restores only an owner/context still valid in the same view; otherwise clear the transient state safely. Opening a child must not make the owning card appear permanently disconnected. Preserve the existing handling of temporary HA shell moves and source/connection invalidation.

Chart point inspection uses tap/click events only. It does not capture pointers, call `preventDefault` on vertical touch movement, set `touch-action:none`, disable page zoom or require a drag to reveal data. Keep the popup guard's native-slider exception and background containment. Change the guard only where a focused test proves a chart tap/scroll conflict; do not exempt the entire canvas from modal containment.

Alternative: a nested overlay or a separate hash-generated popup per card. Rejected because both complicate focus/inert ownership, parent restoration and preserved generated output.

### 4. Keep raw history authoritative and derive views separately

Keep request/cache ownership with the existing graph/energy components. The data helper normalizes ordered timestamp/value samples plus explicit gap markers; it does not fetch. Reuse current energy converters and each sample's source metadata before calculating bounds. Preserve original raw records; pass a separate mutable drawing dataset to Chart.js because its decimation may modify that dataset.

Use existing loaded 24-hour history for 1h/6h/24h graph windows. Window switches, appearance changes and selection do not issue Recorder calls. Include the boundary state only when its reported timestamp/state establishes a value at the boundary; never invent coverage or reset unknown intervals to zero. A live value retains its actual HA update timestamp and is distinguishable from recorded history; do not label `Date.now()` as the measurement time of an unchanged state.

Replace the evenly skipped preview points with a shared min/max-preserving reduction. For detail, bound drawing work by pixel width while retaining full-resolution data for selection and summaries. Preserve explicit gaps (`spanGaps:false`), disable smoothing and unnecessary animation, and display a single sample as a point. Do not infer outages merely from an irregular reporting interval: show known nonnumeric/unavailable transitions and absence of coverage faithfully.

Minimum and maximum use all valid values in the selected window, not rounded/decimated points. For `state_class: measurement`, also show an arithmetic **Sample average**; this explicitly does not claim time weighting. Hide that summary for cumulative/total counters or unknown semantics. Do not sum power readings or reinterpret an energy counter's reset as interval consumption. A future bar/consumption feature would need a separately specified statistics/aggregation contract.

Keep existing energy day/month semantics and server requests. Derive calendar boundaries in HA's configured time zone, including 23/25-hour daylight-saving days; do not carry forward the current fixed-24-hour day assumption into the new detail logic. If retained Recorder data covers only part of a month, indicate limited coverage and render that part without claiming complete totals or hourly statistics.

Alternative: build readouts from reduced drawing points or fetch again for each window. Rejected because the first loses precision/peaks and the second adds unnecessary load. Chart.js documents [min/max decimation](https://www.chartjs.org/docs/latest/configuration/decimation.html); HA distinguishes retained raw history from [long-term statistics](https://www.home-assistant.io/integrations/history/).

### 5. Treat the chart as a retained component

Create a Chart.js instance only after its visible container has measurable dimensions. Use responsive container sizing, capped device-pixel scaling where needed, reduced-motion behavior and sparse tick labels. Keep text sizes derived from Marao tokens; at enlarged text reduce tick density and reflow surrounding controls instead of shrinking essential text. All selected readouts and summaries live outside the canvas and remain readable if plotting fails.

Use tap x-coordinates to select the nearest original valid sample in the current window; the finger need not hit a tiny drawn point. Expose previous/next-reading buttons with endpoint disabling. Keep selection keyed by source timestamp across live updates, theme changes and card renders; reconcile only when the source/window no longer contains that sample. Label timestamps in HA's time zone and format values using existing locale/unit/precision rules. Climate-context labels and readouts intentionally contain no unit visually or semantically.

Update the retained chart instance with current derived data/theme rather than replacing its canvas on each HA update. Refactor the energy body render accordingly. Destroy the instance and release listeners/observers on definitive close/removal; invalidate pending module/history completions with the existing request-identity pattern. A late completion must never reopen the sheet. Data or module failure produces a readable local error and explicit Retry, without swallowing console/resource failures or disturbing working entity controls.

Alternative: render a fresh canvas on every update or use a hover-only tooltip. Rejected because it would lose selection/focus and undermine touch use.

## Risks / Trade-offs

- Library weight or blurry/high-memory canvases -> selective registration, deferred loading, measured asset/render costs and responsive device-pixel handling; benchmark representative dense data rather than claim phone performance from library documentation.
- Drill-in can break shared modal ownership -> one shell, retained parent DOM, explicit Back/Close behavior and focused route/focus/scroll/native-control regressions.
- A new History target could overlap a card action -> visible 48px geometry, explicit event isolation and zero-service assertions for inspection across both normal and icon-only variants.
- Sampling can hide faults or manufacture certainty -> extrema-preserving reduction, explicit gaps, exact original-sample selection and independent expected fixtures for dense peaks, missing states and single readings.
- Recorder retention limits monthly detail -> disclose partial coverage; do not change recorder settings, invent data or silently add statistics semantics.
- Concurrent control-grid/verification work touches the same roots -> preserve unrelated edits, refresh scope at apply time and use the current affected selector without assuming either unfinished change has passed.

## Migration Plan

Inspect existing released graph/formatting fixtures, including `ha-test/upgrade/fixtures/energy-formatting-input.json` and its independent format expectations. Independently assert the saved configuration and generated YAML before/after this feature are identical for the existing options. New detail state is transient, existing card/template keys are retained, and no versioned product-data conversion is planned. Do not modify archived history or rewrite prior proof. If any implementation decision would change generated structures/ownership, persisted defaults or installation behavior, revise this preservation assessment and select matching migration/recovery and release-time live proof before writing those paths.

Land data/model tests and asset build checks first, then shared sheet/detail integration and representative safe fixtures as one coherent feature. Keep builder help, native preview behavior, translations, card docs, quality guidance and the source/check map aligned. Use the existing `history`, `energy`, `popup` and reviewed additional action/slider scopes or a narrow chart-detail component mapping; include the new asset/model dependencies so reuse cannot accept stale evidence.

Deploy compatible frontend assets together only to disposable `192.168.0.28`, using existing preparation preflight/exact backups and restoration. Exercise only safe fake entities; chart inspection must dispatch no device service. Check selected normal/narrow/text/zoom/landscape layouts in the reference theme, appearance in both themes, and distinct iPhone/Android tap/scroll behavior where relevant. Inspect representative gallery, native, realistic-page and popup results after the final edit/check. Full testing, exhaustive matrix traversal and historical live replay are not implied.

Rollback restores the matching previous frontend package/build assets and uses the existing exact-source/owned-state recovery if a deployment unexpectedly changes data. Since this design writes no user configuration, it needs no data downgrade; nevertheless verify byte-identical saved source/generated output and completed disposable cleanup. Before any later push/tag/release, run the scoped publication gate with applicable packaging/reproducibility and exact-commit CI.
