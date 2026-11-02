---
title: Layouts and visibility
description: Use Home Assistant's native editor to arrange Marao cards and pages.
---

Home Assistant's dashboard editor owns views, sections, card placement, resizing, duplication and conditional visibility. Marao supplies the cards and their controls.

Open **Edit dashboard** through Home Assistant, the main-page pencil, or the administrator navbar menu. The native header remains visible while editing. Its page tabs include pages that are not in the Marao navbar; scroll the tabs to reach more pages.

## Arrange cards

Use a **Sections** view for normal pages. Edit a card and open its **Layout** tab to change its width or height. Use Home Assistant's move and duplicate controls to organize content. Each duplicated Marao card owns an independent automatic detail sheet.

A card's internal column setting is separate from its dashboard width. For example, People `columns: 2` arranges people inside that card; `grid_options.columns` controls the space Home Assistant allocates to the card. At narrow widths or enlarged text, a card can reduce its visible internal column count while keeping your saved preference.

Use a **Panel** view for a full-page floor plan. A Panel view contains one content card. The floor-plan full-page option keeps room for Marao navigation.

## Visibility

Set conditions in Home Assistant's native **Visibility** tab. Visibility controls presentation; it does not remove a configured entity from a summary's action scope. For linked Entity Group layouts, moving or deleting the member card changes membership; merely hiding it does not.

Marao disables entity actions when a target is unknown, unavailable or disconnected. Native visibility rules do not replace those action checks.

## Saving

Use **Save** or **Cancel** in each card dialog, then **Done** to leave dashboard editing. Done is not a separate whole-dashboard generation step. Resolve a reported save error before continuing.

Changing a page path does not automatically rewrite every explicit link. Update its navbar destination and any `popup_view` references. The [popup guide](../popups/) explains how linked views own their content.
