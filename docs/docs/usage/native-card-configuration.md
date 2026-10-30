---
title: Native card configuration
layout: page
parent: Usage
---

# Configure Marao cards in Home Assistant

Use Home Assistant's **Edit dashboard → Add card** to choose a Marao card. Its
native configuration dialog exposes compatible entities and the current card
options. Home Assistant owns the surrounding view, placement, sizing, visibility,
save and cancel controls. Marao's fields change the card configuration and do not
operate the selected device.

Visual fields and HA's YAML editor edit the complete card configuration. Changing
a display name or option preserves existing actions, native layout and visibility,
unknown fields, explicit empty lists and structured service data. Display names
belong to the card; they do not rename Home Assistant entities. Advanced options
expand underneath the ordinary fields.

An Entity Group keeps its explicit membership, order and per-member settings.
Use the member's edit button to configure it independently. Adding another entity
to a Home Assistant area does not add it to an existing group. Scene collections
likewise retain order and each scene's local name/icon.

Energy cards retain display unit/precision, period, cost choices and contributors.
Each contributor initially appears collapsed with its name and sensor ID. Tap the
heading to edit its energy/name/optional-cost fields inline; new entries open
immediately. Reordering retains the current disclosure state, and reopening the
card dialog resets existing contributors to collapsed. Opening a disclosure alone
does not change saved settings. Graph cards retain ordered power devices and
sensor cards retain background thresholds.

The floor-plan configuration opens the image-placement editor. Upload or replace
the image, add light markers near the preview, and select a marker to open that
light's settings. Strip paths and their points are edited on the image. Coordinates
remain available in the card's YAML instead of appearing as visual numeric fields.
Uploaded images are stored in HA immediately; applying the arrangement changes
the card draft. Full-page mode is intended for a native Panel view.

Media cards retain inline/popup display and Apple TV remote, volume target and
ordered app options. Camera cards keep dashboard/popup streams and event-provider
options. Access/alarm, climate, vacuum and appliance settings keep their existing
meaning, including explicit command data. Previews remain inert.

Wallbox current cards support the existing presets for `number` and `input_number`
entities. Only the preset matching HA's current usable value is colored. Generic
numeric input cards retain their stepper and do not gain a shortcut row.
