---
title: Using the playground
description: Try real Marao cards with fictional devices and copy their configuration.
---

Each card reference shows a live preview built from the same Marao runtime as the documented release. Select **Open playground** to reveal behavior examples, settings and YAML editing. Select **Exit playground** to return to the preview; your edits remain until you reset or leave the page.

## Configure and compare

Use the settings fields for ordinary changes and YAML for advanced configuration. Both edit the same card. Change the theme, language or scenario to compare presentation without changing the configuration you will copy.

Fields with known choices open a searchable dropdown. Search icons by name, entities by their fictional name or ID, and modes or formatting by their supported values. Icon suggestions include a visual preview. Entity lists support multiple selections and keep existing member order and custom names/icons; use YAML to edit those details or reorder members. Fields tied to your own installation also accept a custom value through **Use “…”**. **Use default** removes an optional override; **Clear selection** retains an explicit empty list.

On desktop, settings and preview sit side by side in matching panels. Scroll inside the settings list to reach more options while keeping the preview, editor tabs and Copy/Reset buttons visible. The page outline returns when you exit playground mode. Narrower windows use a stacked layout with normal page scrolling.

Examples cover materially different behaviors rather than every combination of numbers, colors and names. A device's supported capabilities matter: enabling a setting does not give an on/off entity dimming, a read-only sensor an action, or an open-only cover a Close command.

## Copy into Home Assistant

Select **Copy YAML**, replace the fictional entity IDs with your own, and paste the result into **Add card → Manual** or an existing card's YAML editor. Copying includes the public card settings, not the simulated states or website controls.

When you enter your own entity IDs, the preview retains the example’s fictional device capabilities. It does not discover what your real device supports. Dashboard navigation exports a `marao` settings block to merge into the dashboard configuration; keep your existing views.

An invalid draft shows an error and leaves the last valid preview visible. Correct it before copying. Reset returns to the selected example.

The playground keeps edits in the page session. It does not connect to Home Assistant, ask for a token or install configuration. A local display name never renames your real entity.

## What the demonstration means

The controls are real Marao components, while devices and responses are fictional. The cards show their state changes directly; history, forecasts and events use example data. Navigation stays inside the preview, and unsupported operations identify the limitation.

Home Assistant's own dashboard editor, arbitrary native or third-party cards, authentication and real camera transport are not recreated here. Camera examples explain configuration and event behavior; they do not establish playback quality on your network or device. Check those in your own Home Assistant after configuring the card.

Public documentation follows stable releases only. A local development preview may identify its source revision, but unpublished features are not a separate public documentation version.
