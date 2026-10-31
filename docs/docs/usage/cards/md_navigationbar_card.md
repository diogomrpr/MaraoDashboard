---
hide_table_of_contents: true
title: Navigation bar card
layout: page
parent: Cards
---

# Navigation bar card

`custom:marao-navbar-card` is Marao's project-owned floating mobile
navigation. The builder and generator create it automatically as the final
card in each generated view. It accepts an ordered list without a count limit,
keeps full-size controls in one row, and sizes the bar to its available safe width.

![Navigation bar card](../../../assets/images/cards/md_navigationbar_card/navigationcard_light.png)

## Manual usage

    type: custom:marao-navbar-card
    routes:
      - label: Home
        icon: mdi:home-variant-outline
        icon_selected: mdi:home-variant
        url: /marao-dashboard/overview
      - label: Rooms
        icon: mdi:sofa-outline
        icon_selected: mdi:sofa
        url: /marao-dashboard/rooms

Use the builder for generated dashboards so its route order, available pages,
translations, and route validation stay aligned. A manually authored
view must also leave enough bottom content space for the floating bar.

## Route fields

| Field | Required | Description |
|:--|:--:|:--|
| `label` | Yes | Localized route name and the icon's internal accessible name. |
| `url` | Yes | Dashboard route. `path` is accepted as a compatibility alias. |
| `icon` | No | Inactive Material Design icon; defaults to `mdi:circle-outline`. |
| `icon_selected` | No | Filled/selected icon; falls back to `icon`. |

The bar deliberately shows icons without visible labels. The `label` is still
required for semantics and may be exposed as an optional tooltip; navigation
must never depend on a tooltip.

A compact refresh button at the top right of the main page clears the frontend
cache and reloads with a single tap. It scrolls away with the page rather than
floating over content. It loads with the navigation before optional dashboard content,
so it also works when a content module fails. The existing navbar hold gesture
remains available and uses the same recovery action. Save or discard edits first.

For administrators, a completed two-second navbar hold opens Maintenance with
**Edit dashboard** and **Clear cache and refresh**. Editing is available on every
page, including the main page and full-page floor plans, independently of the
main-page editor shortcut's visibility. Other users retain direct hold-to-refresh.

## Layout and behavior

- Every control is visibly at least 48 by 48 CSS pixels.
- Active icon backgrounds are perfect circles and use the Marao theme.
- Gaps remain compact while the visible route count follows the available width.
- When routes exceed that width, the rightmost More destinations toggle opens a
  matching vertical icon menu centered above it. Long menus scroll internally.
- Selecting an overflow destination keeps its configured position; More indicates
  the active overflow route. Escape, an outside tap or the toggle closes the menu.
- iPhone positioning uses Home Assistant's app-aware safe-area value, falling
  back to browser insets, and keeps the
  accepted lowered offset without an extra generic bottom margin.
- Other mobile devices use the normal compact bottom offset.
- Button presses use Marao's strong haptic feedback.
- Open Marao popups remain above the navbar.
- The navbar activates Marao's route-scoped fullscreen shell, which hides Home
  Assistant's native top bar only while the dashboard is active.

Page and navbar side clearance follow the current insets during rotation.
Page bottom clearance follows the navbar's current height and offset, with only
8px of extra spacing so the final card can scroll fully above it.
It uses the bar's CSS bottom offset, so elastic scrolling cannot change the
page height or cause an extra jump at the bottom. Native scrolling bounce remains.
Marao sheets keep their full-screen backdrop, but their content stays inside
the overlay's own top and side safe bounds. `height: auto` keeps short sheets
compact; fixed `height` and `max_height` are limited to available safe height.
Generated sheets use content-driven height up to the available viewport, leaving
at least 50px above the sheet or the top safe inset when larger. Short sheets
stay compact. Even an explicit `100dvh` sheet keeps its title and close control
accessible. Sheets scroll internally above the navbar.

Do not add a second navbar dependency or manually register a Lovelace resource.
The Marao integration owns and registers this component.
